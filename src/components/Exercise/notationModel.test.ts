import { describe, expect, it } from 'vitest';
import {
  beamGroupSize,
  beamRuns,
  buildNoteSpecs,
  isTriplet,
  subdivisionToDuration,
  tupletGroupSize,
  tupletRuns,
} from './notationModel';
import type { PatternEvent, Sticking } from '../../types';

/** Build a pattern from a compact string: "R"/"L" = hits, "-" = rest. */
const ev = (s: string): PatternEvent[] =>
  [...s].map((c) => (c === '-' ? 'rest' : { sticking: c as Sticking }));

describe('subdivisionToDuration', () => {
  it('maps each subdivision to its VexFlow duration token', () => {
    expect(subdivisionToDuration('quarter')).toBe('q');
    expect(subdivisionToDuration('eighth')).toBe('8');
    expect(subdivisionToDuration('sixteenth')).toBe('16');
    expect(subdivisionToDuration('eighthTriplet')).toBe('8');
    expect(subdivisionToDuration('sixteenthTriplet')).toBe('16');
  });
});

describe('isTriplet', () => {
  it('flags only the triplet subdivisions', () => {
    expect(isTriplet('eighthTriplet')).toBe(true);
    expect(isTriplet('sixteenthTriplet')).toBe(true);
    expect(isTriplet('sixteenth')).toBe(false);
    expect(isTriplet('quarter')).toBe(false);
  });
});

describe('buildNoteSpecs', () => {
  it('produces one spec per event, marking rests and carrying stickings', () => {
    const specs = buildNoteSpecs(ev('RL-R'), 'sixteenth');
    expect(specs).toHaveLength(4);
    expect(specs.map((s) => s.isRest)).toEqual([false, false, true, false]);
    expect(specs.every((s) => s.duration === '16')).toBe(true);
    // The "rest" event carries no sticking; hits carry theirs.
    expect(specs.map((s) => (s.isRest ? 'rest' : s.sticking))).toEqual([
      'R',
      'L',
      'rest',
      'R',
    ]);
  });
});

describe('beamGroupSize', () => {
  it('uses the felt-pulse count for straight subdivisions', () => {
    expect(beamGroupSize('sixteenth', false, 4)).toBe(4); // 4/4: 4 per beat
    expect(beamGroupSize('eighth', false, 4)).toBe(2);
    expect(beamGroupSize('quarter', false, 4)).toBe(1); // < 2 ⇒ no beams
    expect(beamGroupSize('eighth', true, 8)).toBe(3); // compound: 3 per dotted-quarter
  });

  it('scales with the pulse unit when the denominator is not 4', () => {
    // 2/2 pulse is a half note → 8ths beam in 4s (per half-note pulse).
    expect(beamGroupSize('eighth', false, 2)).toBe(4);
    expect(beamGroupSize('sixteenth', false, 2)).toBe(8);
    // 7/8 pulse is an eighth → 16ths beam in 2s.
    expect(beamGroupSize('sixteenth', false, 8)).toBe(2);
  });

  it('uses 3 for triplets', () => {
    expect(beamGroupSize('eighthTriplet', false, 4)).toBe(3);
    expect(beamGroupSize('sixteenthTriplet', false, 4)).toBe(3);
  });
});

describe('tupletGroupSize', () => {
  it('is 3 for triplets and 0 otherwise', () => {
    expect(tupletGroupSize('eighthTriplet')).toBe(3);
    expect(tupletGroupSize('sixteenthTriplet')).toBe(3);
    expect(tupletGroupSize('sixteenth')).toBe(0);
  });
});

describe('beamRuns', () => {
  const specs = (pattern: string) => buildNoteSpecs(ev(pattern), 'sixteenth');

  it('beams each group of 4 sixteenths', () => {
    expect(beamRuns(specs('R'.repeat(16)), 4)).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
      [12, 13, 14, 15],
    ]);
  });

  it('breaks beams on rests and drops lone notes', () => {
    // group of 4: R - R R  ⇒ index 0 is alone (dropped), 2-3 beam together
    expect(beamRuns(specs('R-RR'), 4)).toEqual([[2, 3]]);
  });

  it('returns nothing when groupSize < 2 (e.g. quarters)', () => {
    expect(beamRuns(specs('RRRR'), 1)).toEqual([]);
  });
});

describe('tupletRuns', () => {
  it('chunks notes into tuplet brackets, including rests', () => {
    const specs = buildNoteSpecs(ev('R-LRLR'), 'eighthTriplet');
    expect(tupletRuns(specs, 3)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });

  it('returns nothing for non-tuplets (size 0)', () => {
    expect(tupletRuns(buildNoteSpecs(ev('RL'), 'sixteenth'), 0)).toEqual([]);
  });
});
