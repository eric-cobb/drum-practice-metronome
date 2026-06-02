import { useRef } from 'react';
import { useMetronomeStore } from '../../state/metronome';
import { start, stop, skip } from '../../audio/transport';
import { PlayIcon, PauseIcon } from '../Shared/icons';
import { useBeatPulse } from './useBeatPulse';

const iconClass =
  'h-9 w-9 text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.25))]';

/** The circular transport button for Exercise mode (DESIGN §Transport): gradient
 *  + bloom per the Primary button treatment, 80px stopped / 96px playing. It's
 *  the beat indicator too — scale pulse each beat and a cyan gradient shift on
 *  accented beats, but no sonar rings (the notation highlight carries the rhythm
 *  there). During a count-in, pressing it skips into the exercise (Phase 5). */
export function StartStopButton() {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const countIn = useMetronomeStore((s) => s.countIn);

  const buttonRef = useRef<HTMLButtonElement>(null);
  useBeatPulse({ button: buttonRef });

  const counting = countIn !== null;
  const showPause = isPlaying && !counting;

  const onClick = () => {
    if (counting) skip();
    else if (isPlaying) stop();
    else start();
  };

  const label = showPause
    ? 'Pause metronome'
    : counting
      ? 'Skip count-in'
      : 'Start metronome';

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`play-button flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:transition-[width,height] motion-safe:duration-200 motion-safe:ease-out dark:focus-visible:ring-offset-neutral-950 ${
        isPlaying ? 'is-playing h-24 w-24' : 'h-20 w-20'
      }`}
    >
      {showPause ? (
        <PauseIcon className={iconClass} />
      ) : (
        <PlayIcon className={iconClass} />
      )}
    </button>
  );
}
