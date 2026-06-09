import { Power } from 'lucide-react';
import {
  useMetronomeStore,
  BPM_MIN,
  BPM_MAX,
  STEP_SIZE_MIN,
  STEP_SIZE_MAX,
  RAMP_EVERY_REPS_MIN,
  RAMP_EVERY_REPS_MAX,
  RAMP_EVERY_SECONDS_MIN,
  RAMP_EVERY_SECONDS_MAX,
} from '../../state/metronome';
import type { RampConfig } from '../../types';
import { Popover, Stepper, Toggle, Button } from '../ui';
import { ConfigPill } from './ConfigPill';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function summary(ramp: RampConfig | null): string {
  if (!ramp) return 'Off';
  return `${ramp.startBpm}→${ramp.endBpm}`;
}

/** Default ramp from the current tempo up ~40 BPM, +2 every 2 reps. */
function makeDefaultRamp(bpm: number): RampConfig {
  return {
    startBpm: bpm,
    endBpm: clamp(bpm + 40, BPM_MIN, BPM_MAX),
    stepSize: 2,
    trigger: { type: 'reps', everyN: 2 },
    autoStopAtEnd: true,
  };
}

/** The ramp settings, shown immediately on open (no enable step — clicking the
 *  pill enables the ramp). "Turn off ramp" disables it and closes. */
function RampPanel({ close }: { close: () => void }) {
  const ramp = useMetronomeStore((s) => s.ramp);
  const setRamp = useMetronomeStore((s) => s.setRamp);
  if (!ramp) return null; // enabled by the trigger before opening

  return (
    <div className="flex w-72 flex-col gap-3">
      <Stepper
        label="Start BPM"
        value={ramp.startBpm}
        min={BPM_MIN}
        max={BPM_MAX}
        onChange={(v) => setRamp({ ...ramp, startBpm: v })}
      />
      <Stepper
        label="End BPM"
        value={ramp.endBpm}
        min={BPM_MIN}
        max={BPM_MAX}
        onChange={(v) => setRamp({ ...ramp, endBpm: v })}
      />
      <Stepper
        label="Step size (BPM)"
        value={ramp.stepSize}
        min={STEP_SIZE_MIN}
        max={STEP_SIZE_MAX}
        onChange={(v) => setRamp({ ...ramp, stepSize: v })}
      />

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
          Step every
        </span>
        <div role="radiogroup" aria-label="Step trigger" className="surface-deep flex rounded-lg p-0.5">
          {(['reps', 'seconds'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={ramp.trigger.type === type}
              onClick={() =>
                setRamp({
                  ...ramp,
                  trigger:
                    type === 'reps'
                      ? { type: 'reps', everyN: 2 }
                      : { type: 'seconds', everyN: 30 },
                })
              }
              className={
                'h-7 flex-1 rounded-md text-xs font-medium capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
                (ramp.trigger.type === type
                  ? 'surface-card text-fg'
                  : 'text-fg-tertiary hover:text-fg-secondary')
              }
            >
              {type}
            </button>
          ))}
        </div>
        <Stepper
          label={ramp.trigger.type === 'reps' ? 'Reps per step' : 'Seconds per step'}
          value={ramp.trigger.everyN}
          min={ramp.trigger.type === 'reps' ? RAMP_EVERY_REPS_MIN : RAMP_EVERY_SECONDS_MIN}
          max={ramp.trigger.type === 'reps' ? RAMP_EVERY_REPS_MAX : RAMP_EVERY_SECONDS_MAX}
          onChange={(v) => setRamp({ ...ramp, trigger: { ...ramp.trigger, everyN: v } })}
        />
      </div>

      <Toggle
        label="Auto-stop at end"
        checked={ramp.autoStopAtEnd}
        onChange={(v) => setRamp({ ...ramp, autoStopAtEnd: v })}
      />

      <p className="text-[11px] text-fg-muted">
        Playback starts at the start tempo and climbs to the end tempo. Whichever
        stops first — the ramp end or the rep target — ends the session.
      </p>

      <div className="border-t border-line pt-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<Power size={14} strokeWidth={1.5} />}
          onClick={() => {
            setRamp(null);
            close();
          }}
        >
          Turn off ramp
        </Button>
      </div>
    </div>
  );
}

/** Free-mode tempo-ramp config pill + dropdown (SPEC §6). Clicking the pill
 *  enables the ramp (if off) and opens straight to its settings. */
export function RampPill() {
  const ramp = useMetronomeStore((s) => s.ramp);
  const setRamp = useMetronomeStore((s) => s.setRamp);
  const bpm = useMetronomeStore((s) => s.bpm);

  return (
    <Popover
      placement="top"
      align="center"
      label="Tempo ramp"
      widthClass="w-auto"
      trigger={({ toggle }) => (
        <ConfigPill
          data-popover-trigger
          onClick={() => {
            if (ramp === null) setRamp(makeDefaultRamp(bpm));
            toggle();
          }}
          label="Ramp"
          value={summary(ramp)}
          active={ramp !== null}
        />
      )}
    >
      {(close) => <RampPanel close={close} />}
    </Popover>
  );
}
