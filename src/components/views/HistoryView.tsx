import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useExerciseStore } from '../../state/exercises';
import {
  useSessionStore,
  filterSessions,
  shouldNagBackup,
  downloadSessions,
  getLastExportAt,
  getBackupDismissedAt,
  setBackupDismissedAt,
  EMPTY_FILTER,
  type SessionFilter,
} from '../../state/sessions';
import type { Mode } from '../../types';
import { Button, cn } from '../ui';
import { StatCards } from '../History/StatCards';
import { SessionRow } from '../History/SessionRow';
import { newBestSessionIds } from '../History/stats';

const field =
  'surface-deep h-9 rounded-[10px] px-2.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function dayBound(value: string, end: boolean): number | null {
  if (!value) return null;
  const ms = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** History view — stats, recent sessions, export (DESIGN-v2 §5). Reads the
 *  unchanged session log + progress stores. */
export function HistoryView() {
  const sessions = useSessionStore((s) => s.sessions);
  const availableSets = useExerciseStore((s) => s.availableSets);

  // Stable "now" for the view's lifetime so relative times and week buckets
  // don't churn on every render.
  const [now] = useState(() => Date.now());
  const [filter, setFilter] = useState<SessionFilter>(EMPTY_FILTER);
  const [lastExportAt, setLastExp] = useState<number | null>(getLastExportAt());
  const [dismissedAt, setDismissed] = useState<number | null>(getBackupDismissedAt());

  const visible = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);
  const newBestIds = useMemo(() => newBestSessionIds(sessions), [sessions]);
  const setTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of availableSets) m.set(s.id, s.title);
    return m;
  }, [availableSets]);
  const nag = useMemo(
    () =>
      shouldNagBackup({ sessions, lastExportAt, lastDismissedAt: dismissedAt, now }),
    [sessions, lastExportAt, dismissedAt, now],
  );

  const setTitleFor = (setId: string | undefined): string | null =>
    setId ? (setTitleById.get(setId) ?? `${setId} (deleted)`) : null;

  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-fg">History</h1>
          <p className="text-xs text-fg-secondary">
            Your practice sessions, weekly stats, and per-exercise bests.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={15} strokeWidth={1.5} />}
          disabled={sessions.length === 0}
          onClick={() => {
            downloadSessions(sessions);
            setLastExp(Date.now());
          }}
        >
          Export sessions
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="mt-12 text-center text-sm text-fg-tertiary">
          No sessions yet. Press play to begin practicing.
        </p>
      ) : (
        <>
          {nag && (
            <div className="bg-accent-gradient-soft mt-6 flex flex-wrap items-center justify-between gap-2 rounded-[12px] px-4 py-3 text-sm">
              <span className="text-fg-secondary">It’s been a while since your last backup.</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    downloadSessions(sessions);
                    setLastExp(Date.now());
                  }}
                  className="font-medium text-[color:var(--color-accent-text)] hover:brightness-110"
                >
                  Export now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ts = Date.now();
                    setBackupDismissedAt(ts);
                    setDismissed(ts);
                  }}
                  className="text-fg-tertiary hover:text-fg-secondary"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <StatCards sessions={sessions} now={now} />
          </div>

          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-sm font-medium text-fg">Recent sessions</h2>
              <select
                aria-label="Filter by mode"
                value={filter.mode}
                onChange={(e) => setFilter((f) => ({ ...f, mode: e.target.value as Mode | 'all' }))}
                className={field}
              >
                <option value="all">All modes</option>
                <option value="free">Free</option>
                <option value="exercise">Exercise</option>
              </select>
              <input
                type="search"
                aria-label="Search sessions"
                value={filter.query}
                onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
                placeholder="Search…"
                className={cn(field, 'min-w-28 flex-1')}
              />
              <input
                type="date"
                aria-label="From date"
                onChange={(e) => setFilter((f) => ({ ...f, from: dayBound(e.target.value, false) }))}
                className={field}
              />
              <input
                type="date"
                aria-label="To date"
                onChange={(e) => setFilter((f) => ({ ...f, to: dayBound(e.target.value, true) }))}
                className={field}
              />
            </div>

            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-tertiary">
                No sessions match the current filters.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visible.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    newBest={s.id !== undefined && newBestIds.has(s.id)}
                    setTitle={setTitleFor(s.exerciseSetId)}
                    now={now}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
