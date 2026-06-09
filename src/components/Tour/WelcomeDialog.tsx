import { useTourStore } from '../../state/tour';
import { Modal, Button } from '../ui';

/** First-ever-open welcome (SPEC §13): offers either tour or to skip. */
export function WelcomeDialog({ onClose }: { onClose: () => void }) {
  const start = useTourStore((s) => s.start);
  const skipAll = useTourStore((s) => s.skipAll);

  return (
    <Modal onClose={onClose} label="Welcome">
      <div className="flex flex-col gap-3">
        <h3 className="text-[15px] font-medium text-fg">Welcome to the practice metronome</h3>
        <p className="text-sm text-fg-secondary">
          A quick tour can show you around. Start with the free metronome, or jump into
          structured exercise practice — or skip and explore on your own.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            variant="primary"
            onClick={() => {
              start('free');
              onClose();
            }}
          >
            Tour Free mode
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              start('practice');
              onClose();
            }}
          >
            Tour Exercise mode
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              skipAll();
              onClose();
            }}
          >
            Skip — I'll explore on my own
          </Button>
        </div>
      </div>
    </Modal>
  );
}
