import { useMetronomeStore } from '../../state/metronome';
import { Card, cn } from '../ui';
import { TimeSignaturePill } from './TimeSignaturePill';
import { SubdivisionPill } from './SubdivisionPill';
import { ConfigPill } from './ConfigPill';

/** Free-mode config-pill row (DESIGN-v2 §6): an 84px card holding four pills.
 *  Time signature and subdivision are live; Dropout and Ramp are rendered as
 *  inactive placeholders — those features arrive in Phases 7–8 and are out of
 *  scope for the redesign, so the pills show "Off" and don't open a dropdown. */
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
      <ConfigPill label="Dropout" value="Off" disabled title="Click dropout — coming in a later phase" />
      <ConfigPill label="Ramp" value="Off" disabled title="Tempo ramp — coming in a later phase" />
    </Card>
  );
}
