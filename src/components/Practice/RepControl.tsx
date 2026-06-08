import {
  useMetronomeStore,
  BARS_PER_REP_MIN,
  BARS_PER_REP_MAX,
  TARGET_REPS_MIN,
  TARGET_REPS_MAX,
} from '../../state/metronome';
import { Popover, Stepper, Toggle, cn } from '../ui';

/** Rep-counter config dropdown (available only when stopped). Bars-per-rep is
 *  editable in Free mode only — in Exercise mode it is the exercise's
 *  pattern.length and fixed (SPEC §2). */
function RepPopoverBody({ showBarsPerRep }: { showBarsPerRep: boolean }) {
  const barsPerRep = useMetronomeStore((s) => s.barsPerRep);
  const targetReps = useMetronomeStore((s) => s.targetReps);
  const autoStop = useMetronomeStore((s) => s.autoStop);
  const setBarsPerRep = useMetronomeStore((s) => s.setBarsPerRep);
  const setTargetReps = useMetronomeStore((s) => s.setTargetReps);
  const setAutoStop = useMetronomeStore((s) => s.setAutoStop);

  return (
    <div className="flex w-60 flex-col gap-3">
      {showBarsPerRep && (
        <Stepper
          label="Bars per rep"
          value={barsPerRep}
          min={BARS_PER_REP_MIN}
          max={BARS_PER_REP_MAX}
          onChange={setBarsPerRep}
        />
      )}
      <Stepper
        label="Target reps"
        value={targetReps}
        min={TARGET_REPS_MIN}
        max={TARGET_REPS_MAX}
        onChange={setTargetReps}
      />
      <Toggle label="Auto-stop at target" checked={autoStop} onChange={setAutoStop} />
    </div>
  );
}

interface RepControlProps {
  variant?: 'free' | 'exercise';
  placement?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
}

/** Rep counter with a small-caps label. Editable (dropdown) when stopped; a live
 *  "current / target" readout while playing, target muted (DESIGN-v2 §4). */
export function RepControl({
  variant = 'free',
  placement = 'bottom',
  align = 'center',
}: RepControlProps) {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const currentRep = useMetronomeStore((s) => s.currentRep);
  const targetReps = useMetronomeStore((s) => s.targetReps);
  const size = variant === 'free' ? 'text-[56px]' : 'text-[48px]';

  const value = (
    <>
      <span>{currentRep}</span>
      <span className="text-fg-muted"> / {targetReps}</span>
    </>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        Reps
      </span>
      {isPlaying ? (
        <div
          className={cn('font-medium leading-none tabular-nums text-fg', size)}
          role="status"
          aria-live="polite"
          aria-label={`Rep ${currentRep} of ${targetReps}`}
        >
          {value}
        </div>
      ) : (
        <Popover
          placement={placement}
          align={align}
          label="Rep counter"
          widthClass="w-auto"
          trigger={({ toggle }) => (
            <button
              type="button"
              data-popover-trigger
              onClick={toggle}
              aria-label="Rep counter settings"
              className={cn(
                'rounded-[10px] px-2 font-medium leading-none tabular-nums text-fg',
                'hover:text-[color:var(--color-accent-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                size,
              )}
            >
              {value}
            </button>
          )}
        >
          {() => <RepPopoverBody showBarsPerRep={variant === 'free'} />}
        </Popover>
      )}
    </div>
  );
}
