import { useEffect, useMemo, useRef, useState } from 'react';
import { renderExerciseNotation } from '../Exercise/renderNotation';
import type { Exercise } from '../../types';

// The notation is drawn at a fixed natural size, then scaled to the card width
// via CSS transform. Drawing at a generous width gives the notes room to breathe
// before being scaled down (vs. drawing cramped at the card width).
const RENDER_WIDTH = 560;
const RENDER_HEIGHT = 220;

// The preview shows only the first half-bar (capped) rather than the whole
// pattern. Cramming a full 16-note bar into a card makes ornament detail —
// drag/ruff beam counts, ghost-note parentheses — vanish; showing fewer events
// at the same render width zooms each note in enough to read. Trades pattern
// overview for legibility (the full pattern lives on the exercise page).
const PREVIEW_MAX_EVENTS = 8;

/** A static, scaled notation preview for a Library card. Renders lazily (only
 *  once scrolled into view) and non-interactively (no global note ids / band
 *  layer) so dozens of previews don't jank the page or collide with the live
 *  Practice highlight. */
export function NotationPreview({ exercise }: { exercise: Exercise }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  // A zoomed-in slice: the first bar truncated to its first half (capped). The
  // partial bar renders fine — the renderer's voices are non-strict.
  const previewExercise = useMemo<Exercise>(() => {
    const firstBar = exercise.pattern[0] ?? [];
    const count = Math.min(
      PREVIEW_MAX_EVENTS,
      Math.max(1, Math.ceil(firstBar.length / 2)),
    );
    return { ...exercise, pattern: [firstBar.slice(0, count)] };
  }, [exercise]);

  // Track the card's width to compute the scale factor.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setBoxWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render only once the card scrolls into view.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !innerRef.current) return;
    renderExerciseNotation(innerRef.current, previewExercise, RENDER_WIDTH, {
      interactive: false,
    });
  }, [visible, previewExercise]);

  const scale = boxWidth > 0 ? boxWidth / RENDER_WIDTH : 0;

  return (
    <div
      ref={boxRef}
      className="notation-preview relative w-full overflow-hidden"
      style={{ height: RENDER_HEIGHT * scale }}
      aria-hidden
    >
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: RENDER_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}
