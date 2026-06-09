import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Trash2 } from 'lucide-react';
import { useExerciseStore } from '../../state/exercises';
import type { ExerciseSetSummary } from '../../types';
import { cn } from '../ui';

/** Export / delete for user-imported sets, living in the Library so all set
 *  management is together (import + schema are here too). Collapsible; hidden
 *  when there are no imported sets. Bundled sets aren't manageable. */
export function ManageSets() {
  const availableSets = useExerciseStore((s) => s.availableSets);
  const exportSet = useExerciseStore((s) => s.exportSet);
  const deleteSet = useExerciseStore((s) => s.deleteSet);

  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Most-recent import first (store array reflects Dexie insertion order).
  const userSets = useMemo(
    () => availableSets.filter((s) => s.origin === 'user-imported').slice().reverse(),
    [availableSets],
  );

  if (userSets.length === 0) return null;

  const onExport = async (summary: ExerciseSetSummary) => {
    try {
      const blob = await exportSet(summary.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.id}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  const onDelete = async (summary: ExerciseSetSummary) => {
    if (
      !window.confirm(
        `Delete '${summary.title}'? Your session history and progress for this set are preserved.`,
      )
    ) {
      return;
    }
    try {
      await deleteSet(summary.id);
      setMsg(`Deleted '${summary.title}'.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="surface-card rounded-[12px] px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Chevron size={14} strokeWidth={1.5} className="text-fg-tertiary" aria-hidden />
        Manage sets
        <span className="text-xs font-normal tabular-nums text-fg-tertiary">({userSets.length})</span>
      </button>

      {open && (
        <ul className="mt-3 flex flex-col gap-1">
          {userSets.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-1">
              <span className="flex-1 truncate text-sm text-fg">{s.title}</span>
              <span className="text-xs tabular-nums text-fg-tertiary">{s.exerciseCount} ex.</span>
              <button
                type="button"
                onClick={() => void onExport(s)}
                aria-label={`Export ${s.title}`}
                title="Download as JSON"
                className="rounded-md p-1.5 text-fg-tertiary hover:bg-fg/5 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Download size={16} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void onDelete(s)}
                aria-label={`Delete ${s.title}`}
                title="Delete"
                className={cn(
                  'rounded-md p-1.5 text-fg-tertiary hover:bg-danger/10 hover:text-danger-text',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                <Trash2 size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {msg && <p role="status" className="mt-2 text-xs text-fg-tertiary">{msg}</p>}
    </div>
  );
}
