// Theme (light / dark / auto) — SPEC §8, DESIGN §Color. Persisted to localStorage
// and applied as a `dark` class on <html> so Tailwind's class-based dark variant
// (configured in index.css) flips every token at once.

import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'metronome-theme';
const darkQuery = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return window.matchMedia?.(darkQuery).matches ?? false;
}

function resolveDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'auto' && systemPrefersDark());
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', resolveDark(theme));
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'auto'
    ? stored
    : 'auto';
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: loadTheme(),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));

/** Apply the persisted theme immediately and keep 'auto' in sync with the OS.
 *  Call once at startup (before first paint to avoid a flash). */
export function initTheme(): void {
  applyTheme(useThemeStore.getState().theme);
  window.matchMedia?.(darkQuery).addEventListener?.('change', () => {
    if (useThemeStore.getState().theme === 'auto') applyTheme('auto');
  });
}
