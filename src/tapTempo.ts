// Pure tap-tempo math (SPEC §1): BPM from the average interval of the last few
// taps, with the history reset when taps are spaced more than 3s apart.

export const TAP_RESET_MS = 3000;
/** Average over at most the last 4 taps (i.e. 3 intervals). */
export const TAP_HISTORY = 4;

/** Append `now` to the tap history, resetting first if the previous tap was more
 *  than TAP_RESET_MS ago, and keeping only the last TAP_HISTORY taps. */
export function registerTap(times: number[], now: number): number[] {
  const last = times[times.length - 1];
  const base = last !== undefined && now - last > TAP_RESET_MS ? [] : times;
  return [...base, now].slice(-TAP_HISTORY);
}

/** BPM from the average gap between consecutive taps, or null with < 2 taps. */
export function bpmFromTaps(times: number[]): number | null {
  if (times.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < times.length; i++) sum += times[i] - times[i - 1];
  const avg = sum / (times.length - 1);
  if (avg <= 0) return null;
  return Math.round(60000 / avg);
}
