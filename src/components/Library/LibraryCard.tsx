import type { CSSProperties } from 'react';
import { Check, Diamond } from 'lucide-react';
import type { Exercise, ExerciseProgress } from '../../types';
import { cn } from '../ui';
import { tileStateFor } from '../Practice/selector/tileState';
import { NotationPreview } from './NotationPreview';

interface LibraryCardProps {
  exercise: Exercise;
  progress: ExerciseProgress | null;
  defaultBpm: number;
  isCurrent: boolean;
  onClick: () => void;
}

const STATE_STYLE: Record<string, { borderWidth: string; borderColor: string; tint?: string }> = {
  default: { borderWidth: '0.5px', borderColor: 'var(--border-accent)' },
  attempted: { borderWidth: '0.8px', borderColor: 'var(--border-accent)', tint: 'rgba(139,92,246,0.04)' },
  completed: {
    borderWidth: '0.8px',
    borderColor: '#8b5cf6',
    tint: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))',
  },
  mastered: { borderWidth: '0.8px', borderColor: '#fbbf24', tint: 'rgba(251,191,36,0.05)' },
  current: {
    borderWidth: '1.5px',
    borderColor: '#8b5cf6',
    tint: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.10))',
  },
};

/** Status line shown in the card footer. */
function statusText(state: string, progress: ExerciseProgress | null): string {
  switch (state) {
    case 'current':
      return 'Current exercise';
    case 'mastered':
      return `Mastered · best ${progress?.bestBpm ?? 0} BPM`;
    case 'completed':
      return `Completed · best ${progress?.bestBpm ?? 0} BPM`;
    case 'attempted':
      return `In progress · ${progress?.totalSessions ?? 0} session${progress?.totalSessions === 1 ? '' : 's'}`;
    default:
      return 'Not attempted';
  }
}

/** Detailed exercise card in the Library grid (DESIGN-v2 §6): a large tile with
 *  a notation preview, completion-aware border/tint, and a status footer.
 *  Tapping it jumps to that exercise in the Practice view. */
export function LibraryCard({
  exercise,
  progress,
  defaultBpm,
  isCurrent,
  onClick,
}: LibraryCardProps) {
  const state = tileStateFor(progress, defaultBpm, isCurrent);
  const s = STATE_STYLE[state];
  const style: CSSProperties = { borderWidth: s.borderWidth, borderColor: s.borderColor };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isCurrent ? 'true' : undefined}
      aria-label={`Exercise ${exercise.number}: ${exercise.name} — ${statusText(state, progress)}`}
      style={style}
      className={cn(
        'surface-tile relative flex flex-col gap-2 overflow-hidden rounded-[14px] p-4 text-left',
        'transition duration-[120ms] hover:brightness-110',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
      )}
    >
      {s.tint && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[14px]"
          style={{ background: s.tint }}
          aria-hidden
        />
      )}

      <div className="relative flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="text-lg font-medium tabular-nums text-fg">#{exercise.number}</span>
          <span className="truncate text-sm text-fg-secondary">{exercise.name}</span>
        </span>
        {state === 'mastered' && <Diamond size={14} className="shrink-0 fill-gold text-gold" aria-hidden />}
        {(state === 'completed' || state === 'current') && (
          <Check size={15} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden />
        )}
      </div>

      <div className="relative rounded-[8px] bg-fg/[0.02]">
        <NotationPreview exercise={exercise} />
      </div>

      <div className="relative flex items-center justify-between gap-2 text-[11px]">
        <span className={cn(state === 'mastered' ? 'text-gold' : 'text-fg-tertiary')}>
          {statusText(state, progress)}
        </span>
        {exercise.recommendedBpm && (
          <span className="tabular-nums text-fg-muted">{exercise.recommendedBpm} BPM</span>
        )}
      </div>
    </button>
  );
}
