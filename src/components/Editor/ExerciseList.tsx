import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useEditorStore } from '../../state/editor';
import { cn } from '../ui';

const iconBtn =
  'rounded-md p-1 text-fg-tertiary hover:bg-fg/5 hover:text-fg disabled:opacity-30 ' +
  'disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** The set's exercises: select one to edit (highlights, drives the grid),
 *  reorder, add, delete. A set keeps at least one exercise. */
export function ExerciseList() {
  const draft = useEditorStore((s) => s.draft);
  const activeId = useEditorStore((s) => s.activeExerciseId);
  const setActive = useEditorStore((s) => s.setActiveExercise);
  const addExercise = useEditorStore((s) => s.addExercise);
  const deleteExercise = useEditorStore((s) => s.deleteExercise);
  const moveExercise = useEditorStore((s) => s.moveExercise);

  if (!draft) return null;

  const sectionTitle = (id: string) =>
    draft.sections.find((s) => s.id === id)?.title ?? '—';

  return (
    <div className="surface-card rounded-[12px] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Exercises</h2>
        <button
          type="button"
          onClick={() => addExercise(draft.exercises.find((e) => e.id === activeId)?.sectionId)}
          className="inline-flex items-center gap-1 text-xs text-accent-text hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden /> Add
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {draft.exercises.map((ex, i) => {
          const active = ex.id === activeId;
          return (
            <li
              key={ex.id}
              className={cn(
                'flex items-center gap-1.5 rounded-[8px] pl-2.5 pr-1',
                active ? 'bg-accent/15' : 'hover:bg-fg/5',
              )}
            >
              <button
                type="button"
                onClick={() => setActive(ex.id)}
                aria-current={active}
                className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left focus:outline-none"
              >
                <span className="w-5 shrink-0 text-xs tabular-nums text-fg-tertiary">
                  {ex.number}
                </span>
                <span className={cn('flex-1 truncate text-sm', active ? 'text-fg' : 'text-fg-secondary')}>
                  {ex.name}
                </span>
                <span className="shrink-0 truncate text-xs text-fg-tertiary">
                  {sectionTitle(ex.sectionId)}
                </span>
              </button>
              <button
                type="button"
                className={iconBtn}
                disabled={i === 0}
                onClick={() => moveExercise(ex.id, -1)}
                aria-label={`Move ${ex.name} up`}
              >
                <ChevronUp size={16} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                className={iconBtn}
                disabled={i === draft.exercises.length - 1}
                onClick={() => moveExercise(ex.id, 1)}
                aria-label={`Move ${ex.name} down`}
              >
                <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                className={cn(iconBtn, 'hover:bg-danger/10 hover:text-danger-text')}
                disabled={draft.exercises.length <= 1}
                onClick={() => deleteExercise(ex.id)}
                aria-label={`Delete ${ex.name}`}
                title={draft.exercises.length <= 1 ? 'A set needs at least one exercise' : 'Delete exercise'}
              >
                <Trash2 size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
