// Pattern-editor state (Phase 11). Holds the *draft* set being edited — a
// working copy that nothing else reads until the user saves — plus which
// exercise is open and whether there are unsaved changes. Persistence and the
// live registry are deliberately not touched here: the EditorSurface component
// commits a finished draft through the exercises store (which refreshes the
// registry). Keeping this store free of Dexie/IO makes the edit logic
// unit-testable.

import { create } from 'zustand';
import type {
  Exercise,
  ExerciseSet,
  Section,
  Subdivision,
  TimeSignature,
} from '../types';
import {
  blankExercise,
  blankSet,
  cycleOrnament,
  cycleStroke,
  eventsPerBar,
  nextId,
  resizePattern,
  toggleAccent,
  toggleGhost,
} from '../components/Editor/editorModel';

/** Bar-count bounds for the editor (one rep). */
export const EDITOR_BARS_MIN = 1;
export const EDITOR_BARS_MAX = 8;

interface EditorState {
  /** The set being edited, or null when the editor is closed. */
  draft: ExerciseSet | null;
  /** Which exercise within the draft the grid is editing. */
  activeExerciseId: string | null;
  /** True once any edit has been made since open/save. */
  dirty: boolean;

  /** Open an existing set for editing (the caller passes a copy). */
  open: (draft: ExerciseSet, exerciseId?: string) => void;
  /** Open a fresh blank set under the given (already-unique) id. */
  openNew: (id: string) => void;
  /** Close the editor and discard the in-memory draft. */
  close: () => void;
  /** Mark the draft saved (clears the dirty flag). */
  markClean: () => void;

  setActiveExercise: (id: string) => void;

  // Set metadata.
  setTitle: (title: string) => void;
  setSource: (source: string) => void;
  setDefaultBpm: (bpm: number) => void;
  setDefaultTargetReps: (reps: number) => void;

  // Sections.
  addSection: () => void;
  renameSection: (id: string, title: string) => void;
  deleteSection: (id: string) => void;
  moveSection: (id: string, dir: -1 | 1) => void;

  // Exercises.
  addExercise: (sectionId?: string) => void;
  deleteExercise: (id: string) => void;
  moveExercise: (id: string, dir: -1 | 1) => void;
  updateExerciseMeta: (partial: Partial<Exercise>) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  setBarCount: (bars: number) => void;

  // Per-cell pattern edits at (bar, position) of the active exercise.
  cellStroke: (bar: number, pos: number) => void;
  cellAccent: (bar: number, pos: number) => void;
  cellGhost: (bar: number, pos: number) => void;
  cellOrnament: (bar: number, pos: number) => void;
}

/** Patch the draft via `fn`, flag dirty. No-op when nothing is open. */
function patchDraft(
  state: EditorState,
  fn: (set: ExerciseSet) => ExerciseSet,
): Partial<EditorState> {
  if (!state.draft) return {};
  return { draft: fn(state.draft), dirty: true };
}

/** Apply `fn` to the active exercise within the draft (patch + dirty). */
function withActiveExercise(
  state: EditorState,
  fn: (ex: Exercise) => Exercise,
): Partial<EditorState> {
  if (!state.draft || !state.activeExerciseId) return {};
  const exercises = state.draft.exercises.map((e) =>
    e.id === state.activeExerciseId ? fn(e) : e,
  );
  return { draft: { ...state.draft, exercises }, dirty: true };
}

/** Replace the event at (bar, pos) in an exercise's pattern via `op`. */
function editCell(
  ex: Exercise,
  bar: number,
  pos: number,
  op: (ev: Exercise['pattern'][number][number]) => Exercise['pattern'][number][number],
): Exercise {
  return {
    ...ex,
    pattern: ex.pattern.map((b, bi) =>
      bi === bar ? b.map((ev, pi) => (pi === pos ? op(ev) : ev)) : b,
    ),
  };
}

/** Swap the item with id `id` and its neighbor in direction `dir` (-1 up, 1
 *  down). Returns the array unchanged if the move would fall off either end. */
function moveById<T extends { id: string }>(items: T[], id: string, dir: -1 | 1): T[] {
  const i = items.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return items;
  const next = items.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export const useEditorStore = create<EditorState>((set) => ({
  draft: null,
  activeExerciseId: null,
  dirty: false,

  open: (draft, exerciseId) =>
    set({
      draft,
      activeExerciseId: exerciseId ?? draft.exercises[0]?.id ?? null,
      dirty: false,
    }),

  openNew: (id) => {
    const draft = blankSet(id);
    set({ draft, activeExerciseId: draft.exercises[0]?.id ?? null, dirty: false });
  },

  close: () => set({ draft: null, activeExerciseId: null, dirty: false }),

  markClean: () => set({ dirty: false }),

  setActiveExercise: (id) => set({ activeExerciseId: id }),

  // --- Set metadata ---------------------------------------------------------

  setTitle: (title) => set((s) => patchDraft(s, (d) => ({ ...d, title }))),
  setSource: (source) => set((s) => patchDraft(s, (d) => ({ ...d, source }))),
  setDefaultBpm: (bpm) => set((s) => patchDraft(s, (d) => ({ ...d, defaultBpm: bpm }))),
  setDefaultTargetReps: (reps) =>
    set((s) => patchDraft(s, (d) => ({ ...d, defaultTargetReps: reps }))),

  // --- Sections -------------------------------------------------------------

  addSection: () =>
    set((s) =>
      patchDraft(s, (d) => {
        const id = nextId('section', d.sections);
        const order = d.sections.reduce((m, x) => Math.max(m, x.order), 0) + 1;
        const section: Section = { id, title: `Section ${d.sections.length + 1}`, order };
        return { ...d, sections: [...d.sections, section] };
      }),
    ),

  renameSection: (id, title) =>
    set((s) =>
      patchDraft(s, (d) => ({
        ...d,
        sections: d.sections.map((sec) => (sec.id === id ? { ...sec, title } : sec)),
      })),
    ),

  deleteSection: (id) =>
    set((s) =>
      patchDraft(s, (d) => {
        // Guarded in the UI (can't delete the last section or one with
        // exercises); double-check here so the store never corrupts the draft.
        if (d.sections.length <= 1) return d;
        if (d.exercises.some((e) => e.sectionId === id)) return d;
        return { ...d, sections: d.sections.filter((sec) => sec.id !== id) };
      }),
    ),

  moveSection: (id, dir) =>
    set((s) =>
      patchDraft(s, (d) => ({
        ...d,
        // Renumber `order` to match the new array order (the Library/selector
        // sort sections by `order`).
        sections: moveById(d.sections, id, dir).map((sec, i) => ({ ...sec, order: i + 1 })),
      })),
    ),

  // --- Exercises ------------------------------------------------------------

  addExercise: (sectionId) =>
    set((s) => {
      if (!s.draft) return {};
      const d = s.draft;
      const id = nextId('exercise', d.exercises);
      const number = d.exercises.reduce((m, x) => Math.max(m, x.number), 0) + 1;
      const targetSection = sectionId ?? d.sections[0]?.id ?? 'section-1';
      const exercise = blankExercise(id, number, targetSection);
      return {
        draft: { ...d, exercises: [...d.exercises, exercise] },
        activeExerciseId: id,
        dirty: true,
      };
    }),

  deleteExercise: (id) =>
    set((s) => {
      if (!s.draft || s.draft.exercises.length <= 1) return {};
      const exercises = s.draft.exercises.filter((e) => e.id !== id);
      const activeExerciseId =
        s.activeExerciseId === id ? (exercises[0]?.id ?? null) : s.activeExerciseId;
      return { draft: { ...s.draft, exercises }, activeExerciseId, dirty: true };
    }),

  moveExercise: (id, dir) =>
    set((s) => patchDraft(s, (d) => ({ ...d, exercises: moveById(d.exercises, id, dir) }))),

  updateExerciseMeta: (partial) =>
    set((s) => withActiveExercise(s, (ex) => ({ ...ex, ...partial }))),

  setTimeSignature: (ts) =>
    set((s) =>
      withActiveExercise(s, (ex) => ({
        ...ex,
        timeSignature: ts,
        pattern: resizePattern(
          ex.pattern,
          ex.pattern.length,
          eventsPerBar(ts, ex.subdivision),
        ),
      })),
    ),

  setSubdivision: (subdivision) =>
    set((s) =>
      withActiveExercise(s, (ex) => ({
        ...ex,
        subdivision,
        pattern: resizePattern(
          ex.pattern,
          ex.pattern.length,
          eventsPerBar(ex.timeSignature, subdivision),
        ),
      })),
    ),

  setBarCount: (bars) =>
    set((s) =>
      withActiveExercise(s, (ex) => ({
        ...ex,
        pattern: resizePattern(
          ex.pattern,
          bars,
          eventsPerBar(ex.timeSignature, ex.subdivision),
        ),
      })),
    ),

  cellStroke: (bar, pos) =>
    set((s) => withActiveExercise(s, (ex) => editCell(ex, bar, pos, cycleStroke))),
  cellAccent: (bar, pos) =>
    set((s) => withActiveExercise(s, (ex) => editCell(ex, bar, pos, toggleAccent))),
  cellGhost: (bar, pos) =>
    set((s) => withActiveExercise(s, (ex) => editCell(ex, bar, pos, toggleGhost))),
  cellOrnament: (bar, pos) =>
    set((s) => withActiveExercise(s, (ex) => editCell(ex, bar, pos, cycleOrnament))),
}));
