import { useMetronomeStore } from '../../state/metronome';
import { Card, Input } from '../ui';

/** Free-mode session name (DESIGN-v2 §5: "Session name input + Save session"
 *  below the play composition). The label is captured as the session's
 *  exerciseName. Sessions auto-save on stop once at least one rep is completed
 *  (SPEC §4), so there is no separate save action — the helper line states that
 *  rather than offering a redundant button. */
export function SessionNameCard() {
  const label = useMetronomeStore((s) => s.freeSessionLabel);
  const setLabel = useMetronomeStore((s) => s.setFreeSessionLabel);

  return (
    <Card surface="card" className="flex flex-col gap-2 p-4">
      <Input
        label="Session name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Untitled"
      />
      <p className="text-[11px] text-fg-muted">
        Saved automatically when you stop, if you complete at least one rep.
      </p>
    </Card>
  );
}
