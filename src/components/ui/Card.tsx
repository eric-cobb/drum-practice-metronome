import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/** Surface variant → recipe class (see index.css "Surface recipes").
 *  - card: standard card (Library/History cards, info strip)
 *  - elevated: lighter variant (notation canvas, popovers' bodies)
 *  - deep: deep-card variant (session card, top-bar pills)
 *  - popover: heavier floating shadow */
export type CardSurface = 'card' | 'elevated' | 'deep' | 'popover';

const SURFACE_CLASS: Record<CardSurface, string> = {
  card: 'surface-card',
  elevated: 'surface-elevated',
  deep: 'surface-deep',
  popover: 'surface-popover',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  surface?: CardSurface;
  /** Override the default 14px radius (e.g. 16px popover, 11px tile-like). */
  className?: string;
}

/** Elevated surface with the v2 depth treatment (gradient + layered shadow +
 *  inner top-highlight). The recipe lives in CSS; this just selects it and
 *  applies the radius. Compose padding/layout via `className` (DESIGN-v2 §6). */
export function Card({
  children,
  surface = 'card',
  className,
  ...rest
}: CardProps) {
  return (
    <div className={cn('rounded-[14px]', SURFACE_CLASS[surface], className)} {...rest}>
      {children}
    </div>
  );
}
