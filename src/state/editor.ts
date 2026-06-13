// Pattern-editor state (Phase 11). Holds the *draft* set being edited — a
// working copy that nothing else reads until the user saves — plus which
// exercise is open and whether there are unsaved changes. Persistence and the
// live registry are deliberately not touched here: the EditorSurface component
// commits a finished draft through the exercises store (which validates and
// refreshes the registry). Keeping this store free of Dexie/IO makes the edit
// logic unit-testable.

import { create } from 'zustand';
import type {
  Exercise,
  ExerciseSet,
  Subdivision,
  TimeSignature,
} from '../types';
import {
  blankSet,
  cycleOrnament,
  cycleStroke,
  eventsPerBar,
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

  /** Open an existing set for editing (a copy is taken by the caller). */
  open: (draft: ExerciseSet, exerciseId?: string) => void;
  /** Open a fresh blank set under the given (already-unique) id. */
  openNew: (id: string) => void;
  /** Close the editor and discard the in-memory draft. */
  close: () => void;
  /** Mark the draft saved (clears the dirty flag). */
  markClean: () => void;

  setActiveExercise: (id: string) => void;
  setTitle: (title: string) => void;

  // Active-exercise mutations.
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

/** Apply `fn` to the active exercise within the draft, returning the store patch
 *  (and flagging dirty). A no-op when nothing is open. */
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

  setTitle: (title) =>
    set((s) => (s.draft ? { draft: { ...s.draft, title }, dirty: true } : {})),

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
