import { EDITOR_BARS_MAX, EDITOR_BARS_MIN, useEditorStore } from '../../state/editor';
import {
  SUBDIVISION_LABELS,
  SUBDIVISION_ORDER,
  TIME_SIGNATURE_PRESETS,
  formatTimeSignature,
  type Exercise,
  type Subdivision,
  type TimeSignature,
} from '../../types';
import { Input, Stepper, cn } from '../ui';

const SELECT_CLASS = cn(
  'h-10 rounded-[10px] surface-deep px-3 text-sm text-fg',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
);

function sameTimeSignature(a: TimeSignature, b: TimeSignature): boolean {
  return (
    a.numerator === b.numerator &&
    a.denominator === b.denominator &&
    a.displayAs === b.displayAs
  );
}

/** Metadata for the active exercise: name, number, section, meter, subdivision,
 *  bar count, optional recommended tempo / target reps, and notes. */
export function ExerciseMetaForm({ exercise }: { exercise: Exercise }) {
  const draft = useEditorStore((s) => s.draft);
  const update = useEditorStore((s) => s.updateExerciseMeta);
  const setTimeSignature = useEditorStore((s) => s.setTimeSignature);
  const setSubdivision = useEditorStore((s) => s.setSubdivision);
  const setBarCount = useEditorStore((s) => s.setBarCount);

  const tsIndex = TIME_SIGNATURE_PRESETS.findIndex((p) =>
    sameTimeSignature(p, exercise.timeSignature),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Exercise name"
          value={exercise.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-secondary">Section</span>
          <select
            className={SELECT_CLASS}
            value={exercise.sectionId}
            onChange={(e) => update({ sectionId: e.target.value })}
          >
            {draft?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-secondary">Time signature</span>
          <select
            className={SELECT_CLASS}
            value={tsIndex >= 0 ? tsIndex : ''}
            onChange={(e) => {
              const preset = TIME_SIGNATURE_PRESETS[Number(e.target.value)];
              if (preset) setTimeSignature(preset);
            }}
          >
            {tsIndex < 0 && (
              <option value="">{formatTimeSignature(exercise.timeSignature)}</option>
            )}
            {TIME_SIGNATURE_PRESETS.map((p, i) => (
              <option key={i} value={i}>
                {formatTimeSignature(p)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-secondary">Subdivision</span>
          <select
            className={SELECT_CLASS}
            value={exercise.subdivision}
            onChange={(e) => setSubdivision(e.target.value as Subdivision)}
          >
            {SUBDIVISION_ORDER.map((s) => (
              <option key={s} value={s}>
                {SUBDIVISION_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <Stepper
          label="Bars"
          value={exercise.pattern.length}
          min={EDITOR_BARS_MIN}
          max={EDITOR_BARS_MAX}
          onChange={setBarCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Recommended tempo (optional)"
          type="number"
          min={20}
          max={400}
          value={exercise.recommendedBpm ?? ''}
          onChange={(e) =>
            update({ recommendedBpm: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
        <Input
          label="Target reps (optional)"
          type="number"
          min={1}
          max={200}
          value={exercise.targetReps ?? ''}
          onChange={(e) =>
            update({ targetReps: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg-secondary">Notes (optional)</span>
        <textarea
          value={exercise.notes ?? ''}
          onChange={(e) => update({ notes: e.target.value === '' ? undefined : e.target.value })}
          rows={2}
          className="rounded-[10px] surface-deep p-2.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          placeholder="Practice notes shown on the exercise card."
        />
      </label>
    </div>
  );
}
