import { useModeStore } from '../../state/mode';
import { ModeToggle } from '../TopBar/ModeToggle';
import { ExerciseContext } from '../TopBar/ExerciseContext';
import { Canvas } from '../Shell/Canvas';
import { Transport } from '../Shell/Transport';
import { FreeView } from '../Free/FreeView';

/** Practice view — the metronome (DESIGN-v2 §5).
 *
 *  Stage 2 hosts the *working* v1 practice experience so the app stays fully
 *  functional while the shell lands: the mode toggle + exercise context in a
 *  top bar, and the v1 Canvas/Transport (Exercise) or FreeView (Free) body.
 *  Stage 3 rebuilds this view on the v2 primitives (new play composition,
 *  config-pill row, info strip). The history/gear icons that lived in the v1
 *  top bar are intentionally dropped here — the sidebar owns navigation now. */
export function PracticeView() {
  const mode = useModeStore((s) => s.mode);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 px-6">
        <ModeToggle />
        <ExerciseContext />
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {mode === 'exercise' ? (
          <>
            <Canvas />
            <Transport />
          </>
        ) : (
          <FreeView />
        )}
      </div>
    </div>
  );
}
