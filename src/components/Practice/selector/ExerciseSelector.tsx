import { useRef, useState } from 'react';
import { CurrentExercisePill } from '../CurrentExercisePill';
import { ExerciseSelectorOverlay } from './ExerciseSelectorOverlay';

/** The exercise selector (DESIGN-v2 §6): the top-bar pill plus its overlay
 *  (anchored popover on desktop, bottom sheet on mobile). Owns the open state
 *  and the anchor ref. The native v2 replacement for the Stage-3 bridge to the
 *  v1 selector popover. */
export function ExerciseSelector() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <CurrentExercisePill
        anchorRef={anchorRef}
        expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <ExerciseSelectorOverlay anchorRef={anchorRef} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
