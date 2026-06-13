import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { EDITOR_BARS_MAX, EDITOR_BARS_MIN, useEditorStore } from '../../state/editor';
import { useExerciseStore } from '../../state/exercises';
import {
  SUBDIVISION_LABELS,
  SUBDIVISION_ORDER,
  TIME_SIGNATURE_PRESETS,
  formatTimeSignature,
  type TimeSignature,
} from '../../types';
import { Button, Input, Stepper, cn } from '../ui';
import { PatternGrid } from './PatternGrid';
import { NotationLivePreview } from './NotationLivePreview';

const SELECT_CLASS = cn(
  'h-10 rounded-[10px] surface-deep px-3 text-sm text-fg',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
);

/** The full pattern-editor surface (Phase 11, Stage 11.1). Renders inside the
 *  Library view while a draft is open: set/exercise metadata, the sticking grid,
 *  and a live notation preview, with Save (→ exercises store) and Cancel. */
export function EditorSurface() {
  const draft = useEditorStore((s) => s.draft);
  const activeExerciseId = useEditorStore((s) => s.activeExerciseId);
  const dirty = useEditorStore((s) => s.dirty);
  const setTitle = useEditorStore((s) => s.setTitle);
  const updateExerciseMeta = useEditorStore((s) => s.updateExerciseMeta);
  const setTimeSignature = useEditorStore((s) => s.setTimeSignature);
  const setSubdivision = useEditorStore((s) => s.setSubdivision);
  const setBarCount = useEditorStore((s) => s.setBarCount);
  const markClean = useEditorStore((s) => s.markClean);
  const close = useEditorStore((s) => s.close);

  const replaceSet = useExerciseStore((s) => s.replaceSet);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const active = draft?.exercises.find((e) => e.id === activeExerciseId) ?? null;
  if (!draft || !active) return null;

  const onCancel = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    close();
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const result = await replaceSet(draft);
    setSaving(false);
    if (result.ok) {
      markClean();
      close();
    } else {
      setError(result.error);
    }
  };

  const onPickTimeSignature = (value: string) => {
    const preset = TIME_SIGNATURE_PRESETS[Number(value)];
    if (preset) setTimeSignature(preset);
  };

  const tsIndex = TIME_SIGNATURE_PRESETS.findIndex(
    (p) => sameTimeSignature(p, active.timeSignature),
  );

  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-fg">Pattern editor</h1>
          <p className="text-xs text-fg-secondary">
            Build a snare pattern: click a stroke cell to cycle rest → R → L, then
            toggle accents, ghosts, and ornaments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<X size={16} strokeWidth={1.5} />} onClick={onCancel}>
            Cancel
          </Button>
          <Button icon={<Check size={16} strokeWidth={1.5} />} onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save set'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-[10px] border border-danger px-3 py-2 text-xs text-danger-text">
          {error}
        </p>
      )}

      {/* Metadata */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Set title"
          value={draft.title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Exercise name"
          value={active.name}
          onChange={(e) => updateExerciseMeta({ name: e.target.value })}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-secondary">Time signature</span>
          <select
            className={SELECT_CLASS}
            value={tsIndex >= 0 ? tsIndex : ''}
            onChange={(e) => onPickTimeSignature(e.target.value)}
          >
            {tsIndex < 0 && (
              <option value="">{formatTimeSignature(active.timeSignature)}</option>
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
            value={active.subdivision}
            onChange={(e) =>
              setSubdivision(e.target.value as (typeof SUBDIVISION_ORDER)[number])
            }
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
          value={active.pattern.length}
          min={EDITOR_BARS_MIN}
          max={EDITOR_BARS_MAX}
          onChange={setBarCount}
        />
      </div>

      {/* Grid */}
      <div className="surface-card mt-6 rounded-[14px] p-4">
        <PatternGrid exercise={active} />
      </div>

      {/* Live preview */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-fg">Preview</h2>
        <NotationLivePreview exercise={active} />
      </div>
    </div>
  );
}

function sameTimeSignature(a: TimeSignature, b: TimeSignature): boolean {
  return (
    a.numerator === b.numerator &&
    a.denominator === b.denominator &&
    a.displayAs === b.displayAs
  );
}
