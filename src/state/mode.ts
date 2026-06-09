// Top-level mode (Free / Exercise) — SPEC §3.
//
// Switching into Exercise mode snapshots the current (Free) metronome config and
// then pushes the active exercise's settings into the metronome; switching back
// restores the snapshot, so dipping into Exercise mode doesn't clobber a warm-up
// tempo. The snapshot is in-memory only for now (persistence is SPEC §8 / later).
//
// Stopping playback on a mode switch (SPEC §3) is done by the toggle component,
// which owns the scheduler call — keeping the scheduler out of the stores.

import { create } from 'zustand';
import type { MetronomeConfig, Mode } from '../types';
import { useMetronomeStore } from './metronome';
import { useExerciseStore } from './exercises';

function captureMetronomeConfig(): MetronomeConfig {
  const s = useMetronomeStore.getState();
  return {
    bpm: s.bpm,
    timeSignature: s.timeSignature,
    subdivision: s.subdivision,
    barsPerRep: s.barsPerRep,
    targetReps: s.targetReps,
    accentPattern: s.accentPattern,
    dropout: s.dropout,
  };
}

interface ModeState {
  mode: Mode;
  /** Free-mode config saved when entering Exercise mode, restored on return. */
  freeSnapshot: MetronomeConfig | null;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'free',
  freeSnapshot: null,

  setMode: (mode) => {
    if (mode === get().mode) return;
    if (mode === 'exercise') {
      set({ freeSnapshot: captureMetronomeConfig() });
      useExerciseStore.getState().applyCurrentToMetronome();
      // Dropout is Free-mode only (SPEC §5); force it off in Exercise mode.
      useMetronomeStore.getState().setDropout(null);
    } else {
      const snapshot = get().freeSnapshot;
      if (snapshot) useMetronomeStore.getState().applyConfig(snapshot);
    }
    set({ mode });
  },

  toggleMode: () => get().setMode(get().mode === 'free' ? 'exercise' : 'free'),
}));
