// Lookahead scheduler — the core timing engine. READ ARCHITECTURE.md.
//
// Browser timers drift and stall when backgrounded, so we never rely on them
// for *when* a click sounds. Instead a 25ms JS loop schedules clicks up to
// ~100ms ahead against the sample-accurate AudioContext hardware clock.
//
// The metronome counts *felt pulses* (see meter.ts): in simple meter a pulse
// is one base note unit; in compound meter (6/8, 9/8, 12/8) a pulse is a
// dotted quarter, so 6/8 is felt in 2. BPM is the pulse rate.
//
// Playback has two phases (Phase 5): an optional *lead-in* — a run of
// quarter-note count clicks used for pre-roll (SPEC §1) and the count-in
// between exercises (SPEC §7) — followed by the *main* exercise. Reps don't
// advance during the lead-in.
//
// Position/rep math lives in position.ts (pure, unit-tested); this module owns
// the AudioContext, the timer, and the bridge to the store. Data flow is
// one-directional: scheduler -> store. The store holds plain state; this module
// reads config from it each tick (so live BPM/time-sig/rep changes take effect
// going forward) and writes position/rep back at *play time* (never on the 25ms
// loop) so React visuals stay decoupled. The per-subdivision note highlight is
// pushed through a lightweight event (DOM-toggled by the notation) rather than
// the store, to avoid a React re-render on every sixteenth.

import { useMetronomeStore } from '../state/metronome';
import { playClick, playCompletion } from './sounds';
import { getBeatGrouping, subdivisionsPerPulse } from '../meter';
import {
  scheduledMuted,
  stepRandomDropout,
  RANDOM_DROPOUT_INITIAL,
  type RandomDropoutState,
} from './dropout';
import {
  advancePosition,
  currentRep,
  INITIAL_POSITION,
  isDownbeat,
  isMainBeat,
  isTargetReached,
  noteIndexInBar,
  type Position,
} from './position';

const LOOKAHEAD_MS = 25; // how often the JS loop runs
const SCHEDULE_AHEAD_SEC = 0.1; // schedule up to 100ms into the future
const START_DELAY_SEC = 0.06; // tiny offset so the first click isn't clipped

// --- Scheduler events --------------------------------------------------------
//
// A minimal pub-sub for consumers that shouldn't go through the store: the
// notation's current-note highlight (fires every subdivision, DOM-toggled to
// avoid per-note React renders) and the completion signal the transport layer
// uses to orchestrate auto-advance. All events are emitted at *play time*.

export type SchedulerEvent =
  | { type: 'start' }
  | { type: 'note'; barIndex: number; noteIndexInBar: number }
  | { type: 'complete' }
  | { type: 'stop' };

type Listener = (event: SchedulerEvent) => void;
const listeners = new Set<Listener>();

/** Subscribe to scheduler events; returns an unsubscribe function. */
export function onSchedulerEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: SchedulerEvent): void {
  listeners.forEach((listener) => listener(event));
}

let audioContext: AudioContext | null = null;
let timerId: number | null = null;

let nextNoteTime = 0; // AudioContext time of the next tick to schedule
let position: Position = INITIAL_POSITION; // advanced one subdivision at a time

// Lead-in state. `leadInTotal` counts felt pulses (e.g. 4 for a 1-bar count in
// 4/4); 0 means there is no lead-in / we're already in the main phase.
// `leadInActive` stays true until the first main tick clears the count display.
let leadInTotal = 0;
let leadInDone = 0;
let leadInActive = false;

// Click-dropout state (SPEC §5, Free mode). Recomputed once per bar; `dropoutMuted`
// then gates the click audio for every subdivision in that bar. Random mode steps
// its sequential state per bar. Reset on start/skip so bar 0 is never muted.
let dropoutRandomState: RandomDropoutState = RANDOM_DROPOUT_INITIAL;
let dropoutLastBar = -1;
let dropoutMuted = false;

function resetDropout(): void {
  dropoutRandomState = RANDOM_DROPOUT_INITIAL;
  dropoutLastBar = -1;
  dropoutMuted = false;
}

/** Decide mute for `barIndex` once, when the bar first begins. Reads the live
 *  dropout config; null/Exercise mode means never muted. */
function refreshDropoutForBar(barIndex: number): void {
  if (barIndex === dropoutLastBar) return;
  dropoutLastBar = barIndex;
  const cfg = useMetronomeStore.getState().dropout;
  if (!cfg) {
    dropoutMuted = false;
  } else if (cfg.mode === 'scheduled') {
    dropoutMuted = scheduledMuted(barIndex, cfg.barsOn, cfg.barsOff);
  } else {
    const { muted, state } = stepRandomDropout(dropoutRandomState, cfg, Math.random);
    dropoutRandomState = state;
    dropoutMuted = muted;
  }
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioContext = new Ctor();
  }
  return audioContext;
}

/** Run `fn` at AudioContext time `time` rather than now — we schedule up to
 *  100ms early, so a timed callback keeps store/visual updates in sync with
 *  what the user actually hears, without the 25ms loop touching React. */
function atPlayTime(time: number, fn: () => void): void {
  const ctx = getAudioContext();
  const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
  window.setTimeout(fn, delayMs);
}

/** Publish the current main-phase position (and, on a downbeat, the rep) to the
 *  store at play time. The rep only changes on downbeats; updating there avoids
 *  redundant writes. */
function publishPosition(time: number): void {
  const { pulseInBar, barCount } = position;
  const onDownbeat = isDownbeat(position);
  const barsPerRep = useMetronomeStore.getState().barsPerRep;
  const rep = currentRep(barCount, barsPerRep);

  atPlayTime(time, () => {
    if (!useMetronomeStore.getState().isPlaying) return;
    useMetronomeStore.getState().setPosition(pulseInBar, barCount);
    if (onDownbeat) useMetronomeStore.getState().setCurrentRep(rep);
  });
}

/** Schedule one main-phase click at `time` and push its visuals: the rep/beat
 *  position (store, main beats only) and the note highlight (event, every
 *  subdivision). */
function scheduleMainTick(time: number): void {
  const ctx = getAudioContext();
  const { subdivision, timeSignature, accentPattern, barsPerRep } =
    useMetronomeStore.getState();
  const { isCompound } = getBeatGrouping(timeSignature);
  const subsPerPulse = subdivisionsPerPulse(
    subdivision,
    isCompound,
    timeSignature.denominator,
  );
  const noteIdx = noteIndexInBar(position, subsPerPulse);
  // Bar within the current rep: in Exercise mode `barsPerRep` matches the
  // 2D pattern's length, so this addresses pattern[barIndex] directly.
  const barIdx = position.barCount % Math.max(1, barsPerRep);

  // Click dropout (SPEC §5): on a muted bar, skip the click audio (main beats
  // and subdivisions) but still advance the rep counter and the beat/notation
  // visuals below — the indicator keeps pulsing through muted bars.
  refreshDropoutForBar(position.barCount);

  if (isMainBeat(position)) {
    const accented =
      accentPattern[position.pulseInBar] ?? position.pulseInBar === 0;
    if (!dropoutMuted) playClick(ctx, time, accented ? 'accent' : 'beat');
    publishPosition(time);
  } else {
    if (!dropoutMuted) playClick(ctx, time, 'sub');
  }

  // Current-note highlight: emit at play time so the notation cursor lands on
  // the note exactly when it sounds (ARCHITECTURE §Note index tracking).
  atPlayTime(time, () => {
    if (!useMetronomeStore.getState().isPlaying) return;
    emit({ type: 'note', barIndex: barIdx, noteIndexInBar: noteIdx });
  });
}

/** Schedule one lead-in count click at `time`. Counts are quarter-note pulses in
 *  the current meter, accented on each bar's downbeat ("1-2-3-4"), regardless of
 *  the exercise's subdivision (SPEC §7). Reps don't advance; the beat indicator
 *  still pulses and the count display updates. */
function scheduleLeadInTick(time: number): void {
  const ctx = getAudioContext();
  const { pulsesPerBar } = getBeatGrouping(
    useMetronomeStore.getState().timeSignature,
  );
  const indexInBar = leadInDone % pulsesPerBar;
  const accented = indexInBar === 0;
  playClick(ctx, time, accented ? 'accent' : 'beat');

  const count = indexInBar + 1;
  atPlayTime(time, () => {
    if (!useMetronomeStore.getState().isPlaying) return;
    useMetronomeStore
      .getState()
      .setCountIn({ current: count, total: pulsesPerBar });
    useMetronomeStore.getState().setPosition(indexInBar, 0);
  });
}

/** Advance `position` and `nextNoteTime` by one main-phase subdivision, reading
 *  the latest BPM / subdivision / time signature so live changes apply. */
function advanceMain(): void {
  const { bpm, subdivision, timeSignature } = useMetronomeStore.getState();
  const { pulsesPerBar, isCompound } = getBeatGrouping(timeSignature);
  const subsPerPulse = subdivisionsPerPulse(
    subdivision,
    isCompound,
    timeSignature.denominator,
  );

  nextNoteTime += 60 / bpm / subsPerPulse;
  position = advancePosition(position, subsPerPulse, pulsesPerBar);
}

/** Finish the session at `time`: play the completion chime instead of a click,
 *  halt scheduling immediately, then at play time flip the store to stopped and
 *  emit `complete` so the transport layer can auto-advance (SPEC §7). */
function finishAt(time: number): void {
  const ctx = getAudioContext();
  playCompletion(ctx, time);

  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }

  atPlayTime(time, () => {
    useMetronomeStore.getState().setPlaying(false);
    emit({ type: 'complete' });
  });
}

/** Process the tick currently described by `nextNoteTime` (and, in the main
 *  phase, `position`). Returns false when the session has finished and the loop
 *  should stop. */
function processTick(): boolean {
  // Lead-in phase: count pulses at the BPM until the count is exhausted.
  if (leadInDone < leadInTotal) {
    scheduleLeadInTick(nextNoteTime);
    leadInDone += 1;
    nextNoteTime += 60 / useMetronomeStore.getState().bpm;
    return true;
  }

  // First main tick after a lead-in: clear the count display at this downbeat.
  if (leadInActive) {
    leadInActive = false;
    const at = nextNoteTime;
    atPlayTime(at, () => useMetronomeStore.getState().setCountIn(null));
  }

  const { autoStop, barsPerRep, targetReps } = useMetronomeStore.getState();
  if (
    autoStop &&
    isDownbeat(position) &&
    isTargetReached(position.barCount, barsPerRep, targetReps)
  ) {
    finishAt(nextNoteTime);
    return false;
  }

  scheduleMainTick(nextNoteTime);
  advanceMain();
  return true;
}

/** The lookahead loop: schedule everything that falls due in the next window. */
function loop(): void {
  const ctx = getAudioContext();
  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
    if (!processTick()) return;
  }
}

/** Start playback. MUST be called from a user gesture (e.g. a click handler)
 *  so the browser allows the AudioContext to run. `leadInBars` prepends a count
 *  of that many bars (pre-roll or count-in) before the exercise begins. */
export async function startMetronome(opts?: {
  leadInBars?: number;
}): Promise<void> {
  if (timerId !== null) return; // already running

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  position = INITIAL_POSITION;
  resetDropout();

  const leadInBars = opts?.leadInBars ?? 0;
  if (leadInBars > 0) {
    const { pulsesPerBar } = getBeatGrouping(
      useMetronomeStore.getState().timeSignature,
    );
    leadInTotal = pulsesPerBar * leadInBars;
    leadInDone = 0;
    leadInActive = true;
  } else {
    leadInTotal = 0;
    leadInDone = 0;
    leadInActive = false;
  }

  nextNoteTime = ctx.currentTime + START_DELAY_SEC;

  useMetronomeStore.getState().setPlaying(true);
  emit({ type: 'start' });
  if (leadInTotal > 0) {
    // Show the count immediately so the rep counter doesn't flash before the
    // first count click (which lands ~START_DELAY_SEC later).
    const { pulsesPerBar } = getBeatGrouping(
      useMetronomeStore.getState().timeSignature,
    );
    useMetronomeStore
      .getState()
      .setCountIn({ current: 1, total: pulsesPerBar });
  }

  loop(); // schedule the first window immediately
  timerId = window.setInterval(loop, LOOKAHEAD_MS);
}

/** Skip the remaining lead-in: begin the exercise on the next pulse (SPEC §7).
 *  No-op outside a lead-in. */
export function skipLeadIn(): void {
  if (timerId === null || leadInTotal === 0 || leadInDone >= leadInTotal) {
    return;
  }
  leadInTotal = 0;
  leadInDone = 0;
  leadInActive = true; // the next main tick clears the count display
  position = INITIAL_POSITION;
  resetDropout();
}

/** True while a lead-in (pre-roll / count-in) is sounding. */
export function isLeadingIn(): boolean {
  return timerId !== null && leadInDone < leadInTotal;
}

/** Stop playback. Clicks already scheduled within the lookahead window may
 *  still sound (≤100ms) — acceptable per ARCHITECTURE.md. */
export function stopMetronome(): void {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  leadInTotal = 0;
  leadInDone = 0;
  leadInActive = false;
  useMetronomeStore.getState().setPlaying(false);
  emit({ type: 'stop' });
}
