// Global UI-chrome state.
//
// `activeView` drives the v2 four-view router (DESIGN-v2 §5): a lightweight
// Zustand field instead of a routing library — this is a local single-user
// offline SPA, and ARCHITECTURE chose Zustand precisely so state is readable
// synchronously from outside React (the scheduler).
//
// `activeSheet` is the v1 overlay-sheet mechanism. It is retained during the
// redesign so the History/Settings views can bridge to the existing v1 sheets
// until those views are rebuilt natively (Stages 6–7), after which it is removed.

import { create } from 'zustand';

export type ViewId = 'practice' | 'library' | 'history' | 'settings';
export type ActiveSheet = 'settings' | 'history' | null;

interface UIState {
  activeView: ViewId;
  setView: (view: ViewId) => void;

  // v1 transition bridge — removed in Stage 7.
  activeSheet: ActiveSheet;
  openSettings: () => void;
  openHistory: () => void;
  closeSheet: () => void;
}

export const useUiStore = create<UIState>((set) => ({
  activeView: 'practice',
  setView: (view) => set({ activeView: view }),

  activeSheet: null,
  openSettings: () => set({ activeSheet: 'settings' }),
  openHistory: () => set({ activeSheet: 'history' }),
  closeSheet: () => set({ activeSheet: null }),
}));
