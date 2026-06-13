// Exercise-mode state (ARCHITECTURE.md §exercises.ts, SPEC §7).
//
// Holds the merged set registry (bundled + user-imported), the active set, and
// the current exercise position within it — keyed by `exerciseId` so the saved
// position survives JSON reordering. Per-set state (currentExerciseId,
// currentBpm, sectionsCollapsed) is persisted to localStorage as a
// Record<setId, SetState>; switching to another set saves the outgoing set's
// state and restores the incoming set's state.
//
// Bundled sets are loaded synchronously at module load (Vite glob import);
// user-imported sets are loaded asynchronously from Dexie in `initSets`. The
// `registry` field is mutable so imports and deletions update it live.
//
// One-directional data flow: this store reads/writes the metronome store to
// push exercise config in, but must NOT import the mode store (mode → exercises
// → metronome).

import { create } from 'zustand';
import type {
  Exercise,
  ExerciseSet,
  ExerciseSetSummary,
  LoadedSet,
  Section,
  SetState,
} from '../types';
import {
  loadBundledSets,
  loadUserSets,
  getBundledErrors,
  importUserSet,
  replaceUserSet,
  saveUserSetAs,
  exportUserSet,
  deleteUserSet,
  type SetLoadError,
  type ImportResult,
  type LoadResult,
} from '../data/loadExerciseSet';
import { useMetronomeStore } from './metronome';
import { useProgressStore } from './progress';

export const COUNT_IN_BARS_MIN = 1;
export const COUNT_IN_BARS_MAX = 4;

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

// --- localStorage persistence -----------------------------------------------

const ACTIVE_SET_KEY = 'metronome-active-set-id';
const SET_STATES_KEY = 'metronome-set-states';

function readActiveSetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SET_KEY);
  } catch {
    return null;
  }
}
function writeActiveSetId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_SET_KEY, id);
  } catch {
    /* quota or disabled */
  }
}
function readSetStates(): Record<string, SetState> {
  try {
    const raw = localStorage.getItem(SET_STATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, SetState>;
  } catch {
    return {};
  }
}
function writeSetStates(states: Record<string, SetState>): void {
  try {
    localStorage.setItem(SET_STATES_KEY, JSON.stringify(states));
  } catch {
    /* quota or disabled */
  }
}

/** Build the default SetState for a freshly-loaded set: position on the first
 *  exercise, tempo at the set default, no sections collapsed. */
function defaultSetState(set: ExerciseSet): SetState {
  return {
    setId: set.id,
    currentExerciseId: set.exercises[0].id,
    currentBpm: set.defaultBpm,
    sectionsCollapsed: {},
  };
}

/** Derive the lightweight summary list from a registry (sorted by title for
 *  stable rendering — the bundled/user grouping is applied by the consumer). */
function buildSummaries(
  registry: Record<string, LoadedSet>,
): ExerciseSetSummary[] {
  return Object.values(registry)
    .map((set) => ({
      id: set.id,
      title: set.title,
      exerciseCount: set.exercises.length,
      origin: set.origin,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

// --- Types -------------------------------------------------------------------

interface NavOptions {
  /** Preserve the live BPM instead of resetting to the exercise's recommended
   *  tempo — used for auto-advance / count-in transitions (SPEC §7). */
  preserveBpm?: boolean;
}

interface ExerciseState {
  /** All sets currently in the registry, lightweight descriptors. */
  availableSets: ExerciseSetSummary[];
  /** Bundled files that failed to load; surfaced as non-blocking warnings. */
  loadErrors: SetLoadError[];

  activeSetId: string;
  loadedSet: ExerciseSet | null;
  /** Stable identity within the loaded set (NOT an array index). */
  currentExerciseId: string;
  setStates: Record<string, SetState>;

  // Transition / count-in settings (SPEC §7).
  autoStartNext: boolean;
  countInEnabled: boolean;
  countInBars: number;
  setComplete: boolean;

  /** Initialize from bundled + user-imported sets: pick the active set, load
   *  it, restore its SetState, and push the resulting config into the
   *  metronome store. Async because user sets come from Dexie. */
  initSets: () => Promise<void>;
  /** Switch to a different set; saves the outgoing set's state and restores
   *  the incoming set's. No-op if `setId` is already active or unknown. */
  loadSet: (setId: string) => void;
  setExerciseById: (exerciseId: string, options?: NavOptions) => void;
  nextExercise: (options?: NavOptions) => void;
  previousExercise: (options?: NavOptions) => void;
  /** Reset the active set's position to its first exercise. Does NOT clear the
   *  progress table — that's `useProgressStore.reset(setId)`. */
  resetProgress: () => void;

  setAutoStartNext: (autoStartNext: boolean) => void;
  setCountInEnabled: (countInEnabled: boolean) => void;
  setCountInBars: (countInBars: number) => void;
  markSetComplete: () => void;
  setSectionCollapsed: (sectionId: string, collapsed: boolean) => void;
  syncActiveBpm: (bpm: number) => void;

  applyCurrentToMetronome: (options?: NavOptions) => void;

  // User-set CRUD (ARCHITECTURE §Import / Export / Delete flows). These wrap
  // the loader functions and refresh the in-store registry on success so the
  // selector and Settings list update immediately.
  importSet: (file: File) => Promise<ImportResult>;
  replaceSet: (set: ExerciseSet) => Promise<LoadResult>;
  saveSetAs: (set: ExerciseSet, newId: string) => Promise<LoadResult>;
  exportSet: (setId: string) => Promise<Blob>;
  deleteSet: (setId: string) => Promise<void>;
  /** Full set data by id from the registry (bundled or user), for the editor. */
  getSet: (setId: string) => LoadedSet | undefined;
}

// --- Selectors ---------------------------------------------------------------

export function selectCurrentExercise(state: ExerciseState): Exercise | null {
  if (!state.loadedSet) return null;
  return (
    state.loadedSet.exercises.find((e) => e.id === state.currentExerciseId) ??
    null
  );
}

export function selectCurrentExerciseIndex(state: ExerciseState): number {
  if (!state.loadedSet) return -1;
  return state.loadedSet.exercises.findIndex(
    (e) => e.id === state.currentExerciseId,
  );
}

export function selectIsLastExercise(state: ExerciseState): boolean {
  if (!state.loadedSet) return false;
  return (
    selectCurrentExerciseIndex(state) >= state.loadedSet.exercises.length - 1
  );
}

export function selectCurrentSection(state: ExerciseState): Section | null {
  const exercise = selectCurrentExercise(state);
  if (!exercise || !state.loadedSet) return null;
  return (
    state.loadedSet.sections.find((s) => s.id === exercise.sectionId) ?? null
  );
}

// --- Registry (closed over the store via refreshRegistry) -------------------

// Bundled sets are static, discovered at module load. We re-merge user sets
// into a fresh registry whenever the user imports or deletes.
const BUNDLED: LoadedSet[] = loadBundledSets();
const BUNDLED_ERRORS: SetLoadError[] = getBundledErrors();

function mergeRegistry(userSets: LoadedSet[]): Record<string, LoadedSet> {
  const registry: Record<string, LoadedSet> = {};
  for (const set of BUNDLED) registry[set.id] = set;
  // User-imported wins on collision (defensive — import flow prevents).
  for (const set of userSets) registry[set.id] = set;
  return registry;
}

// In-memory cache of the merged registry (kept outside Zustand to avoid
// stringifying large set data in state slices). The store's `availableSets`
// is derived from this.
let REGISTRY: Record<string, LoadedSet> = mergeRegistry([]);

/** Pick a sensible active set: persisted value if still valid, else the
 *  alphabetically-first bundled set. */
function pickActiveSetId(): string {
  const persisted = readActiveSetId();
  if (persisted && REGISTRY[persisted]) return persisted;
  const ids = Object.values(REGISTRY)
    .filter((s) => s.origin === 'bundled')
    .map((s) => s.id)
    .sort();
  if (ids.length) return ids[0];
  const userIds = Object.keys(REGISTRY).sort();
  return userIds[0] ?? '';
}

// --- Store -------------------------------------------------------------------

export const useExerciseStore = create<ExerciseState>((set, get) => {
  /** Refresh `availableSets` from the current REGISTRY and, if the active set
   *  was removed, fall back to the first remaining set. */
  function refreshRegistryState(): void {
    set({ availableSets: buildSummaries(REGISTRY) });
    const state = get();
    if (state.activeSetId && !REGISTRY[state.activeSetId]) {
      const fallback = pickActiveSetId();
      if (fallback) get().loadSet(fallback);
    } else if (state.activeSetId && REGISTRY[state.activeSetId]) {
      // Refresh the loaded set reference in case the active set was replaced
      // (e.g., user re-imported it after editing the JSON externally).
      const currentLoaded = state.loadedSet;
      const fresh = REGISTRY[state.activeSetId];
      if (currentLoaded !== fresh) set({ loadedSet: fresh });
    }
  }

  return {
    availableSets: buildSummaries(REGISTRY),
    loadErrors: BUNDLED_ERRORS,

    activeSetId: '',
    loadedSet: null,
    currentExerciseId: '',
    setStates: readSetStates(),

    autoStartNext: false,
    countInEnabled: true,
    countInBars: 1,
    setComplete: false,

    initSets: async () => {
      const userSets = await loadUserSets();
      REGISTRY = mergeRegistry(userSets);
      set({ availableSets: buildSummaries(REGISTRY) });

      const activeId = pickActiveSetId();
      if (!activeId || !REGISTRY[activeId]) return;
      const loadedSet = REGISTRY[activeId];

      const states = { ...readSetStates() };
      if (!states[activeId]) {
        states[activeId] = defaultSetState(loadedSet);
        writeSetStates(states);
      }
      if (
        !loadedSet.exercises.some(
          (e) => e.id === states[activeId].currentExerciseId,
        )
      ) {
        states[activeId] = {
          ...states[activeId],
          currentExerciseId: loadedSet.exercises[0].id,
        };
        writeSetStates(states);
      }

      set({
        activeSetId: activeId,
        loadedSet,
        currentExerciseId: states[activeId].currentExerciseId,
        setStates: states,
        setComplete: false,
      });
      writeActiveSetId(activeId);
      get().applyCurrentToMetronome();
      const savedBpm = states[activeId].currentBpm;
      if (savedBpm) useMetronomeStore.getState().setBpm(savedBpm);
      void useProgressStore.getState().loadSet(activeId);
    },

    loadSet: (setId) => {
      const state = get();
      if (setId === state.activeSetId) return;
      if (!REGISTRY[setId]) return;

      const states = { ...state.setStates };
      if (state.activeSetId && states[state.activeSetId]) {
        states[state.activeSetId] = {
          ...states[state.activeSetId],
          currentBpm: useMetronomeStore.getState().bpm,
        };
      }

      const incomingSet = REGISTRY[setId];
      if (!states[setId]) states[setId] = defaultSetState(incomingSet);
      if (
        !incomingSet.exercises.some(
          (e) => e.id === states[setId].currentExerciseId,
        )
      ) {
        states[setId] = {
          ...states[setId],
          currentExerciseId: incomingSet.exercises[0].id,
        };
      }

      writeSetStates(states);
      writeActiveSetId(setId);

      set({
        activeSetId: setId,
        loadedSet: incomingSet,
        currentExerciseId: states[setId].currentExerciseId,
        setStates: states,
        setComplete: false,
      });
      get().applyCurrentToMetronome();
      useMetronomeStore.getState().setBpm(states[setId].currentBpm);
      void useProgressStore.getState().loadSet(setId);
    },

    setExerciseById: (exerciseId, options) => {
      const state = get();
      const loadedSet = state.loadedSet;
      if (!loadedSet) return;
      const next = loadedSet.exercises.find((e) => e.id === exerciseId);
      if (!next) return;
      const states = { ...state.setStates };
      if (state.activeSetId && states[state.activeSetId]) {
        states[state.activeSetId] = {
          ...states[state.activeSetId],
          currentExerciseId: next.id,
        };
        writeSetStates(states);
      }
      set({
        currentExerciseId: next.id,
        setStates: states,
        setComplete: false,
      });
      get().applyCurrentToMetronome(options);
    },

    nextExercise: (options) => {
      const idx = selectCurrentExerciseIndex(get());
      const loadedSet = get().loadedSet;
      if (!loadedSet || idx < 0) return;
      const nextIdx = Math.min(idx + 1, loadedSet.exercises.length - 1);
      get().setExerciseById(loadedSet.exercises[nextIdx].id, options);
    },

    previousExercise: (options) => {
      const idx = selectCurrentExerciseIndex(get());
      const loadedSet = get().loadedSet;
      if (!loadedSet || idx < 0) return;
      const prevIdx = Math.max(0, idx - 1);
      get().setExerciseById(loadedSet.exercises[prevIdx].id, options);
    },

    resetProgress: () => {
      const loadedSet = get().loadedSet;
      if (!loadedSet) return;
      get().setExerciseById(loadedSet.exercises[0].id);
    },

    setAutoStartNext: (autoStartNext) => set({ autoStartNext }),
    setCountInEnabled: (countInEnabled) => set({ countInEnabled }),
    setCountInBars: (countInBars) =>
      set({
        countInBars: clamp(
          Math.round(countInBars),
          COUNT_IN_BARS_MIN,
          COUNT_IN_BARS_MAX,
        ),
      }),

    markSetComplete: () => set({ setComplete: true }),

    setSectionCollapsed: (sectionId, collapsed) => {
      const state = get();
      if (!state.activeSetId) return;
      const current = state.setStates[state.activeSetId];
      if (!current) return;
      const states = {
        ...state.setStates,
        [state.activeSetId]: {
          ...current,
          sectionsCollapsed: {
            ...current.sectionsCollapsed,
            [sectionId]: collapsed,
          },
        },
      };
      writeSetStates(states);
      set({ setStates: states });
    },

    syncActiveBpm: (bpm) => {
      const state = get();
      if (!state.activeSetId) return;
      const current = state.setStates[state.activeSetId];
      if (!current || current.currentBpm === bpm) return;
      const states = {
        ...state.setStates,
        [state.activeSetId]: { ...current, currentBpm: bpm },
      };
      writeSetStates(states);
      set({ setStates: states });
    },

    applyCurrentToMetronome: (options) => {
      const state = get();
      const exercise = selectCurrentExercise(state);
      if (!exercise || !state.loadedSet) return;
      useMetronomeStore.getState().applyConfig({
        ...(options?.preserveBpm
          ? {}
          : { bpm: exercise.recommendedBpm ?? state.loadedSet.defaultBpm }),
        timeSignature: exercise.timeSignature,
        subdivision: exercise.subdivision,
        barsPerRep: exercise.pattern.length,
        targetReps: exercise.targetReps ?? state.loadedSet.defaultTargetReps,
      });
      // Per-position accent map → louder click on accented pattern notes
      // (SPEC §12). Cleared when switching to Free mode (mode.ts).
      const accents = exercise.pattern.map((bar) =>
        bar.map((ev) => ev !== 'rest' && ev.accent === true),
      );
      useMetronomeStore.getState().setPatternAccents(accents);
    },

    // --- User-set CRUD --------------------------------------------------

    importSet: async (file) => {
      const result = await importUserSet(file);
      if (result.ok) {
        const userSets = await loadUserSets();
        REGISTRY = mergeRegistry(userSets);
        refreshRegistryState();
      }
      return result;
    },

    replaceSet: async (incoming) => {
      const result = await replaceUserSet(incoming);
      if (result.ok) {
        const userSets = await loadUserSets();
        REGISTRY = mergeRegistry(userSets);
        refreshRegistryState();
      }
      return result;
    },

    saveSetAs: async (incoming, newId) => {
      const result = await saveUserSetAs(incoming, newId);
      if (result.ok) {
        const userSets = await loadUserSets();
        REGISTRY = mergeRegistry(userSets);
        refreshRegistryState();
      }
      return result;
    },

    exportSet: (setId) => exportUserSet(setId),

    deleteSet: async (setId) => {
      await deleteUserSet(setId);
      const userSets = await loadUserSets();
      REGISTRY = mergeRegistry(userSets);
      refreshRegistryState();
    },

    getSet: (setId) => REGISTRY[setId],
  };
});
