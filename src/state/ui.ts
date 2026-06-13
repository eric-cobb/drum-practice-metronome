// Global UI-chrome state: the active destination for the v2 four-view router
// (DESIGN-v2 §5). A lightweight Zustand field instead of a routing library —
// this is a local single-user offline SPA, and ARCHITECTURE chose Zustand so
// state is readable synchronously from outside React (the scheduler).
//
// The active view is persisted to localStorage so a browser refresh stays on
// the current page rather than snapping back to Practice (persistence boundaries
// in CLAUDE.md: localStorage holds last-used UI state).

import { create } from 'zustand';

export type ViewId = 'practice' | 'library' | 'history' | 'settings';

const STORAGE_KEY = 'metronome-active-view';
const VIEWS: readonly ViewId[] = ['practice', 'library', 'history', 'settings'];

function loadView(): ViewId {
  const stored = localStorage.getItem(STORAGE_KEY);
  return VIEWS.includes(stored as ViewId) ? (stored as ViewId) : 'practice';
}

interface UIState {
  activeView: ViewId;
  setView: (view: ViewId) => void;
}

export const useUiStore = create<UIState>((set) => ({
  activeView: loadView(),
  setView: (view) => {
    localStorage.setItem(STORAGE_KEY, view);
    set({ activeView: view });
  },
}));
