import { useMetronomeStore } from '../../state/metronome';
import { Card, cn } from '../ui';
import { TimeSignaturePill } from './TimeSignaturePill';
import { SubdivisionPill } from './SubdivisionPill';
import { DropoutPill } from './DropoutPill';
import { ConfigPill } from './ConfigPill';

/** Free-mode config-pill row (DESIGN-v2 §6): an 84px card holding four pills.
 *  Time signature, subdivision, and dropout are live; Ramp remains an inactive
 *  placeholder until Phase 8. */
export function ConfigPills() {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);

  return (
    <Card
      surface="card"
      className={cn(
        'flex min-h-[84px] flex-wrap items-center justify-center gap-3 px-4 py-3 transition-opacity duration-200',
        isPlaying ? 'opacity-40' : 'opacity-100',
      )}
    >
      <TimeSignaturePill />
      <SubdivisionPill />
      <DropoutPill />
      <ConfigPill label="Ramp" value="Off" disabled title="Tempo ramp — coming in a later phase" />
    </Card>
  );
}
