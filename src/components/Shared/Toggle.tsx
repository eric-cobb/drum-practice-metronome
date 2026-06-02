interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Labeled on/off switch (DESIGN tokens). An explicit On/Off word accompanies
 *  the switch so color isn't the sole state indicator (DESIGN §Accessibility). */
export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-neutral-900 dark:text-neutral-50">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-xs text-neutral-500" aria-hidden>
          {checked ? 'On' : 'Off'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 ${
            checked
              ? 'bg-sky-500 dark:bg-sky-400'
              : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all dark:bg-neutral-950 ${
              checked ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </span>
    </div>
  );
}
