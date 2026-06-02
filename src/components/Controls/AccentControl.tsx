import { useMetronomeStore } from '../../state/metronome';
import { getBeatGrouping } from '../../meter';

/** Per-pulse accent toggles (DESIGN tokens). Defaults to pulse 1 only; an
 *  accented pulse plays a louder, higher click (SPEC §1). Free mode only. */
export function AccentControl() {
  const timeSignature = useMetronomeStore((s) => s.timeSignature);
  const accentPattern = useMetronomeStore((s) => s.accentPattern);
  const toggleAccent = useMetronomeStore((s) => s.toggleAccent);

  const { pulsesPerBar } = getBeatGrouping(timeSignature);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">
        Accents
      </legend>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: pulsesPerBar }, (_, i) => {
          const accented = accentPattern[i] ?? i === 0;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={accented}
              onClick={() => toggleAccent(i)}
              aria-label={`Beat ${i + 1} accent`}
              className={`h-9 w-9 rounded-md text-sm font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                accented
                  ? 'bg-sky-500 text-white dark:bg-sky-400 dark:text-neutral-950'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
