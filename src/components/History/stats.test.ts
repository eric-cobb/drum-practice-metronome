import { describe, it, expect } from 'vitest';
import type { Session } from '../../types';
import {
  last7DaySeconds,
  rolling7Seconds,
  practiceStreak,
  newBestSessionIds,
} from './stats';

const DAY = 24 * 60 * 60 * 1000;
// A fixed "now" at midday so ±hours of session offset stay within the same day.
const NOW = new Date(2026, 5, 8, 12, 0, 0).getTime();

let nextId = 1;
function mk(partial: Partial<Session>): Session {
  return {
    id: nextId++,
    startTime: NOW,
    endTime: NOW,
    durationSeconds: 60,
    mode: 'exercise',
    exerciseName: '',
    startBpm: 100,
    endBpm: 100,
    timeSignature: { numerator: 4, denominator: 4 },
    subdivision: 'sixteenth',
    barsPerRep: 2,
    targetReps: 20,
    repsCompleted: 20,
    dropoutConfig: null,
    rampConfig: null,
    completed: true,
    notes: '',
    ...partial,
  };
}

describe('last7DaySeconds', () => {
  it('buckets by local day with today at index 6', () => {
    const sessions = [
      mk({ startTime: NOW, durationSeconds: 100 }), // today
      mk({ startTime: NOW - 2 * DAY, durationSeconds: 50 }), // 2 days ago
      mk({ startTime: NOW - 2 * DAY, durationSeconds: 25 }), // same day, sums
      mk({ startTime: NOW - 10 * DAY, durationSeconds: 999 }), // out of range
    ];
    const buckets = last7DaySeconds(sessions, NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[6]).toBe(100);
    expect(buckets[4]).toBe(75);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(175);
  });
});

describe('rolling7Seconds', () => {
  it('splits current vs previous 7-day windows', () => {
    const sessions = [
      mk({ startTime: NOW, durationSeconds: 100 }),
      mk({ startTime: NOW - 6 * DAY, durationSeconds: 20 }),
      mk({ startTime: NOW - 7 * DAY, durationSeconds: 30 }),
      mk({ startTime: NOW - 13 * DAY, durationSeconds: 40 }),
      mk({ startTime: NOW - 14 * DAY, durationSeconds: 999 }),
    ];
    expect(rolling7Seconds(sessions, NOW)).toEqual({ current: 120, previous: 70 });
  });
});

describe('practiceStreak', () => {
  it('counts consecutive days including today', () => {
    const sessions = [
      mk({ startTime: NOW }),
      mk({ startTime: NOW - DAY }),
      mk({ startTime: NOW - 2 * DAY }),
      mk({ startTime: NOW - 4 * DAY }), // gap at day 3 breaks it
    ];
    expect(practiceStreak(sessions, NOW)).toBe(3);
  });

  it('gives grace when today has no session yet', () => {
    const sessions = [mk({ startTime: NOW - DAY }), mk({ startTime: NOW - 2 * DAY })];
    expect(practiceStreak(sessions, NOW)).toBe(2);
  });

  it('is zero when the most recent session is older than yesterday', () => {
    expect(practiceStreak([mk({ startTime: NOW - 3 * DAY })], NOW)).toBe(0);
  });
});

describe('newBestSessionIds', () => {
  it('marks the record holder per exercise, earliest on a tie', () => {
    const a = mk({ id: 1, exerciseId: 'e1', endBpm: 120, startTime: NOW - DAY });
    const b = mk({ id: 2, exerciseId: 'e1', endBpm: 120, startTime: NOW - 2 * DAY }); // earlier, same bpm
    const c = mk({ id: 3, exerciseId: 'e1', endBpm: 90 });
    const ids = newBestSessionIds([a, b, c]);
    expect(ids.has(2)).toBe(true);
    expect(ids.has(1)).toBe(false);
    expect(ids.has(3)).toBe(false);
  });

  it('groups Free sessions by name', () => {
    const a = mk({ id: 10, mode: 'free', exerciseName: 'Warmup', endBpm: 80 });
    const b = mk({ id: 11, mode: 'free', exerciseName: 'Warmup', endBpm: 110 });
    const ids = newBestSessionIds([a, b]);
    expect(ids.has(11)).toBe(true);
    expect(ids.has(10)).toBe(false);
  });
});
