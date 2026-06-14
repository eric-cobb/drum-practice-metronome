import { useEffect, useMemo, useRef, useState } from 'react';
import { useExerciseStore, selectCurrentExercise } from '../../state/exercises';
import { renderExerciseNotation, NOTATION_HEIGHT } from './renderNotation';
import { onSchedulerEvent } from '../../audio/scheduler';
import { SUBDIVISION_LABELS } from '../../types';

/** Comfortable horizontal room per note position. The notation renders at this
 *  natural width and is scaled down to fit narrow viewports — below it, VexFlow
 *  would cram/overflow the notes (and the highlight bands would drift). */
const PX_PER_POSITION = 26;
/** Clef + time signature + padding allowance added to the natural width. */
const NATURAL_CHROME = 130;

/** Drum notation for the current exercise (SPEC §7). Rendered once per exercise
 *  (and on width change) at a natural width, then scaled to fit the container so
 *  it never overflows on mobile — the whole SVG (notes + highlight bands) scales
 *  together, so they stay aligned. The current note is highlighted by toggling a
 *  CSS class on the rendered SVG groups (ids "note-{bar}-{n}") in response to
 *  scheduler `note` events, so highlighting never triggers a React re-render. */
export function Notation() {
  const exercise = useExerciseStore(selectCurrentExercise);
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track the container's width to compute the fit scale.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setBoxWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The width the notation wants in order to lay its notes out comfortably.
  const naturalWidth = useMemo(() => {
    if (!exercise) return 0;
    const positions = exercise.pattern.reduce((n, bar) => n + bar.length, 0);
    return NATURAL_CHROME + positions * PX_PER_POSITION;
  }, [exercise]);

  // Render at least the natural width (fill wider containers; scale down narrow
  // ones). scale ≤ 1 so we never upscale a small exercise into blur.
  const renderWidth = Math.max(boxWidth, naturalWidth);
  const scale = boxWidth > 0 && renderWidth > 0 ? Math.min(1, boxWidth / renderWidth) : 1;

  // Move the current-note highlight in step with the audio. Toggling classes /
  // attributes on the existing SVG nodes (no setState) keeps this off React's
  // render path; stale ids after an exercise change resolve to null and are
  // ignored. Two DOM updates per beat: the note `<g>` gets `.note-active` (color
  // + glow + scale, via CSS), and the matching `<rect id="band-…">` flips
  // opacity (the peripheral band).
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
        clear();
      }
    });
    return () => {
      clear();
      unsubscribe();
    };
  }, []);

  // Draw into the inner (scaled) host when the exercise or render width changes.
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !exercise || boxWidth === 0) return;
    const result = renderExerciseNotation(el, exercise, renderWidth);
    setError(result.ok ? null : result.error);
  }, [exercise, renderWidth, boxWidth]);

  const label = exercise
    ? `Exercise ${exercise.number}, ${exercise.name}, ${SUBDIVISION_LABELS[exercise.subdivision]} notes in ${exercise.timeSignature.numerator}/${exercise.timeSignature.denominator}`
    : 'Exercise notation';

  return (
    <div className="w-full">
      {/* Outer box is measured and clips; the inner host is scaled to fit. Its
          height tracks the scaled SVG so the layout doesn't leave a gap. */}
      <div
        ref={boxRef}
        className="w-full overflow-hidden"
        role="img"
        aria-label={label}
        style={{ height: exercise ? NOTATION_HEIGHT * scale : undefined }}
      >
        <div
          ref={innerRef}
          style={{
            width: renderWidth,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
      {error && (
        <p className="mt-2 text-center text-sm text-red-500 dark:text-red-400">
          Couldn&apos;t render notation: {error}
        </p>
      )}
    </div>
  );
}
