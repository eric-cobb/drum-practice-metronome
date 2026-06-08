import { useMetronomeStore } from '../../state/metronome';
import { getBeatGrouping } from '../../meter';
import { Card, cn } from '../ui';

/** Per-pulse accent toggles (DESIGN-v2 §5: a card below the play composition in
 *  Free mode). Defaults to pulse 1; an accented pulse plays a louder, higher
 *  click and a brighter beat-indicator flash (SPEC §1). */
export function AccentEditor() {
  const timeSignature = useMetronomeStore((s) => s.timeSignature);
  const accentPattern = useMetronomeStore((s) => s.accentPattern);
  const toggleAccent = useMetronomeStore((s) => s.toggleAccent);
  const { pulsesPerBar } = getBeatGrouping(timeSignature);

  return (
    <Card surface="card" className="flex flex-col gap-3 p-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        Accents
      </span>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: pulsesPerBar }, (_, i) => {
          const accented = accentPattern[i] ?? i === 0;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={accented}
              onClick={() => toggleAccent(i)}
              aria-label={`Beat ${i + 1} accent`}
              className={cn(
                'h-9 w-9 rounded-[8px] text-sm font-medium tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                accented
                  ? 'bg-accent-gradient text-white'
                  : 'surface-deep text-fg-secondary hover:brightness-110',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
