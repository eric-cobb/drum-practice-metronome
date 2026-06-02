import { describe, expect, it } from 'vitest';
import { applySession, meetsCompletion, progressKey } from './progress';
import type { ExerciseProgress, Session } from '../types';

function makeSession(over: Partial<Session> = {}): Session {
  return {
    startTime: 1_000_000,
    endTime: 1_060_000,
    durationSeconds: 60,
    mode: 'exercise',
    exerciseName: '',
    exerciseSetId: 'stick-control',
    exerciseId: 'sc-01',
    startBpm: 80,
    endBpm: 80,
    timeSignature: { numerator: 2, denominator: 2, displayAs: 'cut' },
    subdivision: 'eighth',
    barsPerRep: 2,
    targetReps: 20,
    repsCompleted: 20,
    dropoutConfig: null,
    rampConfig: null,
    completed: true,
    notes: '',
    ...over,
  };
}

describe('meetsCompletion (SPEC §7)', () => {
  it('is true when target was hit AND endBpm >= setDefaultBpm', () => {
    expect(
      meetsCompletion({ repsCompleted: 20, targetReps: 20, endBpm: 60 }, 60),
    ).toBe(true);
  });
  it('is false when endBpm is below the threshold', () => {
    expect(
      meetsCompletion({ repsCompleted: 20, targetReps: 20, endBpm: 59 }, 60),
    ).toBe(false);
  });
  it('is false when target was not hit', () => {
    expect(
      meetsCompletion({ repsCompleted: 19, targetReps: 20, endBpm: 200 }, 60),
    ).toBe(false);
  });
});

describe('applySession (SPEC §7 / ARCHITECTURE §progress.ts)', () => {
  const now = 2_000_000;

  it('returns null for Free sessions (no exercise context)', () => {
    expect(
      applySession(
        null,
        makeSession({
          mode: 'free',
          exerciseSetId: undefined,
          exerciseId: undefined,
        }),
        60,
        now,
      ),
    ).toBeNull();
  });

  it('builds a fresh row on first completing session', () => {
    const result = applySession(null, makeSession({ endBpm: 80 }), 60, now);
    expect(result).not.toBeNull();
    expect(result!).toMatchObject({
      id: 'stick-control:sc-01',
      setId: 'stick-control',
      exerciseId: 'sc-01',
      completed: true,
      bestBpm: 80,
      totalReps: 20,
      totalSessions: 1,
      firstCompletedAt: now,
      lastPracticedAt: now,
    });
  });

  it('does NOT mark complete on a sub-threshold first session', () => {
    const result = applySession(null, makeSession({ endBpm: 50 }), 60, now);
    expect(result!.completed).toBe(false);
    expect(result!.bestBpm).toBeNull();
    expect(result!.firstCompletedAt).toBeNull();
  });

  it('completion is monotonic — stays true even if next session is below threshold', () => {
    const existing: ExerciseProgress = {
      id: 'stick-control:sc-01',
      setId: 'stick-control',
      exerciseId: 'sc-01',
      completed: true,
      bestBpm: 100,
      totalReps: 20,
      totalSessions: 1,
      firstCompletedAt: 1_000_000,
      lastPracticedAt: 1_000_000,
    };
    const result = applySession(existing, makeSession({ endBpm: 50 }), 60, now);
    expect(result!.completed).toBe(true);
    // bestBpm unchanged — the low session didn't meet completion.
    expect(result!.bestBpm).toBe(100);
  });

  it('bestBpm only updates on a completing session', () => {
    const existing: ExerciseProgress = {
      id: 'stick-control:sc-01',
      setId: 'stick-control',
      exerciseId: 'sc-01',
      completed: true,
      bestBpm: 80,
      totalReps: 20,
      totalSessions: 1,
      firstCompletedAt: 1_000_000,
      lastPracticedAt: 1_000_000,
    };
    const better = applySession(
      existing,
      makeSession({ endBpm: 120 }),
      60,
      now,
    );
    expect(better!.bestBpm).toBe(120);
  });

  it('accumulates totalReps and totalSessions across sessions', () => {
    const a = applySession(null, makeSession({ repsCompleted: 10 }), 60, now)!;
    const b = applySession(a, makeSession({ repsCompleted: 15 }), 60, now)!;
    expect(b.totalReps).toBe(25);
    expect(b.totalSessions).toBe(2);
  });

  it('preserves firstCompletedAt across later sessions', () => {
    const a = applySession(null, makeSession({ endBpm: 80 }), 60, 1_000)!;
    const b = applySession(a, makeSession({ endBpm: 90 }), 60, 5_000)!;
    expect(b.firstCompletedAt).toBe(1_000);
    expect(b.lastPracticedAt).toBe(5_000);
  });
});

describe('progressKey', () => {
  it('joins setId and exerciseId with a colon', () => {
    expect(progressKey('stick-control', 'sc-05')).toBe('stick-control:sc-05');
  });
});
