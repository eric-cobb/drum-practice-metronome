import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../ui';

interface ConfigPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  value: string;
  /** Active = a configuration is set; gets a purple border + faint tint. */
  active?: boolean;
}

/** A single config pill (DESIGN-v2 §6 "Config pills"): 128×52, small-caps label
 *  over a value, with a ▾ chevron. Active pills carry a purple border and tint;
 *  inactive/disabled pills (e.g. "Dropout — Off") are muted. */
export function ConfigPill({
  label,
  value,
  active = false,
  disabled = false,
  className,
  ...rest
}: ConfigPillProps) {
  const style: CSSProperties = active
    ? { borderColor: '#8b5cf6', borderWidth: '0.7px', backgroundColor: 'rgba(139,92,246,0.06)' }
    : {};

  return (
    <button
      type="button"
      disabled={disabled}
      style={style}
      className={cn(
        'surface-deep flex h-[52px] w-32 flex-col items-start justify-center gap-0.5 rounded-[11px] px-3 text-left',
        'transition duration-[120ms] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        disabled ? 'cursor-default opacity-70' : 'hover:brightness-110',
        className,
      )}
      {...rest}
    >
      <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        {label}
      </span>
      <span className="flex w-full items-center justify-between gap-1">
        <span
          className={cn(
            'truncate text-sm font-medium tabular-nums',
            active ? 'text-fg' : 'text-fg-muted',
          )}
        >
          {value}
        </span>
        {!disabled && (
          <ChevronDown size={13} strokeWidth={1.5} className="shrink-0 text-fg-tertiary" aria-hidden />
        )}
      </span>
    </button>
  );
}
