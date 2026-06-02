// Meter interpretation: how a written time signature maps to *felt pulses*.
//
// The metronome's main beat is the felt pulse, and BPM is the pulse rate.
//   - Simple meter (e.g. 4/4, 7/8): one pulse per base note unit.
//   - Compound meter (6/8, 9/8, 12/8): eighths group into dotted-quarter
//     pulses, so 6/8 is felt in 2, 9/8 in 3, 12/8 in 4.

import type { Subdivision, TimeSignature } from './types';

export interface BeatGrouping {
  /** Number of felt pulses (main beats) per bar. */
  pulsesPerBar: number;
  /** True for compound meters felt in dotted-quarter pulses. */
  isCompound: boolean;
}

/** Compound = /8 with a numerator that is a multiple of 3 greater than 3.
 *  6/8 → 2 pulses, 9/8 → 3, 12/8 → 4. Everything else is simple (one pulse
 *  per base note unit), including 3/8 (felt in 3) and odd meters like 7/8. */
export function getBeatGrouping(ts: TimeSignature): BeatGrouping {
  const isCompound =
    ts.denominator === 8 && ts.numerator % 3 === 0 && ts.numerator > 3;
  return {
    isCompound,
    pulsesPerBar: isCompound ? ts.numerator / 3 : ts.numerator,
  };
}

// Simple meter, in subdivisions per *quarter note*. The actual per-pulse count
// scales by 4/denominator: a half-note pulse (2/2) holds twice as many ticks of
// each subdivision as a quarter-note pulse (4/4).
const SIMPLE_PER_QUARTER: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
  eighthTriplet: 3,
  sixteenthTriplet: 6,
};

// Compound meter (6/8, 9/8, 12/8): the pulse is a dotted quarter, naturally
// divided into 3 eighths. The eighth-note grid already IS the triplet feel, so
// the triplet options collapse onto the same grids (3 and 6).
const COMPOUND_SUBS: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 3,
  sixteenth: 6,
  eighthTriplet: 3,
  sixteenthTriplet: 6,
};

/** Clicks per felt pulse for a subdivision, accounting for meter type and the
 *  pulse unit (4 → quarter pulse, 2 → half pulse, 8 → eighth pulse). Clamped to
 *  ≥1 so a subdivision coarser than the pulse (e.g. quarter clicks in 7/8)
 *  still produces one click per pulse. */
export function subdivisionsPerPulse(
  subdivision: Subdivision,
  isCompound: boolean,
  denominator: number,
): number {
  if (isCompound) return COMPOUND_SUBS[subdivision];
  const perQuarter = SIMPLE_PER_QUARTER[subdivision];
  return Math.max(1, Math.round((perQuarter * 4) / denominator));
}
