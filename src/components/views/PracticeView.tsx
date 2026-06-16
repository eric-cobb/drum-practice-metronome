import { useModeStore } from '../../state/mode';
import { ModeToggle } from '../Practice/ModeToggle';
import { ExerciseSelector } from '../Practice/selector/ExerciseSelector';
import { FreeMode } from '../Practice/FreeMode';
import { ExerciseMode } from '../Practice/ExerciseMode';

/** Practice view — the metronome (DESIGN-v2 §5). Rebuilt on the v2 primitives in
 *  Stage 3. A 48px top bar carries the mode toggle (and, in Exercise mode, the
 *  current-exercise pill); the body is the Free or Exercise composition. The
 *  audio engine, scheduler, and stores are unchanged — only the surrounding UI. */
export function PracticeView() {
  const mode = useModeStore((s) => s.mode);

  return (
    <div className="flex h-full flex-col">
      <header className="relative flex h-12 shrink-0 items-center justify-between gap-3 px-6">
        <ModeToggle />
        {mode === 'exercise' ? (
          <ExerciseSelector />
        ) : (
          /* Brand wordmark in the empty Free-mode header. Absolutely centered so
             it never shifts the mode toggle; theme-swapped (dark art on light,
             light art on dark); hidden on the tightest phone widths where it
             would crowd the toggle. */
          <span className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 sm:block">
            <img
              src="/inthepocket_light.png"
              alt="InThePocket"
              className="h-8 w-auto dark:hidden"
              draggable={false}
            />
            <img
              src="/inthepocket_dark.png"
              alt="InThePocket"
              className="hidden h-8 w-auto dark:block"
              draggable={false}
            />
          </span>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {mode === 'exercise' ? <ExerciseMode /> : <FreeMode />}
      </div>
    </div>
  );
}
