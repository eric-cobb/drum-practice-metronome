import { useMetronomeStore } from '../../state/metronome';

/** Thin reps/target progress bar with the accent-gradient fill (DESIGN-v2 §2).
 *  Sits under the rep counter in the play composition. */
export function RepProgressBar() {
  const currentRep = useMetronomeStore((s) => s.currentRep);
  const targetReps = useMetronomeStore((s) => s.targetReps);
  const progress = Math.min(1, Math.max(0, currentRep / targetReps));

  return (
    <div
      className="h-1 w-40 overflow-hidden rounded-full bg-fg/10"
      role="progressbar"
      aria-valuenow={currentRep}
      aria-valuemin={0}
      aria-valuemax={targetReps}
    >
      <div
        className="bg-accent-gradient h-full rounded-full transition-[width] duration-200 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
