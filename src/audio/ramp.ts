// Pure tempo-ramp math (SPEC §6). Given a ramp config and how much has elapsed
// (reps completed or seconds), compute how many steps have applied and the
// resulting BPM. Kept free of Web Audio / the store so it's unit-testable; the
// scheduler drives it and writes the BPM back.

import type { RampConfig } from '../types';

/** Number of ramp steps applied so far, from reps completed or seconds elapsed
 *  depending on the trigger. */
export function rampSteps(
  config: RampConfig,
  repsCompleted: number,
  secondsElapsed: number,
): number {
  const everyN = Math.max(1, config.trigger.everyN);
  const elapsed =
    config.trigger.type === 'reps' ? repsCompleted : secondsElapsed;
  return Math.max(0, Math.floor(elapsed / everyN));
}

/** BPM after `steps` steps, clamped so it never overshoots endBpm. Direction is
 *  inferred from start vs end. */
export function rampBpmForSteps(config: RampConfig, steps: number): number {
  const up = config.endBpm >= config.startBpm;
  const delta = Math.max(1, config.stepSize) * Math.max(0, steps);
  const raw = up ? config.startBpm + delta : config.startBpm - delta;
  return up ? Math.min(raw, config.endBpm) : Math.max(raw, config.endBpm);
}

/** Whether the ramp has reached endBpm. False for a degenerate start===end
 *  config so it never triggers an immediate auto-stop. */
export function rampReachedEnd(config: RampConfig, steps: number): boolean {
  if (config.startBpm === config.endBpm) return false;
  return rampBpmForSteps(config, steps) === config.endBpm;
}
