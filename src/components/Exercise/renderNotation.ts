// VexFlow drawing for an exercise (SPEC §7, ARCHITECTURE §Notation). One Stave
// per bar placed side-by-side on a standard 5-line percussion staff, with the
// snare on the middle line (c/5). The first bar carries the percussion clef and
// the time signature glyph; subsequent bars are bare continuations.
//
// Each note's SVG `<g>` is tagged `note-{barIndex}-{noteIndex}` so the scheduler
// can highlight by direct DOM lookup, with no re-render per beat. Beam and
// tuplet grouping is computed per bar (beams don't cross bar lines).
//
// The whole draw is wrapped so malformed data surfaces an error instead of
// crashing (SPEC §7).

import {
  Annotation,
  Articulation,
  Barline,
  Beam,
  Formatter,
  GhostNote,
  GraceNote,
  GraceNoteGroup,
  Modifier,
  Parenthesis,
  Renderer,
  Stave,
  StaveNote,
  Stem,
  Tuplet,
  Voice,
} from 'vexflow';
import type { Note } from 'vexflow';
import type { Exercise, Ornament, TimeSignature } from '../../types';
import { getBeatGrouping } from '../../meter';
import {
  beamGroupSize,
  beamRuns,
  buildPositionSpecs,
  tupletGroupSize,
  tupletRuns,
  type PositionSpec,
} from './notationModel';

export type RenderResult = { ok: true } | { ok: false; error: string };

const PADDING_X = 12;
const STAVE_Y = 50;
const HEIGHT = 220;
const MIN_WIDTH = 320;
/** Approximate horizontal allocation VexFlow needs for the clef + time
 *  signature glyphs on the first bar of the line (scaled for the larger staff). */
const CLEF_AND_TS_WIDTH = 100;
/** Override VexFlow's default (10) so the staff feels present rather than modest
 *  on the canvas (DESIGN §Notation canvas). VexFlow scales noteheads, stems,
 *  beams, and the clef/time-sig glyphs proportionally to this. */
const STAFF_LINE_SPACING = 16;
/** Sticking labels match the rest of the UI's sans-serif and bump to 18px so
 *  they read clearly under the bigger staff (DESIGN §Notation canvas). */
const STICKING_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, system-ui, sans-serif';
const STICKING_FONT_SIZE = 18;
const STICKING_FONT_WEIGHT = '500';
/** Push the R/L labels down a bit so they don't sit flush against the lowest
 *  staff line. Positive y_shift moves the annotation downward in SVG space. */
const STICKING_Y_SHIFT_PX = 10;
/** When a bar has stems-down voices (kick, hi-hat foot), the labels must clear
 *  the down-stems/noteheads below the staff. */
const STICKING_Y_SHIFT_WITH_FEET_PX = 52;

/** VexFlow-renderable form of the time signature: "C|" for cut, "C" for
 *  common, otherwise "n/d". (DESIGN uses the ₵/C glyphs in UI strings, but
 *  VexFlow expects these specific tokens for its own glyph rendering.) */
function vexTimeSignature(ts: TimeSignature): string {
  if (ts.displayAs === 'cut') return 'C|';
  if (ts.displayAs === 'common') return 'C';
  return `${ts.numerator}/${ts.denominator}`;
}

function staveNote(keys: string[], duration: string, stemUp: boolean): StaveNote {
  return new StaveNote({
    keys,
    duration,
    clef: 'percussion',
    stemDirection: stemUp ? Stem.UP : Stem.DOWN,
  });
}

/** Grace-note count per ornament (SPEC §12): flam 1, drag 2, ruff 3. Buzz is
 *  approximated as a single slashed grace (the true z-notehead is a later
 *  refinement). */
const ORNAMENT_GRACE_COUNT: Record<Ornament, number> = {
  flam: 1,
  drag: 2,
  ruff: 3,
  buzz: 1,
};

/** Build the ornament's grace-note group on the parent's primary line. */
function buildGraceGroup(spec: PositionSpec): GraceNoteGroup | null {
  if (!spec.ornament) return null;
  const key = spec.upKeys[0] ?? spec.downKeys[0] ?? 'c/5';
  const count = ORNAMENT_GRACE_COUNT[spec.ornament];
  const single = count === 1;
  const graces = Array.from(
    { length: count },
    () => new GraceNote({ keys: [key], duration: single ? '8' : '16', slash: single }),
  );
  const group = new GraceNoteGroup(graces, false);
  if (count > 1) group.beamNotes();
  return group;
}

/** Attach the modifiers a hit can carry: sticking (below), accent and open-hat
 *  marks (above), ghost parentheses around the notehead, and an ornament grace
 *  group. `stickingYShift` clears the label past any down-stem voices. */
function applyModifiers(
  note: StaveNote,
  spec: PositionSpec,
  stickingYShift: number,
): void {
  if (spec.sticking) {
    note.addModifier(
      new Annotation(spec.sticking)
        .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
        .setFont(STICKING_FONT_FAMILY, STICKING_FONT_SIZE, STICKING_FONT_WEIGHT)
        .setYShift(stickingYShift),
      0,
    );
  }
  if (spec.accent) {
    note.addModifier(new Articulation('a>').setPosition(Modifier.Position.ABOVE), 0);
  }
  if (spec.hihatOpen) {
    // Open hi-hat: a small ○ above the note. VexFlow's articulation table has no
    // open-circle code, so render it as a text annotation rather than an
    // (invisible) unknown articulation.
    note.addModifier(
      new Annotation('○')
        .setVerticalJustification(Annotation.VerticalJustify.TOP)
        .setFont(STICKING_FONT_FAMILY, 13, 'normal'),
      0,
    );
  }
  const grace = buildGraceGroup(spec);
  if (grace) note.addModifier(grace, 0);
  if (spec.ghost) {
    // Parenthesize the notehead(s) to mark a ghost note.
    Parenthesis.buildAndAttach([note]);
  }
}

interface BarVoices {
  /** Stems-up notes, one tickable per position (StaveNote or GhostNote spacer). */
  up: Note[];
  /** Stems-down notes, or null when the bar has no foot/down voices (single-voice). */
  down: Note[] | null;
  /** The note to highlight per position (the up note, else the down note); null
   *  for rests. */
  primary: (StaveNote | null)[];
}

/** Split a bar's positions into stems-up and stems-down VexFlow voices, filling
 *  the empty side of each position with a GhostNote so the two voices stay
 *  aligned in time (ARCHITECTURE multi-voice rendering). A bar with no down
 *  voices renders as a single voice (the v1 snare path). */
function buildBarVoices(specs: PositionSpec[]): BarVoices {
  const hasDown = specs.some((s) => !s.isRest && s.downKeys.length > 0);
  const stickingYShift = hasDown
    ? STICKING_Y_SHIFT_WITH_FEET_PX
    : STICKING_Y_SHIFT_PX;
  const up: Note[] = [];
  const down: Note[] = [];
  const primary: (StaveNote | null)[] = [];

  for (const spec of specs) {
    if (spec.isRest) {
      up.push(
        new StaveNote({
          keys: ['c/5'],
          duration: `${spec.duration}r`,
          clef: 'percussion',
        }),
      );
      if (hasDown) down.push(new GhostNote(spec.duration));
      primary.push(null);
      continue;
    }

    let upNote: StaveNote | null = null;
    if (spec.upKeys.length > 0) {
      upNote = staveNote(spec.upKeys, spec.duration, true);
      up.push(upNote);
    } else if (hasDown) {
      up.push(new GhostNote(spec.duration));
    }

    let downNote: StaveNote | null = null;
    if (spec.downKeys.length > 0) {
      downNote = staveNote(spec.downKeys, spec.duration, false);
      down.push(downNote);
    } else if (hasDown) {
      down.push(new GhostNote(spec.duration));
    }

    const prim = upNote ?? downNote;
    if (prim) applyModifiers(prim, spec, stickingYShift);
    primary.push(prim);
  }

  return { up, down: hasDown ? down : null, primary };
}

/** Beam mask for one voice: a position is "rest-like" (breaks beams) when it's a
 *  rest or has no note on that voice's side. */
function beamMask(
  specs: PositionSpec[],
  side: 'up' | 'down',
): { isRest: boolean }[] {
  return specs.map((s) => ({
    isRest: s.isRest || (side === 'up' ? s.upKeys.length : s.downKeys.length) === 0,
  }));
}

/** Inject a `<g class="band-layer">` of `<rect class="highlight-band">` elements
 *  behind the notes (one per non-rest note). The rects start invisible
 *  (opacity 0); the Notation component toggles opacity on the scheduler's
 *  `note` events so they form the peripheral layer of the three-layer active-
 *  note highlight (DESIGN/ARCHITECTURE §Active note highlight). Inserting the
 *  group as the SVG's first child renders it behind the staff + notes; the
 *  CSS fill carries the sky tint and themes via --notation-active. */
function injectBandLayer(
  container: HTMLDivElement,
  bars: { stave: Stave; primary: (StaveNote | null)[] }[],
): void {
  const svg = container.querySelector('svg');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(ns, 'g');
  layer.setAttribute('class', 'band-layer');
  svg.insertBefore(layer, svg.firstChild);

  bars.forEach(({ stave, primary }, barIndex) => {
    const yTop = stave.getYForLine(0) - 4;
    const yBottom = stave.getYForLine(4) + 4;
    const height = yBottom - yTop;
    primary.forEach((note, noteIndex) => {
      if (!note) return;
      const noteX = note.getAbsoluteX();
      const band = document.createElementNS(ns, 'rect');
      band.setAttribute('id', `band-${barIndex}-${noteIndex}`);
      band.setAttribute('class', 'highlight-band');
      band.setAttribute('x', String(noteX - 8));
      band.setAttribute('y', String(yTop));
      band.setAttribute('width', '16');
      band.setAttribute('height', String(height));
      band.setAttribute('rx', '3');
      band.setAttribute('opacity', '0');
      layer.appendChild(band);
    });
  });
}

interface RenderOptions {
  /** When false, skip the per-note `id` tagging and the band layer used by the
   *  active-note highlight. Library previews render many notations at once;
   *  without this they'd duplicate the global `note-{bar}-{note}` ids and could
   *  steal the live Practice highlight's lookups. Defaults to true. */
  interactive?: boolean;
}

export function renderExerciseNotation(
  container: HTMLDivElement,
  exercise: Exercise,
  width: number,
  options: RenderOptions = {},
): RenderResult {
  const interactive = options.interactive ?? true;
  // Clear any prior render first (also keeps React StrictMode's double-invoke
  // from stacking two SVGs).
  container.replaceChildren();

  try {
    const usableWidth = Math.max(MIN_WIDTH, Math.floor(width));
    const ts = exercise.timeSignature;
    const { isCompound } = getBeatGrouping(ts);
    const bars = exercise.pattern;
    const barCount = bars.length;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(usableWidth, HEIGHT);
    container.querySelector('svg')?.classList.add('notation-svg');
    const ctx = renderer.getContext();

    // Captured after each bar draws; used in a second pass below to inject the
    // band-layer rects that back the active-note highlight (DESIGN §Active note
    // highlight, three-layer treatment). The band's geometry depends on the
    // formatted note positions, which aren't known until after `voice.draw`.
    const barLayouts: { stave: Stave; primary: (StaveNote | null)[] }[] = [];

    // Previews (interactive: false) omit the clef + time signature: at card
    // scale they're not informative, and reserving width for them on bar 0
    // unevenly compresses the later measures. Dropping them lets every measure
    // share the width equally.
    const clefTsWidth = interactive ? CLEF_AND_TS_WIDTH : 0;

    // Width allocation: the clef + time sig (when shown) live only on bar 0; the
    // remaining width is shared equally among bars for their note area.
    const totalNoteArea = usableWidth - PADDING_X * 2 - clefTsWidth;
    const barWidth = Math.max(80, Math.floor(totalNoteArea / barCount));
    const beamGroup = beamGroupSize(
      exercise.subdivision,
      isCompound,
      ts.denominator,
    );
    const tupletGroup = tupletGroupSize(exercise.subdivision);

    bars.forEach((bar, barIndex) => {
      const isFirst = barIndex === 0;
      const staveX = isFirst
        ? PADDING_X
        : PADDING_X + clefTsWidth + barWidth * barIndex;
      const staveWidth = isFirst ? barWidth + clefTsWidth : barWidth;

      // VexFlow 5 expects camelCase here; the ARCHITECTURE doc uses the v4
      // snake_case (`spacing_between_lines_px`) — same option, just renamed.
      const stave = new Stave(staveX, STAVE_Y, staveWidth, {
        spacingBetweenLinesPx: STAFF_LINE_SPACING,
      });
      if (isFirst && interactive) {
        stave.setClef('percussion'); // standard 5-line percussion clef
        stave.addTimeSignature(vexTimeSignature(ts));
      } else if (!isFirst) {
        // Avoid a double bar line at the join with the previous bar.
        stave.setBegBarType(Barline.type.NONE);
      }
      stave.setContext(ctx).draw();

      const specs = buildPositionSpecs(bar, exercise.subdivision);
      const { up, down, primary } = buildBarVoices(specs);

      const newVoice = () =>
        new Voice({ numBeats: ts.numerator, beatValue: ts.denominator }).setStrict(
          false,
        );
      const upVoice = newVoice().addTickables(up);
      const voices = [upVoice];
      let downVoice: Voice | null = null;
      if (down) {
        downVoice = newVoice().addTickables(down);
        voices.push(downVoice);
      }

      // Beam each voice over its own real notes; tuplets only on the single-voice
      // path (multi-voice triplets are a later refinement).
      // The masks exclude ghost/rest positions, so these indices are all real
      // StaveNotes (cast from the Note[] tickable arrays).
      const upBeams = beamRuns(beamMask(specs, 'up'), beamGroup).map(
        (run) => new Beam(run.map((i) => up[i] as StaveNote)),
      );
      const downBeams =
        down === null
          ? []
          : beamRuns(beamMask(specs, 'down'), beamGroup).map(
              (run) => new Beam(run.map((i) => down[i] as StaveNote)),
            );
      const tuplets =
        down === null
          ? tupletRuns(specs, tupletGroup).map(
              (run) => new Tuplet(run.map((i) => up[i] as StaveNote)),
            )
          : [];

      new Formatter().joinVoices(voices).formatToStave(voices, stave);
      voices.forEach((v) => v.draw(ctx, stave));
      [...upBeams, ...downBeams].forEach((beam) => beam.setContext(ctx).draw());
      tuplets.forEach((tuplet) => tuplet.setContext(ctx).draw());

      // Tag the highlighted note per position with its (barIndex, noteIndex) for
      // the highlight lookup (ARCHITECTURE §Note index tracking). Skipped for
      // non-interactive previews to avoid duplicate global ids.
      if (interactive) {
        primary.forEach((note, noteIndex) =>
          note?.getSVGElement()?.setAttribute('id', `note-${barIndex}-${noteIndex}`),
        );
      }

      barLayouts.push({ stave, primary });
    });

    if (interactive) injectBandLayer(container, barLayouts);

    return { ok: true };
  } catch (err) {
    container.replaceChildren();
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
