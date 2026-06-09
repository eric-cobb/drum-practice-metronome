// Pure stats helpers for the History view (DESIGN-v2 §6 stat cards). Kept
// separate from the session store and unit-tested — the day/week bucketing is
// fiddly enough to be worth pinning down. All times are local.

import type { Session } from '../../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight (ms) for the day containing `ms`. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole days between two instants, by local calendar day (today = 0). */
export function daysAgo(ms: number, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(ms)) / DAY_MS);
}

/** Practice seconds bucketed into the last 7 local days; index 6 = today,
 *  index 0 = six days ago. Powers the "this week" bar chart. */
export function last7DaySeconds(sessions: Session[], now: number): number[] {
  const buckets = new Array<number>(7).fill(0);
  for (const s of sessions) {
    const ago = daysAgo(s.startTime, now);
    if (ago >= 0 && ago <= 6) buckets[6 - ago] += s.durationSeconds;
  }
  return buckets;
}

/** Total practice seconds in the 7 days ending today, and in the prior 7 days
 *  (for the week-over-week delta). */
export function rolling7Seconds(
  sessions: Session[],
  now: number,
): { current: number; previous: number } {
  let current = 0;
  let previous = 0;
  for (const s of sessions) {
    const ago = daysAgo(s.startTime, now);
    if (ago >= 0 && ago <= 6) current += s.durationSeconds;
    else if (ago >= 7 && ago <= 13) previous += s.durationSeconds;
  }
  return { current, previous };
}

/** Which of the last 7 days had at least one session; index 6 = today. */
export function last7DayActive(sessions: Session[], now: number): boolean[] {
  return last7DaySeconds(sessions, now).map((s) => s > 0);
}

/** Consecutive-day practice streak ending today (or yesterday, so a not-yet-
 *  practiced today doesn't break an otherwise-live streak). */
export function practiceStreak(sessions: Session[], now: number): number {
  const days = new Set(sessions.map((s) => startOfDay(s.startTime)));
  let cursor = startOfDay(now);
  if (!days.has(cursor)) cursor -= DAY_MS; // grace for "today not done yet"
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

/** Session ids that hold the best BPM for their exercise (or named Free
 *  session) — the "new best" rows (DESIGN-v2 §6). Ties resolve to the earliest
 *  session, i.e. when the best was first reached. */
export function newBestSessionIds(sessions: Session[]): Set<number> {
  const groupKey = (s: Session): string | null => {
    if (s.mode === 'exercise') {
      if (!s.exerciseId) return null;
      return `ex:${s.exerciseSetId ?? ''}:${s.exerciseId}`;
    }
    const name = s.exerciseName.trim();
    return name ? `free:${name.toLowerCase()}` : null;
  };

  // Best record per group: highest endBpm, earliest startTime on a tie.
  const best = new Map<string, Session>();
  for (const s of sessions) {
    const key = groupKey(s);
    if (key === null || s.id === undefined) continue;
    const prev = best.get(key);
    if (
      !prev ||
      s.endBpm > prev.endBpm ||
      (s.endBpm === prev.endBpm && s.startTime < prev.startTime)
    ) {
      best.set(key, s);
    }
  }

  const ids = new Set<number>();
  for (const s of best.values()) if (s.id !== undefined) ids.add(s.id);
  return ids;
}
