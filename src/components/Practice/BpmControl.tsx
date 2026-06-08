import { useMetronomeStore, BPM_MIN, BPM_MAX } from '../../state/metronome';
import { Popover, cn } from '../ui';

const stepButton =
  'flex h-9 w-9 items-center justify-center rounded-[8px] text-lg text-fg ' +
  'surface-deep hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** BPM dropdown (DESIGN-v2): editable number, slider, ± (Shift = ±5). Tap tempo
 *  is Phase 9. */
function BpmPopoverBody() {
  const bpm = useMetronomeStore((s) => s.bpm);
  const setBpm = useMetronomeStore((s) => s.setBpm);
  const nudgeBpm = useMetronomeStore((s) => s.nudgeBpm);

  return (
    <div className="flex w-60 flex-col items-center gap-3">
      <input
        type="number"
        min={BPM_MIN}
        max={BPM_MAX}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Beats per minute"
        className="w-full bg-transparent text-center text-5xl font-medium tabular-nums text-fg focus:outline-none"
      />
      <input
        type="range"
        min={BPM_MIN}
        max={BPM_MAX}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Tempo slider"
        className="w-full accent-[var(--color-accent)]"
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
        <span className="text-xs text-fg-muted">Shift = ±5</span>
        <button
          type="button"
          className={stepButton}
          onClick={(e) => nudgeBpm(e.shiftKey ? 5 : 1)}
          aria-label="Increase tempo"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

interface BpmControlProps {
  /** 'free' → 56px numerals; 'exercise' → 48px (DESIGN-v2 §4). */
  variant?: 'free' | 'exercise';
  placement?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
}

/** Large clickable BPM with a small-caps label; opens the BPM dropdown. */
export function BpmControl({
  variant = 'free',
  placement = 'bottom',
  align = 'center',
}: BpmControlProps) {
  const bpm = useMetronomeStore((s) => s.bpm);
  const size = variant === 'free' ? 'text-[56px]' : 'text-[48px]';

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        Tempo
      </span>
      <Popover
        placement={placement}
        align={align}
        label="Tempo"
        widthClass="w-auto"
        trigger={({ toggle }) => (
          <button
            type="button"
            data-popover-trigger
            onClick={toggle}
            aria-label="Tempo, beats per minute"
            className={cn(
              'rounded-[10px] px-2 font-medium leading-none tabular-nums text-fg',
              'hover:text-[color:var(--color-accent-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              size,
            )}
          >
            <span aria-live="polite">{bpm}</span>
          </button>
        )}
      >
        {() => <BpmPopoverBody />}
      </Popover>
    </div>
  );
}
