// Session auto-capture (SPEC §4). Hooks the scheduler's transport events so a
// session is recorded no matter how playback ends — Stop button, auto-stop,
// auto-advance, exercise navigation, or a mode switch — since every path funnels
// through the scheduler. Kept out of the stores (it orchestrates several), like
// transport.ts.
//
// Boundaries: 'start' begins a session (snapshotting config at that moment),
// 'stop' ends it (not completed), 'complete' ends it (target reached). A session
// is persisted only if at least one rep finished (SPEC §4).

import { useMetronomeStore } from '../state/metronome';
import { useModeStore } from '../state/mode';
import { useExerciseStore, selectCurrentExercise } from '../state/exercises';
import { useSessionStore } from '../state/sessions';
import { useProgressStore } from '../state/progress';
import { onSchedulerEvent } from './scheduler';
import type { Session } from '../types';

/** Everything fixed at the moment playback starts. */
type Pending = Omit<
  Session,
  | 'id'
  | 'endTime'
  | 'durationSeconds'
  | 'endBpm'
  | 'repsCompleted'
  | 'completed'
  | 'notes'
>;

let initialized = false;
let pending: Pending | null = null;
let maxRep = 0;
let unsubscribeReps: (() => void) | null = null;

function begin(): void {
  // Defensive: if a prior session somehow wasn't closed, finalize it first.
  if (pending) end(false);

  const m = useMetronomeStore.getState();
  const mode = useModeStore.getState().mode;

  const base: Pending = {
    startTime: Date.now(),
    mode,
    exerciseName: mode === 'free' ? m.freeSessionLabel : '',
    startBpm: m.bpm,
    timeSignature: m.timeSignature,
    subdivision: m.subdivision,
    barsPerRep: m.barsPerRep,
    targetReps: m.targetReps,
    // Dropout and ramp are Free-mode only (forced off in Exercise mode), so
    // these are null outside Free regardless (SPEC §5/§6).
    dropoutConfig: mode === 'free' ? m.dropout : null,
    rampConfig: mode === 'free' ? m.ramp : null,
  };

  if (mode === 'exercise') {
    const ex = useExerciseStore.getState();
    const exercise = selectCurrentExercise(ex);
    if (exercise && ex.loadedSet) {
      base.exerciseSetId = ex.loadedSet.id;
      base.exerciseId = exercise.id;
      base.exerciseDisplayName = `#${exercise.number} ${exercise.name}`;
    }
  }

  pending = base;
  maxRep = 0;
  unsubscribeReps = useMetronomeStore.subscribe((state) => {
    if (state.currentRep > maxRep) maxRep = state.currentRep;
  });
}

/** Drop the in-progress session without saving (Esc/discard, SPEC §9). */
function discardPending(): void {
  unsubscribeReps?.();
  unsubscribeReps = null;
  pending = null;
}

function end(completed: boolean): void {
  if (!pending) return;
  unsubscribeReps?.();
  unsubscribeReps = null;

  // A completed run finished all `maxRep` reps; an interrupted one leaves its
  // final (maxRep) rep in progress, so only maxRep-1 fully completed.
  const repsCompleted = completed ? maxRep : Math.max(0, maxRep - 1);
  const snapshot = pending;
  pending = null;

  if (repsCompleted < 1) return; // SPEC §4: only save real practice

  const endTime = Date.now();
  const session: Session = {
    ...snapshot,
    endTime,
    durationSeconds: Math.round((endTime - snapshot.startTime) / 1000),
    endBpm: useMetronomeStore.getState().bpm,
    repsCompleted,
    completed,
    notes: '',
  };
  void useSessionStore.getState().saveSession(session);

  // Update the progress table for exercise sessions (SPEC §7). The set's
  // defaultBpm is the completion threshold; if the set was unloaded between
  // begin/end (rare race), skip rather than recording with a wrong threshold.
  if (session.mode === 'exercise' && session.exerciseSetId) {
    const loadedSet = useExerciseStore.getState().loadedSet;
    if (loadedSet && loadedSet.id === session.exerciseSetId) {
      void useProgressStore.getState().record(session, loadedSet.defaultBpm);
    }
  }
}

/** Wire session capture to scheduler events. Call once on mount. */
export function initSessionRecorder(): void {
  if (initialized) return;
  initialized = true;
  onSchedulerEvent((event) => {
    if (event.type === 'start') begin();
    else if (event.type === 'complete') end(true);
    else if (event.type === 'stop') {
      if (event.discard) discardPending();
      else end(false);
    }
  });
}
