import { useEffect, type RefObject } from 'react';
import { useMetronomeStore } from '../../state/metronome';

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Expand a sonar ring outward and fade it (the radar effect). */
function pulseRing(
  el: Element | null | undefined,
  toScale: number,
  fromOpacity: number,
  duration: number,
  delay = 0,
): void {
  el?.animate(
    [
      { transform: 'scale(1)', opacity: fromOpacity },
      { transform: `scale(${toScale})`, opacity: 0 },
    ],
    { duration, delay, easing: 'ease-out' },
  );
}

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

    // Sonar rings (siblings of the button): one soft purple ring on a normal
    // beat; a brighter purple + a wider cyan ring on accents (the downbeat).
    const wrap = btn.parentElement;
    const ringA = wrap?.querySelector('[data-ring="a"]');
    const ringB = wrap?.querySelector('[data-ring="b"]');
    if (accented) {
      pulseRing(ringA, 1.4, 0.5, 500);
      pulseRing(ringB, 1.65, 0.32, 620, 70);
    } else {
      pulseRing(ringA, 1.35, 0.35, 440);
    }
  }, [currentBeat, isPlaying, accentPattern, ref]);
}
