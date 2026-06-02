import {
  useMetronomeStore,
  NUMERATOR_MIN,
  NUMERATOR_MAX,
} from '../../state/metronome';
import { TIME_SIGNATURE_PRESETS, formatTimeSignature } from '../../types';
import type { Denominator, TimeSignature } from '../../types';

const DENOMINATORS: Denominator[] = [2, 4, 8];

function sameTimeSignature(a: TimeSignature, b: TimeSignature): boolean {
  return (
    a.numerator === b.numerator &&
    a.denominator === b.denominator &&
    (a.displayAs ?? null) === (b.displayAs ?? null)
  );
}

const stepBtn =
  'flex h-9 w-9 items-center justify-center rounded-md text-lg text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

function choiceClass(selected: boolean): string {
  return `rounded-md text-sm font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
    selected
      ? 'bg-sky-500 text-white dark:bg-sky-400 dark:text-neutral-950'
      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
  }`;
}

/** Time signature: numerator stepper, denominator toggle, and quick presets
 *  (DESIGN tokens). Free mode only. */
export function TimeSignatureControl() {
  const timeSignature = useMetronomeStore((s) => s.timeSignature);
  const setNumerator = useMetronomeStore((s) => s.setNumerator);
  const setDenominator = useMetronomeStore((s) => s.setDenominator);
  const setTimeSignature = useMetronomeStore((s) => s.setTimeSignature);

  const { numerator, denominator } = timeSignature;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">
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
          <span className="w-16 text-center text-lg tabular-nums text-neutral-900 dark:text-neutral-50">
            {formatTimeSignature(timeSignature)}
          </span>
          <button
            type="button"
            onClick={() => setNumerator(numerator + 1)}
            disabled={numerator >= NUMERATOR_MAX}
            aria-label="More beats per bar"
            className={stepBtn}
          >
            +
          </button>
        </div>

        <div className="flex gap-2" role="group" aria-label="Beat unit">
          {DENOMINATORS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={denominator === d}
              onClick={() => setDenominator(d)}
              className={`h-9 w-9 ${choiceClass(denominator === d)}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TIME_SIGNATURE_PRESETS.map((preset) => {
          const label = formatTimeSignature(preset);
          const selected = sameTimeSignature(preset, timeSignature);
          return (
            <button
              key={`${preset.numerator}-${preset.denominator}-${preset.displayAs ?? ''}`}
              type="button"
              aria-pressed={selected}
              aria-label={
                preset.displayAs === 'cut'
                  ? 'Cut time (2/2)'
                  : preset.displayAs === 'common'
                    ? 'Common time (4/4)'
                    : `${preset.numerator}/${preset.denominator}`
              }
              onClick={() => setTimeSignature(preset)}
              className={`h-9 px-2.5 ${choiceClass(selected)}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
