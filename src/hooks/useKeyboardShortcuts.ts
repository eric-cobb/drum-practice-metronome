import { useEffect } from 'react';
import { useMetronomeStore } from '../state/metronome';
import { useModeStore } from '../state/mode';
import {
  start,
  stop,
  skip,
  discard,
  goToNext,
  goToPrevious,
} from '../audio/transport';
import { resetReps } from '../audio/scheduler';
import { useTourStore } from '../state/tour';

/** True when focus is in a field where typing should win over shortcuts. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
}

/** Mirror the play button: skip a count-in, else stop if playing, else start. */
function togglePlay(): void {
  const { isPlaying, countIn } = useMetronomeStore.getState();
  if (countIn !== null) skip();
  else if (isPlaying) stop();
  else start();
}

/** Global keyboard shortcuts (SPEC §9). Mounted once at the app root. Ignores
 *  events while typing in a field and while a modifier (⌘/Ctrl/Alt) is held so
 *  browser shortcuts aren't hijacked. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // While a tour is running, its own controls (and Escape) take over.
      if (useTourStore.getState().active) return;
      const typing = isTyping(e.target);
      const m = useMetronomeStore.getState();
      const mode = useModeStore.getState().mode;

      switch (e.key) {
        case ' ':
          if (typing) return;
          // Let Space activate a focused interactive control natively.
          if (
            (e.target as HTMLElement | null)?.closest(
              'button, a, [role="button"], [role="switch"], [role="radio"], [role="tab"]',
            )
          ) {
            return;
          }
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowUp':
          if (typing) return;
          e.preventDefault();
          m.nudgeBpm(e.shiftKey ? 5 : 1);
          break;
        case 'ArrowDown':
          if (typing) return;
          e.preventDefault();
          m.nudgeBpm(e.shiftKey ? -5 : -1);
          break;
        case 't':
        case 'T':
          if (typing) return;
          m.tapTempo();
          break;
        case 'r':
        case 'R':
          if (typing) return;
          resetReps();
          break;
        case 'n':
        case 'N':
          if (typing || mode !== 'exercise') return;
          goToNext();
          break;
        case 'p':
        case 'P':
          if (typing || mode !== 'exercise') return;
          goToPrevious();
          break;
        case 'Escape':
          if (typing) return;
          // Let an open popover/modal handle Escape (close itself) first.
          if (document.querySelector('[role="dialog"]')) return;
          discard();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
