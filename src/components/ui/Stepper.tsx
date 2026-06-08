import { cn } from './cn';

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const stepButton =
  'flex h-8 w-8 items-center justify-center rounded-[8px] text-lg text-fg ' +
  'surface-deep hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** Numeric stepper: −/＋ around a clamped number input (v2). Used in the rep
 *  and config dropdowns. */
export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const id = `stepper-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-fg">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
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
          className={cn(
            'h-8 w-14 rounded-[8px] surface-deep px-2 text-center text-sm tabular-nums text-fg',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        />
        <button
          type="button"
          className={stepButton}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}
