// Shared types for the metronome app.
// Later phases (dropout, ramp, sessions) will extend this file.

export type Denominator = 2 | 4 | 8;

export interface TimeSignature {
  numerator: number; // 2..13
  denominator: Denominator;
  /** Render the staff time-signature glyph as ₵ (cut) or C (common) instead of
   *  the numeric form. Only meaningful for 2/2 (cut) and 4/4 (common); ignored
   *  otherwise. SPEC §1. */
  displayAs?: 'cut' | 'common';
}

export type Subdivision =
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'eighthTriplet'
  | 'sixteenthTriplet';

/** Human-readable labels for the subdivision picker. */
export const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Quarter',
  eighth: '8th',
  sixteenth: '16th',
  eighthTriplet: '8th triplet',
  sixteenthTriplet: '16th triplet',
};

// Note: how many clicks a subdivision produces per felt pulse depends on the
// meter (simple vs compound) — see subdivisionsPerPulse() in meter.ts.

export const SUBDIVISION_ORDER: Subdivision[] = [
  'quarter',
  'eighth',
  'sixteenth',
  'eighthTriplet',
  'sixteenthTriplet',
];

/** Common time-signature quick-select presets (SPEC §1). The ₵ preset is 2/2
 *  with the cut-time display flag; numerically identical to 2/2 otherwise. */
export const TIME_SIGNATURE_PRESETS: TimeSignature[] = [
  { numerator: 2, denominator: 2, displayAs: 'cut' },
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
  { numerator: 5, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 7, denominator: 8 },
  { numerator: 9, denominator: 8 },
  { numerator: 12, denominator: 8 },
];

/** The on-screen label for a time-signature value (the glyph for cut/common,
 *  otherwise "n/d"). Used by the control-strip pill and any other reader. */
export function formatTimeSignature(ts: TimeSignature): string {
  if (ts.displayAs === 'cut') return '₵';
  if (ts.displayAs === 'common') return 'C';
  return `${ts.numerator}/${ts.denominator}`;
}

// --- Modes -------------------------------------------------------------------

/** Top-level app mode (SPEC §3). */
export type Mode = 'free' | 'exercise';

// --- Exercise data (SPEC §7) -------------------------------------------------

/** A single hand assignment. Rests are a separate PatternEvent, not a sticking. */
export type Sticking = 'R' | 'L';

/** One pattern event: a snare hit with a sticking, or a rest. Object-wrapped
 *  (rather than a bare "R" / "L" / "-") so Phase 10 can add voices, accents, and
 *  ornaments to the hit form without rewriting existing JSON (SPEC §7). */
export type PatternEvent = { sticking: Sticking } | 'rest';

/** A first-class section within a set, referenced by exercises via `sectionId`.
 *  Sections are objects (not free text on each exercise) so renaming or
 *  reordering them is a one-line change in the JSON (SPEC §7). */
export interface Section {
  id: string;
  title: string;
  /** Display order within the set (lowest first). */
  order: number;
  description?: string;
}

/** A single exercise. `pattern` is a 2D array: outer dimension is bars, inner
 *  is events within a bar. `pattern.length` is the bar count for one rep — all
 *  bars play in sequence to make one repetition (SPEC §7). All bars must have
 *  the same number of events (same time signature + subdivision). `subdivision`
 *  is already mapped to the internal Subdivision by the loader (the JSON uses
 *  human-friendly tokens like "16th"). */
export interface Exercise {
  id: string;
  number: number;
  name: string;
  /** Foreign key into the set's `sections` array (SPEC §7). */
  sectionId: string;
  pattern: PatternEvent[][];
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  recommendedBpm?: number;
  targetReps?: number;
  notes?: string;
}

/** A loaded, validated set of exercises (e.g. Stick Control). `schemaVersion`
 *  is fixed at 1 in v1; Phase 10 introduces v2 with a load-time migration. */
export interface ExerciseSet {
  id: string;
  title: string;
  source: string;
  defaultBpm: number;
  defaultTargetReps: number;
  schemaVersion: 1;
  /** Section structure for the selector. Each Exercise.sectionId must resolve
   *  to a Section.id in this array (validation enforces). */
  sections: Section[];
  exercises: Exercise[];
}

/** Whether a set ships with the app or was imported by the user from a JSON
 *  file (ARCHITECTURE §Exercise Data Loading). Drives the "User" badge in the
 *  selector and the export/delete affordances in Settings. */
export type SetOrigin = 'bundled' | 'user-imported';

/** A fully-loaded ExerciseSet tagged with its source. */
export type LoadedSet = ExerciseSet & { origin: SetOrigin };

/** Lightweight set descriptor used by the selector to avoid holding every set's
 *  full data in memory. Built from JSON discovery at startup (SPEC §7). */
export interface ExerciseSetSummary {
  id: string;
  title: string;
  exerciseCount: number;
  origin: SetOrigin;
}

/** Stored row in the `userSets` Dexie table: the imported set verbatim, plus
 *  the import timestamp used to order the Settings list (newest first). */
export interface UserSet {
  /** Matches `data.id`. */
  id: string;
  importedAt: number;
  data: ExerciseSet;
}

/** Per-set user state, persisted to localStorage as a Record keyed by setId so
 *  switching between sets restores each one's last position, tempo, and
 *  selector layout exactly as it was (SPEC §7 "Per-set state"). */
export interface SetState {
  setId: string;
  currentExerciseId: string;
  currentBpm: number;
  /** Which sections in this set are collapsed in the selector. */
  sectionsCollapsed: Record<string, boolean>;
}

/** Per-exercise derived progress, stored in the `exerciseProgress` Dexie table
 *  (one row per (setId, exerciseId) tuple). Updated incrementally as sessions
 *  finish — the session log is the source of truth, this is a fast-lookup index
 *  for the selector. Completion is monotonic (SPEC §7). */
export interface ExerciseProgress {
  /** Composite primary key: `${setId}:${exerciseId}`. */
  id: string;
  setId: string;
  exerciseId: string;
  /** True once a session hit target reps AT or ABOVE the set's defaultBpm
   *  (SPEC §7 completion definition); never flips back to false. */
  completed: boolean;
  /** Highest BPM at which a completed session was logged; null until the first
   *  completion. */
  bestBpm: number | null;
  /** Accumulated across all sessions for this exercise. */
  totalReps: number;
  totalSessions: number;
  firstCompletedAt: number | null;
  lastPracticedAt: number | null;
}

// --- Metronome config snapshot ----------------------------------------------

/** The metronome's configurable state, as a plain bundle. Used to push an
 *  exercise's settings into the live metronome and to snapshot/restore Free-mode
 *  settings across mode switches. */
export interface MetronomeConfig {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  barsPerRep: number;
  targetReps: number;
  accentPattern: boolean[];
}

// --- Dropout / ramp config (SPEC §5, §6) -------------------------------------
//
// Defined here so the session log can record them; the Free-mode UI and the
// scheduler behavior that produce these arrive in Phases 7 and 8. Until then,
// sessions always store `null` for both.

export type DropoutConfig =
  | { mode: 'scheduled'; barsOn: number; barsOff: number }
  | {
      mode: 'random';
      muteProbability: number; // 0..100 (%)
      maxConsecutiveMuted: number;
      minBarsBetween: number;
    };

export interface RampConfig {
  startBpm: number;
  endBpm: number;
  stepSize: number;
  trigger:
    | { type: 'reps'; everyN: number }
    | { type: 'seconds'; everyN: number };
  autoStopAtEnd: boolean;
}

// --- Session log (SPEC §4) ---------------------------------------------------

/** One practice session, auto-captured on Start and finalized on Stop /
 *  auto-stop / auto-advance. Persisted in IndexedDB; only saved when at least
 *  one rep was completed. `id` is assigned by Dexie on insert. */
export interface Session {
  id?: number;
  startTime: number; // unix ms
  endTime: number;
  durationSeconds: number;
  mode: Mode;

  // Free mode: optional user-entered label ("" → shown as "Untitled").
  exerciseName: string;

  // Exercise mode identity (absent for Free sessions).
  exerciseSetId?: string;
  exerciseId?: string;
  exerciseDisplayName?: string; // e.g. "#5 Paradiddle R"

  startBpm: number;
  endBpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  barsPerRep: number;
  targetReps: number;
  repsCompleted: number;
  dropoutConfig: DropoutConfig | null;
  rampConfig: RampConfig | null;
  completed: boolean; // true if the rep target was hit
  notes: string; // retrospective, edited from the log
}

/** The export/import file shape (SPEC §4). Wrapping the array in an object lets
 *  the format evolve without breaking older importers. */
export interface SessionExport {
  schemaVersion: 1;
  exportedAt: string; // ISO timestamp
  sessions: Session[];
}
