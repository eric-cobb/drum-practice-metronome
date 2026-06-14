import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useExerciseStore } from '../../state/exercises';
import { useEditorStore } from '../../state/editor';
import { generateUniqueId } from '../../data/loadExerciseSet';
import { cloneSetForEdit } from '../Editor/editorModel';
import type { ExerciseSetSummary } from '../../types';
import { cn } from '../ui';

const iconBtn =
  'rounded-md p-1.5 text-fg-tertiary hover:bg-fg/5 hover:text-fg focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-accent';

/** Set management, living in the Library so it's all in one place. Lists every
 *  set: user sets can be edited, exported, or deleted; bundled sets (read-only)
 *  can be duplicated into an editable copy. Collapsible. */
export function ManageSets() {
  const availableSets = useExerciseStore((s) => s.availableSets);
  const exportSet = useExerciseStore((s) => s.exportSet);
  const deleteSet = useExerciseStore((s) => s.deleteSet);
  const getSet = useExerciseStore((s) => s.getSet);
  const openEditor = useEditorStore((s) => s.open);

  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [msg]);

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

  const onEdit = (summary: ExerciseSetSummary) => {
    const full = getSet(summary.id);
    if (full) openEditor(cloneSetForEdit(full, full.id));
  };

  const onDuplicate = (summary: ExerciseSetSummary) => {
    const full = getSet(summary.id);
    if (!full) return;
    const existing = new Set(availableSets.map((s) => s.id));
    const base = `${full.id}-copy`;
    const id = existing.has(base) ? generateUniqueId(base, existing) : base;
    openEditor(cloneSetForEdit(full, id));
  };

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="surface-card rounded-[12px] px-4 py-3" data-tour="manage-sets">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Chevron size={14} strokeWidth={1.5} className="text-fg-tertiary" aria-hidden />
        Manage sets
        <span className="text-xs font-normal tabular-nums text-fg-tertiary">
          ({availableSets.length})
        </span>
      </button>

      {open && (
        <ul className="mt-3 flex flex-col gap-1">
          {availableSets.map((s) => {
            const bundled = s.origin === 'bundled';
            return (
              <li key={s.id} className="flex items-center gap-2 py-1">
                <span className="flex-1 truncate text-sm text-fg">{s.title}</span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    bundled
                      ? 'bg-fg/10 text-fg-tertiary'
                      : 'bg-accent/15 text-accent-text',
                  )}
                >
                  {bundled ? 'Bundled' : 'User'}
                </span>
                <span className="w-12 text-right text-xs tabular-nums text-fg-tertiary">
                  {s.exerciseCount} ex.
                </span>

                {bundled ? (
                  <button
                    type="button"
                    onClick={() => onDuplicate(s)}
                    aria-label={`Duplicate ${s.title} to edit`}
                    title="Duplicate to edit"
                    className={iconBtn}
                  >
                    <Copy size={16} strokeWidth={1.5} aria-hidden />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      aria-label={`Edit ${s.title}`}
                      title="Edit"
                      className={iconBtn}
                    >
                      <Pencil size={16} strokeWidth={1.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onExport(s)}
                      aria-label={`Export ${s.title}`}
                      title="Download as JSON"
                      className={iconBtn}
                    >
                      <Download size={16} strokeWidth={1.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(s)}
                      aria-label={`Delete ${s.title}`}
                      title="Delete"
                      className={cn(iconBtn, 'hover:bg-danger/10 hover:text-danger-text')}
                    >
                      <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {msg && (
        <p role="status" className="mt-2 text-xs text-fg-tertiary">
          {msg}
        </p>
      )}
    </div>
  );
}
