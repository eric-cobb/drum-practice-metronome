import { BpmControl } from './BpmControl';
import { PlayControl } from './PlayControl';
import { RepControl } from './RepControl';
import { RepProgressBar } from './RepProgressBar';
import { ConfigPills } from './ConfigPills';
import { AccentEditor } from './AccentEditor';
import { SessionNameCard } from './SessionNameCard';

/** Free-mode Practice body (DESIGN-v2 §5): the play composition (BPM · play ·
 *  reps) centered, then the config-pill row, then the accent editor and session
 *  name card. */
export function FreeMode() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 px-6 py-10">
      <BpmControl variant="free" placement="bottom" />
      <PlayControl size="free" />
      <div className="flex flex-col items-center gap-2.5">
        <RepControl variant="free" placement="top" />
        <RepProgressBar />
      </div>
      <ConfigPills />
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <AccentEditor />
        <SessionNameCard />
      </div>
    </div>
  );
}
