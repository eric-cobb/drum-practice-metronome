import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

interface ModalProps {
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}

/** Centered modal dialog (DESIGN-v2 §7): fading backdrop + scale-in panel on the
 *  elevated surface. Closes on backdrop click or Escape. Rendered in a portal so
 *  it overlays everything regardless of the triggering view's stacking context. */
export function Modal({ onClose, label, children, className }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="backdrop-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn('dialog-in surface-popover w-full max-w-md rounded-2xl p-5', className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
