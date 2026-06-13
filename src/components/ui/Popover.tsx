import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

type Placement = 'top' | 'bottom';
type Align = 'start' | 'center' | 'end';

interface PopoverProps {
  /** Renders the trigger; gets the open state and a toggle handler. The trigger
   *  element should carry `data-popover-trigger` so focus can return to it. */
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  /** Renders the panel contents; gets a `close` callback. */
  children: (close: () => void) => ReactNode;
  placement?: Placement;
  align?: Align;
  widthClass?: string;
  label?: string;
}

const GAP = 8;

/** v2 anchored popover (DESIGN-v2 §6 / §7): the elevated popover surface with
 *  the entrance animation, closing on click-outside or Escape and restoring
 *  focus to the trigger.
 *
 *  The panel is rendered in a portal at document.body, positioned with fixed
 *  coordinates from the trigger's rect. This is deliberate: the Practice play
 *  button runs per-beat transform animations that the browser composites onto
 *  their own GPU layers, and an in-flow popover — at ANY z-index — gets painted
 *  under those layers while playing. A body-level portal sits at the root of the
 *  stacking order, after the whole app, so nothing inside the app can composite
 *  over it. */
export function Popover({
  trigger,
  children,
  placement = 'bottom',
  align = 'start',
  widthClass = 'w-72',
  label,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const close = () => setOpen(false);

  // Position the portalled panel against the trigger. Re-runs on open and while
  // open on scroll/resize so it tracks the anchor.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;
      const panel = panelRef.current;
      const pw = panel?.offsetWidth ?? 0;
      const ph = panel?.offsetHeight ?? 0;
      const top = placement === 'bottom' ? a.bottom + GAP : a.top - GAP - ph;
      let left =
        align === 'start'
          ? a.left
          : align === 'end'
            ? a.right - pw
            : a.left + a.width / 2 - pw / 2;
      // Keep within the viewport horizontally.
      left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
      setCoords({ top, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, placement, align]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !anchorRef.current?.contains(t) &&
        !panelRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        anchorRef.current
          ?.querySelector<HTMLElement>('[data-popover-trigger]')
          ?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={anchorRef} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            style={{
              position: 'fixed',
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              // Hide the pre-measurement frame so it doesn't flash at -9999.
              visibility: coords ? 'visible' : 'hidden',
            }}
            className={cn(
              // Own composite layer + top-of-root z so it sits above the play
              // button's per-beat GPU layers.
              'popover-in surface-popover z-[1000] rounded-2xl p-4 will-change-transform',
              widthClass,
            )}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </div>
  );
}
