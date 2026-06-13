// Pure notation helpers: turn an exercise pattern into VexFlow-ready note specs
// and beam/tuplet groupings. Kept free of VexFlow and the DOM so the
// duration/grouping logic is unit-testable in Node; renderNotation.ts consumes
// these specs and does the actual drawing.

import type {
  Ornament,
  PatternEvent,
  Sticking,
  Subdivision,
  Voice,
} from '../../types';
import { subdivisionsPerPulse } from '../../meter';

/** Voice → VexFlow staff key (with notehead glyph) + stem direction (SPEC §12 /
 *  ARCHITECTURE multi-voice rendering). Cross noteheads use the `/x2` glyph,
 *  the ride bell a diamond `/d0`; normal voices have no glyph suffix. */
interface VoiceVex {
  key: string;
  stemUp: boolean;
}
export const VOICE_VEX: Record<Voice, VoiceVex> = {
  snare: { key: 'c/5', stemUp: true },
  kick: { key: 'f/4', stemUp: false },
  'hihat-closed': { key: 'g/5/x2', stemUp: true },
  'hihat-open': { key: 'g/5/x2', stemUp: true },
  'hihat-foot': { key: 'd/4/x2', stemUp: false },
  ride: { key: 'f/5/x2', stemUp: true },
  'ride-bell': { key: 'f/5/d0', stemUp: true },
  crash: { key: 'a/5/x2', stemUp: true },
  'tom-high': { key: 'e/5', stemUp: true },
  'tom-mid': { key: 'd/5', stemUp: true },
  'tom-low': { key: 'a/4', stemUp: true },
};

/** One note position resolved for rendering: its stems-up and stems-down voice
 *  keys plus the modifiers that apply (SPEC §12). A rest has empty key arrays. */
export interface PositionSpec {
  duration: string;
  isRest: boolean;
  upKeys: string[];
  downKeys: string[];
  sticking?: Sticking;
  accent: boolean;
  ghost: boolean;
  ornament?: Ornament;
  /** Any voice is an open hi-hat (renders the ○ marker). */
  hihatOpen: boolean;
}

/** Resolve each pattern event into a PositionSpec for the multi-voice renderer. */
export function buildPositionSpecs(
  pattern: PatternEvent[],
  subdivision: Subdivision,
): PositionSpec[] {
  const duration = DURATIONS[subdivision];
  return pattern.map((event) => {
    if (event === 'rest') {
      return {
        duration,
        isRest: true,
        upKeys: [],
        downKeys: [],
        accent: false,
        ghost: false,
        hihatOpen: false,
      };
    }
    const upKeys: string[] = [];
    const downKeys: string[] = [];
    for (const voice of event.voices) {
      const vex = VOICE_VEX[voice];
      (vex.stemUp ? upKeys : downKeys).push(vex.key);
    }
    return {
      duration,
      isRest: false,
      upKeys,
      downKeys,
      sticking: event.sticking,
      accent: event.accent ?? false,
      ghost: event.ghost ?? false,
      ornament: event.ornament,
      hihatOpen: event.voices.includes('hihat-open'),
    };
  });
}

/** A note carries an optional sticking (foot voices have none); a rest carries
 *  nothing. Discriminated on `isRest`. (Stage 10.1 reads the v2 Hit's sticking;
 *  voices/accent/ghost/ornament rendering arrives in Stage 10.2.) */
export type NoteSpec =
  | { duration: string; isRest: true }
  | { duration: string; isRest: false; sticking?: Sticking };

/** Each pattern event is one note of this value. Triplet events share the base
 *  value of their straight counterpart; the triplet feel comes from tuplets. */
const DURATIONS: Record<Subdivision, string> = {
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
  eighthTriplet: '8',
  sixteenthTriplet: '16',
};

const TRIPLETS: ReadonlySet<Subdivision> = new Set<Subdivision>([
  'eighthTriplet',
  'sixteenthTriplet',
]);

export function subdivisionToDuration(subdivision: Subdivision): string {
  return DURATIONS[subdivision];
}

export function isTriplet(subdivision: Subdivision): boolean {
  return TRIPLETS.has(subdivision);
}

/** One NoteSpec per pattern event; a "rest" event becomes a rest. */
export function buildNoteSpecs(
  pattern: PatternEvent[],
  subdivision: Subdivision,
): NoteSpec[] {
  const duration = DURATIONS[subdivision];
  return pattern.map((event) =>
    event === 'rest'
      ? { duration, isRest: true }
      : { duration, isRest: false, sticking: event.sticking },
  );
  // `event.sticking` is the v2 Hit's sticking (present for migrated snare hits).
}

/** Notes per beam group: the felt-pulse subdivision count (e.g. 4 sixteenths
 *  per quarter, 4 eighths per half-note pulse in 2/2), or 3 for triplets. <2
 *  means "don't beam" (e.g. quarters). */
export function beamGroupSize(
  subdivision: Subdivision,
  isCompound: boolean,
  denominator: number,
): number {
  if (isTriplet(subdivision)) return 3;
  return subdivisionsPerPulse(subdivision, isCompound, denominator);
}

/** Tuplet bracket size, or 0 when the subdivision isn't a tuplet. */
export function tupletGroupSize(subdivision: Subdivision): number {
  return isTriplet(subdivision) ? 3 : 0;
}

/** Note indices to beam together: maximal runs (length ≥ 2) of consecutive
 *  non-rest notes within each `groupSize` chunk. Rests and chunk boundaries
 *  break beams; a lone note keeps its flag instead. */
export function beamRuns(
  specs: readonly { isRest: boolean }[],
  groupSize: number,
): number[][] {
  if (groupSize < 2) return [];
  const runs: number[][] = [];
  for (let start = 0; start < specs.length; start += groupSize) {
    const end = Math.min(start + groupSize, specs.length);
    let run: number[] = [];
    for (let i = start; i < end; i += 1) {
      if (specs[i].isRest) {
        if (run.length >= 2) runs.push(run);
        run = [];
      } else {
        run.push(i);
      }
    }
    if (run.length >= 2) runs.push(run);
  }
  return runs;
}

/** Note indices grouped into tuplet brackets (chunks of `size`, rests included),
 *  or [] when not a tuplet. */
export function tupletRuns(
  specs: readonly { isRest: boolean }[],
  size: number,
): number[][] {
  if (size < 2) return [];
  const runs: number[][] = [];
  for (let start = 0; start < specs.length; start += size) {
    const group: number[] = [];
    for (let i = start; i < Math.min(start + size, specs.length); i += 1) {
      group.push(i);
    }
    if (group.length > 0) runs.push(group);
  }
  return runs;
}
