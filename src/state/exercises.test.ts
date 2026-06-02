// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  useExerciseStore,
  selectCurrentExercise,
  selectCurrentExerciseIndex,
  selectIsLastExercise,
  COUNT_IN_BARS_MIN,
  COUNT_IN_BARS_MAX,
} from './exercises';
import { useMetronomeStore } from './metronome';
import { useModeStore } from './mode';

// Zustand stores are singletons, so reset the relevant slices before each test.
// Also wipe persisted SetState so the bundled set starts at exercise 0.
beforeEach(async () => {
  localStorage.removeItem('metronome-set-states');
  localStorage.removeItem('metronome-active-set-id');
  useExerciseStore.setState({
    activeSetId: '',
    loadedSet: null,
    currentExerciseId: '',
    setStates: {},
    autoStartNext: false,
    countInEnabled: true,
    countInBars: 1,
    setComplete: false,
  });
  // initSets is async because it loads user-imported sets from Dexie. In jsdom
  // Dexie's userSets table is empty so this resolves quickly.
  await useExerciseStore.getState().initSets();
  useModeStore.setState({ mode: 'free', freeSnapshot: null });
});

const currentId = () => useExerciseStore.getState().currentExerciseId;
const exerciseAt = (i: number) =>
  useExerciseStore.getState().loadedSet!.exercises[i].id;

describe('exercise navigation (id-based)', () => {
  it('loads the bundled set starting at the first exercise', () => {
    const state = useExerciseStore.getState();
    expect(state.loadedSet).not.toBeNull();
    expect(state.activeSetId).toBe('foundational-rudiments');
    expect(selectCurrentExerciseIndex(state)).toBe(0);
    expect(state.currentExerciseId).toBe(state.loadedSet!.exercises[0].id);
  });

  it('clamps navigation at both ends of the set', () => {
    const set = useExerciseStore.getState().loadedSet!;
    const last = set.exercises.length - 1;

    useExerciseStore.getState().previousExercise(); // already at 0
    expect(currentId()).toBe(set.exercises[0].id);

    useExerciseStore.getState().setExerciseById(set.exercises[last].id);
    expect(currentId()).toBe(set.exercises[last].id);

    useExerciseStore.getState().nextExercise(); // already at last
    expect(currentId()).toBe(set.exercises[last].id);
  });

  it('setExerciseById ignores unknown ids', () => {
    useExerciseStore.getState().setExerciseById('nonexistent-id');
    expect(currentId()).toBe(exerciseAt(0));
  });

  it('resetProgress returns to the first exercise', () => {
    useExerciseStore.getState().setExerciseById(exerciseAt(3));
    useExerciseStore.getState().resetProgress();
    expect(currentId()).toBe(exerciseAt(0));
  });
});

describe('applying exercise config to the metronome', () => {
  it('pushes the current exercise settings into the metronome store', () => {
    useExerciseStore.getState().setExerciseById(exerciseAt(0));
    const set = useExerciseStore.getState().loadedSet!;
    const ex = selectCurrentExercise(useExerciseStore.getState())!;

    const m = useMetronomeStore.getState();
    expect(m.bpm).toBe(ex.recommendedBpm ?? set.defaultBpm);
    expect(m.subdivision).toBe('eighth');
    expect(m.timeSignature).toEqual({
      numerator: 2,
      denominator: 2,
      displayAs: 'cut',
    });
    expect(m.barsPerRep).toBe(2);
    expect(m.targetReps).toBe(ex.targetReps ?? set.defaultTargetReps);
  });
});

describe('advancing across exercises', () => {
  it('preserves the live BPM when advancing with preserveBpm', () => {
    useExerciseStore.getState().setExerciseById(exerciseAt(0));
    useMetronomeStore.getState().setBpm(112);

    const set = useExerciseStore.getState().loadedSet!;
    const next = set.exercises[1];

    useExerciseStore.getState().nextExercise({ preserveBpm: true });

    const m = useMetronomeStore.getState();
    expect(currentId()).toBe(next.id);
    expect(m.bpm).toBe(112);
    expect(m.subdivision).toBe(next.subdivision);
    expect(m.targetReps).toBe(next.targetReps ?? set.defaultTargetReps);
  });

  it('resets BPM to the exercise default on a plain (manual) move', () => {
    useExerciseStore.getState().setExerciseById(exerciseAt(0));
    useMetronomeStore.getState().setBpm(112);

    useExerciseStore.getState().nextExercise(); // no preserveBpm

    const set = useExerciseStore.getState().loadedSet!;
    const ex = set.exercises[1];
    expect(useMetronomeStore.getState().bpm).toBe(
      ex.recommendedBpm ?? set.defaultBpm,
    );
  });
});

describe('set-complete flag', () => {
  it('is true only at the last exercise of the set', () => {
    const set = useExerciseStore.getState().loadedSet!;
    const last = set.exercises.length - 1;

    useExerciseStore.getState().setExerciseById(set.exercises[0].id);
    expect(selectIsLastExercise(useExerciseStore.getState())).toBe(false);

    useExerciseStore.getState().setExerciseById(set.exercises[last].id);
    expect(selectIsLastExercise(useExerciseStore.getState())).toBe(true);
  });

  it('marks complete and clears it on the next navigation', () => {
    useExerciseStore.getState().markSetComplete();
    expect(useExerciseStore.getState().setComplete).toBe(true);

    useExerciseStore.getState().previousExercise();
    expect(useExerciseStore.getState().setComplete).toBe(false);
  });
});

describe('count-in settings', () => {
  it('clamps count-in bars to the allowed range', () => {
    useExerciseStore.getState().setCountInBars(99);
    expect(useExerciseStore.getState().countInBars).toBe(COUNT_IN_BARS_MAX);
    useExerciseStore.getState().setCountInBars(0);
    expect(useExerciseStore.getState().countInBars).toBe(COUNT_IN_BARS_MIN);
  });
});

describe('SetState persistence (SPEC §7)', () => {
  it('persists currentExerciseId to localStorage on navigation', () => {
    useExerciseStore.getState().setExerciseById(exerciseAt(2));
    const raw = localStorage.getItem('metronome-set-states');
    expect(raw).not.toBeNull();
    const states = JSON.parse(raw!);
    expect(states['foundational-rudiments'].currentExerciseId).toBe(exerciseAt(2));
  });

  it('restores currentExerciseId on the next initSets', async () => {
    useExerciseStore.getState().setExerciseById(exerciseAt(4));
    const id = currentId();
    // Wipe in-memory state but keep localStorage.
    useExerciseStore.setState({
      activeSetId: '',
      loadedSet: null,
      currentExerciseId: '',
      setStates: {},
    });
    await useExerciseStore.getState().initSets();
    expect(currentId()).toBe(id);
  });

  it('syncActiveBpm updates the active set persisted bpm', () => {
    useExerciseStore.getState().syncActiveBpm(174);
    const states = JSON.parse(
      localStorage.getItem('metronome-set-states')!,
    ) as Record<string, { currentBpm: number }>;
    expect(states['foundational-rudiments'].currentBpm).toBe(174);
  });
});

describe('mode switch snapshot / restore', () => {
  it('snapshots Free config on entering Exercise mode and restores it on return', () => {
    useMetronomeStore.getState().applyConfig({
      bpm: 95,
      timeSignature: { numerator: 3, denominator: 4 },
      subdivision: 'eighth',
      barsPerRep: 4,
      targetReps: 8,
    });

    useModeStore.getState().setMode('exercise');
    // Reflects exercise #1 of Stick Control (cut time, 8th notes).
    expect(useMetronomeStore.getState().bpm).toBe(60);
    expect(useMetronomeStore.getState().subdivision).toBe('eighth');

    useModeStore.getState().setMode('free');
    const m = useMetronomeStore.getState();
    expect(m.bpm).toBe(95);
    expect(m.timeSignature).toEqual({ numerator: 3, denominator: 4 });
    expect(m.subdivision).toBe('eighth');
    expect(m.barsPerRep).toBe(4);
    expect(m.targetReps).toBe(8);
  });
});
