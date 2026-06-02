import { useMetronomeStore } from '../../state/metronome';
import { Popover } from '../Shared/Popover';
import { TimeSignatureControl } from '../Controls/TimeSignatureControl';
import { SubdivisionControl } from '../Controls/SubdivisionControl';
import { AccentControl } from '../Controls/AccentControl';
import { SUBDIVISION_LABELS, formatTimeSignature } from '../../types';

// "Always-configured" pill style (DESIGN §Pill toggle): these settings always
// have a value, so they read as a setting rather than an on/off toggle.
const pill =
  'h-8 rounded-full px-3 text-sm tabular-nums bg-neutral-100 text-neutral-700 ' +
  'hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ' +
  'dark:bg-neutral-800 dark:text-neutral-300';

/** Free-mode control strip (DESIGN §Free Mode Layout, §Time Signature / Subdivision
 *  Popovers): time-signature and subdivision pills, each opening its popover. The
 *  Time Signature popover also holds the accent pattern, which drives the
 *  accented-beat treatment on the play button. Recedes to 30% while playing.
 *
 *  Dropout and Ramp pills belong here too per DESIGN, but those features arrive
 *  in Phases 7–8, so they're intentionally omitted for now. */
export function FreeControlStrip() {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const timeSignature = useMetronomeStore((s) => s.timeSignature);
  const subdivision = useMetronomeStore((s) => s.subdivision);

  return (
    <footer
      className={`flex h-14 shrink-0 items-center gap-2 border-t border-neutral-200 px-6 transition-opacity duration-200 ease-out dark:border-neutral-800 ${
        isPlaying ? 'opacity-30' : 'opacity-100'
      }`}
    >
      <Popover
        placement="top"
        align="start"
        label="Time signature and accents"
        widthClass="w-[360px]"
        trigger={({ toggle }) => (
          <button
            type="button"
            data-popover-trigger
            onClick={toggle}
            aria-label="Time signature"
            className={pill}
          >
            {formatTimeSignature(timeSignature)}
          </button>
        )}
      >
        {() => (
          <div className="flex flex-col gap-4">
            <TimeSignatureControl />
            <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
            <AccentControl />
          </div>
        )}
      </Popover>

      <Popover
        placement="top"
        align="start"
        label="Subdivision"
        trigger={({ toggle }) => (
          <button
            type="button"
            data-popover-trigger
            onClick={toggle}
            aria-label="Subdivision"
            className={pill}
          >
            {SUBDIVISION_LABELS[subdivision]}
          </button>
        )}
      >
        {() => <SubdivisionControl />}
      </Popover>
    </footer>
  );
}
