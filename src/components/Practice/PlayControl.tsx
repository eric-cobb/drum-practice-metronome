import { useRef } from 'react';
import { useMetronomeStore } from '../../state/metronome';
import { start, stop, skip } from '../../audio/transport';
import { PlayButton } from '../ui';
import { usePlayPulse } from './usePlayPulse';

interface PlayControlProps {
  size: 'free' | 'exercise';
}

/** The play/stop button for the Practice view, wired to the transport and
 *  doubling as the beat indicator (DESIGN-v2 §6, SPEC §1). During a count-in
 *  the button skips into the exercise; otherwise it toggles play/stop. */
export function PlayControl({ size }: PlayControlProps) {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const countIn = useMetronomeStore((s) => s.countIn);
  const buttonRef = useRef<HTMLButtonElement>(null);

  usePlayPulse(buttonRef);

  const counting = countIn !== null;
  const showPause = isPlaying && !counting;

  const onClick = () => {
    if (counting) skip();
    else if (isPlaying) stop();
    else start();
  };

  const label = showPause
    ? 'Stop metronome'
    : counting
      ? 'Skip count-in'
      : 'Start metronome';

  return (
    <PlayButton
      playing={showPause}
      onClick={onClick}
      size={size}
      buttonRef={buttonRef}
      ariaLabel={label}
    />
  );
}
