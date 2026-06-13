import { useEditorStore } from '../../state/editor';
import { Input } from '../ui';

/** Set-level metadata: title, source, and the defaults a freshly-selected
 *  exercise inherits (tempo, target reps). */
export function SetMetaForm() {
  const draft = useEditorStore((s) => s.draft);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setSource = useEditorStore((s) => s.setSource);
  const setDefaultBpm = useEditorStore((s) => s.setDefaultBpm);
  const setDefaultTargetReps = useEditorStore((s) => s.setDefaultTargetReps);

  if (!draft) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input
        label="Set title"
        value={draft.title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        label="Source"
        value={draft.source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="e.g. Stick Control, original"
      />
      <Input
        label="Default tempo (BPM)"
        type="number"
        min={20}
        max={400}
        value={draft.defaultBpm}
        onChange={(e) => setDefaultBpm(Number(e.target.value))}
      />
      <Input
        label="Default target reps"
        type="number"
        min={1}
        max={200}
        value={draft.defaultTargetReps}
        onChange={(e) => setDefaultTargetReps(Number(e.target.value))}
      />
    </div>
  );
}
