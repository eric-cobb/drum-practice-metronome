import { useModeStore } from '../../state/mode';
import { useMetronomeStore } from '../../state/metronome';
import { stopMetronome } from '../../audio/scheduler';
import type { Mode } from '../../types';

// DESIGN labels exercise mode as "Practice" and free mode as "Free".
const SEGMENTS: { value: Mode; label: string }[] = [
  { value: 'exercise', label: 'Practice' },
  { value: 'free', label: 'Free' },
];

/** Segmented mode control in the top-left (DESIGN §Mode toggle). Switching stops
 *  any running session first (SPEC §3); recedes to 30% opacity while playing. */
export function ModeToggle() {
  const mode = useModeStore((s) => s.mode);
  const setMode = useModeStore((s) => s.setMode);
  const isPlaying = useMetronomeStore((s) => s.isPlaying);

  const select = (next: Mode) => {
    if (next === mode) return;
    stopMetronome();
    setMode(next);
  };

  return (
    <div
      role="group"
      aria-label="Mode"
      className={`inline-flex rounded-lg bg-neutral-100 p-0.5 transition-opacity duration-200 ease-out dark:bg-neutral-800/60 ${
        isPlaying ? 'opacity-30' : 'opacity-100'
      }`}
    >
      {SEGMENTS.map(({ value, label }) => {
        const selected = value === mode;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => select(value)}
            className={`h-8 w-14 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              selected
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
