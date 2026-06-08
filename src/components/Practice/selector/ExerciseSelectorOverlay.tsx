import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { SelectorBody } from './SelectorBody';

const POPOVER_WIDTH = 436;
const MAX_HEIGHT = 730;

interface OverlayProps {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

interface Position {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  arrowLeft: number;
}

function computePosition(anchor: HTMLElement): Position {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(POPOVER_WIDTH, vw - 16);
  const gap = 12;
  const top = r.bottom + gap;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, vw - width - 8));
  const maxHeight = Math.min(MAX_HEIGHT, vh - top - 12);
  const arrowLeft = Math.max(16, Math.min(r.left + r.width / 2 - left, width - 16));
  return { top, left, width, maxHeight, arrowLeft };
}

/** Move focus into the panel on open and keep Tab cycling within it; Escape
 *  closes (DESIGN-v2 §6). */
function useModalFocus(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    // Restore focus to whatever opened the overlay (the pill) on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onKeyDown);
    return () => {
      panel.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [panelRef, onClose]);
}

/** The exercise selector overlay (DESIGN-v2 §6): a dimming backdrop plus, on
 *  desktop, an anchored popover with a pointer arrow; below 768px, a bottom
 *  sheet. Rendered in a portal so it escapes the Practice view's scroll/stacking
 *  contexts. */
export function ExerciseSelectorOverlay({ anchorRef, onClose }: OverlayProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const panelRef = useRef<HTMLDivElement>(null);
  // Compute the initial position synchronously — the anchor pill is already
  // mounted when the overlay opens, so the panel can render (and the focus trap
  // can attach) on the first render rather than after a layout-effect pass.
  const [pos, setPos] = useState<Position | null>(() =>
    isDesktop && anchorRef.current ? computePosition(anchorRef.current) : null,
  );

  useLayoutEffect(() => {
    if (!isDesktop) return;
    const update = () => {
      if (anchorRef.current) setPos(computePosition(anchorRef.current));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isDesktop, anchorRef]);

  useModalFocus(panelRef, onClose);

  const backdrop = (
    <div
      className="backdrop-fade fixed inset-0 z-40 bg-black/40"
      onClick={onClose}
      aria-hidden
    />
  );

  if (isDesktop) {
    if (!pos) return null;
    return createPortal(
      <>
        {backdrop}
        <div
          className="fixed z-50"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {/* Pointer arrow connecting the popover to the anchor pill. */}
          <div
            className="absolute -top-[6px] h-3.5 w-3.5 rotate-45 border-l border-t border-[color:var(--border-visible)]"
            style={{ left: pos.arrowLeft - 7, background: 'var(--popover-arrow-bg)' }}
            aria-hidden
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Exercise selector"
            className="popover-in surface-popover overflow-y-auto rounded-2xl p-4"
            style={{ maxHeight: pos.maxHeight }}
          >
            <SelectorBody close={onClose} />
          </div>
        </div>
      </>,
      document.body,
    );
  }

  return createPortal(
    <>
      {backdrop}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Exercise selector"
        className="sheet-up surface-popover fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl p-4"
      >
        <SelectorBody close={onClose} />
      </div>
    </>,
    document.body,
  );
}
