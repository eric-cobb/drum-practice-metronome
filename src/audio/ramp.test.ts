import { describe, it, expect } from 'vitest';
import type { RampConfig } from '../types';
import { rampSteps, rampBpmForSteps, rampReachedEnd } from './ramp';

const up: RampConfig = {
  startBpm: 80,
  endBpm: 100,
  stepSize: 5,
  trigger: { type: 'reps', everyN: 2 },
  autoStopAtEnd: true,
};
const down: RampConfig = { ...up, startBpm: 120, endBpm: 100 };

describe('rampSteps', () => {
  it('counts steps from reps for a reps trigger', () => {
    expect(rampSteps(up, 0, 999)).toBe(0);
    expect(rampSteps(up, 2, 0)).toBe(1);
    expect(rampSteps(up, 5, 0)).toBe(2);
  });

  it('counts steps from seconds for a seconds trigger', () => {
    const s: RampConfig = { ...up, trigger: { type: 'seconds', everyN: 30 } };
    expect(rampSteps(s, 999, 0)).toBe(0);
    expect(rampSteps(s, 0, 30)).toBe(1);
    expect(rampSteps(s, 0, 75)).toBe(2);
  });
});

describe('rampBpmForSteps', () => {
  it('climbs up and clamps at endBpm', () => {
    expect(rampBpmForSteps(up, 0)).toBe(80);
    expect(rampBpmForSteps(up, 1)).toBe(85);
    expect(rampBpmForSteps(up, 4)).toBe(100); // 80+20
    expect(rampBpmForSteps(up, 10)).toBe(100); // clamped, no overshoot
  });

  it('descends and clamps at endBpm', () => {
    expect(rampBpmForSteps(down, 0)).toBe(120);
    expect(rampBpmForSteps(down, 2)).toBe(110);
    expect(rampBpmForSteps(down, 10)).toBe(100); // clamped
  });
});

describe('rampReachedEnd', () => {
  it('is true once the clamped BPM hits endBpm', () => {
    expect(rampReachedEnd(up, 3)).toBe(false); // 95
    expect(rampReachedEnd(up, 4)).toBe(true); // 100
    expect(rampReachedEnd(down, 4)).toBe(true);
  });

  it('is false for a degenerate start===end config', () => {
    expect(rampReachedEnd({ ...up, startBpm: 100, endBpm: 100 }, 5)).toBe(false);
  });
});
