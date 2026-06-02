// Session log state (SPEC §4). A Zustand store holds the loaded sessions for the
// UI and wraps the Dexie persistence in db/schema.ts; the pure stats / filter
// helpers are exported separately and unit-tested (no IndexedDB needed).

import { create } from 'zustand';
import { db } from '../db/schema';
import type { ExerciseSet, Mode, Session, SessionExport } from '../types';

export const SESSION_EXPORT_SCHEMA_VERSION = 1;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NAG_MIN_UNEXPORTED = 20;

// --- Pure helpers (testable) -------------------------------------------------

export interface SessionFilter {
  mode: Mode | 'all';
  /** Case-insensitive substring matched against the session's display name. */
  query: string;
  /** Inclusive unix-ms bounds, or null for unbounded. */
  from: number | null;
  to: number | null;
}

export const EMPTY_FILTER: SessionFilter = {
  mode: 'all',
  query: '',
  from: null,
  to: null,
};

/** The human label for a session in the list (used for display and filtering). */
export function sessionLabel(session: Session): string {
  if (session.mode === 'exercise') {
    return session.exerciseDisplayName ?? session.exerciseId ?? 'Exercise';
  }
  return session.exerciseName.trim() || 'Untitled';
}

export function filterSessions(
  sessions: Session[],
  filter: SessionFilter,
): Session[] {
  const q = filter.query.trim().toLowerCase();
  return sessions.filter((s) => {
    if (filter.mode !== 'all' && s.mode !== filter.mode) return false;
    if (q && !sessionLabel(s).toLowerCase().includes(q)) return false;
    if (filter.from !== null && s.startTime < filter.from) return false;
    if (filter.to !== null && s.startTime > filter.to) return false;
    return true;
  });
}

/** Start of the current week (Monday 00:00 local) as unix ms. */
export function startOfWeek(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysSinceMonday = (d.getDay() + 6) % 7; // getDay: 0=Sun..6=Sat
  d.setDate(d.getDate() - daysSinceMonday);
  return d.getTime();
}

export interface SessionStats {
  weekSeconds: number;
  weekCount: number;
  /** Best BPM per completed exercise in the active set, in set order. */
  exerciseBests: { label: string; bpm: number }[];
  /** Best BPM per named Free-mode session, top 5 by BPM. */
  freeBests: { label: string; bpm: number }[];
}

export function computeStats(
  sessions: Session[],
  activeSet: ExerciseSet | null,
  now: number,
): SessionStats {
  const weekStart = startOfWeek(now);
  const weekSessions = sessions.filter((s) => s.startTime >= weekStart);

  // Best BPM per active-set exercise (completed sessions only), in set order.
  const exerciseBests: SessionStats['exerciseBests'] = [];
  if (activeSet) {
    for (const ex of activeSet.exercises) {
      let best = 0;
      for (const s of sessions) {
        if (s.completed && s.exerciseId === ex.id && s.endBpm > best) {
          best = s.endBpm;
        }
      }
      if (best > 0)
        exerciseBests.push({ label: `#${ex.number} ${ex.name}`, bpm: best });
    }
  }

  // Best BPM per named Free-mode label, top 5.
  const freeByName = new Map<string, number>();
  for (const s of sessions) {
    if (s.mode !== 'free') continue;
    const name = s.exerciseName.trim();
    if (!name) continue;
    freeByName.set(name, Math.max(freeByName.get(name) ?? 0, s.endBpm));
  }
  const freeBests = [...freeByName.entries()]
    .map(([label, bpm]) => ({ label, bpm }))
    .sort((a, b) => b.bpm - a.bpm)
    .slice(0, 5);

  return {
    weekSeconds: weekSessions.reduce((sum, s) => sum + s.durationSeconds, 0),
    weekCount: weekSessions.length,
    exerciseBests,
    freeBests,
  };
}

/** The wrapped export payload (SPEC §4): an object, not a bare array, so the
 *  format can evolve without breaking older importers. */
export function buildSessionExport(sessions: Session[]): SessionExport {
  return {
    schemaVersion: SESSION_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sessions,
  };
}

/** Pretty-printed JSON for the export file. */
export function sessionsToJson(sessions: Session[]): string {
  return JSON.stringify(buildSessionExport(sessions), null, 2);
}

/** Download all sessions as a JSON file and record the export time (so the
 *  backup reminder resets). DOM side effect; call only in the browser. */
export function downloadSessions(sessions: Session[]): void {
  const blob = new Blob([sessionsToJson(sessions)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `metronome-sessions-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setLastExportAt(Date.now());
}

// --- Import ------------------------------------------------------------------

export type ImportParse =
  | { ok: true; sessions: Session[] }
  | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A session entry is well-formed enough to import. We don't re-validate every
 *  nested field exhaustively, but we require the identity/sort fields the log
 *  and dedupe depend on. The `id` is intentionally ignored (reassigned on add). */
function isImportableSession(v: unknown): v is Session {
  if (!isObject(v)) return false;
  return (
    typeof v.startTime === 'number' &&
    typeof v.endTime === 'number' &&
    (v.mode === 'free' || v.mode === 'exercise') &&
    typeof v.repsCompleted === 'number'
  );
}

/** Validate a parsed export file (SPEC §4): a `{ schemaVersion, sessions }`
 *  object whose entries are importable sessions. Returns a clear reason on
 *  failure rather than throwing. */
export function parseSessionImport(raw: unknown): ImportParse {
  if (!isObject(raw)) {
    return { ok: false, error: 'File is not a valid sessions export object.' };
  }
  if (raw.schemaVersion !== SESSION_EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schemaVersion (expected ${SESSION_EXPORT_SCHEMA_VERSION}).`,
    };
  }
  if (!Array.isArray(raw.sessions)) {
    return { ok: false, error: 'Missing a "sessions" array.' };
  }
  const bad = raw.sessions.findIndex((s) => !isImportableSession(s));
  if (bad !== -1) {
    return { ok: false, error: `sessions[${bad}] is not a valid session.` };
  }
  return { ok: true, sessions: raw.sessions as Session[] };
}

/** Identity for duplicate detection: same start, mode, and exercise. */
const dedupeKey = (s: Session): string =>
  `${s.startTime}|${s.mode}|${s.exerciseId ?? ''}`;

/** Split imported sessions into those new relative to `existing` (and to each
 *  other) and a count of skipped duplicates (SPEC §4 merge strategy). */
export function dedupeImport(
  existing: Session[],
  imported: Session[],
): { toAdd: Session[]; skipped: number } {
  const seen = new Set(existing.map(dedupeKey));
  const toAdd: Session[] = [];
  let skipped = 0;
  for (const s of imported) {
    const key = dedupeKey(s);
    if (seen.has(key)) {
      skipped += 1;
    } else {
      seen.add(key);
      toAdd.push(s);
    }
  }
  return { toAdd, skipped };
}

/** Drop the imported id so Dexie assigns a fresh auto-increment one. */
const withoutId = (s: Session): Session => {
  const { id: _id, ...rest } = s;
  void _id;
  return rest;
};

// --- Backup reminder (SPEC §4) -----------------------------------------------

const LAST_EXPORT_KEY = 'metronome-last-export-at';
const BACKUP_DISMISSED_KEY = 'metronome-backup-dismissed-at';

function readTimestamp(key: string): number | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const getLastExportAt = (): number | null =>
  readTimestamp(LAST_EXPORT_KEY);
export const setLastExportAt = (ms: number): void =>
  localStorage.setItem(LAST_EXPORT_KEY, String(ms));
export const getBackupDismissedAt = (): number | null =>
  readTimestamp(BACKUP_DISMISSED_KEY);
export const setBackupDismissedAt = (ms: number): void =>
  localStorage.setItem(BACKUP_DISMISSED_KEY, String(ms));

/** Sessions not covered by the last export (created after it, or all if never
 *  exported). */
export function unexportedCount(
  sessions: Session[],
  lastExportAt: number | null,
): number {
  if (lastExportAt === null) return sessions.length;
  return sessions.filter((s) => s.startTime > lastExportAt).length;
}

/** Whether to show the backup nag (SPEC §4, optional): more than 30 days since
 *  the last export and more than 20 unexported sessions, and not dismissed in
 *  the last 30 days. With no prior export, the oldest session's age stands in
 *  for "time since last backup" so brand-new users aren't nagged. */
export function shouldNagBackup(args: {
  sessions: Session[];
  lastExportAt: number | null;
  lastDismissedAt: number | null;
  now: number;
}): boolean {
  const { sessions, lastExportAt, lastDismissedAt, now } = args;
  if (lastDismissedAt !== null && now - lastDismissedAt < THIRTY_DAYS_MS) {
    return false;
  }
  if (unexportedCount(sessions, lastExportAt) <= NAG_MIN_UNEXPORTED)
    return false;

  if (lastExportAt !== null) return now - lastExportAt > THIRTY_DAYS_MS;
  // Never exported: nag only if data has been accumulating for over 30 days.
  const oldest = sessions.reduce(
    (min, s) => Math.min(min, s.startTime),
    Infinity,
  );
  return oldest !== Infinity && now - oldest > THIRTY_DAYS_MS;
}

// --- Store (wraps Dexie) -----------------------------------------------------

const byNewest = (a: Session, b: Session): number => b.startTime - a.startTime;

interface SessionStore {
  sessions: Session[];
  loaded: boolean;
  /** Load all sessions from IndexedDB (most recent first). */
  load: () => Promise<void>;
  /** Persist a finalized session and prepend it to the in-memory list. */
  saveSession: (session: Session) => Promise<void>;
  remove: (id: number) => Promise<void>;
  updateNotes: (id: number, notes: string) => Promise<void>;
  /** Import sessions (SPEC §4). `replaceAll` wipes existing first; otherwise new
   *  sessions are added and duplicates skipped. Returns the merge summary. */
  importSessions: (
    sessions: Session[],
    replaceAll: boolean,
  ) => Promise<{ added: number; skipped: number }>;
}

// --- Per-set queries (selector "Recents" row + per-exercise history) --------

/** All sessions for one (setId, exerciseId) tuple, most recent first. Uses the
 *  `exerciseSetId` index and filters `exerciseId` in JS — that's plenty fast
 *  for personal-use volumes (a method book is rarely more than a few thousand
 *  rows total). */
export async function getSessionsByExercise(
  setId: string,
  exerciseId: string,
): Promise<Session[]> {
  const rows = await db.sessions
    .where('exerciseSetId')
    .equals(setId)
    .and((s) => s.exerciseId === exerciseId)
    .toArray();
  rows.sort(byNewest);
  return rows;
}

/** Up to `limit` most-recently-practiced exercise ids within a set, newest
 *  first, de-duplicated. Powers the selector's "Recents" tile row. */
export async function getRecentExercisesForSet(
  setId: string,
  limit: number,
): Promise<{ exerciseId: string; lastPracticedAt: number }[]> {
  const rows = await db.sessions.where('exerciseSetId').equals(setId).toArray();
  rows.sort(byNewest);
  const seen = new Set<string>();
  const out: { exerciseId: string; lastPracticedAt: number }[] = [];
  for (const s of rows) {
    if (!s.exerciseId || seen.has(s.exerciseId)) continue;
    seen.add(s.exerciseId);
    out.push({ exerciseId: s.exerciseId, lastPracticedAt: s.startTime });
    if (out.length >= limit) break;
  }
  return out;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  loaded: false,

  load: async () => {
    const sessions = await db.sessions.toArray();
    sessions.sort(byNewest);
    set({ sessions, loaded: true });
  },

  saveSession: async (session) => {
    const id = await db.sessions.add(session);
    set((state) => ({
      sessions: [{ ...session, id }, ...state.sessions].sort(byNewest),
    }));
  },

  remove: async (id) => {
    await db.sessions.delete(id);
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) }));
  },

  updateNotes: async (id, notes) => {
    await db.sessions.update(id, { notes });
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, notes } : s)),
    }));
  },

  importSessions: async (imported, replaceAll) => {
    let summary: { added: number; skipped: number };
    if (replaceAll) {
      await db.sessions.clear();
      await db.sessions.bulkAdd(imported.map(withoutId));
      summary = { added: imported.length, skipped: 0 };
    } else {
      const existing = await db.sessions.toArray();
      const { toAdd, skipped } = dedupeImport(existing, imported);
      await db.sessions.bulkAdd(toAdd.map(withoutId));
      summary = { added: toAdd.length, skipped };
    }
    // Reload from IndexedDB so the list reflects the fresh auto-assigned ids.
    await get().load();
    return summary;
  },
}));
