import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExerciseSetSummary } from '../../../types';
import { cn } from '../../ui';

const userBadge =
  'rounded bg-fg/10 px-1.5 py-0.5 text-[10px] font-medium text-fg-tertiary';

function SetRow({
  summary,
  done,
  selected,
  onSelect,
}: {
  summary: ExerciseSetSummary;
  done: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-fg/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        selected ? 'text-[color:var(--color-accent-text)]' : 'text-fg',
      )}
    >
      <span className="flex items-center gap-1.5">
        <span>{summary.title}</span>
        {summary.origin === 'user-imported' && <span className={userBadge}>User</span>}
      </span>
      <span className="text-xs tabular-nums text-fg-tertiary">
        {done} of {summary.exerciseCount}
      </span>
    </button>
  );
}

interface SetPickerProps {
  activeSetId: string;
  setSummaries: ExerciseSetSummary[];
  completionBySet: Record<string, number>;
  onSelect: (setId: string) => void;
  onOpenSettings: () => void;
}

/** Compact set selector at the top of the popover (SPEC §7): shows the active
 *  set + progress; clicking reveals all sets (bundled / user) each with their
 *  own progress summary. */
export function SetPicker({
  activeSetId,
  setSummaries,
  completionBySet,
  onSelect,
  onOpenSettings,
}: SetPickerProps) {
  const [open, setOpen] = useState(false);
  const active = setSummaries.find((s) => s.id === activeSetId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-set-picker]')) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!active) return null;

  const bundled = setSummaries.filter((s) => s.origin === 'bundled');
  const user = setSummaries.filter((s) => s.origin === 'user-imported');

  return (
    <div data-set-picker className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Switch exercise set"
        className="surface-deep flex h-11 w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-fg">{active.title}</span>
          {active.origin === 'user-imported' && <span className={userBadge}>User</span>}
          <ChevronDown size={14} strokeWidth={1.5} className="text-fg-tertiary" aria-hidden />
        </span>
        <span className="text-xs tabular-nums text-fg-tertiary">
          {completionBySet[activeSetId] ?? 0} of {active.exerciseCount} complete
        </span>
      </button>

      {open && (
        <div className="surface-popover absolute inset-x-0 top-full z-30 mt-1 flex flex-col gap-2 rounded-[12px] p-2">
          {bundled.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2 pb-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-tertiary">
                Bundled
              </div>
              {bundled.map((s) => (
                <SetRow
                  key={s.id}
                  summary={s}
                  done={completionBySet[s.id] ?? 0}
                  selected={s.id === activeSetId}
                  onSelect={() => {
                    setOpen(false);
                    if (s.id !== activeSetId) onSelect(s.id);
                  }}
                />
              ))}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <div className="px-2 pb-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-tertiary">
              Your sets
            </div>
            {user.length > 0 ? (
              user.map((s) => (
                <SetRow
                  key={s.id}
                  summary={s}
                  done={completionBySet[s.id] ?? 0}
                  selected={s.id === activeSetId}
                  onSelect={() => {
                    setOpen(false);
                    if (s.id !== activeSetId) onSelect(s.id);
                  }}
                />
              ))
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="rounded-[8px] px-2 py-1.5 text-left text-sm text-fg-tertiary hover:bg-fg/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Import a set in the Library →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
