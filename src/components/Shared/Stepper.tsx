const stepButton =
  'flex h-9 w-9 items-center justify-center rounded-md text-lg text-neutral-900 ' +
  'hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent ' +
  'dark:text-neutral-50 dark:hover:bg-neutral-800 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** Numeric stepper: −/+ buttons around a number input, clamped to [min, max]
 *  (DESIGN tokens). Used in the rep-counter and settings popovers/sheets. */
export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const id = `stepper-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor={id}
        className="text-sm text-neutral-900 dark:text-neutral-50"
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={stepButton}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 w-14 rounded-md border border-neutral-200 bg-transparent px-2 text-center text-sm tabular-nums text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-neutral-800 dark:text-neutral-50"
        />
        <button
          type="button"
          className={stepButton}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
