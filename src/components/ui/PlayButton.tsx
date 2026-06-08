import { Play, Pause } from 'lucide-react';
import { cn } from './cn';

interface PlayButtonProps {
  playing: boolean;
  onClick: () => void;
  /** Free mode is the larger composition; Exercise mode is smaller
   *  (DESIGN-v2 §6: 184px vs 152px diameter). */
  size?: 'free' | 'exercise';
  className?: string;
}

const DIAMETER: Record<NonNullable<PlayButtonProps['size']>, number> = {
  free: 184,
  exercise: 152,
};

/** The signature element: gradient face with an atmospheric bloom behind it and
 *  an inner glow over it, both non-interactive (DESIGN-v2 §3). When stopped it
 *  breathes subtly (disabled under reduced motion via CSS). The icon is white
 *  and ~30% of the diameter. */
export function PlayButton({
  playing,
  onClick,
  size = 'free',
  className,
}: PlayButtonProps) {
  const d = DIAMETER[size];
  const iconSize = Math.round(d * 0.3);
  const Icon = playing ? Pause : Play;

  return (
    <div
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: d, height: d }}
    >
      {/* Atmospheric bloom — behind the face, never clickable. */}
      <span className="play-bloom-outer" aria-hidden />
      <button
        type="button"
        onClick={onClick}
        aria-label={playing ? 'Stop' : 'Start'}
        className={cn('play-button-v2 grid place-items-center', !playing && 'is-stopped')}
        style={{ width: d, height: d }}
      >
        <span className="play-bloom-inner" aria-hidden />
        <Icon
          size={iconSize}
          strokeWidth={1.5}
          className="relative text-white"
          // The play triangle reads centered when nudged slightly right to
          // offset its optical weight; the pause glyph is symmetric.
          style={{ fill: 'white', transform: playing ? undefined : `translateX(${iconSize * 0.06}px)` }}
          aria-hidden
        />
      </button>
    </div>
  );
}
