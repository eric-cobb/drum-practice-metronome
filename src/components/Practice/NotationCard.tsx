import { Notation } from '../Exercise/Notation';
import { ErrorBoundary } from '../ErrorBoundary';
import { Card } from '../ui';

/** The notation on the elevated canvas surface (DESIGN-v2 §5 "Notation canvas").
 *  Notation renders itself once per exercise and recolors via CSS vars, so the
 *  card only provides the surface and padding. Boundaried so a malformed
 *  imported exercise that throws in VexFlow can't take down the whole app. */
export function NotationCard() {
  return (
    <Card surface="elevated" data-tour="notation" className="flex min-h-[180px] items-center justify-center p-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <ErrorBoundary compact>
          <Notation />
        </ErrorBoundary>
      </div>
    </Card>
  );
}
