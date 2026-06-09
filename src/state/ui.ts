// Global UI-chrome state: the active destination for the v2 four-view router
// (DESIGN-v2 §5). A lightweight Zustand field instead of a routing library —
// this is a local single-user offline SPA, and ARCHITECTURE chose Zustand so
// state is readable synchronously from outside React (the scheduler).

import { create } from 'zustand';

export type ViewId = 'practice' | 'library' | 'history' | 'settings';

interface UIState {
  activeView: ViewId;
  setView: (view: ViewId) => void;
}

export const useUiStore = create<UIState>((set) => ({
  activeView: 'practice',
  setView: (view) => set({ activeView: view }),
}));
