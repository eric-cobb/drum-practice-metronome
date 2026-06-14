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
import type { Exercise } from '../../types';
import { cn } from '../ui';

const iconBtn =
  'rounded-md p-1 text-fg-tertiary hover:bg-fg/5 hover:text-fg disabled:opacity-30 ' +
  'disabled:hover:bg-transparent disabled:pointer-events-none focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-accent';

const dragHandle =
  'cursor-grab touch-none rounded-md p-1 text-fg-tertiary hover:bg-fg/5 hover:text-fg ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing';

/** The set's exercises: drag to reorder (keyboard-accessible via the handle),
 *  click to select for editing, add, delete. A set keeps at least one. */
export function ExerciseList() {
  const draft = useEditorStore((s) => s.draft);
  const activeId = useEditorStore((s) => s.activeExerciseId);
  const addExercise = useEditorStore((s) => s.addExercise);
  const reorderExercises = useEditorStore((s) => s.reorderExercises);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!draft) return null;

  const ids = draft.exercises.map((e) => e.id);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorderExercises(
      arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))),
    );
  };

  return (
    <div className="surface-card rounded-[12px] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Exercises</h2>
        <button
          type="button"
          onClick={() =>
            addExercise(draft.exercises.find((e) => e.id === activeId)?.sectionId)
          }
          className="inline-flex items-center gap-1 text-xs text-accent-text hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden /> Add
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="mt-3 flex flex-col gap-1">
            {draft.exercises.map((ex) => (
              <SortableExerciseRow
                key={ex.id}
                exercise={ex}
                active={ex.id === activeId}
                sectionTitle={draft.sections.find((s) => s.id === ex.sectionId)?.title ?? '—'}
                canDelete={draft.exercises.length > 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableExerciseRow({
  exercise,
  active,
  sectionTitle,
  canDelete,
}: {
  exercise: Exercise;
  active: boolean;
  sectionTitle: string;
  canDelete: boolean;
}) {
  const setActive = useEditorStore((s) => s.setActiveExercise);
  const deleteExercise = useEditorStore((s) => s.deleteExercise);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        'flex items-center gap-1 rounded-[8px] pr-1',
        active ? 'bg-accent/15' : 'hover:bg-fg/5',
        isDragging && 'opacity-80 shadow-[0_4px_12px_rgba(0,0,0,0.35)]',
      )}
    >
      <button
        type="button"
        className={dragHandle}
        aria-label={`Reorder ${exercise.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setActive(exercise.id)}
        aria-current={active}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left focus:outline-none"
      >
        <span className="w-5 shrink-0 text-xs tabular-nums text-fg-tertiary">
          {exercise.number}
        </span>
        <span className={cn('flex-1 truncate text-sm', active ? 'text-fg' : 'text-fg-secondary')}>
          {exercise.name}
        </span>
        <span className="shrink-0 truncate text-xs text-fg-tertiary">{sectionTitle}</span>
      </button>
      {/* Wrapper carries the title so the tooltip still shows when the button is
          disabled (a disabled button receives no hover events). */}
      <span
        className="inline-flex"
        title={canDelete ? 'Delete exercise' : 'A set needs at least one exercise'}
      >
        <button
          type="button"
          className={cn(iconBtn, 'hover:bg-danger/10 hover:text-danger-text')}
          disabled={!canDelete}
          onClick={() => deleteExercise(exercise.id)}
          aria-label={`Delete ${exercise.name}`}
        >
          <Trash2 size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </span>
    </li>
  );
}
