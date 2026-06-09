import { describe, it, expect } from 'vitest';
import { registerTap, bpmFromTaps } from './tapTempo';

describe('registerTap', () => {
  it('accumulates taps and keeps only the last 4', () => {
    let t: number[] = [];
    [0, 500, 1000, 1500, 2000].forEach((n) => (t = registerTap(t, n)));
    expect(t).toEqual([500, 1000, 1500, 2000]);
  });

  it('resets the history when a tap is more than 3s after the previous', () => {
    let t = registerTap(registerTap([], 0), 500);
    t = registerTap(t, 4000); // 3.5s gap → reset
    expect(t).toEqual([4000]);
  });
});

describe('bpmFromTaps', () => {
  it('returns null with fewer than two taps', () => {
    expect(bpmFromTaps([])).toBeNull();
    expect(bpmFromTaps([1000])).toBeNull();
  });

  it('computes BPM from the average interval', () => {
    // 500ms gaps → 120 BPM.
    expect(bpmFromTaps([0, 500, 1000, 1500])).toBe(120);
    // 1000ms gaps → 60 BPM.
    expect(bpmFromTaps([0, 1000])).toBe(60);
  });

  it('averages uneven gaps', () => {
    // gaps 400 + 600 → avg 500 → 120 BPM.
    expect(bpmFromTaps([0, 400, 1000])).toBe(120);
  });
});
