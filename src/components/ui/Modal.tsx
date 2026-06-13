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
// The default width is the `className` fallback (not baked into the base) so a
// caller passing e.g. `max-w-4xl` fully replaces it — otherwise two max-w-*
// utilities collide and the source order, not the caller, decides the winner.
export function Modal({ onClose, label, children, className = 'max-w-md' }: ModalProps) {
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
        className={cn('dialog-in surface-popover w-full rounded-2xl p-5', className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
