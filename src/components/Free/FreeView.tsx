import { BpmDisplay } from '../Transport/BpmDisplay';
import { RepDisplay } from '../Transport/RepDisplay';
import { FreePlayButton } from './FreePlayButton';
import { FreeControlStrip } from './FreeControlStrip';

/** Free-mode layout (DESIGN §Free Mode Layout): the transport *is* the content.
 *  BPM, the giant pulsing play/stop button, and the rep counter stack as one
 *  centered composition in the canvas zone, over a thin control strip. */
export function FreeView() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-auto px-8 py-12 sm:gap-12">
        <BpmDisplay variant="free" placement="bottom" align="center" />
        <FreePlayButton />
        <RepDisplay variant="free" placement="top" align="center" />
      </main>
      <FreeControlStrip />
    </>
  );
}
