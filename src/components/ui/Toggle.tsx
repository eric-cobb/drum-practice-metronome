import { cn } from './cn';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Hide the visible label when the row already names the control. The On/Off
   *  word and aria-label remain for accessibility. */
  hideLabel?: boolean;
}

/** On/off switch. The track shows the accent gradient when on. An explicit
 *  On/Off word accompanies the switch so color isn't the sole state indicator
 *  (SPEC §10 accessibility). */
export function Toggle({ label, checked, onChange, hideLabel }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {!hideLabel && <span className="text-sm text-fg">{label}</span>}
      <span className="flex items-center gap-2">
        <span className="text-xs text-fg-muted" aria-hidden>
          {checked ? 'On' : 'Off'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative h-6 w-11 rounded-full transition duration-[120ms]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
            checked ? 'bg-accent-gradient' : 'bg-fg/15',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-[120ms]',
              checked ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </button>
      </span>
    </div>
  );
}
