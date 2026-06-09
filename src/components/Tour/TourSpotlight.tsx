import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTourStore, TOUR_STEPS } from '../../state/tour';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Button } from '../ui';

const PAD = 8; // padding around the highlighted element
const CALLOUT_W = 320;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The active-tour overlay (SPEC §13): a dimmed backdrop with a spotlight cut
 *  out around the current step's target, plus a callout with the copy and
 *  Back / Next / Skip controls. Hand-rolled on a portal (no tour library). */
export function TourSpotlight() {
  const active = useTourStore((s) => s.active);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const end = useTourStore((s) => s.end);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [rect, setRect] = useState<Rect | null>(null);

  const steps = active ? TOUR_STEPS[active.tour] : [];
  const step = active ? steps[active.step] : null;

  // The tour only runs on desktop; end gracefully if the window shrinks.
  useEffect(() => {
    if (active && !isDesktop) end();
  }, [active, isDesktop, end]);

  // Measure the target each step, then keep it pinned on scroll/resize.
  useLayoutEffect(() => {
    if (!step) return;
    let raf = 0;
    let tries = 0;

    // Re-measure only (never scrolls) — safe to call from the scroll listener.
    const remeasure = () => {
      const el = document.querySelector(step.target);
      if (!el) return; // keep the last rect on a transient miss
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // Initial pass: bring the target into view, retrying for a few frames in
    // case the DOM is still settling after a mode/view switch.
    const init = () => {
      const el = document.querySelector(step.target);
      if (!el) {
        if (tries++ < 5) {
          raf = requestAnimationFrame(init);
        } else {
          end(); // genuinely absent — don't hang the tour
        }
        return;
      }
      el.scrollIntoView({ block: 'center', inline: 'center' });
      remeasure();
    };
    init();

    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [step, end]);

  // Escape skips the tour.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        end();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, end]);

  if (!active || !step || !rect || !isDesktop) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(v, max));
  // Estimated callout height, used to keep it fully on-screen. (Generous; the
  // real callout is shorter, so clamping is conservative.)
  const estH = 220;

  let top: number;
  let left: number;
  if (rect.height > vh * 0.6) {
    // A tall target (e.g. the full-height sidebar): place the callout beside it
    // rather than above/below, where it would land off-screen.
    const onLeftSide = rect.left < vw / 2;
    left = onLeftSide ? rect.left + rect.width + 12 : rect.left - CALLOUT_W - 12;
    top = vh / 2 - estH / 2;
  } else if (rect.top + rect.height + estH + 16 < vh) {
    top = rect.top + rect.height + PAD + 8; // below
    left = rect.left + rect.width / 2 - CALLOUT_W / 2;
  } else {
    top = rect.top - estH - PAD; // above
    left = rect.left + rect.width / 2 - CALLOUT_W / 2;
  }
  // Always keep the callout fully within the viewport so its controls are reachable.
  left = clamp(left, 12, vw - CALLOUT_W - 12);
  top = clamp(top, 12, vh - estH - 12);
  const calloutStyle = { top, left };

  const isLast = active.step === steps.length - 1;

  return createPortal(
    <>
      {/* Click-capture layer — blocks page interaction behind the spotlight. */}
      <div className="fixed inset-0 z-[80]" aria-hidden />
      {/* Spotlight: a transparent box over the target whose huge box-shadow
          darkens the rest of the screen. */}
      <div
        className="pointer-events-none fixed z-[81] rounded-[12px]"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
          transition: 'all 180ms ease-out',
        }}
        aria-hidden
      />
      {/* Callout */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className="dialog-in surface-popover fixed z-[82] rounded-2xl p-4"
        style={{ width: CALLOUT_W, ...calloutStyle }}
      >
        <h3 className="text-sm font-medium text-fg">{step.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-secondary">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={end}
            className="text-xs text-fg-tertiary hover:text-fg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums text-fg-muted">
              {active.step + 1} of {steps.length}
            </span>
            {active.step > 0 && (
              <Button variant="ghost" size="sm" onClick={prev}>
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={next}>
              {isLast ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
