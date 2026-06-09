import type { ReactElement } from 'react';
import { useUiStore } from '../../state/ui';
import type { ViewId } from '../../state/ui';
import { cn } from '../ui/cn';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PracticeView } from '../views/PracticeView';
import { LibraryView } from '../views/LibraryView';
import { HistoryView } from '../views/HistoryView';
import { SettingsView } from '../views/SettingsView';

const VIEWS: { id: ViewId; element: ReactElement }[] = [
  { id: 'practice', element: <PracticeView /> },
  { id: 'library', element: <LibraryView /> },
  { id: 'history', element: <HistoryView /> },
  { id: 'settings', element: <SettingsView /> },
];

/** The v2 app shell (DESIGN-v2 §5, §6): a persistent sidebar (bottom nav on
 *  mobile) and a content region that crossfades between the four views.
 *
 *  All four views stay mounted and are crossfaded via opacity, rather than
 *  remounted on switch. This is deliberate: the Practice view hosts the live
 *  audio engine and notation, and remounting it on every navigation would
 *  disrupt playback and re-run VexFlow layout. Inactive layers are
 *  pointer-events-none + aria-hidden. The fade is disabled under reduced
 *  motion. (DESIGN-v2 §7 "View transitions".) */
export function AppShell() {
  const activeView = useUiStore((s) => s.activeView);

  return (
    <div className="canvas-bg flex h-full flex-col md:flex-row">
      <Sidebar />

      <main className="relative flex-1 overflow-hidden">
        {VIEWS.map(({ id, element }) => {
          const active = activeView === id;
          return (
            <div
              key={id}
              aria-hidden={!active}
              className={cn(
                'absolute inset-0 overflow-auto transition-opacity duration-[120ms] motion-reduce:transition-none',
                active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none',
              )}
            >
              {element}
            </div>
          );
        })}
      </main>

      <BottomNav />
    </div>
  );
}
