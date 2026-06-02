import { useMetronomeStore } from '../../state/metronome';
import { ModeToggle } from '../TopBar/ModeToggle';
import { ExerciseContext } from '../TopBar/ExerciseContext';
import { IconButton } from '../Shared/IconButton';
import { ClockIcon, GearIcon } from '../Shared/icons';

interface TopBarProps {
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

/** Top bar (DESIGN §Top Bar): mode toggle · exercise context · history + gear.
 *  Icons recede to 30% opacity while playing. */
export function TopBar({ onOpenHistory, onOpenSettings }: TopBarProps) {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 px-6 dark:border-neutral-800">
      <ModeToggle />
      <ExerciseContext />
      <div
        className={`flex items-center gap-2 transition-opacity duration-200 ease-out ${
          isPlaying ? 'opacity-30' : 'opacity-100'
        }`}
      >
        <IconButton label="Practice history" onClick={onOpenHistory}>
          <ClockIcon />
        </IconButton>
        <IconButton label="Settings" onClick={onOpenSettings}>
          <GearIcon />
        </IconButton>
      </div>
    </header>
  );
}
