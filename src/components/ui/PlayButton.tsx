import type { Ref } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from './cn';

interface PlayButtonProps {
  playing: boolean;
  onClick: () => void;
  /** Free mode is the larger composition; Exercise mode is smaller
   *  (DESIGN-v2 §6: 184px vs 152px diameter). */
  size?: 'free' | 'exercise';
  /** Ref to the inner <button>, so callers can drive the beat-indicator pulse
   *  (Practice) without the primitive owning store state. */
  buttonRef?: Ref<HTMLButtonElement>;
  /** Override the derived Start/Stop label (e.g. "Skip count-in"). */
  ariaLabel?: string;
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
  buttonRef,
  ariaLabel,
  className,
}: PlayButtonProps) {
  const d = DIAMETER[size];
  const iconSize = Math.round(d * 0.3);
  const Icon = playing ? Pause : Play;

  return (
    <div
      // `isolate` confines the button's bloom/rings — and especially the WAAPI
      // pulse transform, which the browser composites onto its own layer while
      // playing — to a self-contained stacking context. Without it that
      // composited layer escapes above sibling popovers (BPM/config panels),
      // showing the button through them even though the panels are opaque.
      className={cn('relative inline-grid place-items-center isolate', className)}
      style={{ width: d, height: d }}
    >
      {/* Atmospheric bloom — behind the face, never clickable. */}
      <span className="play-bloom-outer" aria-hidden />
      {/* Sonar rings — expand outward on each beat (driven by usePlayPulse).
          Invisible at rest; behind the face so only the outer ring shows. */}
      <span
        data-ring="a"
        className="pointer-events-none absolute inset-0 rounded-full border-2 opacity-0 border-[color:var(--color-accent)]"
        aria-hidden
      />
      <span
        data-ring="b"
        className="pointer-events-none absolute inset-0 rounded-full border-2 opacity-0 border-[color:var(--color-accent-cyan)]"
        aria-hidden
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? (playing ? 'Stop' : 'Start')}
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
