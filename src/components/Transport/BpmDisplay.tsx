import { useMetronomeStore, BPM_MIN, BPM_MAX } from '../../state/metronome';
import { Popover } from '../Shared/Popover';

const stepButton =
  'flex h-9 w-9 items-center justify-center rounded-md text-lg text-neutral-900 ' +
  'hover:bg-neutral-100 dark:text-neutral-50 dark:hover:bg-neutral-800 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

/** BPM popover (DESIGN §BPM Popover): editable number, slider, ± (Shift = ±5).
 *  Tap tempo is Phase 9, so it's omitted here. */
function BpmPopoverBody() {
  const bpm = useMetronomeStore((s) => s.bpm);
  const setBpm = useMetronomeStore((s) => s.setBpm);
  const nudgeBpm = useMetronomeStore((s) => s.nudgeBpm);

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        type="number"
        min={BPM_MIN}
        max={BPM_MAX}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Beats per minute"
        className="w-full bg-transparent text-center text-5xl font-semibold tabular-nums tracking-tight text-neutral-900 focus:outline-none dark:text-neutral-50"
      />
      <input
        type="range"
        min={BPM_MIN}
        max={BPM_MAX}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Tempo slider"
        className="w-full accent-sky-500"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={stepButton}
          onClick={(e) => nudgeBpm(e.shiftKey ? -5 : -1)}
          aria-label="Decrease tempo"
        >
          −
        </button>
        <span className="text-xs text-neutral-500">Shift = ±5</span>
        <button
          type="button"
          className={stepButton}
          onClick={(e) => nudgeBpm(e.shiftKey ? 5 : 1)}
          aria-label="Increase tempo"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface BpmDisplayProps {
  /** 'exercise' → 48/96px (transport); 'free' → 64/128px (central composition). */
  variant?: 'exercise' | 'free';
  placement?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
}

/** Large clickable BPM number; opens the BPM popover (DESIGN §Transport, §Free
 *  Mode Layout). Size depends on mode and play state. */
export function BpmDisplay({
  variant = 'exercise',
  placement = 'top',
  align = 'start',
}: BpmDisplayProps) {
  const bpm = useMetronomeStore((s) => s.bpm);
  const isPlaying = useMetronomeStore((s) => s.isPlaying);

  // Sizes per DESIGN §Typography. Free numerals are larger and tracking-tight;
  // Exercise numerals stay supporting-sized with default tracking.
  const size =
    variant === 'free'
      ? isPlaying
        ? 'text-[180px] tracking-tight'
        : 'text-8xl tracking-tight'
      : isPlaying
        ? 'text-8xl'
        : 'text-5xl';

  return (
    <Popover
      placement={placement}
      align={align}
      label="Tempo"
      trigger={({ toggle }) => (
        <button
          type="button"
          data-popover-trigger
          onClick={toggle}
          aria-label="Tempo, beats per minute"
          className={`rounded-md font-semibold leading-none tabular-nums text-neutral-900 hover:text-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 motion-safe:transition-all motion-safe:duration-200 dark:text-neutral-50 dark:hover:text-sky-400 ${size}`}
        >
          <span aria-live="polite">{bpm}</span>
        </button>
      )}
    >
      {() => <BpmPopoverBody />}
    </Popover>
  );
}
