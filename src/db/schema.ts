// IndexedDB schema for the session log + per-exercise progress (ARCHITECTURE
// §Persistence). Dexie wraps IndexedDB; session-domain logic lives in
// state/sessions.ts and progress logic in state/progress.ts. Those are the only
// modules that should touch `db` directly.
//
// v1: sessions only.
// v2: added `exerciseProgress` table (selector-fast progress lookup, SPEC §7)
//     and an `exerciseSetId` index on sessions so per-set queries can use it.

import Dexie, { type Table } from 'dexie';
import type { ExerciseProgress, Session, UserSet } from '../types';

class MetronomeDB extends Dexie {
  sessions!: Table<Session, number>;
  /** One row per (setId, exerciseId) tuple; key is `${setId}:${exerciseId}`. */
  exerciseProgress!: Table<ExerciseProgress, string>;
  /** User-imported exercise sets (ARCHITECTURE §Exercise Data Loading). The
   *  bundled sets live in `src/data/exercises/` and are loaded via Vite's glob
   *  import; this table is the runtime-imported half. */
  userSets!: Table<UserSet, string>;

  constructor() {
    super('MetronomeDB');
    this.version(1).stores({
      sessions: '++id, startTime, mode, exerciseId',
    });
    this.version(2).stores({
      sessions: '++id, startTime, mode, exerciseSetId, exerciseId',
      exerciseProgress: 'id, setId, completed, lastPracticedAt',
    });
    this.version(3).stores({
      sessions: '++id, startTime, mode, exerciseSetId, exerciseId',
      exerciseProgress: 'id, setId, completed, lastPracticedAt',
      userSets: 'id, importedAt',
    });
  }
}

export const db = new MetronomeDB();
