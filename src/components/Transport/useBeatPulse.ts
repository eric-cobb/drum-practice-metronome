import { useEffect, type RefObject } from 'react';
import { useMetronomeStore } from '../../state/metronome';

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

type Ring = RefObject<HTMLElement | null> | undefined;

function animateRing(
  ref: Ring,
  to: number,
  opacity: number,
  duration: number,
  delay: number,
): void {
  const el = ref?.current;
  if (!el) return;
  el.animate(
    [
      { transform: 'scale(1)', opacity },
      { transform: `scale(${to})`, opacity: 0 },
    ],
    { duration, delay, easing: 'ease-out' },
  );
}

interface BeatPulseRefs {
  button: RefObject<HTMLElement | null>;
  /** Free mode only — omit in Exercise mode (no sonar rings there). */
  skyRing?: RefObject<HTMLElement | null>;
  cyanRing1?: RefObject<HTMLElement | null>;
  cyanRing2?: RefObject<HTMLElement | null>;
}

/** The play/stop button IS the beat indicator (DESIGN §"The button is the beat
 *  indicator", §Motion). On each beat while playing:
 *   - unaccented → small scale pulse + a single soft sky sonar ring
 *   - accented (per the accent pattern) → larger pulse, the gradient flashes
 *     sky → cyan (decaying back via CSS transition), and two cyan rings expand
 *  Rings only animate when their refs are provided (Free mode). Reduced motion
 *  replaces scale/rings with a brief outer-bloom brightness shift. */
export function useBeatPulse({
  button,
  skyRing,
  cyanRing1,
  cyanRing2,
}: BeatPulseRefs): void {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const currentBeat = useMetronomeStore((s) => s.currentBeat);
  const accentPattern = useMetronomeStore((s) => s.accentPattern);

  useEffect(() => {
    if (!isPlaying || currentBeat < 0) return;
    const btn = button.current;
    if (!btn) return;

    const accented = accentPattern[currentBeat] ?? currentBeat === 0;
    const reduce = prefersReducedMotion();

    if (accented) {
      // Flash the cyan gradient; the CSS transition decays it back to sky.
      btn.classList.add('is-accented');
      window.setTimeout(
        () => btn.classList.remove('is-accented'),
        reduce ? 250 : 60,
      );
    } else if (reduce) {
      btn.classList.add('is-beat-bloom');
      window.setTimeout(() => btn.classList.remove('is-beat-bloom'), 120);
    }

    if (reduce) return; // no scale, no rings under reduced motion

    btn.animate(
      [
        { transform: 'scale(1)' },
        { transform: `scale(${accented ? 1.06 : 1.03})` },
        { transform: 'scale(1)' },
      ],
      { duration: accented ? 200 : 120, easing: 'ease-out' },
    );

    if (accented) {
      animateRing(cyanRing1, 1.35, 0.55, 500, 0);
      animateRing(cyanRing2, 1.55, 0.22, 600, 80);
    } else {
      animateRing(skyRing, 1.25, 0.3, 400, 0);
    }
  }, [
    currentBeat,
    isPlaying,
    accentPattern,
    button,
    skyRing,
    cyanRing1,
    cyanRing2,
  ]);
}
