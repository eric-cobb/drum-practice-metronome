import { describe, expect, it } from 'vitest';
import {
  blankSet,
  cycleOrnament,
  cycleStroke,
  eventsPerBar,
  resizeBar,
  resizePattern,
  toggleAccent,
  toggleGhost,
} from './editorModel';
import type { Hit, PatternEvent, TimeSignature } from '../../types';

const ts = (numerator: number, denominator: 2 | 4 | 8): TimeSignature => ({
  numerator,
  denominator,
});

describe('eventsPerBar', () => {
  it('counts positions for common meter + subdivision combos', () => {
    expect(eventsPerBar(ts(4, 4), 'sixteenth')).toBe(16);
    expect(eventsPerBar(ts(4, 4), 'eighth')).toBe(8);
    expect(eventsPerBar(ts(4, 4), 'quarter')).toBe(4);
    expect(eventsPerBar(ts(3, 4), 'eighth')).toBe(6);
    // 6/8 is compound (felt in 2), eighths divide each pulse by 3 → 6.
    expect(eventsPerBar(ts(6, 8), 'eighth')).toBe(6);
  });
});

describe('resizeBar / resizePattern', () => {
  it('pads short bars with rests and truncates long ones', () => {
    expect(resizeBar([{ voices: ['snare'], sticking: 'R' }], 3)).toEqual([
      { voices: ['snare'], sticking: 'R' },
      'rest',
      'rest',
    ]);
    expect(resizeBar(['rest', 'rest', 'rest'], 2)).toEqual(['rest', 'rest']);
  });

  it('reshapes a pattern to barCount × perBar, preserving overlap', () => {
    const pattern: PatternEvent[][] = [[{ voices: ['snare'], sticking: 'R' }, 'rest']];
    const out = resizePattern(pattern, 2, 2);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual([{ voices: ['snare'], sticking: 'R' }, 'rest']);
    expect(out[1]).toEqual(['rest', 'rest']);
  });
});

describe('cell operations', () => {
  it('cycles a stroke rest → R → L → rest', () => {
    const r = cycleStroke('rest');
    expect(r).toEqual({ voices: ['snare'], sticking: 'R' });
    const l = cycleStroke(r);
    expect(l).toEqual({ voices: ['snare'], sticking: 'L' });
    expect(cycleStroke(l)).toBe('rest');
  });

  it('preserves accent/ornament when cycling R → L', () => {
    const hit: Hit = { voices: ['snare'], sticking: 'R', accent: true, ornament: 'flam' };
    expect(cycleStroke(hit)).toEqual({
      voices: ['snare'],
      sticking: 'L',
      accent: true,
      ornament: 'flam',
    });
  });

  it('accent and ghost are mutually exclusive', () => {
    const hit: Hit = { voices: ['snare'], sticking: 'R', ghost: true };
    const accented = toggleAccent(hit);
    expect(accented).toEqual({ voices: ['snare'], sticking: 'R', accent: true });
    // Toggling ghost on a now-accented hit clears the accent.
    expect(toggleGhost(accented)).toEqual({
      voices: ['snare'],
      sticking: 'R',
      ghost: true,
    });
  });

  it('omits falsy flags so saved hits stay minimal', () => {
    const hit: Hit = { voices: ['snare'], sticking: 'R', accent: true };
    const off = toggleAccent(hit);
    expect(off).toEqual({ voices: ['snare'], sticking: 'R' });
    expect(off !== 'rest' && 'accent' in off).toBe(false);
  });

  it('cycles ornaments none → flam → drag → ruff → buzz → none', () => {
    let ev: PatternEvent = { voices: ['snare'], sticking: 'R' };
    const seen: (string | undefined)[] = [];
    for (let i = 0; i < 5; i += 1) {
      ev = cycleOrnament(ev);
      seen.push(ev === 'rest' ? 'rest' : ev.ornament);
    }
    expect(seen).toEqual(['flam', 'drag', 'ruff', 'buzz', undefined]);
  });

  it('cell ops are no-ops on rests (accent/ghost/ornament)', () => {
    expect(toggleAccent('rest')).toBe('rest');
    expect(toggleGhost('rest')).toBe('rest');
    expect(cycleOrnament('rest')).toBe('rest');
  });
});

describe('blankSet', () => {
  it('produces a valid one-section, one-exercise v2 set of rests', () => {
    const set = blankSet('my-set');
    expect(set.id).toBe('my-set');
    expect(set.schemaVersion).toBe(2);
    expect(set.sections).toHaveLength(1);
    expect(set.exercises).toHaveLength(1);
    const ex = set.exercises[0];
    expect(ex.sectionId).toBe(set.sections[0].id);
    expect(ex.pattern).toHaveLength(1);
    expect(ex.pattern[0]).toHaveLength(16); // 4/4 sixteenths
    expect(ex.pattern[0].every((e) => e === 'rest')).toBe(true);
  });
});
