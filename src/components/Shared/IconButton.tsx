import type { ReactNode } from 'react';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

/** 32px square icon button (DESIGN §Buttons): no background, hover tint only. */
export function IconButton({ label, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
    >
      {children}
    </button>
  );
}
