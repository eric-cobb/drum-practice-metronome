import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editor';
import type { Hit } from '../types';

const reset = () => useEditorStore.getState().close();

/** The active exercise out of the live store (throws if none — tests open one). */
function active() {
  const { draft, activeExerciseId } = useEditorStore.getState();
  const ex = draft?.exercises.find((e) => e.id === activeExerciseId);
  if (!ex) throw new Error('no active exercise');
  return ex;
}

describe('editor store', () => {
  beforeEach(reset);

  it('openNew seeds a blank draft and is not dirty', () => {
    useEditorStore.getState().openNew('my-set');
    const s = useEditorStore.getState();
    expect(s.draft?.id).toBe('my-set');
    expect(s.activeExerciseId).toBe(s.draft?.exercises[0].id);
    expect(s.dirty).toBe(false);
  });

  it('cellStroke cycles the targeted position and flags dirty', () => {
    useEditorStore.getState().openNew('my-set');
    useEditorStore.getState().cellStroke(0, 2);
    expect(active().pattern[0][2]).toEqual({ voices: ['snare'], sticking: 'R' });
    expect(useEditorStore.getState().dirty).toBe(true);
    // Other positions untouched.
    expect(active().pattern[0][0]).toBe('rest');
  });

  it('cellAccent only affects hits and clears ghost', () => {
    useEditorStore.getState().openNew('my-set');
    const store = useEditorStore.getState();
    store.cellStroke(0, 0); // → R hit
    store.cellGhost(0, 0); // → ghost
    store.cellAccent(0, 0); // → accent, ghost cleared
    expect(active().pattern[0][0]).toEqual({ voices: ['snare'], sticking: 'R', accent: true });
  });

  it('setSubdivision resizes every bar, preserving overlap', () => {
    useEditorStore.getState().openNew('my-set');
    useEditorStore.getState().cellStroke(0, 0); // R at position 0 (sixteenths)
    useEditorStore.getState().setSubdivision('eighth');
    const ex = active();
    expect(ex.subdivision).toBe('eighth');
    expect(ex.pattern[0]).toHaveLength(8);
    // Position 0 survived the resize.
    expect(ex.pattern[0][0]).toEqual({ voices: ['snare'], sticking: 'R' });
  });

  it('setBarCount adds bars of rests and drops extras', () => {
    useEditorStore.getState().openNew('my-set');
    useEditorStore.getState().setBarCount(3);
    expect(active().pattern).toHaveLength(3);
    expect(active().pattern[2].every((e) => e === 'rest')).toBe(true);
    useEditorStore.getState().setBarCount(1);
    expect(active().pattern).toHaveLength(1);
  });

  it('setTimeSignature changes the meter and reshapes the grid', () => {
    useEditorStore.getState().openNew('my-set');
    useEditorStore.getState().setTimeSignature({ numerator: 3, denominator: 4 });
    expect(active().timeSignature.numerator).toBe(3);
    expect(active().pattern[0]).toHaveLength(12); // 3/4 sixteenths
  });

  it('mutations are immutable — prior snapshots are not changed', () => {
    useEditorStore.getState().openNew('my-set');
    const before = active().pattern[0][0];
    useEditorStore.getState().cellStroke(0, 0);
    expect(before).toBe('rest'); // captured value unchanged
  });

  it('addSection / rename / move (renumbers order) / delete (guarded)', () => {
    const s = () => useEditorStore.getState();
    s().openNew('my-set');
    s().addSection();
    expect(active() && s().draft?.sections).toHaveLength(2);
    const [a, b] = s().draft!.sections;

    s().renameSection(b.id, 'Rolls');
    expect(s().draft!.sections.find((x) => x.id === b.id)?.title).toBe('Rolls');

    s().moveSection(b.id, -1); // b before a
    expect(s().draft!.sections.map((x) => x.id)).toEqual([b.id, a.id]);
    // order renumbered to match array position
    expect(s().draft!.sections.map((x) => x.order)).toEqual([1, 2]);

    // The first section now holds the blank exercise → can't delete it; the
    // empty one can go.
    const withEx = s().draft!.exercises[0].sectionId;
    const empty = s().draft!.sections.find((x) => x.id !== withEx)!;
    s().deleteSection(empty.id);
    expect(s().draft!.sections).toHaveLength(1);
    // Deleting the last remaining section is refused.
    s().deleteSection(s().draft!.sections[0].id);
    expect(s().draft!.sections).toHaveLength(1);
  });

  it('addExercise selects the new one; deleteExercise is guarded at one', () => {
    const s = () => useEditorStore.getState();
    s().openNew('my-set');
    s().addExercise();
    expect(s().draft!.exercises).toHaveLength(2);
    expect(s().activeExerciseId).toBe(s().draft!.exercises[1].id);

    s().deleteExercise(s().draft!.exercises[1].id);
    expect(s().draft!.exercises).toHaveLength(1);
    // Can't delete the last exercise.
    s().deleteExercise(s().draft!.exercises[0].id);
    expect(s().draft!.exercises).toHaveLength(1);
  });

  it('moveExercise reorders the list', () => {
    const s = () => useEditorStore.getState();
    s().openNew('my-set');
    s().addExercise();
    const [first, second] = s().draft!.exercises;
    s().moveExercise(second.id, -1);
    expect(s().draft!.exercises.map((e) => e.id)).toEqual([second.id, first.id]);
  });

  it('set-metadata setters update the draft and flag dirty', () => {
    const s = () => useEditorStore.getState();
    s().openNew('my-set');
    s().setSource('GLS');
    s().setDefaultBpm(120);
    s().setDefaultTargetReps(30);
    expect(s().draft!.source).toBe('GLS');
    expect(s().draft!.defaultBpm).toBe(120);
    expect(s().draft!.defaultTargetReps).toBe(30);
    expect(s().dirty).toBe(true);
  });

  it('close clears the draft', () => {
    useEditorStore.getState().openNew('my-set');
    useEditorStore.getState().close();
    expect(useEditorStore.getState().draft).toBeNull();
  });

  it('open uses the provided exercise and starts clean', () => {
    const hit: Hit = { voices: ['snare'], sticking: 'R' };
    useEditorStore.getState().open({
      id: 's',
      title: 'T',
      source: 'x',
      defaultBpm: 80,
      defaultTargetReps: 16,
      schemaVersion: 2,
      sections: [{ id: 'sec', title: 'Sec', order: 1 }],
      exercises: [
        {
          id: 'e1',
          number: 1,
          name: 'One',
          sectionId: 'sec',
          timeSignature: { numerator: 1, denominator: 4 },
          subdivision: 'quarter',
          pattern: [[hit]],
        },
      ],
    });
    expect(useEditorStore.getState().activeExerciseId).toBe('e1');
    expect(useEditorStore.getState().dirty).toBe(false);
  });
});
