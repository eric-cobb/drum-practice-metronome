import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AppShell } from './components/AppShell/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmHost } from './components/ConfirmHost';
import { useExerciseStore } from './state/exercises';
import { useSessionStore } from './state/sessions';
import { useProgressStore } from './state/progress';
import { useMetronomeStore } from './state/metronome';
import { useModeStore } from './state/mode';
import { loadFreeConfig, saveFreeConfig } from './state/freeConfig';
import { initTransport } from './audio/transport';
import { initSessionRecorder } from './audio/sessionRecorder';
import { requestPersistentStorage } from './db/persistence';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

/** App root (DESIGN-v2 §5). Runs one-time initialization, then renders the v2
 *  app shell (persistent sidebar + four-view router). */
export default function App() {
  const initSets = useExerciseStore((s) => s.initSets);
  const loadSessions = useSessionStore((s) => s.load);
  const loadProgressForSet = useProgressStore((s) => s.loadSet);

  useKeyboardShortcuts();

  // Discover bundled + user-imported sets, load the session log and the active
  // set's progress cache, wire up auto-advance and session capture, and request
  // persistent storage (SPEC §4, §7). `initSets` is async because user-imported
  // sets come from Dexie; the progress prime happens after it resolves.
  useEffect(() => {
    // IndexedDB can be blocked (Firefox private windows, strict modes) or full;
    // degrade to the bundled sets rather than letting a rejection break startup.
    initSets()
      .then(() => {
        const activeSetId = useExerciseStore.getState().activeSetId;
        if (activeSetId) void loadProgressForSet(activeSetId);
        // initSets applies the active exercise's config even when starting in
        // Free mode; in Free mode, restore the persisted Free config over it.
        if (useModeStore.getState().mode !== 'exercise') {
          const free = loadFreeConfig();
          if (free) useMetronomeStore.getState().applyConfig(free);
        }
      })
      .catch((err) => console.error('Set loading failed; using bundled only.', err));
    initTransport();
    initSessionRecorder();
    void loadSessions().catch((err) =>
      console.error('Session history unavailable (IndexedDB blocked?).', err),
    );
    void requestPersistentStorage();

    // Persist the live BPM into the active set's SetState as the user adjusts
    // it. Debounced via a 200ms tail so slider drags don't write on every event.
    let debounce: number | null = null;
    const unsubscribe = useMetronomeStore.subscribe((state, prev) => {
      if (state.bpm === prev.bpm) return;
      if (useModeStore.getState().mode !== 'exercise') return;
      if (debounce !== null) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        useExerciseStore.getState().syncActiveBpm(state.bpm);
      }, 200);
    });

    // Persist Free-mode config (tempo/meter/subdivision/reps/accents) so a reload
    // keeps it. Exercise mode persists per-set above, so skip it here.
    let freeDebounce: number | null = null;
    const unsubscribeFree = useMetronomeStore.subscribe((state, prev) => {
      if (useModeStore.getState().mode === 'exercise') return;
      if (
        state.bpm === prev.bpm &&
        state.timeSignature === prev.timeSignature &&
        state.subdivision === prev.subdivision &&
        state.barsPerRep === prev.barsPerRep &&
        state.targetReps === prev.targetReps &&
        state.accentPattern === prev.accentPattern
      ) {
        return;
      }
      if (freeDebounce !== null) window.clearTimeout(freeDebounce);
      freeDebounce = window.setTimeout(() => {
        const s = useMetronomeStore.getState();
        saveFreeConfig({
          bpm: s.bpm,
          timeSignature: s.timeSignature,
          subdivision: s.subdivision,
          barsPerRep: s.barsPerRep,
          targetReps: s.targetReps,
          accentPattern: s.accentPattern,
        });
      }, 200);
    });

    return () => {
      if (debounce !== null) window.clearTimeout(debounce);
      if (freeDebounce !== null) window.clearTimeout(freeDebounce);
      unsubscribe();
      unsubscribeFree();
    };
  }, [initSets, loadSessions, loadProgressForSet]);

  return (
    <div className="h-full text-fg">
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
      <ConfirmHost />

      {/* Anonymous page-view analytics on production deploys only. Mounted at
       *  the root so it doesn't remount on view/sheet changes; renders nothing
       *  visible. Disabled automatically in dev (per @vercel/analytics docs).
       *  See README §Privacy. */}
      <Analytics />
    </div>
  );
}
