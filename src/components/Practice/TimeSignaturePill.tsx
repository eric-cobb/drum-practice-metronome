import {
  useMetronomeStore,
  NUMERATOR_MIN,
  NUMERATOR_MAX,
} from '../../state/metronome';
import { TIME_SIGNATURE_PRESETS, formatTimeSignature } from '../../types';
import type { Denominator, TimeSignature } from '../../types';
import { Popover, cn } from '../ui';
import { ConfigPill } from './ConfigPill';

const DENOMINATORS: Denominator[] = [2, 4, 8];

function sameTimeSignature(a: TimeSignature, b: TimeSignature): boolean {
  return (
    a.numerator === b.numerator &&
    a.denominator === b.denominator &&
    (a.displayAs ?? null) === (b.displayAs ?? null)
  );
}

const stepBtn =
  'flex h-9 w-9 items-center justify-center rounded-[8px] text-lg text-fg surface-deep ' +
  'hover:brightness-110 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function choice(selected: boolean): string {
  return cn(
    'rounded-[8px] text-sm font-medium tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    selected ? 'bg-accent-gradient text-white' : 'surface-deep text-fg-secondary hover:brightness-110',
  );
}

/** Time-signature control inside the pill dropdown: numerator stepper,
 *  denominator toggle, and quick presets (Free mode). */
function TimeSignatureControl() {
  const timeSignature = useMetronomeStore((s) => s.timeSignature);
  const setNumerator = useMetronomeStore((s) => s.setNumerator);
  const setDenominator = useMetronomeStore((s) => s.setDenominator);
  const setTimeSignature = useMetronomeStore((s) => s.setTimeSignature);
  const { numerator, denominator } = timeSignature;

  return (
    <fieldset className="flex w-72 flex-col gap-3">
      <legend className="mb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        Time signature
      </legend>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNumerator(numerator - 1)}
            disabled={numerator <= NUMERATOR_MIN}
            aria-label="Fewer beats per bar"
            className={stepBtn}
          >
            −
          </button>
          <span className="w-14 text-center text-lg tabular-nums text-fg">
            {formatTimeSignature(timeSignature)}
          </span>
          <button
            type="button"
            onClick={() => setNumerator(numerator + 1)}
            disabled={numerator >= NUMERATOR_MAX}
            aria-label="More beats per bar"
            className={stepBtn}
          >
            ＋
          </button>
        </div>
        <div className="flex gap-2" role="group" aria-label="Beat unit">
          {DENOMINATORS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={denominator === d}
              onClick={() => setDenominator(d)}
              className={cn('h-9 w-9', choice(denominator === d))}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {TIME_SIGNATURE_PRESETS.map((preset) => {
          const selected = sameTimeSignature(preset, timeSignature);
          return (
            <button
              key={`${preset.numerator}-${preset.denominator}-${preset.displayAs ?? ''}`}
              type="button"
              aria-pressed={selected}
              onClick={() => setTimeSignature(preset)}
              className={cn('h-9 px-2.5', choice(selected))}
            >
              {formatTimeSignature(preset)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Free-mode time-signature config pill + dropdown. Always "active" (a meter is
 *  always set). */
export function TimeSignaturePill() {
  const timeSignature = useMetronomeStore((s) => s.timeSignature);
  return (
    <Popover
      placement="top"
      align="center"
      label="Time signature"
      widthClass="w-auto"
      trigger={({ toggle }) => (
        <ConfigPill
          data-popover-trigger
          onClick={toggle}
          label="Time sig"
          value={formatTimeSignature(timeSignature)}
          active
        />
      )}
    >
      {() => <TimeSignatureControl />}
    </Popover>
  );
}
