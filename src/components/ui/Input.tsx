import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label; also wires up htmlFor/id for a11y. Omit for bare inputs
   *  (e.g. the search field inside the selector, which uses a placeholder). */
  label?: string;
}

const FIELD =
  'h-9 w-full rounded-[10px] surface-deep px-3 text-sm text-fg ' +
  'placeholder:text-fg-muted tabular-nums ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

/** Text/number input on the deep surface with an accent focus ring. The
 *  gradient focus ring from DESIGN-v2 §2 is approximated here with a solid
 *  accent ring; the true gradient ring is a Stage 8 polish item. */
export function Input({ label, id, className, ...rest }: InputProps) {
  const fieldId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const field = <input id={fieldId} className={cn(FIELD, className)} {...rest} />;

  if (!label) return field;
  return (
    <label htmlFor={fieldId} className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        {label}
      </span>
      {field}
    </label>
  );
}
