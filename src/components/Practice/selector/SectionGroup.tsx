import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Exercise, ExerciseProgress, Section } from '../../../types';
import { ExerciseRow } from './ExerciseRow';
import { tileStateFor } from './tileState';

interface SectionGroupProps {
  section: Section;
  exercises: Exercise[];
  /** Force-open regardless of collapse state (used while searching). */
  forceOpen: boolean;
  collapsed: boolean;
  onToggle: () => void;
  progressById: Record<string, ExerciseProgress>;
  defaultBpm: number;
  currentExerciseId: string;
  /** Live rep position of the current exercise (0–1) for its row progress bar. */
  currentProgress: number;
  /** Rep-count label for the current exercise's row (e.g. "8 / 20 reps"). */
  currentRepLabel: string;
  onPickExercise: (id: string) => void;
  searchActive: boolean;
}

/** A collapsible section in the selector (SPEC §7): header with title and a
 *  "done of total" counter, then a list of name-first exercise rows. */
export function SectionGroup({
  section,
  exercises,
  forceOpen,
  collapsed,
  onToggle,
  progressById,
  defaultBpm,
  currentExerciseId,
  currentProgress,
  currentRepLabel,
  onPickExercise,
  searchActive,
}: SectionGroupProps) {
  const completed = exercises.filter((ex) => progressById[ex.id]?.completed).length;
  const total = exercises.length;
  const noMatches = searchActive && exercises.length === 0;
  const open = forceOpen ? true : !collapsed;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={searchActive}
        aria-expanded={open}
        className="flex items-center justify-between gap-3 rounded-[8px] py-1 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-1.5">
          <Chevron size={14} strokeWidth={1.5} className="text-fg-tertiary" aria-hidden />
          <span className="font-medium text-fg">{section.title}</span>
        </span>
        <span className="text-xs tabular-nums text-fg-tertiary">
          {noMatches ? '(0 matches)' : `${completed} of ${total} complete`}
        </span>
      </button>
      {open && exercises.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {exercises.map((ex) => {
            const isCurrent = ex.id === currentExerciseId;
            return (
              <ExerciseRow
                key={ex.id}
                number={ex.number}
                name={ex.name}
                state={tileStateFor(progressById[ex.id], defaultBpm, isCurrent)}
                progress={isCurrent ? currentProgress : undefined}
                repLabel={isCurrent ? currentRepLabel : undefined}
                onClick={() => onPickExercise(ex.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
