import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AppShell } from './components/AppShell/AppShell';
import { useExerciseStore } from './state/exercises';
import { useSessionStore } from './state/sessions';
import { useProgressStore } from './state/progress';
import { useMetronomeStore } from './state/metronome';
import { useModeStore } from './state/mode';
import { initTransport } from './audio/transport';
import { initSessionRecorder } from './audio/sessionRecorder';
import { requestPersistentStorage } from './db/persistence';

/** App root (DESIGN-v2 §5). Runs one-time initialization, then renders the v2
 *  app shell (persistent sidebar + four-view router). */
export default function App() {
  const initSets = useExerciseStore((s) => s.initSets);
  const loadSessions = useSessionStore((s) => s.load);
  const loadProgressForSet = useProgressStore((s) => s.loadSet);

  // Discover bundled + user-imported sets, load the session log and the active
  // set's progress cache, wire up auto-advance and session capture, and request
  // persistent storage (SPEC §4, §7). `initSets` is async because user-imported
  // sets come from Dexie; the progress prime happens after it resolves.
  useEffect(() => {
    void initSets().then(() => {
      const activeSetId = useExerciseStore.getState().activeSetId;
      if (activeSetId) void loadProgressForSet(activeSetId);
    });
    initTransport();
    initSessionRecorder();
    void loadSessions();
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
    return () => {
      if (debounce !== null) window.clearTimeout(debounce);
      unsubscribe();
    };
  }, [initSets, loadSessions, loadProgressForSet]);

  return (
    <div className="h-full text-fg">
      <AppShell />

      {/* Anonymous page-view analytics on production deploys only. Mounted at
       *  the root so it doesn't remount on view/sheet changes; renders nothing
       *  visible. Disabled automatically in dev (per @vercel/analytics docs).
       *  See README §Privacy. */}
      <Analytics />
    </div>
  );
}
