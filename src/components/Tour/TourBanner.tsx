import { useTourStore, type TourId } from '../../state/tour';
import { Button, cn } from '../ui';

/** First-entry banner for a mode the user hasn't toured (SPEC §13). "Yes" starts
 *  the tour; "No thanks" marks it seen so it won't reappear. */
export function TourBanner({ tour, onClose }: { tour: TourId; onClose: () => void }) {
  const start = useTourStore((s) => s.start);
  const dismiss = useTourStore((s) => s.dismiss);

  return (
    <div
      className={cn(
        'surface-popover fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3',
        'rounded-full px-4 py-2 text-sm',
      )}
      role="status"
    >
      <span className="text-fg-secondary">First time here? Take a quick tour.</span>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          start(tour);
          onClose();
        }}
      >
        Yes
      </Button>
      <button
        type="button"
        onClick={() => {
          dismiss(tour); // marks this mode's tour seen so the banner won't reappear
          onClose();
        }}
        className="text-xs text-fg-tertiary hover:text-fg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        No thanks
      </button>
    </div>
  );
}
