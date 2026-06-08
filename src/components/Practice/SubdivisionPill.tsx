import { useMetronomeStore } from '../../state/metronome';
import { SUBDIVISION_LABELS, SUBDIVISION_ORDER } from '../../types';
import { Popover, cn } from '../ui';
import { ConfigPill } from './ConfigPill';

/** Free-mode subdivision config pill + dropdown. */
export function SubdivisionPill() {
  const subdivision = useMetronomeStore((s) => s.subdivision);
  const setSubdivision = useMetronomeStore((s) => s.setSubdivision);

  return (
    <Popover
      placement="top"
      align="center"
      label="Subdivision"
      widthClass="w-auto"
      trigger={({ toggle }) => (
        <ConfigPill
          data-popover-trigger
          onClick={toggle}
          label="Subdivision"
          value={SUBDIVISION_LABELS[subdivision]}
          active
        />
      )}
    >
      {() => (
        <fieldset className="flex w-64 flex-col gap-2">
          <legend className="mb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
            Subdivision
          </legend>
          <div className="flex flex-wrap gap-2">
            {SUBDIVISION_ORDER.map((value) => {
              const selected = value === subdivision;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSubdivision(value)}
                  className={cn(
                    'h-9 rounded-[8px] px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    selected
                      ? 'bg-accent-gradient text-white'
                      : 'surface-deep text-fg-secondary hover:brightness-110',
                  )}
                >
                  {SUBDIVISION_LABELS[value]}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </Popover>
  );
}
