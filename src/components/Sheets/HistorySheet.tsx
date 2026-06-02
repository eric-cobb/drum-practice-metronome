import { useMemo, useState } from 'react';
import { Sheet } from '../Shared/Sheet';
import { useExerciseStore } from '../../state/exercises';
import {
  useSessionStore,
  computeStats,
  filterSessions,
  sessionLabel,
  shouldNagBackup,
  downloadSessions,
  getLastExportAt,
  getBackupDismissedAt,
  setBackupDismissedAt,
  EMPTY_FILTER,
  type SessionFilter,
} from '../../state/sessions';
import { SUBDIVISION_LABELS, type Mode, type Session } from '../../types';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function dayBound(value: string, end: boolean): number | null {
  if (!value) return null;
  const ms = new Date(
    `${value}T${end ? '23:59:59.999' : '00:00:00'}`,
  ).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const field =
  'h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-neutral-800 dark:text-neutral-50';

const sectionLabel =
  'text-xs font-medium uppercase tracking-wide text-neutral-500';

function BestList({ items }: { items: { label: string; bpm: number }[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((b) => (
        <li
          key={b.label}
          className="flex justify-between text-sm text-neutral-700 dark:text-neutral-300"
        >
          <span className="truncate">{b.label}</span>
          <span className="tabular-nums text-neutral-500">
            @ <span className="text-sky-600 dark:text-sky-400">{b.bpm}</span>{' '}
            BPM
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stats({ sessions }: { sessions: Session[] }) {
  const loadedSet = useExerciseStore((s) => s.loadedSet);
  const stats = useMemo(
    () => computeStats(sessions, loadedSet, Date.now()),
    [sessions, loadedSet],
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className={sectionLabel}>This week</div>
        <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
          <span className="font-medium text-neutral-900 dark:text-neutral-50">
            {formatDuration(stats.weekSeconds)}
          </span>{' '}
          •{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-50">
            {stats.weekCount}
          </span>{' '}
          {stats.weekCount === 1 ? 'session' : 'sessions'}
        </div>
      </div>

      {stats.exerciseBests.length > 0 && (
        <div>
          <div className={sectionLabel}>Best tempos — exercises</div>
          <div className="mt-1">
            <BestList items={stats.exerciseBests} />
          </div>
        </div>
      )}

      {stats.freeBests.length > 0 && (
        <div>
          <div className={sectionLabel}>Best tempos — Free</div>
          <div className="mt-1">
            <BestList items={stats.freeBests} />
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
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

  return (
    <li className="border-b border-neutral-200 last:border-0 dark:border-neutral-800">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-neutral-900 dark:text-neutral-50">
            {sessionLabel(session)}
            {session.completed && (
              <span
                className="ml-2 text-sky-600 dark:text-sky-400"
                title="Completed"
              >
                ✓
              </span>
            )}
          </span>
          <span className="text-xs text-neutral-500">
            {formatDateTime(session.startTime)}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-neutral-500">
          {bpm} BPM • {session.repsCompleted}/{session.targetReps} •{' '}
          {formatDuration(session.durationSeconds)}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 pb-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {(
              [
                [
                  'Time sig',
                  `${session.timeSignature.numerator}/${session.timeSignature.denominator}`,
                ],
                ['Subdivision', SUBDIVISION_LABELS[session.subdivision]],
                ['Bars/rep', `${session.barsPerRep}`],
                ['Reps', `${session.repsCompleted} / ${session.targetReps}`],
                ['Completed', session.completed ? 'Yes' : 'No'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  {k}
                </dt>
                <dd className="tabular-nums text-neutral-800 dark:text-neutral-200">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={2}
              placeholder="Add a retrospective note…"
              className="resize-y rounded-md border border-neutral-200 bg-transparent px-2 py-1 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-neutral-800 dark:text-neutral-50"
            />
          </label>
          <button
            type="button"
            onClick={onDelete}
            className="self-start text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
          >
            Delete session
          </button>
        </div>
      )}
    </li>
  );
}

export function HistorySheet({ onClose }: { onClose: () => void }) {
  const sessions = useSessionStore((s) => s.sessions);
  const [filter, setFilter] = useState<SessionFilter>(EMPTY_FILTER);
  const [lastExportAt, setLastExp] = useState<number | null>(getLastExportAt());
  const [dismissedAt, setDismissed] = useState<number | null>(
    getBackupDismissedAt(),
  );

  const visible = useMemo(
    () => filterSessions(sessions, filter),
    [sessions, filter],
  );
  const nag = useMemo(
    () =>
      shouldNagBackup({
        sessions,
        lastExportAt,
        lastDismissedAt: dismissedAt,
        now: Date.now(),
      }),
    [sessions, lastExportAt, dismissedAt],
  );

  return (
    <Sheet title="History" onClose={onClose}>
      <div className="flex flex-col gap-6">
        {nag && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sky-500/10 px-4 py-3 text-sm">
            <span className="text-sky-700 dark:text-sky-300">
              It’s been a while since your last backup.
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  downloadSessions(sessions);
                  setLastExp(Date.now());
                }}
                className="font-medium text-sky-700 hover:text-sky-600 dark:text-sky-300"
              >
                Export now
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = Date.now();
                  setBackupDismissedAt(now);
                  setDismissed(now);
                }}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            No sessions yet. Press play to begin practicing.
          </p>
        ) : (
          <>
            <Stats sessions={sessions} />

            <div>
              <div className={`${sectionLabel} mb-2`}>Recent sessions</div>
              <div className="flex flex-wrap items-end gap-2 pb-2">
                <select
                  aria-label="Filter by mode"
                  value={filter.mode}
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      mode: e.target.value as Mode | 'all',
                    }))
                  }
                  className={field}
                >
                  <option value="all">All</option>
                  <option value="free">Free</option>
                  <option value="exercise">Practice</option>
                </select>
                <input
                  type="search"
                  aria-label="Search sessions"
                  value={filter.query}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, query: e.target.value }))
                  }
                  placeholder="Search…"
                  className={`${field} min-w-28 flex-1`}
                />
                <input
                  type="date"
                  aria-label="From date"
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      from: dayBound(e.target.value, false),
                    }))
                  }
                  className={field}
                />
                <input
                  type="date"
                  aria-label="To date"
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      to: dayBound(e.target.value, true),
                    }))
                  }
                  className={field}
                />
              </div>

              {visible.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-500">
                  No sessions match the current filters.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {visible.map((s) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
