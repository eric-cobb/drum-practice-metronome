import { useRef, useState, type ChangeEvent } from 'react';
import { Upload, FileCode } from 'lucide-react';
import { useExerciseStore } from '../../state/exercises';
import type { ExerciseSet } from '../../types';
import { Button, Modal, cn } from '../ui';
import { SchemaReferenceModal } from './SchemaReferenceModal';

interface ConflictState {
  existing: boolean;
  bundled: boolean;
  suggestedNewId: string;
  pendingSet: ExerciseSet;
}

type Msg = { ok: boolean; text: string } | null;

/** Import-set + schema-reference entry points for the Library header
 *  (DESIGN-v2 §5). Wraps the exercise store's import flow, including the
 *  id-conflict resolution dialog (SPEC §7). */
export function LibraryActions() {
  const importSet = useExerciseStore((s) => s.importSet);
  const replaceSet = useExerciseStore((s) => s.replaceSet);
  const saveSetAs = useExerciseStore((s) => s.saveSetAs);

  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    const result = await importSet(file);
    if (result.ok) {
      setMsg({ ok: true, text: `Imported '${result.set.title}' (${result.set.exercises.length} exercises).` });
    } else if ('conflict' in result) {
      setConflict(result.conflict);
    } else {
      setMsg({ ok: false, text: result.error });
    }
  };

  const onReplace = async () => {
    if (!conflict) return;
    const result = await replaceSet(conflict.pendingSet);
    setConflict(null);
    setMsg(
      result.ok
        ? { ok: true, text: `Replaced '${result.set.title}'.` }
        : { ok: false, text: result.error },
    );
  };

  const onKeepBoth = async () => {
    if (!conflict) return;
    const result = await saveSetAs(conflict.pendingSet, conflict.suggestedNewId);
    setConflict(null);
    setMsg(
      result.ok
        ? { ok: true, text: `Imported as '${result.set.id}'.` }
        : { ok: false, text: result.error },
    );
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onPick}
          className="hidden"
        />
        <Button
          variant="primary"
          size="sm"
          icon={<Upload size={15} strokeWidth={1.5} />}
          onClick={() => fileRef.current?.click()}
        >
          Import set
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<FileCode size={15} strokeWidth={1.5} />}
          onClick={() => setShowSchema(true)}
        >
          Schema reference
        </Button>
      </div>
      {msg && (
        <p
          role="status"
          className={cn('text-xs', msg.ok ? 'text-[color:var(--color-accent-text)]' : 'text-danger-text')}
        >
          {msg.text}
        </p>
      )}

      {showSchema && <SchemaReferenceModal onClose={() => setShowSchema(false)} />}

      {conflict && (
        <Modal onClose={() => setConflict(null)} label="Resolve set id conflict">
          <div className="flex flex-col gap-3">
            <h3 className="text-[15px] font-medium text-fg">Set id already in use</h3>
            <p className="text-sm text-fg-secondary">
              {conflict.bundled
                ? `'${conflict.pendingSet.id}' matches a bundled set that ships with the app. Bundled sets can't be replaced — choose "Keep both" to import under a new id.`
                : `'${conflict.pendingSet.id}' is already imported. Replace it with the version from the file, or keep both.`}
            </p>
            <p className="text-xs text-fg-muted">
              Keep both imports as{' '}
              <code className="rounded bg-fg/10 px-1 py-0.5 text-[11px]">{conflict.suggestedNewId}</code>.
            </p>
            <div className="mt-1 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConflict(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={conflict.bundled}
                onClick={() => void onReplace()}
              >
                Replace existing
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void onKeepBoth()}>
                Keep both
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
