import { useMetronomeStore } from '../../state/metronome';
import { BpmDisplay } from '../Transport/BpmDisplay';
import { RepDisplay } from '../Transport/RepDisplay';
import { StartStopButton } from '../Transport/StartStopButton';
import { ProgressBar } from '../Transport/ProgressBar';

/** Transport zone (DESIGN §Transport): BPM · start/stop · reps, with a progress
 *  bar at the top edge. Grows from 96px to 128px when playing. */
export function Transport() {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);

  return (
    <footer
      className={`relative shrink-0 border-t border-neutral-200 ease-out motion-safe:transition-all motion-safe:duration-200 dark:border-neutral-800 ${
        isPlaying ? 'h-32' : 'h-24'
      }`}
    >
      <ProgressBar />
      <div className="grid h-full grid-cols-3 items-center px-6">
        <div className="flex justify-start">
          <BpmDisplay />
        </div>
        <div className="flex justify-center">
          <StartStopButton />
        </div>
        <div className="flex justify-end">
          <RepDisplay />
        </div>
      </div>
    </footer>
  );
}
