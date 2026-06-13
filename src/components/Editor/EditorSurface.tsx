import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useEditorStore } from '../../state/editor';
import { useExerciseStore } from '../../state/exercises';
import { Button } from '../ui';
import { validateDraft } from './editorModel';
import { SetMetaForm } from './SetMetaForm';
import { SectionsPanel } from './SectionsPanel';
import { ExerciseList } from './ExerciseList';
import { ExerciseMetaForm } from './ExerciseMetaForm';
import { PatternGrid } from './PatternGrid';
import { NotationLivePreview } from './NotationLivePreview';

/** The full pattern-editor surface (Phase 11). Renders inside the Library view
 *  while a draft is open: set metadata, section + exercise management, and — for
 *  the selected exercise — its metadata, the sticking grid, and a live preview.
 *  Saves the whole set through the exercises store (validate → persist →
 *  registry refresh). */
export function EditorSurface() {
  const draft = useEditorStore((s) => s.draft);
  const activeExerciseId = useEditorStore((s) => s.activeExerciseId);
  const dirty = useEditorStore((s) => s.dirty);
  const markClean = useEditorStore((s) => s.markClean);
  const close = useEditorStore((s) => s.close);

  const replaceSet = useExerciseStore((s) => s.replaceSet);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const active = draft?.exercises.find((e) => e.id === activeExerciseId) ?? null;
  if (!draft) return null;

  const onCancel = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    close();
  };

  const onSave = async () => {
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
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

  return (
    <div className="mx-auto max-w-[1100px] px-8 py-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-fg">Edit set</h1>
          <p className="text-xs text-fg-secondary">
            Build sections and exercises, then click a stroke cell to cycle rest →
            R → L and toggle accents, ghosts, and ornaments.
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

      <div className="mt-6 flex flex-col gap-6">
        <SetMetaForm />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Left: structure */}
          <div className="flex flex-col gap-6">
            <SectionsPanel />
            <ExerciseList />
          </div>

          {/* Right: the selected exercise */}
          <div className="flex flex-col gap-6">
            {active ? (
              <>
                <div className="surface-card rounded-[14px] p-4">
                  <ExerciseMetaForm exercise={active} />
                </div>
                <div className="surface-card rounded-[14px] p-4">
                  <PatternGrid exercise={active} />
                </div>
                <div>
                  <h2 className="mb-2 text-sm font-medium text-fg">Preview</h2>
                  <NotationLivePreview exercise={active} />
                </div>
              </>
            ) : (
              <p className="text-sm text-fg-tertiary">Select an exercise to edit.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
