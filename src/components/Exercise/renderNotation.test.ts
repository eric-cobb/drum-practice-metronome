// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { renderExerciseNotation } from './renderNotation';
import { loadBundledSets } from '../../data/loadExerciseSet';
import type { Exercise, PatternEvent, Sticking } from '../../types';

/** Build a pattern from a compact string: "R"/"L" = snare hits, "-" = rest. */
const ev = (s: string): PatternEvent[] =>
  [...s].map((c) =>
    c === '-' ? 'rest' : { voices: ['snare'], sticking: c as Sticking },
  );

beforeAll(() => {
  // jsdom ships no <canvas>; give VexFlow a minimal 2D context stub so its text
  // measurement doesn't log "getContext not implemented" on every render. The
  // real browser uses a real canvas; here we only assert SVG structure.
  const stub = { font: '', measureText: () => ({ width: 0 }) };
  HTMLCanvasElement.prototype.getContext = (() =>
    stub) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('renderExerciseNotation', () => {
  it('renders an SVG for every bundled exercise without throwing', () => {
    const sets = loadBundledSets();
    expect(sets.length).toBeGreaterThanOrEqual(1);

    const allExercises = sets.flatMap((s) => s.exercises);
    for (const exercise of allExercises) {
      const container = document.createElement('div');
      const r = renderExerciseNotation(container, exercise, 640);
      expect(r.ok, `exercise ${exercise.id}`).toBe(true);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.childElementCount ?? 0).toBeGreaterThan(0);
    }
  });

  it('handles a pattern containing rests across multiple bars', () => {
    const exercise: Exercise = {
      id: 'rest-test',
      number: 1,
      name: 'With rests',
      sectionId: 'main',
      pattern: [ev('R-L-R-L-'), ev('-R-L-R-L')],
      timeSignature: { numerator: 2, denominator: 4 },
      subdivision: 'eighth',
    };
    const container = document.createElement('div');
    expect(renderExerciseNotation(container, exercise, 640).ok).toBe(true);
    expect(container.querySelector('svg')).not.toBeNull();
    // Two bars render side-by-side as a single SVG.
  });

  it('handles triplet subdivisions (best-effort tuplets)', () => {
    const exercise: Exercise = {
      id: 'triplet-test',
      number: 1,
      name: 'Triplets',
      sectionId: 'main',
      pattern: [ev('RLRLRLRLRLRL')],
      timeSignature: { numerator: 4, denominator: 4 },
      subdivision: 'eighthTriplet',
    };
    const container = document.createElement('div');
    expect(renderExerciseNotation(container, exercise, 480).ok).toBe(true);
  });

  it('renders a multi-voice bar (hands up, kick down) with accents', () => {
    const exercise: Exercise = {
      id: 'mv-test',
      number: 1,
      name: 'Groove',
      sectionId: 'main',
      pattern: [
        [
          { voices: ['hihat-closed', 'kick'], sticking: 'R' },
          { voices: ['hihat-closed'], sticking: 'R' },
          { voices: ['hihat-closed', 'snare'], sticking: 'R', accent: true },
          { voices: ['hihat-closed'], sticking: 'R' },
        ],
      ],
      timeSignature: { numerator: 2, denominator: 4 },
      subdivision: 'eighth',
    };
    const container = document.createElement('div');
    expect(renderExerciseNotation(container, exercise, 640).ok).toBe(true);
    expect(container.querySelector('svg')).not.toBeNull();
    // One highlight band per non-rest position (all 4 here), confirming the
    // multi-voice bar formatted and laid out without throwing.
    expect(container.querySelectorAll('.band-layer rect')).toHaveLength(4);
  });

  it('renders ghosts, ornaments, and an open hi-hat without throwing', () => {
    const exercise: Exercise = {
      id: 'orn-test',
      number: 1,
      name: 'Ornaments',
      sectionId: 'main',
      pattern: [
        [
          { voices: ['snare'], sticking: 'R', accent: true, ornament: 'flam' },
          { voices: ['snare'], sticking: 'L', ghost: true },
          { voices: ['snare'], sticking: 'R', ornament: 'drag' },
          { voices: ['hihat-open'] },
        ],
      ],
      timeSignature: { numerator: 2, denominator: 4 },
      subdivision: 'eighth',
    };
    const container = document.createElement('div');
    expect(renderExerciseNotation(container, exercise, 640).ok).toBe(true);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('parenthesizes ghost noteheads (more glyphs than a plain note)', () => {
    const make = (ghost: boolean): Exercise => ({
      id: ghost ? 'g' : 'p',
      number: 1,
      name: 'x',
      sectionId: 'main',
      pattern: [[{ voices: ['snare'], sticking: 'R', ghost }]],
      timeSignature: { numerator: 1, denominator: 4 },
      subdivision: 'quarter',
    });
    const count = (ex: Exercise) => {
      const c = document.createElement('div');
      renderExerciseNotation(c, ex, 400);
      return c.querySelectorAll('svg *').length;
    };
    // The two parentheses add rendered elements the plain note doesn't have.
    expect(count(make(true))).toBeGreaterThan(count(make(false)));
  });

  it('clears the container on re-render (no stacked SVGs)', () => {
    const sets = loadBundledSets();
    const set = sets[0];
    if (!set || set.exercises.length < 2) return;
    const container = document.createElement('div');
    renderExerciseNotation(container, set.exercises[0], 640);
    renderExerciseNotation(container, set.exercises[1], 640);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('injects a band layer with one rect per non-rest note', () => {
    // Two-bar pattern: bar 0 has 4 hits + 4 rests, bar 1 has all hits — total
    // of 12 non-rest events that should each get a band rect, and the rests
    // should NOT (DESIGN/ARCHITECTURE §Active note highlight).
    const exercise: Exercise = {
      id: 'band-test',
      number: 1,
      name: 'Bands',
      sectionId: 'main',
      pattern: [ev('R-L-R-L-'), ev('RLRLRLRL')],
      timeSignature: { numerator: 2, denominator: 4 },
      subdivision: 'eighth',
    };
    const container = document.createElement('div');
    expect(renderExerciseNotation(container, exercise, 640).ok).toBe(true);

    const bandLayer = container.querySelector('svg > g.band-layer');
    expect(bandLayer).not.toBeNull();
    const bands = bandLayer?.querySelectorAll('rect.highlight-band') ?? [];
    expect(bands).toHaveLength(12);
    // Each band has a stable id the highlighter can address, starts hidden,
    // and has the 16×band-height geometry from the spec.
    for (const band of bands) {
      expect(band.id).toMatch(/^band-\d+-\d+$/);
      expect(band.getAttribute('opacity')).toBe('0');
      expect(band.getAttribute('width')).toBe('16');
    }
    // The band layer is the first <g> child so it renders behind the notes.
    const svg = container.querySelector('svg');
    expect(svg?.firstElementChild).toBe(bandLayer);
  });
});
