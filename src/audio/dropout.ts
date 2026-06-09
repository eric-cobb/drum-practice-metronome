// Pure click-dropout logic (SPEC §5). Decides, per bar, whether the click is
// muted. Kept free of Web Audio / the store so it's unit-testable; the scheduler
// holds the random-mode state and steps it once per bar.
//
// During a muted bar the scheduler still advances counters and emits the note
// event — only the click audio is skipped (ARCHITECTURE §Mute behavior).

import type { DropoutConfig } from '../types';

/** Scheduled dropout is stateless: play for `barsOn` bars, mute for `barsOff`,
 *  repeat. Bar 0 falls in the first "on" run, so a session never starts muted. */
export function scheduledMuted(
  barIndex: number,
  barsOn: number,
  barsOff: number,
): boolean {
  const cycle = Math.max(1, barsOn) + Math.max(0, barsOff);
  return barIndex % cycle >= Math.max(1, barsOn);
}

/** Sequential state for random dropout — advanced one bar at a time. */
export interface RandomDropoutState {
  /** Index of the next bar to decide (0-based). */
  barIndex: number;
  /** Consecutive muted bars ending at the previous bar. */
  consecutiveMuted: number;
  /** Unmuted bars since the last muted bar (or since start). */
  barsSinceMute: number;
  /** Whether any bar has been muted yet (min-between only applies after one). */
  hasMuted: boolean;
}

export const RANDOM_DROPOUT_INITIAL: RandomDropoutState = {
  barIndex: 0,
  consecutiveMuted: 0,
  barsSinceMute: 0,
  hasMuted: false,
};

/** Decide whether the next bar is muted under random dropout, returning the
 *  decision and the advanced state. Constraints (SPEC §5):
 *   - the first bar is never muted;
 *   - within a muted run, at most `maxConsecutiveMuted` bars;
 *   - between runs, at least `minBarsBetween` unmuted bars;
 *   - otherwise muted with probability `muteProbability`%.
 *  `rand` returns a float in [0,1) (injected for tests). */
export function stepRandomDropout(
  state: RandomDropoutState,
  config: Extract<DropoutConfig, { mode: 'random' }>,
  rand: () => number,
): { muted: boolean; state: RandomDropoutState } {
  const { barIndex, consecutiveMuted, barsSinceMute, hasMuted } = state;

  let muted = false;
  if (barIndex > 0) {
    const canMute =
      consecutiveMuted > 0
        ? consecutiveMuted < config.maxConsecutiveMuted
        : !hasMuted || barsSinceMute >= config.minBarsBetween;
    muted = canMute && rand() * 100 < config.muteProbability;
  }

  const next: RandomDropoutState = muted
    ? {
        barIndex: barIndex + 1,
        consecutiveMuted: consecutiveMuted + 1,
        barsSinceMute: 0,
        hasMuted: true,
      }
    : {
        barIndex: barIndex + 1,
        consecutiveMuted: 0,
        barsSinceMute: barsSinceMute + 1,
        hasMuted,
      };

  return { muted, state: next };
}
