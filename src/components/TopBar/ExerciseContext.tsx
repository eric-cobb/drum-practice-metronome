import { useModeStore } from '../../state/mode';
import { useMetronomeStore } from '../../state/metronome';
import {
  useExerciseStore,
  selectCurrentExercise,
  selectCurrentExerciseIndex,
} from '../../state/exercises';
import { ExercisePopover } from './ExercisePopover';

/** Borderless exercise-name field for Free mode (DESIGN: top-bar center). */
function FreeName() {
  const label = useMetronomeStore((s) => s.freeSessionLabel);
  const setLabel = useMetronomeStore((s) => s.setFreeSessionLabel);
  return (
    <input
      type="text"
      value={label}
      onChange={(e) => setLabel(e.target.value)}
      placeholder="Exercise name"
      aria-label="Exercise name"
      className="w-full max-w-xs bg-transparent text-center text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-50 dark:placeholder:text-neutral-600"
    />
  );
}

/** Clickable exercise context text in the top-bar center (DESIGN §Exercise
 *  context); opens the multi-layer Exercise Popover. */
function ExerciseTrigger() {
  const loadedSet = useExerciseStore((s) => s.loadedSet);
  const index = useExerciseStore(selectCurrentExerciseIndex);
  const exercise = useExerciseStore(selectCurrentExercise);

  return (
    <ExercisePopover
      trigger={({ toggle }) => (
        <button
          type="button"
          data-popover-trigger
          onClick={toggle}
          disabled={!loadedSet || !exercise}
          className="group max-w-[70vw] truncate rounded-md px-2 py-1 text-sm hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-neutral-800"
        >
          {loadedSet && exercise ? (
            <>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">
                {loadedSet.title}
              </span>
              <span className="px-2 text-neutral-400">·</span>
              <span className="text-neutral-900 dark:text-neutral-50">
                #{exercise.number} {exercise.name}
              </span>
              <span className="px-2 text-neutral-400">·</span>
              <span className="text-xs text-neutral-500">
                {index + 1} of {loadedSet.exercises.length}
              </span>
            </>
          ) : (
            <span className="text-neutral-500">Loading…</span>
          )}
        </button>
      )}
    />
  );
}

/** Top-bar center: exercise context (Practice) or the name field (Free). */
export function ExerciseContext() {
  const mode = useModeStore((s) => s.mode);
  return (
    <div className="flex min-w-0 flex-1 justify-center">
      {mode === 'exercise' ? <ExerciseTrigger /> : <FreeName />}
    </div>
  );
}
