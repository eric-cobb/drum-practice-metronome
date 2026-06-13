// Exercise-set loading + validation (SPEC §7, ARCHITECTURE §Exercise Data
// Loading). Sets come from two sources: bundled JSON files in
// src/data/exercises/ (compiled at build time via `import.meta.glob`) and
// user-imported JSON stored in the Dexie `userSets` table. Both pass through
// the same hand-rolled validator. The user-imported set wins on id collision —
// the import flow normally prevents that, but the registry merge is defensive.
//
// Bundled sets ship with the public app; user-imported sets exist only in the
// user's browser. The `origin` tag is what drives the "User" badge in the
// selector and the export/delete affordances in Settings.

import { db } from '../db/schema';
import {
  FOOT_VOICES,
  type Denominator,
  type Exercise,
  type ExerciseSet,
  type Hit,
  type LoadedSet,
  type Ornament,
  type PatternEvent,
  type Section,
  type SetOrigin,
  type Sticking,
  type Subdivision,
  type TimeSignature,
  type Voice,
} from '../types';

export type LoadResult =
  | { ok: true; set: ExerciseSet }
  | { ok: false; error: string };

/** JSON authors subdivisions with human-friendly tokens; map them to the
 *  internal Subdivision. Keep this list in sync with the Subdivision type. */
const SUBDIVISION_TOKENS: Record<string, Subdivision> = {
  quarter: 'quarter',
  '8th': 'eighth',
  '16th': 'sixteenth',
  '8th triplet': 'eighthTriplet',
  '16th triplet': 'sixteenthTriplet',
};

const STICKINGS: readonly Sticking[] = ['R', 'L'];
const DENOMINATORS: readonly Denominator[] = [2, 4, 8];
const DISPLAY_AS: readonly ('cut' | 'common')[] = ['cut', 'common'];
const VOICES: readonly Voice[] = [
  'snare',
  'kick',
  'hihat-closed',
  'hihat-open',
  'hihat-foot',
  'ride',
  'ride-bell',
  'crash',
  'tom-high',
  'tom-mid',
  'tom-low',
];
const ORNAMENTS: readonly Ornament[] = ['flam', 'drag', 'ruff', 'buzz'];
/** Runtime sets are always v2; v1 files are migrated at load (SPEC §12). */
const RUNTIME_SCHEMA_VERSION = 2 as const;

/** Thrown internally to short-circuit validation with a located message. */
class ValidationError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${path} must be a non-empty string`);
  }
  return value;
}

function requireStringAllowEmpty(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${path} must be a string`);
  }
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${path} must be a number`);
  }
  return value;
}

function requireInt(value: unknown, path: string, min: number): number {
  const n = requireNumber(value, path);
  if (!Number.isInteger(n) || n < min) {
    throw new ValidationError(`${path} must be an integer ≥ ${min}`);
  }
  return n;
}

function parseTimeSignature(value: unknown, path: string): TimeSignature {
  if (!isObject(value)) {
    throw new ValidationError(`${path} must be an object`);
  }
  const numerator = requireInt(value.numerator, `${path}.numerator`, 1);
  const denominator = requireNumber(value.denominator, `${path}.denominator`);
  if (!DENOMINATORS.includes(denominator as Denominator)) {
    throw new ValidationError(`${path}.denominator must be 2, 4, or 8`);
  }
  const ts: TimeSignature = {
    numerator,
    denominator: denominator as Denominator,
  };
  if (value.displayAs !== undefined) {
    if (!DISPLAY_AS.includes(value.displayAs as 'cut' | 'common')) {
      throw new ValidationError(
        `${path}.displayAs must be "cut" or "common" (got ${JSON.stringify(value.displayAs)})`,
      );
    }
    ts.displayAs = value.displayAs as 'cut' | 'common';
  }
  return ts;
}

type EventParser = (value: unknown, path: string) => PatternEvent;

/** v1 event: a bare snare hit or rest. Migrated to a v2 Hit on the spot —
 *  { sticking } → { voices: ["snare"], sticking } (SPEC §12 migration). */
function parsePatternEventV1(value: unknown, path: string): PatternEvent {
  if (value === 'rest') return 'rest';
  if (isObject(value) && STICKINGS.includes(value.sticking as Sticking)) {
    return { voices: ['snare'], sticking: value.sticking as Sticking };
  }
  throw new ValidationError(
    `${path} must be "rest" or { "sticking": "R" | "L" } (got ${JSON.stringify(value)})`,
  );
}

/** v2 hit: one or more voices, optional sticking/accent/ghost/ornament. */
function parseHit(value: Record<string, unknown>, path: string): Hit {
  const raw = value.voices;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ValidationError(`${path}.voices must be a non-empty array`);
  }
  const voices = raw.map((v, i) => {
    if (!VOICES.includes(v as Voice)) {
      throw new ValidationError(
        `${path}.voices[${i}] must be a drum voice (got ${JSON.stringify(v)})`,
      );
    }
    return v as Voice;
  });
  const onlyFootVoices = voices.every((v) => FOOT_VOICES.includes(v));

  const hit: Hit = { voices };

  // Sticking is optional: meaningful for hand/rudiment work, omitted for grooves
  // where the limbs are fixed. Only forbidden when every voice is a foot voice
  // (a kick/hi-hat-foot can't carry a hand).
  if (value.sticking !== undefined) {
    if (!STICKINGS.includes(value.sticking as Sticking)) {
      throw new ValidationError(`${path}.sticking must be "R" or "L"`);
    }
    if (onlyFootVoices) {
      throw new ValidationError(
        `${path}.sticking is not allowed when every voice is a foot voice (${FOOT_VOICES.join(', ')})`,
      );
    }
    hit.sticking = value.sticking as Sticking;
  }

  if (value.accent !== undefined) {
    if (typeof value.accent !== 'boolean') {
      throw new ValidationError(`${path}.accent must be a boolean`);
    }
    hit.accent = value.accent;
  }
  if (value.ghost !== undefined) {
    if (typeof value.ghost !== 'boolean') {
      throw new ValidationError(`${path}.ghost must be a boolean`);
    }
    hit.ghost = value.ghost;
  }
  if (hit.accent && hit.ghost) {
    throw new ValidationError(`${path} cannot be both accent and ghost`);
  }
  if (value.ornament !== undefined) {
    if (!ORNAMENTS.includes(value.ornament as Ornament)) {
      throw new ValidationError(
        `${path}.ornament must be one of ${ORNAMENTS.join(', ')}`,
      );
    }
    hit.ornament = value.ornament as Ornament;
  }
  return hit;
}

function parsePatternEventV2(value: unknown, path: string): PatternEvent {
  if (value === 'rest') return 'rest';
  if (isObject(value)) return parseHit(value, path);
  throw new ValidationError(
    `${path} must be "rest" or a hit object (got ${JSON.stringify(value)})`,
  );
}

function parseBar(
  value: unknown,
  path: string,
  parseEvent: EventParser,
): PatternEvent[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`${path} must be a non-empty array`);
  }
  return value.map((event, i) => parseEvent(event, `${path}[${i}]`));
}

function parsePattern(
  value: unknown,
  path: string,
  parseEvent: EventParser,
): PatternEvent[][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`${path} must be a non-empty array of bars`);
  }
  const bars = value.map((bar, i) => parseBar(bar, `${path}[${i}]`, parseEvent));
  const firstLength = bars[0].length;
  const mismatch = bars.findIndex((bar) => bar.length !== firstLength);
  if (mismatch > 0) {
    throw new ValidationError(
      `${path}[${mismatch}] has ${bars[mismatch].length} events but ${path}[0] has ${firstLength}; all bars must have the same length`,
    );
  }
  return bars;
}

function parseSubdivision(value: unknown, path: string): Subdivision {
  if (typeof value !== 'string' || !(value in SUBDIVISION_TOKENS)) {
    const valid = Object.keys(SUBDIVISION_TOKENS)
      .map((t) => `"${t}"`)
      .join(', ');
    throw new ValidationError(
      `${path} must be one of ${valid} (got ${JSON.stringify(value)})`,
    );
  }
  return SUBDIVISION_TOKENS[value];
}

function parseSection(value: unknown, path: string): Section {
  if (!isObject(value)) {
    throw new ValidationError(`${path} must be an object`);
  }
  const section: Section = {
    id: requireString(value.id, `${path}.id`),
    title: requireString(value.title, `${path}.title`),
    order: requireInt(value.order, `${path}.order`, 0),
  };
  if (value.description !== undefined) {
    section.description = requireStringAllowEmpty(
      value.description,
      `${path}.description`,
    );
  }
  return section;
}

function parseExercise(
  value: unknown,
  path: string,
  parseEvent: EventParser,
): Exercise {
  if (!isObject(value)) {
    throw new ValidationError(`${path} must be an object`);
  }
  const exercise: Exercise = {
    id: requireString(value.id, `${path}.id`),
    number: requireInt(value.number, `${path}.number`, 1),
    name: requireString(value.name, `${path}.name`),
    sectionId: requireString(value.sectionId, `${path}.sectionId`),
    pattern: parsePattern(value.pattern, `${path}.pattern`, parseEvent),
    timeSignature: parseTimeSignature(
      value.timeSignature,
      `${path}.timeSignature`,
    ),
    subdivision: parseSubdivision(value.subdivision, `${path}.subdivision`),
  };
  if (value.recommendedBpm !== undefined) {
    exercise.recommendedBpm = requireNumber(
      value.recommendedBpm,
      `${path}.recommendedBpm`,
    );
  }
  if (value.targetReps !== undefined) {
    exercise.targetReps = requireInt(value.targetReps, `${path}.targetReps`, 1);
  }
  if (value.notes !== undefined) {
    exercise.notes = requireStringAllowEmpty(value.notes, `${path}.notes`);
  }
  return exercise;
}

/** Validate arbitrary parsed JSON into a typed ExerciseSet. Returns either a
 *  successful set or a human-readable reason. Never throws. */
export function validateExerciseSet(raw: unknown): LoadResult {
  try {
    if (!isObject(raw)) {
      throw new ValidationError('exercise set must be an object');
    }
    // Accept v1 (single-voice snare) or v2 (multi-voice); v1 events are migrated
    // to v2 Hits by the chosen parser, so the result is always v2 (SPEC §12).
    const parseEvent: EventParser =
      raw.schemaVersion === 1
        ? parsePatternEventV1
        : raw.schemaVersion === 2
          ? parsePatternEventV2
          : (() => {
              throw new ValidationError(
                `schemaVersion must be 1 or 2 (got ${JSON.stringify(raw.schemaVersion)})`,
              );
            })();
    if (!Array.isArray(raw.sections) || raw.sections.length === 0) {
      throw new ValidationError('sections must be a non-empty array');
    }
    if (!Array.isArray(raw.exercises) || raw.exercises.length === 0) {
      throw new ValidationError('exercises must be a non-empty array');
    }
    const sections = raw.sections.map((s, i) =>
      parseSection(s, `sections[${i}]`),
    );
    const sectionIds = new Set<string>();
    for (let i = 0; i < sections.length; i += 1) {
      if (sectionIds.has(sections[i].id)) {
        throw new ValidationError(
          `sections[${i}].id "${sections[i].id}" is duplicated`,
        );
      }
      sectionIds.add(sections[i].id);
    }
    const exercises = raw.exercises.map((ex, i) =>
      parseExercise(ex, `exercises[${i}]`, parseEvent),
    );
    for (let i = 0; i < exercises.length; i += 1) {
      if (!sectionIds.has(exercises[i].sectionId)) {
        throw new ValidationError(
          `exercises[${i}].sectionId "${exercises[i].sectionId}" does not match any section in this set`,
        );
      }
    }
    const set: ExerciseSet = {
      id: requireString(raw.id, 'id'),
      title: requireString(raw.title, 'title'),
      source: requireStringAllowEmpty(raw.source, 'source'),
      defaultBpm: requireInt(raw.defaultBpm, 'defaultBpm', 1),
      defaultTargetReps: requireInt(
        raw.defaultTargetReps,
        'defaultTargetReps',
        1,
      ),
      schemaVersion: RUNTIME_SCHEMA_VERSION,
      sections,
      exercises,
    };
    return { ok: true, set };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}

// --- Bundled sets (sync, discovered at build time) --------------------------

export interface SetLoadError {
  path: string;
  error: string;
}

const bundledModules = import.meta.glob<{ default: unknown }>(
  './exercises/*.json',
  { eager: true },
);

function loadBundledSync(): {
  sets: LoadedSet[];
  errors: SetLoadError[];
} {
  const sets: LoadedSet[] = [];
  const errors: SetLoadError[] = [];
  for (const [path, mod] of Object.entries(bundledModules)) {
    const result = validateExerciseSet(mod.default);
    if (!result.ok) {
      errors.push({ path, error: result.error });
      continue;
    }
    sets.push({ ...result.set, origin: 'bundled' });
  }
  return { sets, errors };
}

const BUNDLED = loadBundledSync();

/** All validated bundled sets (sync, already resolved at module load). */
export function loadBundledSets(): LoadedSet[] {
  return BUNDLED.sets;
}

/** Path-keyed validation errors for bundled files that failed to load. */
export function getBundledErrors(): SetLoadError[] {
  return BUNDLED.errors;
}

/** The set of all bundled ids — used by the import flow to detect collisions
 *  against shipped content (which the user cannot overwrite). */
export function getBundledSetIds(): Set<string> {
  return new Set(BUNDLED.sets.map((s) => s.id));
}

// --- User-imported sets (async, from Dexie) ---------------------------------

/** Repair a user set loaded from IndexedDB that predates the v2 multi-voice
 *  schema (Phase 10). Such rows were stored verbatim in the v1 shape — pattern
 *  events `{ sticking }` with no `voices` — which the v2 renderer can't read
 *  (`event.voices is not iterable`). Re-runs the v1→v2 event migration directly
 *  on the already-internal stored shape (subdivision tokens are already mapped,
 *  so validateExerciseSet can't be reused). Returns the set unchanged when it's
 *  already v2 so callers can skip a needless re-write. */
export function migrateStoredSet(data: ExerciseSet): {
  set: ExerciseSet;
  changed: boolean;
} {
  let changed = data.schemaVersion !== 2;
  const migrateEvent = (ev: PatternEvent): PatternEvent => {
    if (ev === 'rest') return ev;
    const obj = ev as { voices?: unknown; sticking?: Sticking };
    if (Array.isArray(obj.voices)) return ev; // already a v2 hit
    changed = true;
    const hit: Hit = { voices: ['snare'] };
    if (obj.sticking) hit.sticking = obj.sticking;
    return hit;
  };
  const exercises = data.exercises.map((ex) => ({
    ...ex,
    pattern: ex.pattern.map((bar) => bar.map(migrateEvent)),
  }));
  if (!changed) return { set: data, changed: false };
  return { set: { ...data, schemaVersion: 2, exercises }, changed: true };
}

export async function loadUserSets(): Promise<LoadedSet[]> {
  const records = await db.userSets.toArray();
  const sets: LoadedSet[] = [];
  for (const r of records) {
    const { set, changed } = migrateStoredSet(r.data);
    // Persist the upgrade once so the repair is permanent (and the editor /
    // export see v2). importedAt is preserved so the Manage-sets order is stable.
    if (changed) {
      await db.userSets.put({ id: r.id, importedAt: r.importedAt, data: set });
    }
    sets.push({ ...set, origin: 'user-imported' as SetOrigin });
  }
  return sets;
}

/** Merge bundled + user-imported into a single registry. On id collision the
 *  user-imported set wins (defensive — the import flow normally prevents
 *  collisions but data corruption could leave one). */
export async function loadAllSets(): Promise<LoadedSet[]> {
  const [bundled, userImported] = await Promise.all([
    Promise.resolve(loadBundledSets()),
    loadUserSets(),
  ]);
  const byId = new Map<string, LoadedSet>();
  for (const set of bundled) byId.set(set.id, set);
  for (const set of userImported) byId.set(set.id, set);
  return Array.from(byId.values());
}

// --- User-set CRUD ----------------------------------------------------------

/** Suggest a fresh id by appending `-2`, `-3`, … to the base until it doesn't
 *  collide with any existing id (bundled or user). Used by the conflict UI. */
export function generateUniqueId(
  baseId: string,
  existing: Set<string>,
): string {
  let n = 2;
  while (existing.has(`${baseId}-${n}`)) n += 1;
  return `${baseId}-${n}`;
}

/** Outcome of an attempted import. `conflict` carries the parsed-but-not-saved
 *  set so the UI can resolve via Replace/KeepBoth without re-uploading. */
export type ImportResult =
  | { ok: true; set: ExerciseSet }
  | { ok: false; error: string }
  | {
      ok: false;
      conflict: {
        /** True if the id matches an already-imported user set. */
        existing: boolean;
        /** True if the id matches a bundled set (which can't be replaced). */
        bundled: boolean;
        suggestedNewId: string;
        /** The parsed but unsaved set, ready for Replace / KeepBoth to commit. */
        pendingSet: ExerciseSet;
      };
    };

/** Read + validate a JSON file and either save it directly or surface a
 *  conflict for the UI to resolve (ARCHITECTURE §Import flow). */
export async function importUserSet(file: File): Promise<ImportResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Could not read the file.' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not a valid JSON file.' };
  }
  const validated = validateExerciseSet(raw);
  if (!validated.ok) {
    return { ok: false, error: `Schema validation failed: ${validated.error}` };
  }
  const set = validated.set;

  const bundledIds = getBundledSetIds();
  const existing = await db.userSets.get(set.id);
  if (existing || bundledIds.has(set.id)) {
    const allIds = new Set<string>([
      ...bundledIds,
      ...(await db.userSets.toCollection().primaryKeys()),
    ]);
    return {
      ok: false,
      conflict: {
        existing: !!existing,
        bundled: bundledIds.has(set.id),
        suggestedNewId: generateUniqueId(set.id, allIds),
        pendingSet: set,
      },
    };
  }
  await saveUserSet(set);
  return { ok: true, set };
}

/** Commit a pending import that already passed validation. */
export async function saveUserSet(set: ExerciseSet): Promise<void> {
  await db.userSets.put({ id: set.id, importedAt: Date.now(), data: set });
}

/** Commit a pending import after the user chose "Replace existing". Disallowed
 *  for bundled ids — those are baked into the build and can't be overwritten. */
export async function replaceUserSet(set: ExerciseSet): Promise<LoadResult> {
  if (getBundledSetIds().has(set.id)) {
    return {
      ok: false,
      error: `"${set.id}" is a bundled set and cannot be replaced.`,
    };
  }
  await saveUserSet(set);
  return { ok: true, set };
}

/** Commit a pending import after the user chose "Keep both", under a renamed
 *  id. The set object is cloned with the new id so the original file is never
 *  mutated. */
export async function saveUserSetAs(
  set: ExerciseSet,
  newId: string,
): Promise<LoadResult> {
  if (!newId.trim()) {
    return { ok: false, error: 'New id cannot be empty.' };
  }
  const allIds = new Set<string>([
    ...getBundledSetIds(),
    ...(await db.userSets.toCollection().primaryKeys()),
  ]);
  if (allIds.has(newId)) {
    return { ok: false, error: `"${newId}" is already in use.` };
  }
  const renamed: ExerciseSet = { ...set, id: newId };
  await saveUserSet(renamed);
  return { ok: true, set: renamed };
}

/** Build a JSON Blob for downloading a user-imported set verbatim. */
export async function exportUserSet(setId: string): Promise<Blob> {
  const record = await db.userSets.get(setId);
  if (!record) {
    throw new Error(`No user-imported set with id "${setId}"`);
  }
  return new Blob([JSON.stringify(record.data, null, 2)], {
    type: 'application/json',
  });
}

/** Remove a user-imported set. Deliberately preserves the session log,
 *  exerciseProgress rows, and per-set localStorage state so re-importing the
 *  same id restores everything (ARCHITECTURE §Delete flow). */
export async function deleteUserSet(setId: string): Promise<void> {
  await db.userSets.delete(setId);
}
