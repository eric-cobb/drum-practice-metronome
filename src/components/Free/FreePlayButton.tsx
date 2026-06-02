import { useRef } from 'react';
import { useMetronomeStore } from '../../state/metronome';
import { start, stop, skip } from '../../audio/transport';
import { PlayIcon, PauseIcon } from '../Shared/icons';
import { useBeatPulse } from '../Transport/useBeatPulse';

const iconClass =
  'h-20 w-20 text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.25))]';

/** The giant central transport button for Free mode (DESIGN §Free Mode Layout,
 *  §Primary button treatment): 240px stopped / 280px playing, gradient + bloom,
 *  and it *is* the beat indicator — sky pulse + one soft ring on unaccented
 *  beats, cyan shift + intensified bloom + two rings on accented beats. During a
 *  count-in it skips into playback (Phase 5 behavior). */
export function FreePlayButton() {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const countIn = useMetronomeStore((s) => s.countIn);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const skyRingRef = useRef<HTMLSpanElement>(null);
  const cyanRing1Ref = useRef<HTMLSpanElement>(null);
  const cyanRing2Ref = useRef<HTMLSpanElement>(null);

  useBeatPulse({
    button: buttonRef,
    skyRing: skyRingRef,
    cyanRing1: cyanRing1Ref,
    cyanRing2: cyanRing2Ref,
  });

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

  const ringClass =
    'pointer-events-none absolute inset-0 rounded-full border-2 opacity-0';

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`play-button flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4 focus-visible:ring-offset-white motion-safe:transition-[width,height] motion-safe:duration-200 motion-safe:ease-out dark:focus-visible:ring-offset-neutral-950 ${
          isPlaying ? 'is-playing h-[280px] w-[280px]' : 'h-60 w-60'
        }`}
      >
        {showPause ? (
          <PauseIcon className={iconClass} />
        ) : (
          <PlayIcon className={iconClass} />
        )}
      </button>
      {/* Sonar rings — animated via WAAPI on beats; invisible at rest. */}
      <span
        ref={skyRingRef}
        aria-hidden
        className={`${ringClass} border-sky-400`}
      />
      <span
        ref={cyanRing1Ref}
        aria-hidden
        className={`${ringClass} border-cyan-400 dark:border-cyan-300`}
      />
      <span
        ref={cyanRing2Ref}
        aria-hidden
        className={`${ringClass} border-cyan-400 dark:border-cyan-300`}
      />
    </div>
  );
}
