import { GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '../../state/editor';
import type { Section } from '../../types';
import { cn } from '../ui';

const iconBtn =
  'rounded-md p-1 text-fg-tertiary hover:bg-fg/5 hover:text-fg disabled:opacity-30 ' +
  'disabled:hover:bg-transparent disabled:pointer-events-none focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-accent';

const dragHandle =
  'cursor-grab touch-none rounded-md p-1 text-fg-tertiary hover:bg-fg/5 hover:text-fg ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing';

/** Manage the set's sections: drag to reorder (keyboard-accessible via the
 *  handle), rename, add, delete. A section can't be deleted while it holds
 *  exercises or if it's the only one. */
export function SectionsPanel() {
  const draft = useEditorStore((s) => s.draft);
  const reorderSections = useEditorStore((s) => s.reorderSections);
  const addSection = useEditorStore((s) => s.addSection);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!draft) return null;

  const ids = draft.sections.map((s) => s.id);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorderSections(
      arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))),
    );
  };

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="mt-3 flex flex-col gap-2">
            {draft.sections.map((section, i) => (
              <SortableSectionRow
                key={section.id}
                section={section}
                index={i}
                used={draft.exercises.filter((e) => e.sectionId === section.id).length}
                isOnly={draft.sections.length <= 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableSectionRow({
  section,
  index,
  used,
  isOnly,
}: {
  section: Section;
  index: number;
  used: number;
  isOnly: boolean;
}) {
  const renameSection = useEditorStore((s) => s.renameSection);
  const deleteSection = useEditorStore((s) => s.deleteSection);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const canDelete = !isOnly && used === 0;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        'flex items-center gap-1.5 rounded-[8px]',
        isDragging && 'opacity-80 shadow-[0_4px_12px_rgba(0,0,0,0.35)]',
      )}
    >
      <button
        type="button"
        className={dragHandle}
        aria-label={`Reorder ${section.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} strokeWidth={1.5} aria-hidden />
      </button>
      <input
        value={section.title}
        onChange={(e) => renameSection(section.id, e.target.value)}
        aria-label={`Section ${index + 1} name`}
        className="h-9 flex-1 rounded-[8px] surface-deep px-2.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <span className="w-12 text-right text-xs tabular-nums text-fg-tertiary">{used} ex.</span>
      {/* Wrapper carries the title so the tooltip still shows when the button is
          disabled (a disabled button receives no hover events). */}
      <span
        className="inline-flex"
        title={
          isOnly
            ? 'A set needs at least one section'
            : used > 0
              ? 'Move or delete its exercises first'
              : 'Delete section'
        }
      >
        <button
          type="button"
          className={cn(iconBtn, 'hover:bg-danger/10 hover:text-danger-text')}
          disabled={!canDelete}
          onClick={() => deleteSection(section.id)}
          aria-label={`Delete ${section.title}`}
        >
          <Trash2 size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </span>
    </li>
  );
}
