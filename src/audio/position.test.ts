import { describe, expect, it } from 'vitest';
import {
  advancePosition,
  currentRep,
  INITIAL_POSITION,
  isDownbeat,
  isTargetReached,
  noteIndexInBar,
  type Position,
  repsCompleted,
} from './position';
import { getBeatGrouping, subdivisionsPerPulse } from '../meter';
import type { Subdivision, TimeSignature } from '../types';

/** Replays the scheduler's per-tick advance for `bars` whole bars, returning
 *  the position seen at the start of each tick. Uses the same meter helpers the
 *  real scheduler uses, so meter regressions surface here too. */
function simulateTicks(
  timeSignature: TimeSignature,
  subdivision: Subdivision,
  bars: number,
): Position[] {
  const { pulsesPerBar, isCompound } = getBeatGrouping(timeSignature);
  const subsPerPulse = subdivisionsPerPulse(
    subdivision,
    isCompound,
    timeSignature.denominator,
  );
  const ticksPerBar = pulsesPerBar * subsPerPulse;

  const positions: Position[] = [];
  let pos = INITIAL_POSITION;
  // +1 so the final tick lands on the downbeat that begins bar `bars`.
  for (let i = 0; i < bars * ticksPerBar + 1; i += 1) {
    positions.push(pos);
    pos = advancePosition(pos, subsPerPulse, pulsesPerBar);
  }
  return positions;
}

describe('advancePosition', () => {
  it('wraps subticks into pulses and pulses into bars (4/4 quarter)', () => {
    // quarter in 4/4: 1 sub per pulse, 4 pulses per bar -> 4 ticks per bar
    let pos = INITIAL_POSITION;
    for (let i = 0; i < 4; i += 1) pos = advancePosition(pos, 1, 4);
    expect(pos).toEqual({ pulseInBar: 0, subTickInPulse: 0, barCount: 1 });
  });

  it('counts subdivision ticks within a pulse (4/4 sixteenth)', () => {
    // sixteenth in 4/4: 4 subs per pulse
    let pos = INITIAL_POSITION;
    pos = advancePosition(pos, 4, 4);
    expect(pos).toEqual({ pulseInBar: 0, subTickInPulse: 1, barCount: 0 });
    for (let i = 0; i < 3; i += 1) pos = advancePosition(pos, 4, 4);
    expect(pos).toEqual({ pulseInBar: 1, subTickInPulse: 0, barCount: 0 });
  });
});

describe('noteIndexInBar', () => {
  it('runs 0..N-1 across the bar and resets at each downbeat (4/4 sixteenth)', () => {
    // 4 subs per pulse, 4 pulses per bar -> 16 notes, then wraps to 0.
    const subsPerPulse = 4;
    let pos = INITIAL_POSITION;
    const seen: number[] = [];
    for (let i = 0; i < 17; i += 1) {
      seen.push(noteIndexInBar(pos, subsPerPulse));
      pos = advancePosition(pos, subsPerPulse, 4);
    }
    expect(seen.slice(0, 16)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(seen[16]).toBe(0); // next bar's downbeat wraps back to note 0
  });

  it('counts eighth-note positions in 3/4 (2 subs per pulse -> 6 per bar)', () => {
    const subsPerPulse = 2;
    let pos = INITIAL_POSITION;
    const seen: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      seen.push(noteIndexInBar(pos, subsPerPulse));
      pos = advancePosition(pos, subsPerPulse, 3);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('rep math', () => {
  it('reports the 1-indexed current rep, incrementing every barsPerRep bars', () => {
    const barsPerRep = 2;
    expect(currentRep(0, barsPerRep)).toBe(1); // bar 0 -> rep 1
    expect(currentRep(1, barsPerRep)).toBe(1); // still rep 1
    expect(currentRep(2, barsPerRep)).toBe(2); // rep 2 begins
    expect(currentRep(3, barsPerRep)).toBe(2);
    expect(currentRep(4, barsPerRep)).toBe(3);
  });

  it('handles barsPerRep of 1 (every bar is a rep)', () => {
    expect(currentRep(0, 1)).toBe(1);
    expect(currentRep(5, 1)).toBe(6);
  });

  it('reaches target exactly at bar barsPerRep * targetReps', () => {
    const barsPerRep = 2;
    const targetReps = 20;
    expect(isTargetReached(39, barsPerRep, targetReps)).toBe(false);
    expect(isTargetReached(40, barsPerRep, targetReps)).toBe(true);
    expect(repsCompleted(40, barsPerRep)).toBe(20);
  });
});

describe('counter increments every N bars across time signatures', () => {
  const cases: Array<{ ts: TimeSignature; sub: Subdivision }> = [
    { ts: { numerator: 4, denominator: 4 }, sub: 'sixteenth' },
    { ts: { numerator: 3, denominator: 4 }, sub: 'eighth' },
    { ts: { numerator: 7, denominator: 8 }, sub: 'sixteenth' },
    { ts: { numerator: 6, denominator: 8 }, sub: 'eighth' }, // compound, felt in 2
    { ts: { numerator: 5, denominator: 4 }, sub: 'quarter' },
    // Cut time / 2/2 with 8th-note subs — half-note pulse, 4 subs/pulse, 8/bar.
    { ts: { numerator: 2, denominator: 2 }, sub: 'eighth' },
  ];

  for (const barsPerRep of [1, 2, 4]) {
    for (const { ts, sub } of cases) {
      const label = `${ts.numerator}/${ts.denominator} ${sub}, ${barsPerRep} bars/rep`;

      it(`increments once per ${barsPerRep} bar(s) — ${label}`, () => {
        const bars = barsPerRep * 5; // exercise several reps
        const positions = simulateTicks(ts, sub, bars);

        // The current rep should change *only* at the downbeat of bars that are
        // multiples of barsPerRep, and increase by exactly 1 each time.
        let prevRep = 0;
        let seenDownbeats = 0;
        for (const pos of positions) {
          if (!isDownbeat(pos)) continue;
          seenDownbeats += 1;
          const rep = currentRep(pos.barCount, barsPerRep);
          const expected = Math.floor(pos.barCount / barsPerRep) + 1;
          expect(rep).toBe(expected);
          if (pos.barCount % barsPerRep === 0) {
            expect(rep).toBe(prevRep + 1); // stepped up at the boundary
            prevRep = rep;
          } else {
            expect(rep).toBe(prevRep); // unchanged between boundaries
          }
        }
        expect(seenDownbeats).toBe(bars + 1); // a downbeat per bar, plus bar `bars`
      });
    }
  }

  it('counts the right number of ticks per bar for compound 6/8', () => {
    // 6/8 felt in 2 pulses; eighth subdivision -> 3 subs per pulse -> 6 ticks/bar
    const positions = simulateTicks(
      { numerator: 6, denominator: 8 },
      'eighth',
      1,
    );
    expect(positions).toHaveLength(7); // 6 ticks + the next downbeat
    expect(positions[6]).toEqual({
      pulseInBar: 0,
      subTickInPulse: 0,
      barCount: 1,
    });
  });

  it('counts 8 ticks/bar in 2/2 with 8th-note subdivision (half-note pulse)', () => {
    // 2/2 felt in 2 half-note pulses; eighth divides each pulse into 4 (4 × 2 = 8).
    const positions = simulateTicks(
      { numerator: 2, denominator: 2 },
      'eighth',
      1,
    );
    expect(positions).toHaveLength(9); // 8 ticks + the next downbeat
    expect(positions[8]).toEqual({
      pulseInBar: 0,
      subTickInPulse: 0,
      barCount: 1,
    });
  });
});
