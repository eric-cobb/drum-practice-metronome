import type { ExerciseProgress } from '../../../types';
import type { TileState } from '../../ui';

/** Best BPM ≥ this × set default earns the "mastered" (gold) state (SPEC §7). */
const HIGH_TEMPO_MULTIPLIER = 1.5;

/** Map an exercise's progress row to a v2 Tile state (DESIGN-v2 §6 tile states).
 *  `current` always wins. */
export function tileStateFor(
  progress: ExerciseProgress | null | undefined,
  defaultBpm: number,
  isCurrent: boolean,
): TileState {
  if (isCurrent) return 'current';
  if (progress?.completed) {
    const mastered = (progress.bestBpm ?? 0) >= defaultBpm * HIGH_TEMPO_MULTIPLIER;
    return mastered ? 'mastered' : 'completed';
  }
  if (progress && progress.totalSessions > 0) return 'attempted';
  return 'default';
}
