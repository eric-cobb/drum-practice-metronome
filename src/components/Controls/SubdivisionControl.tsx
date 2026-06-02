import { useMetronomeStore } from '../../state/metronome';
import { SUBDIVISION_LABELS, SUBDIVISION_ORDER } from '../../types';

/** Segmented picker for the click subdivision (DESIGN tokens). Free mode only. */
export function SubdivisionControl() {
  const subdivision = useMetronomeStore((s) => s.subdivision);
  const setSubdivision = useMetronomeStore((s) => s.setSubdivision);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">
        Subdivision
      </legend>
      <div className="flex flex-wrap gap-2">
        {SUBDIVISION_ORDER.map((value) => {
          const selected = value === subdivision;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setSubdivision(value)}
              className={`h-9 rounded-md px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                selected
                  ? 'bg-sky-500 text-white dark:bg-sky-400 dark:text-neutral-950'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {SUBDIVISION_LABELS[value]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
