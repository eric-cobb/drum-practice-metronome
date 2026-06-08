import { useEffect, useRef, useState, type ReactNode } from 'react';
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

const POS: Record<Placement, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
};
const ALIGN: Record<Align, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

/** v2 anchored popover (DESIGN-v2 §6 / §7): the elevated popover surface with
 *  the entrance animation, closing on click-outside or Escape and restoring
 *  focus to the trigger. Used for the BPM / rep / config-pill dropdowns. The
 *  full exercise-selector popover (backdrop, arrow) is a separate Stage 4
 *  component. */
export function Popover({
  trigger,
  children,
  placement = 'bottom',
  align = 'start',
  widthClass = 'w-72',
  label,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        rootRef.current
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
    <div ref={rootRef} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            'popover-in surface-popover absolute z-50 rounded-2xl p-4',
            POS[placement],
            ALIGN[align],
            widthClass,
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
