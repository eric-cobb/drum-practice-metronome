// A tiny global confirm dialog (replaces native window.confirm, which can't be
// styled to match the app and has accessibility quirks). Call `askConfirm({...})`
// from anywhere; it returns a Promise<boolean>. <ConfirmHost> (rendered once at
// the app root) shows the dialog and resolves the promise.

import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  request: PendingConfirm | null;
  open: (opts: ConfirmOptions) => Promise<boolean>;
  resolve: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  open: (opts) =>
    new Promise<boolean>((resolve) => {
      // If a confirm is already open, dismiss it as cancelled first.
      const existing = get().request;
      if (existing) existing.resolve(false);
      set({ request: { ...opts, resolve } });
    }),
  resolve: (ok) => {
    const req = get().request;
    if (req) {
      req.resolve(ok);
      set({ request: null });
    }
  },
}));

/** Show a confirm dialog and resolve to true (confirmed) / false (cancelled). */
export const askConfirm = (opts: ConfirmOptions): Promise<boolean> =>
  useConfirmStore.getState().open(opts);
