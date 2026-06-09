import { useState } from 'react';
import { Diamond } from 'lucide-react';
import { useSessionStore, sessionLabel } from '../../state/sessions';
import { SUBDIVISION_LABELS, type Session } from '../../types';
import { Button } from '../ui';
import { formatDuration, formatExact, formatRelative } from './format';

/** Left status indicator: gold diamond for a new best, filled accent circle for
 *  a completed session, empty ring for a stopped one (DESIGN-v2 §6). */
function StatusIndicator({ session, newBest }: { session: Session; newBest: boolean }) {
  if (newBest) {
    return <Diamond size={14} className="shrink-0 fill-gold text-gold" aria-label="New best" />;
  }
  if (session.completed) {
    return <span className="bg-accent-gradient h-3 w-3 shrink-0 rounded-full" aria-label="Completed" />;
  }
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full border border-fg/40"
      aria-label="Stopped"
    />
  );
}

interface SessionRowProps {
  session: Session;
  newBest: boolean;
  /** Resolved set title for exercise sessions (or null → derive). */
  setTitle: string | null;
  now: number;
}

export function SessionRow({ session, newBest, setTitle, now }: SessionRowProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(session.notes);
  const remove = useSessionStore((s) => s.remove);
  const updateNotes = useSessionStore((s) => s.updateNotes);

  const onDelete = () => {
    if (session.id === undefined) return;
    if (window.confirm('Delete this session? This cannot be undone.')) {
      void remove(session.id);
    }
  };
  const saveNotes = () => {
    if (session.id !== undefined && notes !== session.notes) {
      void updateNotes(session.id, notes);
    }
  };

  const bpm =
    session.startBpm === session.endBpm
      ? `${session.endBpm}`
      : `${session.startBpm}→${session.endBpm}`;

  const context =
    session.mode === 'exercise' ? (setTitle ?? 'Exercise set') : 'Free mode';

  return (
    <li className="surface-card overflow-hidden rounded-[12px]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <StatusIndicator session={session} newBest={newBest} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg">
            {sessionLabel(session)}
          </span>
          <span className="block truncate text-[11px] text-fg-tertiary">
            {newBest && <span className="font-medium text-gold">New best — </span>}
            {context}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          <span className="text-xs tabular-nums text-fg-secondary">
            {session.repsCompleted}/{session.targetReps} · {bpm} BPM
          </span>
          <span className="text-[11px] text-fg-tertiary">
            {formatDuration(session.durationSeconds)} · {formatRelative(session.startTime, now)}
          </span>
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {(
              [
                ['Time sig', `${session.timeSignature.numerator}/${session.timeSignature.denominator}`],
                ['Subdivision', SUBDIVISION_LABELS[session.subdivision]],
                ['Bars/rep', `${session.barsPerRep}`],
                ['Reps', `${session.repsCompleted} / ${session.targetReps}`],
                ['Completed', session.completed ? 'Yes' : 'No'],
                ['When', formatExact(session.startTime)],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-fg-tertiary">
                  {k}
                </dt>
                <dd className="tabular-nums text-fg-secondary">{v}</dd>
              </div>
            ))}
          </dl>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-fg-tertiary">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={2}
              placeholder="Add a retrospective note…"
              className="surface-deep resize-y rounded-[10px] px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <Button variant="destructive" size="sm" className="self-start" onClick={onDelete}>
            Delete session
          </Button>
        </div>
      )}
    </li>
  );
}
