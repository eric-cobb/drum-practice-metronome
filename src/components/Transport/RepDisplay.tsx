import {
  useMetronomeStore,
  BARS_PER_REP_MIN,
  BARS_PER_REP_MAX,
  TARGET_REPS_MIN,
  TARGET_REPS_MAX,
} from '../../state/metronome';
import { Popover } from '../Shared/Popover';
import { Stepper } from '../Shared/Stepper';
import { Toggle } from '../Shared/Toggle';

/** Rep-counter config popover (DESIGN §Rep Counter Popover), available only when
 *  stopped. */
function RepPopoverBody() {
  const barsPerRep = useMetronomeStore((s) => s.barsPerRep);
  const targetReps = useMetronomeStore((s) => s.targetReps);
  const autoStop = useMetronomeStore((s) => s.autoStop);
  const setBarsPerRep = useMetronomeStore((s) => s.setBarsPerRep);
  const setTargetReps = useMetronomeStore((s) => s.setTargetReps);
  const setAutoStop = useMetronomeStore((s) => s.setAutoStop);

  return (
    <div className="flex flex-col gap-3">
      <Stepper
        label="Bars per rep"
        value={barsPerRep}
        min={BARS_PER_REP_MIN}
        max={BARS_PER_REP_MAX}
        onChange={setBarsPerRep}
      />
      <Stepper
        label="Target reps"
        value={targetReps}
        min={TARGET_REPS_MIN}
        max={TARGET_REPS_MAX}
        onChange={setTargetReps}
      />
      <Toggle
        label="Auto-stop at target"
        checked={autoStop}
        onChange={setAutoStop}
      />
    </div>
  );
}

const numberClass =
  'font-semibold leading-none tabular-nums motion-safe:transition-all motion-safe:duration-200';

interface RepDisplayProps {
  /** 'exercise' → 48/96px; 'free' → 64/112px, tracking-tight (DESIGN §Typography). */
  variant?: 'exercise' | 'free';
  placement?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
}

/** Rep counter. Editable (popover) when stopped; a live "current / target"
 *  display when playing, target muted (DESIGN §Transport, §Free Mode Layout). */
export function RepDisplay({
  variant = 'exercise',
  placement = 'top',
  align = 'end',
}: RepDisplayProps) {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const currentRep = useMetronomeStore((s) => s.currentRep);
  const targetReps = useMetronomeStore((s) => s.targetReps);

  const playingSize =
    variant === 'free' ? 'text-[112px] tracking-tight' : 'text-8xl';
  const stoppedSize =
    variant === 'free' ? 'text-[64px] tracking-tight' : 'text-5xl';

  if (isPlaying) {
    return (
      <div
        className={`${numberClass} ${playingSize} text-neutral-900 dark:text-neutral-50`}
        role="status"
        aria-live="polite"
        aria-label={`Rep ${currentRep} of ${targetReps}`}
      >
        <span>{currentRep}</span>
        <span className="text-neutral-400 dark:text-neutral-600">
          {' '}
          / {targetReps}
        </span>
      </div>
    );
  }

  return (
    <Popover
      placement={placement}
      align={align}
      label="Rep counter"
      trigger={({ toggle }) => (
        <button
          type="button"
          data-popover-trigger
          onClick={toggle}
          aria-label="Rep counter settings"
          className={`${numberClass} ${stoppedSize} rounded-md text-neutral-900 hover:text-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-neutral-50 dark:hover:text-sky-400`}
        >
          <span>{currentRep}</span>
          <span className="text-neutral-400 dark:text-neutral-600">
            {' '}
            / {targetReps}
          </span>
        </button>
      )}
    >
      {() => <RepPopoverBody />}
    </Popover>
  );
}
