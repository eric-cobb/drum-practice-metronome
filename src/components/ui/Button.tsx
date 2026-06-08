import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading icon (Lucide), sized by the caller. */
  icon?: ReactNode;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium ' +
  'transition duration-[120ms] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-transparent disabled:opacity-40 disabled:pointer-events-none';

/** Variant treatments per DESIGN-v2 §6 / §2:
 *  - primary: the purple→cyan gradient, white text, hover brightens
 *  - secondary: deep-card surface, foreground text, hairline border
 *  - ghost: transparent, hover tint only
 *  - destructive: muted-red border + text, no fill (DESIGN-v2 §2 semantic) */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-gradient text-white border border-white/15 hover:brightness-110 shadow-[0_2px_4px_rgba(0,0,0,0.3)]',
  secondary: 'surface-deep text-fg hover:brightness-110',
  ghost: 'text-fg-secondary hover:bg-fg/5 hover:text-fg',
  destructive: 'border border-danger text-danger-text hover:bg-danger/10',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

/** General-purpose button. The play button is a separate primitive
 *  (PlayButton) because of its bloom composition and sizing. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
