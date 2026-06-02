// Per-exercise progress (SPEC §7, ARCHITECTURE §progress.ts). Backed by the
// `exerciseProgress` Dexie table; updated incrementally as sessions finalize.
// The session log remains the source of truth; this is a derived, fast-lookup
// index that powers the selector's completion tiles.
//
// The merge logic is split out as pure helpers so it can be unit-tested without
// touching IndexedDB. The Zustand store caches the active set's progress as a
// Map<exerciseId, ExerciseProgress> for reactive UI lookups.

import { create } from 'zustand';
import { db } from '../db/schema';
import type { ExerciseProgress, Session } from '../types';

// --- Pure helpers (testable) -------------------------------------------------

/** Composite primary key for the exerciseProgress table. */
export const progressKey = (setId: string, exerciseId: string): string =>
  `${setId}:${exerciseId}`;

/** A session counts as "completing" the exercise iff it hit target reps at or
 *  above the set's default tempo (SPEC §7 completion definition). */
export function meetsCompletion(
  session: Pick<Session, 'repsCompleted' | 'targetReps' | 'endBpm'>,
  setDefaultBpm: number,
): boolean {
  return (
    session.repsCompleted >= session.targetReps &&
    session.endBpm >= setDefaultBpm
  );
}

/** Fold one session into an existing progress row (or build a fresh one when
 *  `existing` is null). Completion is monotonic — once true, stays true even if
 *  the new session is below threshold. */
export function applySession(
  existing: ExerciseProgress | null,
  session: Session,
  setDefaultBpm: number,
  now: number,
): ExerciseProgress | null {
  if (
    session.mode !== 'exercise' ||
    !session.exerciseSetId ||
    !session.exerciseId
  ) {
    return null;
  }
  const sessionMeets = meetsCompletion(session, setDefaultBpm);
  const wasCompleted = existing?.completed ?? false;

  return {
    id: progressKey(session.exerciseSetId, session.exerciseId),
    setId: session.exerciseSetId,
    exerciseId: session.exerciseId,
    completed: wasCompleted || sessionMeets,
    bestBpm: sessionMeets
      ? Math.max(existing?.bestBpm ?? 0, session.endBpm)
      : (existing?.bestBpm ?? null),
    totalReps: (existing?.totalReps ?? 0) + session.repsCompleted,
    totalSessions: (existing?.totalSessions ?? 0) + 1,
    firstCompletedAt: existing?.firstCompletedAt ?? (sessionMeets ? now : null),
    lastPracticedAt: now,
  };
}

// --- Dexie wrappers ----------------------------------------------------------

/** Fold one finalized session into the progress table (no-op for Free sessions
 *  and for exercise sessions missing setId/exerciseId). */
export async function recordSession(
  session: Session,
  setDefaultBpm: number,
): Promise<void> {
  if (
    session.mode !== 'exercise' ||
    !session.exerciseSetId ||
    !session.exerciseId
  ) {
    return;
  }
  const id = progressKey(session.exerciseSetId, session.exerciseId);
  const existing = (await db.exerciseProgress.get(id)) ?? null;
  const updated = applySession(existing, session, setDefaultBpm, Date.now());
  if (updated) await db.exerciseProgress.put(updated);
}

export async function getProgress(
  setId: string,
  exerciseId: string,
): Promise<ExerciseProgress | null> {
  return (
    (await db.exerciseProgress.get(progressKey(setId, exerciseId))) ?? null
  );
}

export async function getProgressForSet(
  setId: string,
): Promise<ExerciseProgress[]> {
  return db.exerciseProgress.where('setId').equals(setId).toArray();
}

/** Count of completed exercises in a set — used in the set-picker summary. */
export async function getCompletedCount(setId: string): Promise<number> {
  return db.exerciseProgress
    .where('setId')
    .equals(setId)
    .filter((p) => p.completed)
    .count();
}

/** Wipe all progress rows for one set; other sets are untouched (SPEC §7). */
export async function resetSetProgress(setId: string): Promise<void> {
  await db.exerciseProgress.where('setId').equals(setId).delete();
}

// --- Reactive cache ----------------------------------------------------------

interface ProgressState {
  /** Active set's progress keyed by exerciseId for O(1) selector lookups.
   *  Empty when no set is loaded yet. */
  bySet: Record<string, Record<string, ExerciseProgress>>;
  /** Load (or refresh) the cache for one set from Dexie. */
  loadSet: (setId: string) => Promise<void>;
  /** Persist a session and update the in-memory cache for live tile updates. */
  record: (session: Session, setDefaultBpm: number) => Promise<void>;
  /** Reset progress for a set (DB + cache). */
  reset: (setId: string) => Promise<void>;
  /** Manually mark one exercise as complete (SPEC §7 "Mark as completed").
   *  Sets `completed: true` and lifts `bestBpm` if the supplied bpm is higher.
   *  Does NOT increment totalReps / totalSessions — this isn't a real session. */
  markCompleted: (
    setId: string,
    exerciseId: string,
    bpm: number,
  ) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  bySet: {},

  loadSet: async (setId) => {
    const rows = await getProgressForSet(setId);
    const byId: Record<string, ExerciseProgress> = {};
    for (const row of rows) byId[row.exerciseId] = row;
    set((state) => ({ bySet: { ...state.bySet, [setId]: byId } }));
  },

  record: async (session, setDefaultBpm) => {
    await recordSession(session, setDefaultBpm);
    if (
      session.mode !== 'exercise' ||
      !session.exerciseSetId ||
      !session.exerciseId
    ) {
      return;
    }
    const setId = session.exerciseSetId;
    const exerciseId = session.exerciseId;
    const existing = get().bySet[setId]?.[exerciseId] ?? null;
    const updated = applySession(existing, session, setDefaultBpm, Date.now());
    if (!updated) return;
    set((state) => ({
      bySet: {
        ...state.bySet,
        [setId]: { ...(state.bySet[setId] ?? {}), [exerciseId]: updated },
      },
    }));
  },

  reset: async (setId) => {
    await resetSetProgress(setId);
    set((state) => ({ bySet: { ...state.bySet, [setId]: {} } }));
  },

  markCompleted: async (setId, exerciseId, bpm) => {
    const id = progressKey(setId, exerciseId);
    const existing = (await db.exerciseProgress.get(id)) ?? null;
    const now = Date.now();
    const updated: ExerciseProgress = {
      id,
      setId,
      exerciseId,
      completed: true,
      bestBpm: Math.max(existing?.bestBpm ?? 0, bpm),
      totalReps: existing?.totalReps ?? 0,
      totalSessions: existing?.totalSessions ?? 0,
      firstCompletedAt: existing?.firstCompletedAt ?? now,
      lastPracticedAt: now,
    };
    await db.exerciseProgress.put(updated);
    set((state) => ({
      bySet: {
        ...state.bySet,
        [setId]: { ...(state.bySet[setId] ?? {}), [exerciseId]: updated },
      },
    }));
  },
}));
