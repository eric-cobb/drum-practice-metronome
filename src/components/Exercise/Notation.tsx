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
  // ones). scale ≤ 1 so we never upscale a small exercise into blur. On mobile
  // boxWidth < naturalWidth, so renderWidth pins to naturalWidth and doesn't
  // change as boxWidth jitters — only `scale` (a CSS transform) follows it.
  const renderWidth = boxWidth > 0 ? Math.max(boxWidth, naturalWidth) : 0;
  const scale = renderWidth > 0 ? Math.min(1, boxWidth / renderWidth) : 1;

  // Move the current-note highlight in step with the audio. Toggling classes /
  // attributes on the existing SVG nodes (no setState) keeps this off React's
  // render path; stale ids after an exercise change resolve to null and are
  // ignored. Two DOM updates per beat: the note `<g>` gets `.note-active` (color
  // + glow + scale, via CSS), and the matching `<rect id="band-…">` flips
  // opacity (the peripheral band).
  useEffect(() => {
    // Clear EVERY lit highlight by querying the DOM, not by remembering the last
    // one set. On mobile the play-time `note` events (setTimeout-scheduled) can
    // drop, reorder, or double under load, so a single tracked "active" ref
    // misses clears and stale highlights pile up (the band appears stuck while
    // the glow drifts ahead). Querying is cheap (a handful of elements) and
    // guarantees exactly one highlight at a time.
    const clear = () => {
      document
        .querySelectorAll('.notation-svg .note-active')
        .forEach((el) => el.classList.remove('note-active'));
      document
        .querySelectorAll('.notation-svg .highlight-band[opacity="1"]')
        .forEach((el) => el.setAttribute('opacity', '0'));
    };
    const unsubscribe = onSchedulerEvent((event) => {
      clear();
      if (event.type === 'note') {
        document
          .getElementById(`note-${event.barIndex}-${event.noteIndexInBar}`)
          ?.classList.add('note-active');
        document
          .getElementById(`band-${event.barIndex}-${event.noteIndexInBar}`)
          ?.setAttribute('opacity', '1');
      }
    });
    return () => {
      clear();
      unsubscribe();
    };
  }, []);

  // Redraw only when the exercise or the render WIDTH changes — never on plain
  // boxWidth jitter (mobile fires those constantly). Re-creating the SVG mid-
  // play would rebuild the highlight bands out from under the running highlight
  // and desync it. The fit `scale` is a CSS transform applied below, so it can
  // follow boxWidth without a redraw.
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !exercise || renderWidth === 0) return;
    const result = renderExerciseNotation(el, exercise, renderWidth);
    setError(result.ok ? null : result.error);
  }, [exercise, renderWidth]);

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
