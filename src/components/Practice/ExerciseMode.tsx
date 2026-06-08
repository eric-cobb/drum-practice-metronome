import { useExerciseStore } from '../../state/exercises';
import { NotationCard } from './NotationCard';
import { InfoStrip } from './InfoStrip';
import { BpmControl } from './BpmControl';
import { PlayControl } from './PlayControl';
import { RepControl } from './RepControl';
import { RepProgressBar } from './RepProgressBar';
import { ExerciseNotesCard } from './ExerciseNotesCard';

/** Exercise-mode Practice body (DESIGN-v2 §5): notation canvas, info strip, the
 *  play composition (BPM · play · reps), and the exercise notes card. */
export function ExerciseMode() {
  const setComplete = useExerciseStore((s) => s.setComplete);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-8">
      {setComplete && (
        <div
          className="bg-accent-gradient-soft rounded-[12px] border border-[color:var(--color-accent)] px-4 py-2 text-center text-sm font-medium text-[color:var(--color-accent-text)]"
          role="status"
        >
          Set complete — every exercise done. 🎉
        </div>
      )}

      <NotationCard />
      <InfoStrip />

      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-3">
        <div className="flex justify-center sm:justify-start">
          <BpmControl variant="exercise" placement="top" />
        </div>
        <div className="flex justify-center">
          <PlayControl size="exercise" />
        </div>
        <div className="flex flex-col items-center gap-2.5 sm:items-end">
          <RepControl variant="exercise" placement="top" />
          <RepProgressBar />
        </div>
      </div>

      <ExerciseNotesCard />
    </div>
  );
}
