// Pure helpers for the pattern editor (Phase 11). No React, no store — just the
// math that turns a time signature + subdivision into a grid, resizes patterns
// when those change, and the per-cell edit operations. Kept separate from the
// Zustand store so it's unit-testable in isolation (mirrors notationModel.ts).

import { getBeatGrouping, subdivisionsPerPulse } from '../../meter';
import type {
  Exercise,
  ExerciseSet,
  Hit,
  Ornament,
  PatternEvent,
  Subdivision,
  TimeSignature,
  Voice,
} from '../../types';

/** Canonical voice order, top of the drum staff to bottom — used to keep a
 *  hit's `voices` array and the editor's voice rows in a stable, notation-like
 *  order. */
export const VOICE_ORDER: readonly Voice[] = [
  'crash',
  'ride',
  'ride-bell',
  'hihat-open',
  'hihat-closed',
  'tom-high',
  'tom-mid',
  'tom-low',
  'snare',
  'kick',
  'hihat-foot',
];

/** Short labels for the editor's voice rows (the row-label column is narrow). */
export const VOICE_LABEL: Record<Voice, string> = {
  crash: 'Crash',
  ride: 'Ride',
  'ride-bell': 'Bell',
  'hihat-open': 'HH open',
  'hihat-closed': 'Hi-hat',
  'tom-high': 'Tom 1',
  'tom-mid': 'Tom 2',
  'tom-low': 'Floor',
  snare: 'Snare',
  kick: 'Kick',
  'hihat-foot': 'HH foot',
};

/** Sort voices into VOICE_ORDER so saved JSON and the grid stay canonical. */
export function orderVoices(voices: readonly Voice[]): Voice[] {
  return VOICE_ORDER.filter((v) => voices.includes(v));
}

/** Number of grid positions (note slots) in one bar for a meter + subdivision.
 *  pulsesPerBar × subdivisions-per-pulse (see meter.ts). */
export function eventsPerBar(
  ts: TimeSignature,
  subdivision: Subdivision,
): number {
  const { pulsesPerBar, isCompound } = getBeatGrouping(ts);
  return pulsesPerBar * subdivisionsPerPulse(subdivision, isCompound, ts.denominator);
}

/** Cycle order for the ornament cell: none → flam → drag → ruff → buzz → none. */
export const ORNAMENT_CYCLE: readonly (Ornament | undefined)[] = [
  undefined,
  'flam',
  'drag',
  'ruff',
  'buzz',
];

/** Build a clean Hit, omitting falsy/undefined optional fields so saved JSON
 *  stays minimal (and never carries `accent: false` etc.). Preserves the source
 *  event's voices (so editing an accent/ghost/ornament on a multi-voice hit like
 *  hi-hat+snare keeps every voice); defaults to a single snare voice only when
 *  none are supplied (a fresh hit created from a rest). */
function buildHit(p: Partial<Hit>): Hit {
  const h: Hit = {
    voices: p.voices && p.voices.length > 0 ? p.voices : ['snare'],
  };
  if (p.sticking) h.sticking = p.sticking;
  if (p.accent) h.accent = true;
  if (p.ghost) h.ghost = true;
  if (p.ornament) h.ornament = p.ornament;
  return h;
}

/** Truncate or right-pad (with rests) a bar's events to exactly `perBar`. */
export function resizeBar(events: PatternEvent[], perBar: number): PatternEvent[] {
  const next = events.slice(0, perBar);
  while (next.length < perBar) next.push('rest');
  return next;
}

/** Reshape a pattern to `barCount` bars of `perBar` events, preserving existing
 *  content where it overlaps and filling the rest with rests. */
export function resizePattern(
  pattern: PatternEvent[][],
  barCount: number,
  perBar: number,
): PatternEvent[][] {
  const bars: PatternEvent[][] = [];
  for (let i = 0; i < barCount; i += 1) bars.push(resizeBar(pattern[i] ?? [], perBar));
  return bars;
}

// --- Per-cell edit operations (return a new event) --------------------------

/** The Stroke row is the snare lane: it adds/cycles the snare voice's sticking
 *  while preserving any other voices in the hit. The snare-only cycle is the
 *  familiar rest → R → L → rest (the final step removes the snare, which on a
 *  snare-only hit empties it back to a rest). On a hit that has other voices, the
 *  R→L→(remove snare) steps keep those voices intact; adding the snare to a hit
 *  that lacks it starts at R. */
export function cycleStroke(ev: PatternEvent): PatternEvent {
  if (ev === 'rest') return buildHit({ voices: ['snare'], sticking: 'R' });

  if (!ev.voices.includes('snare')) {
    return buildHit({
      ...ev,
      voices: orderVoices([...ev.voices, 'snare']),
      sticking: 'R',
    });
  }
  if (ev.sticking === 'R') return buildHit({ ...ev, sticking: 'L' });
  if (ev.sticking === 'L') {
    const rest = ev.voices.filter((v) => v !== 'snare');
    if (rest.length === 0) return 'rest';
    return buildHit({ ...ev, voices: orderVoices(rest), sticking: undefined });
  }
  // Snare present but no sticking yet → start the hand cycle at R.
  return buildHit({ ...ev, sticking: 'R' });
}

/** Toggle a voice on/off at a position, preserving the other voices and the
 *  hit's modifiers. Adding to a rest creates a hit; removing the last voice
 *  empties the position back to a rest. Used by the per-voice grid rows. */
export function toggleVoice(ev: PatternEvent, voice: Voice): PatternEvent {
  if (ev === 'rest') return buildHit({ voices: [voice] });
  if (ev.voices.includes(voice)) {
    const rest = ev.voices.filter((v) => v !== voice);
    if (rest.length === 0) return 'rest';
    return buildHit({ ...ev, voices: orderVoices(rest) });
  }
  return buildHit({ ...ev, voices: orderVoices([...ev.voices, voice]) });
}

/** Toggle accent on a hit (no-op on a rest). Accent and ghost are mutually
 *  exclusive (SPEC §12 validation), so enabling one clears the other. */
export function toggleAccent(ev: PatternEvent): PatternEvent {
  if (ev === 'rest') return ev;
  const accent = !ev.accent;
  return buildHit({ ...ev, accent, ghost: accent ? false : ev.ghost });
}

/** Toggle ghost on a hit (no-op on a rest); clears accent when enabling. */
export function toggleGhost(ev: PatternEvent): PatternEvent {
  if (ev === 'rest') return ev;
  const ghost = !ev.ghost;
  return buildHit({ ...ev, ghost, accent: ghost ? false : ev.accent });
}

/** Cycle a hit's ornament through ORNAMENT_CYCLE (no-op on a rest). */
export function cycleOrnament(ev: PatternEvent): PatternEvent {
  if (ev === 'rest') return ev;
  const i = ORNAMENT_CYCLE.indexOf(ev.ornament);
  const next = ORNAMENT_CYCLE[(i + 1) % ORNAMENT_CYCLE.length];
  return buildHit({ ...ev, ornament: next });
}

// --- Blank-document factories -----------------------------------------------

/** A fresh single-bar exercise of all rests in 4/4 sixteenths. */
export function blankExercise(
  id: string,
  number: number,
  sectionId: string,
): Exercise {
  const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  const subdivision: Subdivision = 'sixteenth';
  return {
    id,
    number,
    name: `Exercise ${number}`,
    sectionId,
    timeSignature,
    subdivision,
    pattern: resizePattern([], 1, eventsPerBar(timeSignature, subdivision)),
  };
}

/** A fresh user set with one section and one blank exercise. */
export function blankSet(id: string): ExerciseSet {
  const sectionId = 'section-1';
  return {
    id,
    title: 'Untitled set',
    source: 'Created in the editor',
    defaultBpm: 80,
    defaultTargetReps: 16,
    schemaVersion: 2,
    sections: [{ id: sectionId, title: 'Section 1', order: 1 }],
    exercises: [blankExercise('exercise-1', 1, sectionId)],
  };
}

/** Smallest unused `${prefix}-N` id among `items` (N starts at 1). */
export function nextId(prefix: string, items: ReadonlyArray<{ id: string }>): string {
  const ids = new Set(items.map((i) => i.id));
  let n = 1;
  while (ids.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

/** Deep-clone a set under a new id, so editing a copy never mutates the
 *  registry's object (used by "Edit" and "Duplicate to edit"). The set is plain
 *  JSON data, so a JSON round-trip is a safe deep clone. */
export function cloneSetForEdit(set: ExerciseSet, newId: string): ExerciseSet {
  const clone = JSON.parse(JSON.stringify(set)) as ExerciseSet & {
    origin?: unknown;
  };
  // `origin` is a runtime tag on LoadedSet, not part of the persisted shape —
  // drop it so a duplicated bundled set doesn't carry/export origin: "bundled".
  delete clone.origin;
  return { ...clone, id: newId };
}

/** Structural validation for a draft before saving (the runtime-shape analogue
 *  of loadExerciseSet's validator, which only accepts the raw on-disk shape).
 *  Returns an error message, or null when the draft is sound. */
export function validateDraft(set: ExerciseSet): string | null {
  if (!set.title.trim()) return 'Give the set a title.';
  if (set.sections.length === 0) return 'Add at least one section.';
  if (set.exercises.length === 0) return 'Add at least one exercise.';

  const sectionIds = new Set(set.sections.map((s) => s.id));
  if (sectionIds.size !== set.sections.length) return 'Two sections share an id.';
  for (const s of set.sections) {
    if (!s.title.trim()) return 'Every section needs a name.';
  }

  const exerciseIds = new Set(set.exercises.map((e) => e.id));
  if (exerciseIds.size !== set.exercises.length) return 'Two exercises share an id.';
  for (const ex of set.exercises) {
    if (!ex.name.trim()) return `Exercise ${ex.number} needs a name.`;
    if (!sectionIds.has(ex.sectionId)) {
      return `"${ex.name}" isn't assigned to a section.`;
    }
    if (ex.pattern.length === 0) return `"${ex.name}" has no bars.`;
  }
  return null;
}
