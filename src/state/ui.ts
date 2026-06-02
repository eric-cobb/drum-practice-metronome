// Global UI-chrome state: which on-demand sheet (if any) is open. Lifted out of
// App.tsx into a Zustand store so deep components (e.g. the Exercise Popover's
// SetPicker, which needs a "Import sets in Settings →" shortcut) can open the
// sheets without threading callbacks through the tree.

import { create } from 'zustand';

export type ActiveSheet = 'settings' | 'history' | null;

interface UIState {
  activeSheet: ActiveSheet;
  openSettings: () => void;
  openHistory: () => void;
  closeSheet: () => void;
}

export const useUiStore = create<UIState>((set) => ({
  activeSheet: null,
  openSettings: () => set({ activeSheet: 'settings' }),
  openHistory: () => set({ activeSheet: 'history' }),
  closeSheet: () => set({ activeSheet: null }),
}));
