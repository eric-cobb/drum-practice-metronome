import { useExerciseStore, selectCurrentExercise } from '../../state/exercises';
import { Card } from '../ui';

/** Exercise notes card (DESIGN-v2 §5: below the play composition in Exercise
 *  mode). Shows the exercise's practice notes, or a muted placeholder when the
 *  exercise has none. */
export function ExerciseNotesCard() {
  const exercise = useExerciseStore(selectCurrentExercise);
  if (!exercise) return null;

  return (
    <Card surface="card" className="flex flex-col gap-2 p-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        Notes
      </span>
      {exercise.notes ? (
        <p className="text-sm leading-relaxed text-fg-secondary">{exercise.notes}</p>
      ) : (
        <p className="text-sm text-fg-muted">No practice notes for this exercise.</p>
      )}
    </Card>
  );
}
