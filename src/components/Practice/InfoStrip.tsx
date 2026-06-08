import {
  useExerciseStore,
  selectCurrentExercise,
  selectCurrentSection,
} from '../../state/exercises';
import { SUBDIVISION_LABELS, formatTimeSignature } from '../../types';
import { Card } from '../ui';

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        {label}
      </span>
      <span className="max-w-full truncate text-xs font-medium text-fg">{value}</span>
    </div>
  );
}

/** Exercise-mode info strip below the notation (DESIGN-v2 §6): a 48px row of
 *  four cells — time signature, subdivision, count-in, section — split by
 *  hairline separators. Read-only (the exercise determines these). */
export function InfoStrip() {
  const exercise = useExerciseStore(selectCurrentExercise);
  const section = useExerciseStore(selectCurrentSection);
  const countInEnabled = useExerciseStore((s) => s.countInEnabled);
  const countInBars = useExerciseStore((s) => s.countInBars);

  if (!exercise) return null;

  const countIn = countInEnabled
    ? `${countInBars} bar${countInBars === 1 ? '' : 's'}`
    : 'Off';

  return (
    <Card surface="card" className="flex h-12 items-stretch">
      <Cell label="Time sig" value={formatTimeSignature(exercise.timeSignature)} />
      <div className="my-2 w-px bg-fg/10" aria-hidden />
      <Cell label="Subdivision" value={SUBDIVISION_LABELS[exercise.subdivision]} />
      <div className="my-2 w-px bg-fg/10" aria-hidden />
      <Cell label="Count-in" value={countIn} />
      <div className="my-2 w-px bg-fg/10" aria-hidden />
      <Cell label="Section" value={section?.title ?? '—'} />
    </Card>
  );
}
