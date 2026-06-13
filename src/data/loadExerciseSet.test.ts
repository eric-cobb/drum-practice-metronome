import { describe, expect, it } from 'vitest';
import {
  loadBundledSets,
  migrateStoredSet,
  validateExerciseSet,
} from './loadExerciseSet';
import type { ExerciseSet } from '../types';

/** A fresh, minimal valid raw set each call, so tests can mutate it freely. */
function makeValidRaw(): Record<string, unknown> {
  return {
    id: 'test-set',
    title: 'Test Set',
    source: 'src',
    defaultBpm: 60,
    defaultTargetReps: 20,
    schemaVersion: 1,
    sections: [{ id: 'section-a', title: 'Section A', order: 1 }],
    exercises: [
      {
        id: 'e1',
        number: 1,
        name: 'Ex 1',
        sectionId: 'section-a',
        pattern: [
          [{ sticking: 'R' }, { sticking: 'L' }, 'rest', { sticking: 'L' }],
          [{ sticking: 'L' }, { sticking: 'R' }, 'rest', { sticking: 'R' }],
        ],
        timeSignature: { numerator: 4, denominator: 4 },
        subdivision: '16th',
      },
    ],
  };
}

describe('validateExerciseSet — happy path', () => {
  it('accepts a well-formed set and maps the subdivision token', () => {
    const result = validateExerciseSet(makeValidRaw());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.set.exercises).toHaveLength(1);
    expect(result.set.exercises[0].subdivision).toBe('sixteenth');
  });

  it('maps every supported subdivision token', () => {
    const tokens: Array<[string, string]> = [
      ['quarter', 'quarter'],
      ['8th', 'eighth'],
      ['16th', 'sixteenth'],
      ['8th triplet', 'eighthTriplet'],
      ['16th triplet', 'sixteenthTriplet'],
    ];
    for (const [token, expected] of tokens) {
      const raw = makeValidRaw();
      (raw.exercises as Record<string, unknown>[])[0].subdivision = token;
      const result = validateExerciseSet(raw);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.set.exercises[0].subdivision).toBe(expected);
    }
  });

  it('migrates a v1 pattern to v2 (snare hits) and reports schemaVersion 2', () => {
    const result = validateExerciseSet(makeValidRaw());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.set.schemaVersion).toBe(2);
    expect(result.set.exercises[0].pattern).toEqual([
      [
        { voices: ['snare'], sticking: 'R' },
        { voices: ['snare'], sticking: 'L' },
        'rest',
        { voices: ['snare'], sticking: 'L' },
      ],
      [
        { voices: ['snare'], sticking: 'L' },
        { voices: ['snare'], sticking: 'R' },
        'rest',
        { voices: ['snare'], sticking: 'R' },
      ],
    ]);
  });

  it('keeps optional fields when present and omits them when absent', () => {
    const raw = makeValidRaw();
    const ex = (raw.exercises as Record<string, unknown>[])[0];
    ex.recommendedBpm = 80;
    ex.targetReps = 12;
    ex.notes = 'go slow';
    const result = validateExerciseSet(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.set.exercises[0].recommendedBpm).toBe(80);
    expect(result.set.exercises[0].targetReps).toBe(12);
    expect(result.set.exercises[0].notes).toBe('go slow');
  });
});

describe('validateExerciseSet — rejects malformed input with a clear reason', () => {
  const expectError = (raw: unknown, match: RegExp) => {
    const result = validateExerciseSet(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(match);
  };

  it('rejects non-objects (including arrays)', () => {
    expectError(null, /must be an object/);
    expectError([], /must be an object/);
  });

  it('rejects an empty or missing exercises array', () => {
    const raw = makeValidRaw();
    raw.exercises = [];
    expectError(raw, /exercises must be a non-empty array/);
    delete raw.exercises;
    expectError(raw, /exercises must be a non-empty array/);
  });

  it('rejects a missing set id', () => {
    const raw = makeValidRaw();
    delete raw.id;
    expectError(raw, /^id must be a non-empty string/);
  });

  it('rejects an unknown subdivision token (including internal keys)', () => {
    const raw = makeValidRaw();
    (raw.exercises as Record<string, unknown>[])[0].subdivision = 'sixteenth';
    expectError(raw, /exercises\[0\]\.subdivision must be one of/);
  });

  it('rejects an invalid pattern event, naming the (bar, index) path', () => {
    const raw = makeValidRaw();
    (raw.exercises as Record<string, unknown>[])[0].pattern = [
      [{ sticking: 'R' }, { sticking: 'X' }],
    ];
    expectError(raw, /exercises\[0\]\.pattern\[0\]\[1\]/);
  });

  it('rejects a flat (1D) pattern — outer array must hold bars', () => {
    const raw = makeValidRaw();
    (raw.exercises as Record<string, unknown>[])[0].pattern = [
      { sticking: 'R' },
      { sticking: 'L' },
    ];
    expectError(raw, /exercises\[0\]\.pattern\[0\] must be a non-empty array/);
  });

  it('rejects an exercise whose sectionId does not match any section', () => {
    const raw = makeValidRaw();
    (raw.exercises as Record<string, unknown>[])[0].sectionId = 'no-such';
    expectError(
      raw,
      /exercises\[0\]\.sectionId "no-such" does not match any section/,
    );
  });

  it('rejects a missing sections array', () => {
    const raw = makeValidRaw();
    delete raw.sections;
    expectError(raw, /sections must be a non-empty array/);
  });

  it('rejects duplicate section ids', () => {
    const raw = makeValidRaw();
    raw.sections = [
      { id: 'a', title: 'A', order: 1 },
      { id: 'a', title: 'Also A', order: 2 },
    ];
    expectError(raw, /sections\[1\]\.id "a" is duplicated/);
  });

  it('rejects bars of mismatched lengths', () => {
    const raw = makeValidRaw();
    (raw.exercises as Record<string, unknown>[])[0].pattern = [
      [{ sticking: 'R' }, { sticking: 'L' }],
      [{ sticking: 'R' }, { sticking: 'L' }, { sticking: 'R' }],
    ];
    expectError(raw, /pattern\[1\] has 3 events but .* has 2/);
  });

  it('rejects a missing or unsupported schemaVersion (accepts 1 and 2)', () => {
    const raw = makeValidRaw();
    delete raw.schemaVersion;
    expectError(raw, /schemaVersion must be 1 or 2/);
    raw.schemaVersion = 3;
    expectError(raw, /schemaVersion must be 1 or 2/);
    // 2 is valid — a missing pattern field is what fails here, not the version.
    raw.schemaVersion = 2;
    const result = validateExerciseSet(raw);
    expect(result.ok).toBe(false);
  });

  it('rejects a denominator that is not 2, 4, or 8', () => {
    const raw = makeValidRaw();
    (
      (raw.exercises as Record<string, unknown>[])[0].timeSignature as Record<
        string,
        unknown
      >
    ).denominator = 3;
    expectError(raw, /denominator must be 2, 4, or 8/);
  });

  it('rejects an unknown displayAs flag', () => {
    const raw = makeValidRaw();
    (
      (raw.exercises as Record<string, unknown>[])[0].timeSignature as Record<
        string,
        unknown
      >
    ).displayAs = 'square';
    expectError(raw, /displayAs must be "cut" or "common"/);
  });

  it('rejects a non-integer exercise number', () => {
    const raw = makeValidRaw();
    (raw.exercises as Record<string, unknown>[])[0].number = 1.5;
    expectError(raw, /exercises\[0\]\.number must be an integer/);
  });
});

describe('migrateStoredSet — repair pre-Phase-10 stored user sets', () => {
  /** A user set as it was stored in IndexedDB before the v2 schema: internal
   *  subdivision token, schemaVersion 1, pattern events lacking `voices`. */
  const v1Stored = (): ExerciseSet =>
    ({
      id: 'stick-control',
      title: 'Stick Control',
      source: 'GLS',
      defaultBpm: 80,
      defaultTargetReps: 20,
      schemaVersion: 1,
      sections: [{ id: 's', title: 'S', order: 1 }],
      exercises: [
        {
          id: 'e1',
          number: 1,
          name: 'Ex 1',
          sectionId: 's',
          timeSignature: { numerator: 4, denominator: 4 },
          subdivision: 'sixteenth',
          pattern: [[{ sticking: 'R' }, 'rest', { sticking: 'L' }]],
        },
      ],
      // The stored shape is structurally v1; cast through unknown for the test.
    }) as unknown as ExerciseSet;

  it('adds voices to v1 events and bumps the version', () => {
    const { set, changed } = migrateStoredSet(v1Stored());
    expect(changed).toBe(true);
    expect(set.schemaVersion).toBe(2);
    expect(set.exercises[0].pattern[0]).toEqual([
      { voices: ['snare'], sticking: 'R' },
      'rest',
      { voices: ['snare'], sticking: 'L' },
    ]);
  });

  it('leaves an already-v2 set untouched (no needless re-write)', () => {
    const v2: ExerciseSet = {
      ...v1Stored(),
      schemaVersion: 2,
      exercises: [
        {
          ...v1Stored().exercises[0],
          pattern: [[{ voices: ['snare'], sticking: 'R' }, 'rest']],
        },
      ],
    };
    const { set, changed } = migrateStoredSet(v2);
    expect(changed).toBe(false);
    expect(set).toBe(v2);
  });
});

describe('loadBundledSets — the bundled set(s)', () => {
  it('discovers and validates every JSON in src/data/exercises/', () => {
    const sets = loadBundledSets();
    expect(sets.length).toBeGreaterThanOrEqual(1);
    for (const set of sets) {
      expect(set.origin).toBe('bundled');
      expect(set.exercises.length).toBeGreaterThan(0);
      // sectionId foreign key must resolve for every exercise.
      const sectionIds = new Set(set.sections.map((s) => s.id));
      for (const ex of set.exercises) {
        expect(sectionIds.has(ex.sectionId)).toBe(true);
      }
    }
  });

  it('ships the foundational-rudiments set as the default bundled content', () => {
    const sets = loadBundledSets();
    expect(sets.some((s) => s.id === 'foundational-rudiments')).toBe(true);
  });
});

// --- v2 multi-voice schema (SPEC §12) ---------------------------------------

/** A minimal valid v2 raw set, mutable per test. */
function makeValidV2Raw(): Record<string, unknown> {
  return {
    id: 'v2-set',
    title: 'V2 Set',
    source: 'src',
    defaultBpm: 80,
    defaultTargetReps: 16,
    schemaVersion: 2,
    sections: [{ id: 's', title: 'S', order: 1 }],
    exercises: [
      {
        id: 'e1',
        number: 1,
        name: 'Groove',
        sectionId: 's',
        pattern: [
          [
            { voices: ['hihat-closed', 'kick'], sticking: 'R' },
            { voices: ['snare'], sticking: 'L', accent: true },
            'rest',
            { voices: ['kick'] },
          ],
        ],
        timeSignature: { numerator: 4, denominator: 4 },
        subdivision: '16th',
      },
    ],
  };
}

describe('validateExerciseSet — v2 multi-voice', () => {
  it('accepts multi-voice hits, accents, and foot voices without sticking', () => {
    const result = validateExerciseSet(makeValidV2Raw());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.set.schemaVersion).toBe(2);
    expect(result.set.exercises[0].pattern[0]).toEqual([
      { voices: ['hihat-closed', 'kick'], sticking: 'R' },
      { voices: ['snare'], sticking: 'L', accent: true },
      'rest',
      { voices: ['kick'] },
    ]);
  });

  /** Mutate the first event of the v2 fixture and assert it's rejected. */
  const expectFirstEventError = (event: unknown, match: RegExp) => {
    const raw = makeValidV2Raw();
    (raw.exercises as Record<string, unknown>[])[0] = {
      ...(raw.exercises as Record<string, unknown>[])[0],
      pattern: [[event]],
      timeSignature: { numerator: 1, denominator: 4 },
      subdivision: 'quarter',
    };
    const result = validateExerciseSet(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(match);
  };

  it('rejects an empty voices array', () => {
    expectFirstEventError({ voices: [], sticking: 'R' }, /voices must be a non-empty array/);
  });

  it('rejects an unknown voice', () => {
    expectFirstEventError({ voices: ['cowbell'], sticking: 'R' }, /must be a drum voice/);
  });

  it('allows omitting sticking on hand voices (optional)', () => {
    const raw = makeValidV2Raw();
    (raw.exercises as Record<string, unknown>[])[0] = {
      ...(raw.exercises as Record<string, unknown>[])[0],
      pattern: [[{ voices: ['snare'] }]],
      timeSignature: { numerator: 1, denominator: 4 },
      subdivision: 'quarter',
    };
    expect(validateExerciseSet(raw).ok).toBe(true);
  });

  it('forbids sticking when every voice is a foot voice', () => {
    expectFirstEventError({ voices: ['kick'], sticking: 'R' }, /sticking is not allowed/);
  });

  it('rejects a hit that is both accent and ghost', () => {
    expectFirstEventError(
      { voices: ['snare'], sticking: 'R', accent: true, ghost: true },
      /cannot be both accent and ghost/,
    );
  });

  it('rejects an unknown ornament', () => {
    expectFirstEventError(
      { voices: ['snare'], sticking: 'R', ornament: 'spin' },
      /ornament must be one of/,
    );
  });
});
