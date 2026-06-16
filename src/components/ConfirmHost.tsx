import { useConfirmStore } from '../state/confirm';
import { Button, Modal } from './ui';

/** Renders the single global confirm dialog (see state/confirm.ts). Mount once
 *  at the app root. Escape / backdrop / Cancel resolve to false. */
export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const resolve = useConfirmStore((s) => s.resolve);

  if (!request) return null;

  return (
    <Modal onClose={() => resolve(false)} label={request.title}>
      <div className="flex flex-col gap-3">
        <h3 className="text-[15px] font-medium text-fg">{request.title}</h3>
        {request.body && <p className="text-sm text-fg-secondary">{request.body}</p>}
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => resolve(false)}>
            {request.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={request.destructive ? 'destructive' : 'primary'}
            size="sm"
            onClick={() => resolve(true)}
          >
            {request.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
