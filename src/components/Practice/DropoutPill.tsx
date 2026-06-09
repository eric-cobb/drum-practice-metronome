import {
  useMetronomeStore,
  DEFAULT_SCHEDULED_DROPOUT,
  DEFAULT_RANDOM_DROPOUT,
  BARS_ON_MIN,
  BARS_ON_MAX,
  BARS_OFF_MIN,
  BARS_OFF_MAX,
  MUTE_PROBABILITY_MIN,
  MUTE_PROBABILITY_MAX,
  MAX_CONSECUTIVE_MIN,
  MAX_CONSECUTIVE_MAX,
  MIN_BETWEEN_MIN,
  MIN_BETWEEN_MAX,
} from '../../state/metronome';
import type { DropoutConfig } from '../../types';
import { Popover, Stepper, cn } from '../ui';
import { ConfigPill } from './ConfigPill';

type DropoutMode = 'off' | 'scheduled' | 'random';

const MODES: { value: DropoutMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'random', label: 'Random' },
];

/** Pill summary text (DESIGN-v2 §6). */
function summary(cfg: DropoutConfig | null): string {
  if (!cfg) return 'Off';
  if (cfg.mode === 'scheduled') return `${cfg.barsOn} on · ${cfg.barsOff} off`;
  return `Random ${cfg.muteProbability}%`;
}

function DropoutPanel() {
  const dropout = useMetronomeStore((s) => s.dropout);
  const setDropout = useMetronomeStore((s) => s.setDropout);
  const mode: DropoutMode = dropout?.mode ?? 'off';

  const selectMode = (next: DropoutMode) => {
    if (next === mode) return;
    if (next === 'off') setDropout(null);
    else if (next === 'scheduled') setDropout(DEFAULT_SCHEDULED_DROPOUT);
    else setDropout(DEFAULT_RANDOM_DROPOUT);
  };

  return (
    <div className="flex w-72 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
          Click dropout
        </span>
        <div role="radiogroup" aria-label="Dropout mode" className="surface-deep flex rounded-lg p-0.5">
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => selectMode(value)}
              className={cn(
                'h-7 flex-1 rounded-md text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                mode === value ? 'surface-card text-fg' : 'text-fg-tertiary hover:text-fg-secondary',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {dropout?.mode === 'scheduled' && (
        <div className="flex flex-col gap-3">
          <Stepper
            label="Bars on"
            value={dropout.barsOn}
            min={BARS_ON_MIN}
            max={BARS_ON_MAX}
            onChange={(v) => setDropout({ ...dropout, barsOn: v })}
          />
          <Stepper
            label="Bars off"
            value={dropout.barsOff}
            min={BARS_OFF_MIN}
            max={BARS_OFF_MAX}
            onChange={(v) => setDropout({ ...dropout, barsOff: v })}
          />
        </div>
      )}

      {dropout?.mode === 'random' && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-sm text-fg">
              Mute probability
              <span className="tabular-nums text-fg-tertiary">{dropout.muteProbability}%</span>
            </span>
            <input
              type="range"
              min={MUTE_PROBABILITY_MIN}
              max={MUTE_PROBABILITY_MAX}
              value={dropout.muteProbability}
              onChange={(e) => setDropout({ ...dropout, muteProbability: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
              aria-label="Mute probability"
            />
          </label>
          <Stepper
            label="Max consecutive muted"
            value={dropout.maxConsecutiveMuted}
            min={MAX_CONSECUTIVE_MIN}
            max={MAX_CONSECUTIVE_MAX}
            onChange={(v) => setDropout({ ...dropout, maxConsecutiveMuted: v })}
          />
          <Stepper
            label="Min bars between"
            value={dropout.minBarsBetween}
            min={MIN_BETWEEN_MIN}
            max={MIN_BETWEEN_MAX}
            onChange={(v) => setDropout({ ...dropout, minBarsBetween: v })}
          />
        </div>
      )}

      <p className="text-[11px] text-fg-muted">
        Muted bars stay silent but the beat indicator keeps pulsing and reps keep counting.
      </p>
    </div>
  );
}

/** Free-mode dropout config pill + dropdown (SPEC §5). Active when dropout is on. */
export function DropoutPill() {
  const dropout = useMetronomeStore((s) => s.dropout);
  return (
    <Popover
      placement="top"
      align="center"
      label="Click dropout"
      widthClass="w-auto"
      trigger={({ toggle }) => (
        <ConfigPill
          data-popover-trigger
          onClick={toggle}
          label="Dropout"
          value={summary(dropout)}
          active={dropout !== null}
        />
      )}
    >
      {() => <DropoutPanel />}
    </Popover>
  );
}
