import { describe, it, expect } from 'vitest';
import {
  scheduledMuted,
  stepRandomDropout,
  RANDOM_DROPOUT_INITIAL,
  type RandomDropoutState,
} from './dropout';

describe('scheduledMuted', () => {
  it('plays barsOn then mutes barsOff, repeating; never mutes bar 0', () => {
    // 4 on, 2 off → cycle of 6: bars 0-3 play, 4-5 mute.
    const pattern = Array.from({ length: 12 }, (_, i) => scheduledMuted(i, 4, 2));
    expect(pattern).toEqual([
      false, false, false, false, true, true,
      false, false, false, false, true, true,
    ]);
  });

  it('handles 1 on / 1 off (alternating), starting unmuted', () => {
    expect([0, 1, 2, 3].map((i) => scheduledMuted(i, 1, 1))).toEqual([
      false, true, false, true,
    ]);
  });
});

/** Run the random stepper across `count` bars with a fixed rand sequence
 *  (values < probability → mute when allowed). */
function runRandom(
  config: Parameters<typeof stepRandomDropout>[1],
  rands: number[],
): boolean[] {
  let state: RandomDropoutState = RANDOM_DROPOUT_INITIAL;
  const out: boolean[] = [];
  for (let i = 0; i < rands.length; i++) {
    const r = stepRandomDropout(state, config, () => rands[i]);
    out.push(r.muted);
    state = r.state;
  }
  return out;
}

describe('stepRandomDropout', () => {
  const cfg = { mode: 'random' as const, muteProbability: 100, maxConsecutiveMuted: 2, minBarsBetween: 2 };

  it('never mutes the first bar even at 100% probability', () => {
    expect(runRandom(cfg, [0, 0])[0]).toBe(false);
  });

  it('caps consecutive mutes and enforces the gap between runs', () => {
    // prob 100 (rand 0 always wants to mute): bar0 forced unmuted, then mute up
    // to max (2), forced gap of minBetween (2), then mute again.
    const out = runRandom(cfg, [0, 0, 0, 0, 0, 0, 0, 0]);
    expect(out).toEqual([false, true, true, false, false, true, true, false]);
  });

  it('respects probability — rand above the threshold never mutes', () => {
    // prob 50: 0.99*100 = 99 ≥ 50 → never mutes.
    const out = runRandom({ ...cfg, muteProbability: 50 }, [0.99, 0.99, 0.99, 0.99]);
    expect(out).toEqual([false, false, false, false]);
  });

  it('probability is a percentage threshold', () => {
    const p = { mode: 'random' as const, muteProbability: 30, maxConsecutiveMuted: 8, minBarsBetween: 0 };
    // 0.2*100=20 < 30 → mute; 0.5*100=50 >= 30 → play.
    expect(runRandom(p, [0.5, 0.2, 0.5])).toEqual([false, true, false]);
  });
});
