import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { cn } from './cn';

/** Exercise tile states (DESIGN-v2 §6 "Tile states"):
 *  - default: not yet attempted
 *  - attempted: started, not completed (arc badge)
 *  - completed: hit target at/above default BPM (check badge)
 *  - mastered: best BPM ≥ 1.5× default (gold diamond badge)
 *  - current: the active exercise (thick accent border, rep progress bar) */
export type TileState =
  | 'default'
  | 'attempted'
  | 'completed'
  | 'mastered'
  | 'current';

interface TileProps {
  number: number;
  name?: string;
  state?: TileState;
  onClick?: () => void;
  /** Rep position 0–1, shown as a bottom progress bar on the current tile. */
  progress?: number;
  /** Selector tiles are 56px; the grid uses 64px (SPEC §7). */
  size?: number;
}

interface StateStyle {
  borderWidth: string;
  borderColor: string;
  /** Soft tint overlay (color or gradient), painted above the surface. */
  tint?: string;
  /** Raised inner-highlight strength for accent/current states. */
  hl?: string;
}

const STATE_STYLE: Record<TileState, StateStyle> = {
  default: { borderWidth: '0.5px', borderColor: 'var(--border-accent)' },
  attempted: {
    borderWidth: '0.8px',
    borderColor: 'var(--border-accent)',
    tint: 'rgba(139, 92, 246, 0.04)',
  },
  completed: {
    borderWidth: '0.8px',
    borderColor: '#8b5cf6',
    tint: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))',
    hl: 'rgba(255,255,255,0.12)',
  },
  mastered: {
    borderWidth: '0.8px',
    borderColor: '#fbbf24',
    tint: 'rgba(251, 191, 36, 0.05)',
    hl: 'rgba(255,255,255,0.12)',
  },
  current: {
    borderWidth: '1.5px',
    borderColor: '#8b5cf6',
    tint: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.10))',
    hl: 'rgba(255,255,255,0.14)',
  },
};

/** Small arc badge for the attempted state — a ring with a quarter open. */
function ArcBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <circle
        cx="6"
        cy="6"
        r="4.5"
        fill="none"
        stroke="var(--color-accent-text)"
        strokeWidth="1.5"
        strokeDasharray="21 7"
        strokeLinecap="round"
        transform="rotate(-90 6 6)"
      />
    </svg>
  );
}

function CheckBadge() {
  return (
    <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-accent">
      <Check size={9} strokeWidth={3} className="text-white" aria-hidden />
    </span>
  );
}

function DiamondBadge() {
  return (
    <span
      className="block h-[10px] w-[10px] bg-gold"
      style={{ transform: 'rotate(45deg)' }}
      aria-hidden
    />
  );
}

const BADGE: Partial<Record<TileState, () => React.ReactElement>> = {
  attempted: ArcBadge,
  completed: CheckBadge,
  mastered: DiamondBadge,
};

/** Numbered exercise tile for the selector grid and recents row. The Library
 *  view's larger detailed cards (Stage 5) are a separate component. */
export function Tile({
  number,
  name,
  state = 'default',
  onClick,
  progress,
  size = 64,
}: TileProps) {
  const s = STATE_STYLE[state];
  const Badge = BADGE[state];
  const style: CSSProperties = {
    width: size,
    height: size,
    borderWidth: s.borderWidth,
    borderColor: s.borderColor,
  };
  // Custom property for the raised inner-highlight on accent/current states.
  if (s.hl) (style as Record<string, string>)['--hl'] = s.hl;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name ? `Exercise ${number}: ${name}` : `Exercise ${number}`}
      aria-current={state === 'current' ? 'true' : undefined}
      className={cn(
        'surface-tile relative overflow-hidden rounded-[11px] text-fg',
        'transition duration-[120ms] hover:brightness-110',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
      )}
      style={style}
    >
      {/* Tint overlay above the surface gradient, below the content. */}
      {s.tint && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[11px]"
          style={{ background: s.tint }}
          aria-hidden
        />
      )}

      <span className="relative flex h-full flex-col items-center justify-center px-1">
        <span className="text-base font-medium leading-none tabular-nums">{number}</span>
        {name && (
          <span className="mt-1 line-clamp-1 max-w-full text-[9px] leading-tight text-fg-tertiary">
            {name}
          </span>
        )}
      </span>

      {Badge && (
        <span className="absolute right-1 top-1 flex items-center justify-center">
          <Badge />
        </span>
      )}

      {state === 'current' && progress != null && (
        <span
          className="pointer-events-none absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-fg/10"
          aria-hidden
        >
          <span
            className="block h-full rounded-full bg-accent-gradient"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
          />
        </span>
      )}
    </button>
  );
}
