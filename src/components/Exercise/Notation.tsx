import { useEffect, useRef, useState } from 'react';
import { useExerciseStore, selectCurrentExercise } from '../../state/exercises';
import { renderExerciseNotation } from './renderNotation';
import { onSchedulerEvent } from '../../audio/scheduler';
import { SUBDIVISION_LABELS } from '../../types';

/** Drum notation for the current exercise (SPEC §7). Renders once per exercise
 *  (and on width change), never per beat — playback must not re-render this.
 *  The current note is highlighted by toggling a CSS class on the rendered
 *  SVG groups (ids "note-0", "note-1", …) in response to scheduler `note`
 *  events, so highlighting never triggers a React re-render. */
export function Notation() {
  const exercise = useExerciseStore(selectCurrentExercise);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track the container's width so the notation scales to the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Move the current-note highlight in step with the audio. Toggling classes /
  // attributes on the existing SVG nodes (no setState) keeps this off React's
  // render path; stale ids after an exercise change resolve to null and are
  // ignored. The three-layer highlight (DESIGN §Active note highlight) needs
  // two DOM updates per beat: the note `<g>` gets `.note-active` (color +
  // glow + scale, via CSS), and the matching `<rect id="band-…">` flips
  // opacity (the peripheral band). Ids are `note-{bar}-{note}` and
  // `band-{bar}-{note}` (ARCHITECTURE §Note index tracking,
  // §Current-note highlighting).
  useEffect(() => {
    let active: { noteId: string; bandId: string } | null = null;
    const clear = () => {
      if (active) {
        document.getElementById(active.noteId)?.classList.remove('note-active');
        document.getElementById(active.bandId)?.setAttribute('opacity', '0');
        active = null;
      }
    };
    const unsubscribe = onSchedulerEvent((event) => {
      if (event.type === 'note') {
        clear();
        const noteId = `note-${event.barIndex}-${event.noteIndexInBar}`;
        const bandId = `band-${event.barIndex}-${event.noteIndexInBar}`;
        document.getElementById(noteId)?.classList.add('note-active');
        document.getElementById(bandId)?.setAttribute('opacity', '1');
        active = { noteId, bandId };
      } else {
        // 'stop' / 'complete': drop the highlight.
        clear();
      }
    });
    return () => {
      clear();
      unsubscribe();
    };
  }, []);

  // Draw when the exercise or available width changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !exercise || width === 0) return;
    const result = renderExerciseNotation(el, exercise, width);
    setError(result.ok ? null : result.error);
  }, [exercise, width]);

  if (!exercise) return null;

  const { numerator, denominator } = exercise.timeSignature;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full overflow-x-auto"
        role="img"
        aria-label={`Exercise ${exercise.number}, ${exercise.name}, ${SUBDIVISION_LABELS[exercise.subdivision]} notes in ${numerator}/${denominator}`}
      />
      {error && (
        <p className="mt-2 text-center text-sm text-red-500 dark:text-red-400">
          Couldn&apos;t render notation: {error}
        </p>
      )}
    </div>
  );
}
