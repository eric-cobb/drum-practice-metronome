import { useMetronomeStore } from '../../state/metronome';

/** Thin reps-completed / target fill at the top edge of the transport zone
 *  (DESIGN §Transport). */
export function ProgressBar() {
  const currentRep = useMetronomeStore((s) => s.currentRep);
  const targetReps = useMetronomeStore((s) => s.targetReps);
  const progress = Math.min(1, Math.max(0, currentRep / targetReps));

  return (
    <div
      className="absolute inset-x-0 top-0 h-0.5 bg-transparent"
      role="progressbar"
      aria-valuenow={currentRep}
      aria-valuemin={0}
      aria-valuemax={targetReps}
    >
      <div
        className="h-full bg-sky-500 transition-[width] duration-200 ease-out dark:bg-sky-400"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
