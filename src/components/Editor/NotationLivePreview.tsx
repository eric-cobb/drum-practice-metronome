import { useEffect, useRef } from 'react';
import { renderExerciseNotation } from '../Exercise/renderNotation';
import type { Exercise } from '../../types';

const RENDER_WIDTH = 820;

/** Live, non-interactive VexFlow render of the exercise being edited. Re-renders
 *  whenever the exercise object changes (the editor store hands back a new
 *  object on every edit), so the staff tracks the grid in real time. */
export function NotationLivePreview({ exercise }: { exercise: Exercise }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      renderExerciseNotation(ref.current, exercise, RENDER_WIDTH, {
        interactive: false,
      });
    }
  }, [exercise]);

  return (
    <div className="notation-preview overflow-x-auto rounded-[10px]">
      <div ref={ref} style={{ width: RENDER_WIDTH }} aria-hidden />
    </div>
  );
}
