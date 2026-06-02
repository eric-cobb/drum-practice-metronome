// Pure scheduling math: how the metronome's position advances and how reps
// derive from the bar count. Kept free of Web Audio and the store so the
// timing/rep logic can be unit-tested without a browser. The scheduler holds a
// single Position and steps it with advancePosition() once per subdivision.

/** Where the metronome is, counted in subdivision ticks. */
export interface Position {
  /** 0-indexed felt pulse within the current bar. */
  pulseInBar: number;
  /** 0-indexed subdivision tick within the current pulse. */
  subTickInPulse: number;
  /** Total completed bars since playback started (the current bar's index). */
  barCount: number;
}

export const INITIAL_POSITION: Position = {
  pulseInBar: 0,
  subTickInPulse: 0,
  barCount: 0,
};

/** Advance by one subdivision tick. `subsPerPulse` and `pulsesPerBar` come from
 *  the current subdivision and meter (see meter.ts); reading them per step lets
 *  live time-signature / subdivision changes take effect going forward. */
export function advancePosition(
  pos: Position,
  subsPerPulse: number,
  pulsesPerBar: number,
): Position {
  let { pulseInBar, subTickInPulse, barCount } = pos;

  subTickInPulse += 1;
  if (subTickInPulse >= subsPerPulse) {
    subTickInPulse = 0;
    pulseInBar += 1;
    if (pulseInBar >= pulsesPerBar) {
      pulseInBar = 0;
      barCount += 1;
    }
  }

  return { pulseInBar, subTickInPulse, barCount };
}

/** True at the very start of a tick that begins a new pulse (a main beat). */
export function isMainBeat(pos: Position): boolean {
  return pos.subTickInPulse === 0;
}

/** True at the start of a bar's first pulse (the downbeat). */
export function isDownbeat(pos: Position): boolean {
  return pos.subTickInPulse === 0 && pos.pulseInBar === 0;
}

/** 0-indexed subdivision tick within the *bar* — the position's index into a
 *  one-bar pattern, used to drive the notation's current-note highlight
 *  (ARCHITECTURE §Current-note highlighting). For a 4/4 sixteenth exercise this
 *  runs 0..15 and resets each bar, so a multi-bar rep re-highlights the same
 *  notes. `subsPerPulse` comes from the subdivision/meter (see meter.ts). */
export function noteIndexInBar(pos: Position, subsPerPulse: number): number {
  return pos.pulseInBar * subsPerPulse + pos.subTickInPulse;
}

// --- Rep counting ------------------------------------------------------------
//
// A rep is `barsPerRep` bars. The rep counter increments every `barsPerRep`
// bars. `barCount` is the 0-indexed current bar, so full reps finished so far
// is floor(barCount / barsPerRep), and the rep being played (1-indexed) is one
// more than that.

const safeBarsPerRep = (barsPerRep: number): number => Math.max(1, barsPerRep);

/** Full reps completed by the start of `barCount`. 0 at the start of bar 0. */
export function repsCompleted(barCount: number, barsPerRep: number): number {
  return Math.floor(barCount / safeBarsPerRep(barsPerRep));
}

/** The rep currently being played, 1-indexed. 1 at the start of bar 0. */
export function currentRep(barCount: number, barsPerRep: number): number {
  return repsCompleted(barCount, barsPerRep) + 1;
}

/** True once `targetReps` full reps have been played — i.e. at the downbeat of
 *  bar `barsPerRep * targetReps`, the moment the session should auto-stop. */
export function isTargetReached(
  barCount: number,
  barsPerRep: number,
  targetReps: number,
): boolean {
  return repsCompleted(barCount, barsPerRep) >= targetReps;
}
