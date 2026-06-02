import { useEffect } from 'react';
import { TopBar } from './components/Shell/TopBar';
import { Canvas } from './components/Shell/Canvas';
import { Transport } from './components/Shell/Transport';
import { FreeView } from './components/Free/FreeView';
import { SettingsSheet } from './components/Sheets/SettingsSheet';
import { HistorySheet } from './components/Sheets/HistorySheet';
import { useModeStore } from './state/mode';
import { useExerciseStore } from './state/exercises';
import { useSessionStore } from './state/sessions';
import { useProgressStore } from './state/progress';
import { useMetronomeStore } from './state/metronome';
import { useUiStore } from './state/ui';
import { initTransport } from './audio/transport';
import { initSessionRecorder } from './audio/sessionRecorder';
import { requestPersistentStorage } from './db/persistence';

/** Practice shell (DESIGN §Layout). Both modes share the top bar and sheets;
 *  Exercise mode uses canvas + bottom transport, Free mode uses the central
 *  play-button composition with its own control strip. */
export default function App() {
  const mode = useModeStore((s) => s.mode);
  const initSets = useExerciseStore((s) => s.initSets);
  const loadSessions = useSessionStore((s) => s.load);
  const loadProgressForSet = useProgressStore((s) => s.loadSet);
  const activeSheet = useUiStore((s) => s.activeSheet);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const openHistory = useUiStore((s) => s.openHistory);
  const openSettings = useUiStore((s) => s.openSettings);

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
    <div className="flex h-full flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <TopBar onOpenHistory={openHistory} onOpenSettings={openSettings} />
      {mode === 'exercise' ? (
        <>
          <Canvas />
          <Transport />
        </>
      ) : (
        <FreeView />
      )}

      {activeSheet === 'settings' && <SettingsSheet onClose={closeSheet} />}
      {activeSheet === 'history' && <HistorySheet onClose={closeSheet} />}
    </div>
  );
}
