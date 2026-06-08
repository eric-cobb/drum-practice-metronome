import type { Ref } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  useExerciseStore,
  selectCurrentExercise,
  selectCurrentExerciseIndex,
} from '../../state/exercises';
import { cn } from '../ui';

interface CurrentExercisePillProps {
  anchorRef: Ref<HTMLButtonElement>;
  expanded: boolean;
  onClick: () => void;
}

/** Current-exercise pill in the Practice top bar (DESIGN-v2 §6): a small-caps
 *  "CURRENT EXERCISE" label over the number + name, with a chevron. The trigger
 *  for the exercise selector; ExerciseSelector owns the open state + overlay. */
export function CurrentExercisePill({
  anchorRef,
  expanded,
  onClick,
}: CurrentExercisePillProps) {
  const loadedSet = useExerciseStore((s) => s.loadedSet);
  const index = useExerciseStore(selectCurrentExerciseIndex);
  const exercise = useExerciseStore(selectCurrentExercise);

  return (
    <button
      ref={anchorRef}
      type="button"
      onClick={onClick}
      disabled={!loadedSet || !exercise}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label="Current exercise — open selector"
      className={cn(
        'surface-deep flex h-11 min-w-[200px] max-w-[260px] items-center gap-2 rounded-[11px] px-3 text-left',
        'transition duration-[120ms] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
          Current exercise
        </span>
        {loadedSet && exercise ? (
          <span className="truncate text-sm font-medium text-fg">
            #{exercise.number} {exercise.name}
            <span className="ml-1.5 text-xs font-normal tabular-nums text-fg-muted">
              {index + 1}/{loadedSet.exercises.length}
            </span>
          </span>
        ) : (
          <span className="text-sm text-fg-muted">Loading…</span>
        )}
      </span>
      <ChevronDown
        size={16}
        strokeWidth={1.5}
        className={cn('shrink-0 text-fg-tertiary transition-transform', expanded && 'rotate-180')}
        aria-hidden
      />
    </button>
  );
}
