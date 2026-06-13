import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useEditorStore } from '../../state/editor';
import { cn } from '../ui';

const iconBtn =
  'rounded-md p-1 text-fg-tertiary hover:bg-fg/5 hover:text-fg disabled:opacity-30 ' +
  'disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** Manage the set's sections: rename, reorder, add, delete. A section can't be
 *  deleted while it holds exercises or if it's the only one (the delete button
 *  is disabled with a reason). */
export function SectionsPanel() {
  const draft = useEditorStore((s) => s.draft);
  const renameSection = useEditorStore((s) => s.renameSection);
  const deleteSection = useEditorStore((s) => s.deleteSection);
  const moveSection = useEditorStore((s) => s.moveSection);
  const addSection = useEditorStore((s) => s.addSection);

  if (!draft) return null;

  const countFor = (sectionId: string) =>
    draft.exercises.filter((e) => e.sectionId === sectionId).length;

  return (
    <div className="surface-card rounded-[12px] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Sections</h2>
        <button
          type="button"
          onClick={addSection}
          className="inline-flex items-center gap-1 text-xs text-accent-text hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden /> Add
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {draft.sections.map((section, i) => {
          const used = countFor(section.id);
          const last = draft.sections.length <= 1;
          const canDelete = !last && used === 0;
          return (
            <li key={section.id} className="flex items-center gap-1.5">
              <input
                value={section.title}
                onChange={(e) => renameSection(section.id, e.target.value)}
                aria-label={`Section ${i + 1} name`}
                className="h-9 flex-1 rounded-[8px] surface-deep px-2.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <span className="w-12 text-right text-xs tabular-nums text-fg-tertiary">
                {used} ex.
              </span>
              <button
                type="button"
                className={iconBtn}
                disabled={i === 0}
                onClick={() => moveSection(section.id, -1)}
                aria-label={`Move ${section.title} up`}
              >
                <ChevronUp size={16} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                className={iconBtn}
                disabled={i === draft.sections.length - 1}
                onClick={() => moveSection(section.id, 1)}
                aria-label={`Move ${section.title} down`}
              >
                <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                className={cn(iconBtn, 'hover:bg-danger/10 hover:text-danger-text')}
                disabled={!canDelete}
                onClick={() => deleteSection(section.id)}
                aria-label={`Delete ${section.title}`}
                title={
                  last
                    ? 'A set needs at least one section'
                    : used > 0
                      ? 'Move or delete its exercises first'
                      : 'Delete section'
                }
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
