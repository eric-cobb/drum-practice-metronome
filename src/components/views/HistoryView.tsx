import { Clock } from 'lucide-react';
import { useUiStore } from '../../state/ui';
import { Button } from '../ui';
import { ViewHeader } from './ViewHeader';

/** History view — session log, stats, recents (DESIGN-v2 §5). Built natively in
 *  Stage 6. Until then this bridges to the working v1 session-log sheet so no
 *  functionality is lost during the migration. */
export function HistoryView() {
  const openHistory = useUiStore((s) => s.openHistory);

  return (
    <div className="mx-auto max-w-[1600px]">
      <ViewHeader
        title="History"
        description="Your practice sessions, weekly stats, and per-exercise bests."
      />
      <div className="px-8">
        <div className="surface-card flex h-48 flex-col items-center justify-center gap-4 rounded-[14px] text-sm text-fg-tertiary">
          <span>The full History view lands in Stage 6.</span>
          <Button
            variant="secondary"
            icon={<Clock size={16} strokeWidth={1.5} />}
            onClick={openHistory}
          >
            Open session log
          </Button>
        </div>
      </div>
    </div>
  );
}
