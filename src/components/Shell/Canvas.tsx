import { useModeStore } from '../../state/mode';
import { Notation } from '../Exercise/Notation';

/** Canvas zone (DESIGN §Canvas, §Notation canvas): the notation, full-width,
 *  vertically centered, no container chrome, capped at 1600px. Free mode has no
 *  notation — the zone stays empty and the transport numbers carry the content. */
export function Canvas() {
  const mode = useModeStore((s) => s.mode);

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto px-8 py-16">
      {mode === 'exercise' && (
        <div className="mx-auto w-full max-w-[1600px]">
          <Notation />
        </div>
      )}
    </main>
  );
}
