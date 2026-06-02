import { describe, expect, it } from 'vitest';
import {
  buildSessionExport,
  computeStats,
  dedupeImport,
  filterSessions,
  parseSessionImport,
  sessionLabel,
  shouldNagBackup,
  startOfWeek,
  EMPTY_FILTER,
} from './sessions';
import type { Exercise, ExerciseSet, Session } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeSession(over: Partial<Session> = {}): Session {
  return {
    startTime: Date.UTC(2024, 0, 10, 12),
    endTime: Date.UTC(2024, 0, 10, 12, 1),
    durationSeconds: 60,
    mode: 'free',
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
    ...over,
  };
}

function makeSet(
  exercises: Pick<Exercise, 'id' | 'number' | 'name'>[],
): ExerciseSet {
  return {
    id: 'stick-control',
    title: 'Stick Control',
    source: '',
    defaultBpm: 60,
    defaultTargetReps: 20,
    schemaVersion: 1,
    sections: [{ id: 'main', title: 'Main', order: 1 }],
    exercises: exercises.map((e) => ({
      ...e,
      sectionId: 'main',
      pattern: [[{ sticking: 'R' }]],
      timeSignature: { numerator: 4, denominator: 4 },
      subdivision: 'sixteenth',
    })),
  };
}

describe('sessionLabel', () => {
  it('uses the display name for exercise sessions', () => {
    expect(
      sessionLabel(
        makeSession({
          mode: 'exercise',
          exerciseDisplayName: '#5 Paradiddle R',
        }),
      ),
    ).toBe('#5 Paradiddle R');
  });

  it('falls back to "Untitled" for an unnamed Free session', () => {
    expect(
      sessionLabel(makeSession({ mode: 'free', exerciseName: '   ' })),
    ).toBe('Untitled');
    expect(
      sessionLabel(makeSession({ mode: 'free', exerciseName: 'Warm-up' })),
    ).toBe('Warm-up');
  });
});

describe('filterSessions', () => {
  const sessions = [
    makeSession({ mode: 'free', exerciseName: 'Warm-up', startTime: 1000 }),
    makeSession({
      mode: 'exercise',
      exerciseDisplayName: '#1 Singles R',
      startTime: 2000,
    }),
    makeSession({
      mode: 'free',
      exerciseName: 'Song practice',
      startTime: 3000,
    }),
  ];

  it('returns everything with the empty filter', () => {
    expect(filterSessions(sessions, EMPTY_FILTER)).toHaveLength(3);
  });

  it('filters by mode', () => {
    expect(
      filterSessions(sessions, { ...EMPTY_FILTER, mode: 'exercise' }),
    ).toHaveLength(1);
  });

  it('matches the label case-insensitively', () => {
    const r = filterSessions(sessions, { ...EMPTY_FILTER, query: 'song' });
    expect(r).toHaveLength(1);
    expect(r[0].exerciseName).toBe('Song practice');
  });

  it('respects inclusive date bounds', () => {
    expect(
      filterSessions(sessions, { ...EMPTY_FILTER, from: 2000, to: 3000 }),
    ).toHaveLength(2);
  });
});

describe('startOfWeek', () => {
  it('returns Monday 00:00 for a midweek day', () => {
    const wed = new Date(2024, 0, 10, 14, 30); // Wed 10 Jan 2024, local
    const mon = new Date(2024, 0, 8, 0, 0, 0, 0);
    expect(startOfWeek(wed.getTime())).toBe(mon.getTime());
  });

  it('treats Sunday as the end of the week (previous Monday)', () => {
    const sun = new Date(2024, 0, 14, 9, 0); // Sun 14 Jan 2024
    const mon = new Date(2024, 0, 8, 0, 0, 0, 0);
    expect(startOfWeek(sun.getTime())).toBe(mon.getTime());
  });
});

describe('computeStats', () => {
  const now = new Date(2024, 0, 10, 12).getTime(); // Wed; week starts Mon Jan 8
  const inWeek = new Date(2024, 0, 9, 10).getTime();
  const beforeWeek = new Date(2024, 0, 5, 10).getTime();

  it('totals practice time and session count for the current week only', () => {
    const sessions = [
      makeSession({ startTime: inWeek, durationSeconds: 120 }),
      makeSession({ startTime: inWeek, durationSeconds: 60 }),
      makeSession({ startTime: beforeWeek, durationSeconds: 999 }),
    ];
    const stats = computeStats(sessions, null, now);
    expect(stats.weekSeconds).toBe(180);
    expect(stats.weekCount).toBe(2);
  });

  it('reports best BPM per completed exercise, in set order, ignoring incomplete runs', () => {
    const set = makeSet([
      { id: 'e1', number: 1, name: 'Singles R' },
      { id: 'e2', number: 2, name: 'Singles L' },
    ]);
    const sessions = [
      makeSession({
        mode: 'exercise',
        exerciseId: 'e1',
        endBpm: 90,
        completed: true,
      }),
      makeSession({
        mode: 'exercise',
        exerciseId: 'e1',
        endBpm: 110,
        completed: true,
      }),
      // higher BPM but not completed → excluded
      makeSession({
        mode: 'exercise',
        exerciseId: 'e2',
        endBpm: 200,
        completed: false,
      }),
    ];
    expect(computeStats(sessions, set, now).exerciseBests).toEqual([
      { label: '#1 Singles R', bpm: 110 },
    ]);
  });

  it('reports top-5 named Free bests by BPM (max per name)', () => {
    const sessions = [
      makeSession({ exerciseName: 'A', endBpm: 80 }),
      makeSession({ exerciseName: 'A', endBpm: 120 }), // max for A
      makeSession({ exerciseName: 'B', endBpm: 100 }),
      makeSession({ exerciseName: 'C', endBpm: 140 }),
      makeSession({ exerciseName: 'D', endBpm: 60 }),
      makeSession({ exerciseName: 'E', endBpm: 90 }),
      makeSession({ exerciseName: 'F', endBpm: 70 }),
      makeSession({ exerciseName: '', endBpm: 999 }), // unnamed → ignored
    ];
    const { freeBests } = computeStats(sessions, null, now);
    expect(freeBests).toEqual([
      { label: 'C', bpm: 140 },
      { label: 'A', bpm: 120 },
      { label: 'B', bpm: 100 },
      { label: 'E', bpm: 90 },
      { label: 'F', bpm: 70 },
    ]);
  });
});

describe('buildSessionExport', () => {
  it('wraps the sessions with schemaVersion and an ISO timestamp', () => {
    const exp = buildSessionExport([makeSession()]);
    expect(exp.schemaVersion).toBe(1);
    expect(() => new Date(exp.exportedAt).toISOString()).not.toThrow();
    expect(exp.sessions).toHaveLength(1);
  });
});

describe('parseSessionImport', () => {
  const file = (sessions: unknown[]) => ({
    schemaVersion: 1,
    exportedAt: 'x',
    sessions,
  });

  it('accepts a well-formed export object', () => {
    const r = parseSessionImport(file([makeSession()]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sessions).toHaveLength(1);
  });

  it('rejects a bare array (the pre-§4 format)', () => {
    expect(parseSessionImport([makeSession()]).ok).toBe(false);
  });

  it('rejects a wrong schemaVersion', () => {
    const r = parseSessionImport({ schemaVersion: 2, sessions: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/schemaVersion/);
  });

  it('rejects a missing sessions array', () => {
    const r = parseSessionImport({ schemaVersion: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/sessions/);
  });

  it('rejects a malformed session, naming the index', () => {
    const r = parseSessionImport(file([makeSession(), { mode: 'free' }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/sessions\[1\]/);
  });
});

describe('dedupeImport', () => {
  it('skips entries matching existing on (startTime, mode, exerciseId)', () => {
    const existing = [
      makeSession({ startTime: 100, mode: 'exercise', exerciseId: 'e1' }),
    ];
    const imported = [
      makeSession({ startTime: 100, mode: 'exercise', exerciseId: 'e1' }), // dup
      makeSession({ startTime: 200, mode: 'exercise', exerciseId: 'e1' }), // new
    ];
    const { toAdd, skipped } = dedupeImport(existing, imported);
    expect(skipped).toBe(1);
    expect(toAdd.map((s) => s.startTime)).toEqual([200]);
  });

  it('treats a different exerciseId at the same time as distinct', () => {
    const existing = [
      makeSession({ startTime: 100, mode: 'exercise', exerciseId: 'e1' }),
    ];
    const imported = [
      makeSession({ startTime: 100, mode: 'exercise', exerciseId: 'e2' }),
    ];
    expect(dedupeImport(existing, imported).toAdd).toHaveLength(1);
  });

  it('dedupes duplicates within the imported batch itself', () => {
    const imported = [
      makeSession({ startTime: 100, mode: 'free' }),
      makeSession({ startTime: 100, mode: 'free' }),
    ];
    const { toAdd, skipped } = dedupeImport([], imported);
    expect(toAdd).toHaveLength(1);
    expect(skipped).toBe(1);
  });
});

describe('shouldNagBackup', () => {
  const now = Date.UTC(2024, 5, 1);
  const many = (n: number, startTime: number) =>
    Array.from({ length: n }, () => makeSession({ startTime }));

  it('nags with >20 unexported sessions and last export over 30 days ago', () => {
    expect(
      shouldNagBackup({
        sessions: many(21, now - DAY_MS),
        lastExportAt: now - 40 * DAY_MS,
        lastDismissedAt: null,
        now,
      }),
    ).toBe(true);
  });

  it('does not nag with 20 or fewer unexported sessions', () => {
    expect(
      shouldNagBackup({
        sessions: many(20, now - DAY_MS),
        lastExportAt: now - 40 * DAY_MS,
        lastDismissedAt: null,
        now,
      }),
    ).toBe(false);
  });

  it('does not nag when exported within the last 30 days', () => {
    expect(
      shouldNagBackup({
        sessions: many(21, now - DAY_MS),
        lastExportAt: now - 5 * DAY_MS,
        lastDismissedAt: null,
        now,
      }),
    ).toBe(false);
  });

  it('does not nag when dismissed within the last 30 days', () => {
    expect(
      shouldNagBackup({
        sessions: many(21, now - DAY_MS),
        lastExportAt: now - 40 * DAY_MS,
        lastDismissedAt: now - 5 * DAY_MS,
        now,
      }),
    ).toBe(false);
  });

  it('with no prior export, nags only once data is over 30 days old', () => {
    expect(
      shouldNagBackup({
        sessions: many(21, now - 40 * DAY_MS),
        lastExportAt: null,
        lastDismissedAt: null,
        now,
      }),
    ).toBe(true);
    expect(
      shouldNagBackup({
        sessions: many(21, now - 2 * DAY_MS),
        lastExportAt: null,
        lastDismissedAt: null,
        now,
      }),
    ).toBe(false);
  });
});
