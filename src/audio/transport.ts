// Transport orchestration (Phase 5): the higher-level playback intents that
// combine the scheduler with the metronome / exercise / mode stores. Components
// call these instead of the raw scheduler so the pre-roll (SPEC §1) and
// count-in / auto-advance (SPEC §7) policy lives in one place. This module also
// owns the auto-advance controller, which reacts to the scheduler's `complete`
// event. Keeping it here (above the stores) preserves the scheduler's rule of
// importing only the metronome store.

import { useMetronomeStore } from '../state/metronome';
import { useExerciseStore, selectIsLastExercise } from '../state/exercises';
import { useModeStore } from '../state/mode';
import {
  onSchedulerEvent,
  startMetronome,
  stopMetronome,
  skipLeadIn,
} from './scheduler';

/** Pause after the completion chime before the next exercise loads (SPEC §7). */
const ADVANCE_PAUSE_MS = 1000;

let initialized = false;
let advanceTimer: number | null = null;

function cancelPendingAdvance(): void {
  if (advanceTimer !== null) {
    window.clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

/** Bars of lead-in for a between-exercise transition: the configured count-in,
 *  or 0 when count-in is disabled. */
function transitionLeadInBars(): number {
  const { countInEnabled, countInBars } = useExerciseStore.getState();
  return countInEnabled ? countInBars : 0;
}

/** Auto-advance after a session completes at target (SPEC §7). Only Exercise
 *  mode advances; in Free mode the completion just stops. */
function handleComplete(): void {
  if (useModeStore.getState().mode !== 'exercise') return;

  // Last exercise of the set: surface "Set complete" instead of advancing.
  if (selectIsLastExercise(useExerciseStore.getState())) {
    useExerciseStore.getState().markSetComplete();
    return;
  }

  advanceTimer = window.setTimeout(() => {
    advanceTimer = null;
    // Load the next exercise, preserving the live BPM so a tempo carries across
    // exercises; target reps resets to the next exercise's default.
    useExerciseStore.getState().nextExercise({ preserveBpm: true });
    if (useExerciseStore.getState().autoStartNext) {
      void startMetronome({ leadInBars: transitionLeadInBars() });
    }
    // Auto-start OFF: the next exercise is now loaded and rendered; the user
    // presses Start to begin (with pre-roll if enabled).
  }, ADVANCE_PAUSE_MS);
}

/** Wire the auto-advance controller to scheduler events. Call once on mount. */
export function initTransport(): void {
  if (initialized) return;
  initialized = true;
  onSchedulerEvent((event) => {
    if (event.type === 'complete') {
      handleComplete();
    } else if (event.type === 'stop') {
      // A manual stop during the post-completion pause cancels the advance.
      cancelPendingAdvance();
    }
  });
}

/** Start fresh from stopped (the Start button). Applies pre-roll if enabled,
 *  in both modes (SPEC §1). */
export function start(): void {
  cancelPendingAdvance();
  const leadInBars = useMetronomeStore.getState().preRollEnabled ? 1 : 0;
  void startMetronome({ leadInBars });
}

/** Stop playback (the Stop button). */
export function stop(): void {
  stopMetronome();
}

/** Stop and discard the in-progress session without saving (Esc, SPEC §9). */
export function discard(): void {
  cancelPendingAdvance();
  stopMetronome({ discard: true });
}

/** Skip the remaining lead-in count (the Skip button shown during count-in). */
export function skip(): void {
  skipLeadIn();
}

/** Move to another exercise (Prev/Next). While playing with count-in enabled,
 *  transition seamlessly: stop, load the next exercise preserving BPM, and
 *  restart behind a count-in. Otherwise stop and load fresh (resetting BPM to
 *  the exercise's recommended tempo). */
function navigate(direction: 'next' | 'previous'): void {
  cancelPendingAdvance();
  const playing = useMetronomeStore.getState().isPlaying;
  const { countInEnabled, countInBars } = useExerciseStore.getState();
  const move =
    direction === 'next'
      ? useExerciseStore.getState().nextExercise
      : useExerciseStore.getState().previousExercise;

  if (playing && countInEnabled) {
    stopMetronome();
    move({ preserveBpm: true });
    void startMetronome({ leadInBars: countInBars });
  } else {
    stopMetronome();
    move();
  }
}

export function goToNext(): void {
  navigate('next');
}

export function goToPrevious(): void {
  navigate('previous');
}

/** Reset progress to the first exercise (the confirm lives in the UI). */
export function resetProgress(): void {
  cancelPendingAdvance();
  stopMetronome();
  useExerciseStore.getState().resetProgress();
}

/** Switch to a different exercise set (SPEC §7). Stops the metronome first so
 *  any in-progress session for the outgoing set is saved by the recorder, then
 *  hands off to the exercises store's `loadSet`. */
export function switchSet(setId: string): void {
  cancelPendingAdvance();
  stopMetronome();
  useExerciseStore.getState().loadSet(setId);
}
