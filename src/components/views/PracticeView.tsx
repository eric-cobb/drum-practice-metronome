import { useModeStore } from '../../state/mode';
import { ModeToggle } from '../Practice/ModeToggle';
import { ExerciseSelector } from '../Practice/selector/ExerciseSelector';
import { FreeMode } from '../Practice/FreeMode';
import { ExerciseMode } from '../Practice/ExerciseMode';

/** Practice view — the metronome (DESIGN-v2 §5). Rebuilt on the v2 primitives in
 *  Stage 3. A centered brand wordmark band sits on top, then a 48px bar carries
 *  the mode toggle (and, in Exercise mode, the current-exercise pill); the body
 *  is the Free or Exercise composition. The audio engine, scheduler, and stores
 *  are unchanged — only the surrounding UI. */
export function PracticeView() {
  const mode = useModeStore((s) => s.mode);

  return (
    <div className="flex h-full flex-col">
      {/* Brand wordmark — its own centered band at the top, in both modes, so it
          has room and never collides with the controls. Theme-swapped: the
          dark-text art on light surfaces, the light-text art on dark. */}
      <div className="flex shrink-0 items-center justify-center px-6 pb-2 pt-6">
        <img
          src="/inthepocket_light.png"
          alt="InThePocket"
          className="h-11 w-auto sm:h-12 dark:hidden"
          draggable={false}
        />
        <img
          src="/inthepocket_dark.png"
          alt="InThePocket"
          className="hidden h-11 w-auto sm:h-12 dark:block"
          draggable={false}
        />
      </div>
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-6">
        <ModeToggle />
        {mode === 'exercise' && <ExerciseSelector />}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {mode === 'exercise' ? <ExerciseMode /> : <FreeMode />}
      </div>
    </div>
  );
}
