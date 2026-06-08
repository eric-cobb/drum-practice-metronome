import { useEffect, type RefObject } from 'react';
import { useMetronomeStore } from '../../state/metronome';

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The v2 play button IS the beat indicator (SPEC §1). On each beat while
 *  playing it pulses: a brief brightness flash (stronger on accented beats, so
 *  the downbeat reads distinct) plus a scale pop. Reduced motion keeps only the
 *  brightness flash. The button's stopped "breathing" animation is inactive
 *  while playing, so the scale animation here never conflicts with it.
 *
 *  This lives in Practice (not the PlayButton primitive) so the primitive stays
 *  free of store state. */
export function usePlayPulse(ref: RefObject<HTMLElement | null>): void {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const currentBeat = useMetronomeStore((s) => s.currentBeat);
  const accentPattern = useMetronomeStore((s) => s.accentPattern);

  useEffect(() => {
    if (!isPlaying || currentBeat < 0) return;
    const btn = ref.current;
    if (!btn) return;

    const accented = accentPattern[currentBeat] ?? currentBeat === 0;
    const cls = accented ? 'is-accent' : 'is-beat';
    btn.classList.add(cls);
    window.setTimeout(() => btn.classList.remove(cls), accented ? 180 : 110);

    if (prefersReducedMotion()) return;
    btn.animate(
      [
        { transform: 'scale(1)' },
        { transform: `scale(${accented ? 1.05 : 1.03})` },
        { transform: 'scale(1)' },
      ],
      { duration: accented ? 200 : 120, easing: 'ease-out' },
    );
  }, [currentBeat, isPlaying, accentPattern, ref]);
}
