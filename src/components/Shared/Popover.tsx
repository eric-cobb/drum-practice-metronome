import { useEffect, useRef, useState, type ReactNode } from 'react';

type Placement = 'top' | 'bottom';
type Align = 'start' | 'center' | 'end';

interface PopoverProps {
  /** Renders the trigger; gets the open state and a toggle handler. */
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  /** Renders the panel contents; gets a `close` callback. */
  children: (close: () => void) => ReactNode;
  placement?: Placement;
  align?: Align;
  /** Panel width class (DESIGN: 280–320px). */
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

/** Anchored popover (DESIGN §Popovers): hairline surface, subtle shadow, closes
 *  on click-outside or Escape, restores focus to the trigger on close. */
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
        // Return focus to the trigger for keyboard users.
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
          className={`popover-in absolute z-50 ${POS[placement]} ${ALIGN[align]} ${widthClass} rounded-xl border border-neutral-200 bg-white p-4 shadow-lg shadow-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-neutral-950/50`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
