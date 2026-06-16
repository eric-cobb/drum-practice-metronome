import { Check } from 'lucide-react';
import type { TileState } from '../../ui';
import { cn } from '../../ui/cn';

/** Trailing status glyph mirroring the tile states (DESIGN-v2 §6): completed =
 *  accent check, mastered = gold diamond, attempted = open arc. Default + current
 *  render no badge (current is labelled separately). */
function StatusBadge({ state }: { state: TileState }) {
  if (state === 'completed') {
    return (
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent"
        aria-hidden
      >
        <Check size={11} strokeWidth={3} className="text-white" />
      </span>
    );
  }
  if (state === 'mastered') {
    return (
      <span
        className="block h-3 w-3 bg-gold"
        style={{ transform: 'rotate(45deg)' }}
        aria-hidden
      />
    );
  }
  if (state === 'attempted') {
    return (
      <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden>
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
  return null;
}

interface ExerciseRowProps {
  number: number;
  name: string;
  state: TileState;
  /** Rep position 0–1, shown as a bar under the name on the current row. */
  progress?: number;
  /** Rep count label for the current row (e.g. "8 / 20 reps"). */
  repLabel?: string;
  onClick: () => void;
}

/** A name-first exercise row for the selector (replaces the old number tiles):
 *  leading number, full name, trailing status. The current row is tinted with a
 *  left accent bar, a "Current" tag, and a rep-progress bar under the name. */
export function ExerciseRow({
  number,
  name,
  state,
  progress,
  repLabel,
  onClick,
}: ExerciseRowProps) {
  const isCurrent = state === 'current';
  const pct = Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isCurrent ? 'true' : undefined}
      aria-label={`Exercise ${number}: ${name}`}
      className={cn(
        'relative flex w-full items-center gap-3 overflow-hidden rounded-[9px] px-2.5 py-2 text-left',
        'min-h-[40px] transition duration-[120ms]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isCurrent ? '' : 'hover:bg-fg/5',
      )}
      style={
        isCurrent
          ? {
              background:
                'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.10))',
            }
          : undefined
      }
    >
      {isCurrent && (
        <span
          className="bg-accent-gradient absolute left-0 top-0 h-full w-[3px]"
          aria-hidden
        />
      )}

      <span
        className={cn(
          'w-6 shrink-0 text-right text-xs tabular-nums',
          isCurrent ? 'text-[color:var(--color-accent-text)]' : 'text-fg-tertiary',
        )}
      >
        {number}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm leading-snug text-fg">{name}</span>
        {isCurrent && progress != null && (
          <span className="flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-fg/15">
              <span
                className="block h-full rounded-full bg-accent-gradient"
                style={{ width: `${pct}%` }}
              />
            </span>
            {repLabel && (
              <span className="shrink-0 text-[10px] tabular-nums text-fg-tertiary">
                {repLabel}
              </span>
            )}
          </span>
        )}
      </span>

      {isCurrent ? (
        <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.1em] text-[color:var(--color-accent-text)]">
          Current
        </span>
      ) : (
        <span className="flex shrink-0 items-center justify-center">
          <StatusBadge state={state} />
        </span>
      )}
    </button>
  );
}
