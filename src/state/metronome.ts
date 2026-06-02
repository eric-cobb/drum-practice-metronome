// Zustand store for live metronome state (ARCHITECTURE.md §State Management).
//
// Plain state + simple setters only. The scheduler reads this via getState()
// from outside React and writes position back at play time. This store does
// NOT import the scheduler, keeping the dependency one-directional.

import { create } from 'zustand';
import type {
  Denominator,
  MetronomeConfig,
  Subdivision,
  TimeSignature,
} from '../types';
import { getBeatGrouping } from '../meter';

export const BPM_MIN = 30;
export const BPM_MAX = 300;
export const NUMERATOR_MIN = 2;
export const NUMERATOR_MAX = 13;
export const BARS_PER_REP_MIN = 1;
export const BARS_PER_REP_MAX = 16;
export const TARGET_REPS_MIN = 1;
export const TARGET_REPS_MAX = 999;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Accent pattern sized to the meter's felt pulses, preserving existing
 *  toggles and defaulting to an accent on pulse 1 (SPEC §1). Pulses beyond the
 *  previous pattern's length default to unaccented; an empty `prev` (initial
 *  state) yields accent on pulse 1 only. */
function patternForTimeSignature(
  ts: TimeSignature,
  prev: boolean[],
): boolean[] {
  const { pulsesPerBar } = getBeatGrouping(ts);
  return Array.from({ length: pulsesPerBar }, (_, i) => prev[i] ?? i === 0);
}

interface MetronomeState {
  // Config
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  accentPattern: boolean[];

  // Rep counter (SPEC §2)
  barsPerRep: number;
  targetReps: number;
  autoStop: boolean;

  // Pre-roll: optional 1-bar count before a fresh Start, in both modes (SPEC §1).
  preRollEnabled: boolean;

  // Free-mode session label, captured as the session's exerciseName (SPEC §4).
  // Optional; "" is logged as "Untitled".
  freeSessionLabel: string;

  // Play state (currentBeat is -1 when nothing has sounded yet; currentRep is
  // 0 when stopped, then the 1-indexed rep being played while running)
  isPlaying: boolean;
  currentBeat: number;
  currentBar: number;
  currentRep: number;

  // Lead-in (pre-roll / count-in) display: the count currently sounding and the
  // count per bar, or null when not counting in. Set by the scheduler at play
  // time; the Display shows this in place of the rep counter (SPEC §1, §7).
  countIn: { current: number; total: number } | null;

  // Config actions
  setBpm: (bpm: number) => void;
  nudgeBpm: (delta: number) => void;
  setNumerator: (numerator: number) => void;
  setDenominator: (denominator: Denominator) => void;
  setTimeSignature: (timeSignature: TimeSignature) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  toggleAccent: (beatIndex: number) => void;

  // Rep-counter actions
  setBarsPerRep: (barsPerRep: number) => void;
  setTargetReps: (targetReps: number) => void;
  setAutoStop: (autoStop: boolean) => void;
  setPreRollEnabled: (preRollEnabled: boolean) => void;
  setFreeSessionLabel: (label: string) => void;

  // Apply a bundle of config at once — used to push an exercise's settings into
  // the metronome and to restore Free-mode settings on mode switch. Numeric
  // fields are clamped; if a timeSignature is given without an accentPattern,
  // the pattern defaults to an accent on pulse 1 sized to the new meter.
  applyConfig: (config: Partial<MetronomeConfig>) => void;

  // Play-state actions (driven by the scheduler)
  setPlaying: (isPlaying: boolean) => void;
  setPosition: (beat: number, bar: number) => void;
  setCurrentRep: (rep: number) => void;
  setCountIn: (countIn: { current: number; total: number } | null) => void;
}

const INITIAL_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };

export const useMetronomeStore = create<MetronomeState>((set) => ({
  bpm: 120,
  timeSignature: INITIAL_TIME_SIGNATURE,
  subdivision: 'quarter',
  accentPattern: patternForTimeSignature(INITIAL_TIME_SIGNATURE, []),

  barsPerRep: 2,
  targetReps: 20,
  autoStop: true,
  preRollEnabled: false,
  freeSessionLabel: '',

  isPlaying: false,
  currentBeat: -1,
  currentBar: 0,
  currentRep: 0,
  countIn: null,

  setBpm: (bpm) => set({ bpm: clamp(Math.round(bpm), BPM_MIN, BPM_MAX) }),

  nudgeBpm: (delta) =>
    set((state) => ({ bpm: clamp(state.bpm + delta, BPM_MIN, BPM_MAX) })),

  setNumerator: (numerator) =>
    set((state) => {
      const next = clamp(Math.round(numerator), NUMERATOR_MIN, NUMERATOR_MAX);
      // Drop `displayAs` on manual edits — the cut/common glyph only travels
      // with the preset (SPEC §1).
      const timeSignature: TimeSignature = {
        numerator: next,
        denominator: state.timeSignature.denominator,
      };
      return {
        timeSignature,
        accentPattern: patternForTimeSignature(
          timeSignature,
          state.accentPattern,
        ),
      };
    }),

  setDenominator: (denominator) =>
    set((state) => {
      const timeSignature: TimeSignature = {
        numerator: state.timeSignature.numerator,
        denominator,
      };
      return {
        timeSignature,
        accentPattern: patternForTimeSignature(
          timeSignature,
          state.accentPattern,
        ),
      };
    }),

  setTimeSignature: (timeSignature) =>
    set((state) => ({
      timeSignature,
      accentPattern: patternForTimeSignature(
        timeSignature,
        state.accentPattern,
      ),
    })),

  setSubdivision: (subdivision) => set({ subdivision }),

  toggleAccent: (beatIndex) =>
    set((state) => {
      if (beatIndex < 0 || beatIndex >= state.accentPattern.length) {
        return {};
      }
      const accentPattern = state.accentPattern.slice();
      accentPattern[beatIndex] = !accentPattern[beatIndex];
      return { accentPattern };
    }),

  setBarsPerRep: (barsPerRep) =>
    set({
      barsPerRep: clamp(
        Math.round(barsPerRep),
        BARS_PER_REP_MIN,
        BARS_PER_REP_MAX,
      ),
    }),

  setTargetReps: (targetReps) =>
    set({
      targetReps: clamp(
        Math.round(targetReps),
        TARGET_REPS_MIN,
        TARGET_REPS_MAX,
      ),
    }),

  setAutoStop: (autoStop) => set({ autoStop }),

  setPreRollEnabled: (preRollEnabled) => set({ preRollEnabled }),

  setFreeSessionLabel: (freeSessionLabel) => set({ freeSessionLabel }),

  applyConfig: (config) =>
    set(() => {
      const next: Partial<MetronomeState> = {};
      if (config.bpm !== undefined) {
        next.bpm = clamp(Math.round(config.bpm), BPM_MIN, BPM_MAX);
      }
      if (config.subdivision !== undefined) {
        next.subdivision = config.subdivision;
      }
      if (config.barsPerRep !== undefined) {
        next.barsPerRep = clamp(
          Math.round(config.barsPerRep),
          BARS_PER_REP_MIN,
          BARS_PER_REP_MAX,
        );
      }
      if (config.targetReps !== undefined) {
        next.targetReps = clamp(
          Math.round(config.targetReps),
          TARGET_REPS_MIN,
          TARGET_REPS_MAX,
        );
      }
      if (config.timeSignature !== undefined) {
        next.timeSignature = config.timeSignature;
        // An explicit accentPattern wins; otherwise reset to a default accent on
        // pulse 1 sized to the new meter.
        next.accentPattern =
          config.accentPattern ??
          patternForTimeSignature(config.timeSignature, []);
      } else if (config.accentPattern !== undefined) {
        next.accentPattern = config.accentPattern;
      }
      return next;
    }),

  setPlaying: (isPlaying) =>
    // Clear any lead-in display on every transport edge; the scheduler sets it
    // again right after starting when a pre-roll / count-in is in effect.
    set(
      isPlaying
        ? {
            isPlaying: true,
            currentBeat: -1,
            currentBar: 0,
            currentRep: 1,
            countIn: null,
          }
        : {
            isPlaying: false,
            currentBeat: -1,
            currentBar: 0,
            currentRep: 0,
            countIn: null,
          },
    ),

  setPosition: (beat, bar) => set({ currentBeat: beat, currentBar: bar }),

  setCurrentRep: (rep) => set({ currentRep: rep }),

  setCountIn: (countIn) => set({ countIn }),
}));
