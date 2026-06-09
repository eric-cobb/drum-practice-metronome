// Guided tour state (SPEC §13). Tracks which tours the user has seen (persisted)
// and the currently-running tour. Starting a tour switches to the right mode and
// Practice view and stops playback, per the behavioral rules.

import { create } from 'zustand';
import { useModeStore } from './mode';
import { useUiStore } from './ui';
import { stopMetronome } from '../audio/scheduler';
import freeStepsJson from '../data/tours/free.json';
import practiceStepsJson from '../data/tours/practice.json';

export type TourId = 'free' | 'practice';

export interface TourStep {
  /** CSS selector for the highlighted element (a data-tour attribute). */
  target: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: Record<TourId, TourStep[]> = {
  free: freeStepsJson as TourStep[],
  practice: practiceStepsJson as TourStep[],
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'metronome-tour-state';

interface TourSeen {
  free: boolean;
  practice: boolean;
  /** When the user last chose "Skip — I'll explore on my own". Suppresses the
   *  welcome dialog permanently and the first-entry banners for 7 days. */
  skippedAt?: number;
}

function readSeen(): TourSeen {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { free: false, practice: false };
    const parsed = JSON.parse(raw) as Partial<TourSeen>;
    return {
      free: parsed.free ?? false,
      practice: parsed.practice ?? false,
      skippedAt: parsed.skippedAt,
    };
  } catch {
    return { free: false, practice: false };
  }
}

function writeSeen(seen: TourSeen): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    /* quota or disabled */
  }
}

/** The mode a tour runs in ('practice' tour = Exercise mode). */
const modeForTour = (tour: TourId) => (tour === 'free' ? 'free' : 'exercise');

/** Welcome dialog: only on a truly fresh start (neither tour seen, never skipped). */
export function shouldShowWelcome(seen: TourSeen): boolean {
  return !seen.free && !seen.practice && seen.skippedAt === undefined;
}

/** First-entry banner: mode not seen, not recently skipped, not shown already
 *  this session. */
export function bannerEligible(
  seen: TourSeen,
  tour: TourId,
  shownThisSession: TourId[],
  now: number,
): boolean {
  if (seen[tour]) return false;
  if (shownThisSession.includes(tour)) return false;
  if (seen.skippedAt !== undefined && now - seen.skippedAt < SEVEN_DAYS_MS) {
    return false;
  }
  return true;
}

interface TourStore {
  seen: TourSeen;
  active: { tour: TourId; step: number } | null;
  /** Banners shown this session (transient, not persisted). */
  shownBanners: TourId[];

  /** Start a tour: stop playback, switch to its mode + the Practice view. */
  start: (tour: TourId) => void;
  next: () => void;
  prev: () => void;
  /** End the active tour, marking it seen (both finishing and skipping count). */
  end: () => void;
  /** Mark a tour seen without running it (banner "No thanks"). */
  dismiss: (tour: TourId) => void;
  /** "Skip — I'll explore on my own": suppress welcome + banners. */
  skipAll: () => void;
  markBannerShown: (tour: TourId) => void;
}

export const useTourStore = create<TourStore>((set, get) => ({
  seen: readSeen(),
  active: null,
  shownBanners: [],

  start: (tour) => {
    stopMetronome();
    useModeStore.getState().setMode(modeForTour(tour));
    useUiStore.getState().setView('practice');
    set({ active: { tour, step: 0 } });
  },

  next: () => {
    const { active } = get();
    if (!active) return;
    const steps = TOUR_STEPS[active.tour];
    if (active.step >= steps.length - 1) {
      get().end();
    } else {
      set({ active: { ...active, step: active.step + 1 } });
    }
  },

  prev: () => {
    const { active } = get();
    if (!active || active.step === 0) return;
    set({ active: { ...active, step: active.step - 1 } });
  },

  end: () => {
    const { active, seen } = get();
    if (!active) return;
    const seenNext = { ...seen, [active.tour]: true };
    writeSeen(seenNext);
    set({ seen: seenNext, active: null });
  },

  dismiss: (tour) => {
    const seenNext = { ...get().seen, [tour]: true };
    writeSeen(seenNext);
    set({ seen: seenNext });
  },

  skipAll: () => {
    const seenNext = { ...get().seen, skippedAt: Date.now() };
    writeSeen(seenNext);
    set({ seen: seenNext });
  },

  markBannerShown: (tour) =>
    set((s) => ({ shownBanners: [...s.shownBanners, tour] })),
}));
