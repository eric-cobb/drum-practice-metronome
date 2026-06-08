import { Circle, Music } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useModeStore } from '../../state/mode';
import { useMetronomeStore } from '../../state/metronome';
import { stopMetronome } from '../../audio/scheduler';
import type { Mode } from '../../types';
import { cn } from '../ui';

const SEGMENTS: { value: Mode; label: string; icon: LucideIcon }[] = [
  { value: 'free', label: 'Free', icon: Circle },
  { value: 'exercise', label: 'Exercise', icon: Music },
];

/** Mode toggle at the top of the Practice view (DESIGN-v2 §6): a 2-segment pill,
 *  the active segment on the card surface with the inner highlight, the inactive
 *  one muted. Switching stops any running session first (SPEC §3). */
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
      className={cn(
        'surface-deep inline-flex h-7 items-center rounded-full p-0.5 transition-opacity duration-200',
        isPlaying ? 'opacity-30' : 'opacity-100',
      )}
    >
      {SEGMENTS.map(({ value, label, icon: Icon }) => {
        const selected = value === mode;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => select(value)}
            className={cn(
              'flex h-6 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selected
                ? 'surface-card text-fg'
                : 'text-fg-tertiary hover:text-fg-secondary',
            )}
          >
            <Icon size={12} strokeWidth={1.5} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
