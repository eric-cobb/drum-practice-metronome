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
  Tremolo,
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

/** Vertical gap between consecutive tremolo slashes — VexFlow's `Tremolo.spacing`
 *  metric default (Metrics isn't re-exported, so it's inlined here). */
const TREMOLO_SPACING = 7;
/** Glyph size for the tremolo slashes — VexFlow's resolved `Tremolo.fontSize`
 *  (falls back to the global default of 30). */
const TREMOLO_FONT_SIZE = 30;
/** Extra stem length (px, on top of Stem.HEIGHT = 35) given to every note in a
 *  beam group that contains a buzz tremolo. The beam is anchored to the stem
 *  tips (Beam.getBeamYToDraw), so lengthening the whole group's stems lifts the
 *  beam and opens vertical room for the buzz slashes between it and the notehead
 *  — without tilting the beam (every stem in the group grows equally). */
const BUZZ_STEM_EXTRA_PX = 27;
/** Isolated (un-beamed) buzz notes show a flag instead of a beam; the flag is
 *  taller than a beam join, so they need a longer stem to seat the slashes below
 *  it. */
const BUZZ_STEM_EXTRA_FLAGGED_PX = 28;

/** A buzz tremolo positioned to clear whatever sits at the top of the stem:
 *
 *  - Beamed buzz: the beam-group stems are lifted (BUZZ_STEM_EXTRA_PX) so the
 *    beam rides high; drop the slashes a few spacings below it.
 *  - Flagged (isolated) buzz: there's no beam — a flag hangs off the top of the
 *    stem instead. Anchoring below the tip would put the slashes through the
 *    flag, so anchor them UP from the notehead, sitting the stack in the gap
 *    below the flag (the stem is lifted for room there too).
 *
 *  Mirrors stock Tremolo.draw; the inlined spacing/size are VexFlow's defaults. */
class BeamClearTremolo extends Tremolo {
  override draw(): void {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    const stemDirection = note.getStemDirection();
    const scale = note.getFontScale();
    const ySpacing = TREMOLO_SPACING * stemDirection * scale;
    const x =
      note.getAbsoluteX() +
      (stemDirection === Stem.UP
        ? note.getGlyphWidth() - Stem.WIDTH / 2
        : Stem.WIDTH / 2);
    const { topY, baseY } = note.getStemExtents();
    const beamed = (note as unknown as { beam?: unknown }).beam != null;
    let y = beamed ? topY + ySpacing * 3.2 : baseY - ySpacing * 4;
    this.fontInfo = { ...this.fontInfo, size: TREMOLO_FONT_SIZE * scale };
    for (let i = 0; i < this.num; i++) {
      this.renderText(ctx, x, y);
      y += ySpacing;
    }
  }
}

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

/** Grace-note config per non-buzz ornament (SPEC §12): flam = one slashed
 *  eighth grace; drag = two and ruff = three sixteenth graces (two beams),
 *  distinguished by count per rudimental convention. Buzz is NOT a grace — it's
 *  a tremolo on the main note (handled in applyModifiers). */
const ORNAMENT_GRACES: Record<
  Exclude<Ornament, 'buzz'>,
  { count: number; duration: string; slash: boolean }
> = {
  flam: { count: 1, duration: '8', slash: true },
  drag: { count: 2, duration: '16', slash: false },
  ruff: { count: 3, duration: '16', slash: false },
};

/** Build the ornament's grace-note group on the parent's line, beamed and with a
 *  slur to the main note. VexFlow positions the graces just left of the main
 *  notehead once the group is beamed (multi) and attached as a modifier. Returns
 *  null for buzz / no ornament. */
function buildGraceGroup(spec: PositionSpec, stemUp: boolean): GraceNoteGroup | null {
  if (!spec.ornament || spec.ornament === 'buzz') return null;
  const cfg = ORNAMENT_GRACES[spec.ornament];
  const key = spec.upKeys[0] ?? spec.downKeys[0] ?? 'c/5';
  const graces = Array.from(
    { length: cfg.count },
    () =>
      new GraceNote({
        keys: [key],
        duration: cfg.duration,
        slash: cfg.slash,
        stemDirection: stemUp ? Stem.UP : Stem.DOWN,
      }),
  );
  const group = new GraceNoteGroup(graces, true); // true = draw the slur to the main note
  if (cfg.count > 1) group.beamNotes();
  return group;
}

/** Attach the modifiers a hit can carry: sticking (below), accent and open-hat
 *  marks (above), ghost parentheses around the notehead, and an ornament grace
 *  group. `stickingYShift` clears the label past any down-stem voices. */
function applyModifiers(
  note: StaveNote,
  spec: PositionSpec,
  stickingYShift: number,
  stemUp: boolean,
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
  // Ornament: buzz → tremolo (3 stem slashes) on the main note; flam/drag/ruff
  // → a grace-note group to the note's left.
  if (spec.ornament === 'buzz') {
    note.addModifier(new BeamClearTremolo(3), 0);
  } else {
    const grace = buildGraceGroup(spec, stemUp);
    if (grace) note.addModifier(grace, 0);
  }
  if (spec.ghost) {
    // Parenthesize the notehead(s) to mark a ghost note (full-value, not grace).
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
    if (prim) applyModifiers(prim, spec, stickingYShift, upNote !== null);
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
  /** When true, render the ornament's name (flam/drag/ruff/buzz) under each
   *  ornamented note. An editor aid (the live preview) — Practice and Library
   *  leave it off so the staff stays clean. Defaults to false. */
  labelOrnaments?: boolean;
}

/** Draw the ornament's name under each ornamented note straight into the SVG
 *  (editor aid; see RenderOptions.labelOrnaments). Direct DOM injection rather
 *  than a VexFlow Annotation, because a second BOTTOM annotation collides with
 *  the sticking label's layout and renders nothing. `primary[i]` aligns with
 *  `specs[i]`. */
function injectOrnamentLabels(
  container: HTMLDivElement,
  specs: PositionSpec[],
  primary: (StaveNote | null)[],
  fallbackY: number,
): void {
  const svg = container.querySelector('svg');
  if (!svg) return;
  // Sit the label below the lowest sticking annotation rather than guessing the
  // 18px label's position. Sticking is a BOTTOM `.vf-annotation`; the open-hihat
  // ○ is a TOP one with a smaller y, so the max y is the lowest sticking.
  let stickingY = -Infinity;
  svg.querySelectorAll('.vf-annotation text').forEach((t) => {
    const ty = parseFloat(t.getAttribute('y') ?? '');
    if (Number.isFinite(ty)) stickingY = Math.max(stickingY, ty);
  });
  const labelY = (stickingY > -Infinity ? stickingY : fallbackY) + 15;

  // The render canvas is clipped to its viewBox (0 0 W 220); a label below the
  // staff would be cut off, so grow the SVG height + viewBox to fit it.
  const needed = labelY + 12;
  if (needed > parseFloat(svg.getAttribute('height') ?? '0')) {
    svg.setAttribute('height', String(needed));
    svg.style.height = `${needed}`;
    const vb = svg.getAttribute('viewBox')?.split(/\s+/);
    if (vb?.length === 4) {
      vb[3] = String(needed);
      svg.setAttribute('viewBox', vb.join(' '));
    }
  }

  const NS = 'http://www.w3.org/2000/svg';
  specs.forEach((spec, i) => {
    const note = primary[i];
    if (!spec.ornament || !note) return;
    const el = document.createElementNS(NS, 'text');
    el.setAttribute('x', String(note.getAbsoluteX() + note.getGlyphWidth() / 2));
    el.setAttribute('y', String(labelY));
    el.setAttribute('text-anchor', 'middle');
    // Color comes from the `.notation-svg .ornament-label` rule (a themed CSS
    // var), so it recolors live on a light/dark toggle — no inline fill, which
    // would bake in the color at render time.
    el.setAttribute('class', 'ornament-label');
    el.style.fontFamily = STICKING_FONT_FAMILY;
    el.style.fontSize = '13px';
    el.textContent = spec.ornament;
    svg.appendChild(el);
  });
}

export function renderExerciseNotation(
  container: HTMLDivElement,
  exercise: Exercise,
  width: number,
  options: RenderOptions = {},
): RenderResult {
  const interactive = options.interactive ?? true;
  const labelOrnaments = options.labelOrnaments ?? false;
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
      const upRuns = beamRuns(beamMask(specs, 'up'), beamGroup);
      // Buzz notes carry a tremolo whose slashes need vertical room. Lengthen
      // every stem in a run that holds one (and any un-beamed lone buzz) so the
      // beam lifts uniformly — see BUZZ_STEM_EXTRA_PX. up[i] aligns with specs[i].
      const buzzIdx = specs.flatMap((s, i) =>
        s.ornament === 'buzz' && s.upKeys.length > 0 ? [i] : [],
      );
      if (buzzIdx.length > 0) {
        // Beamed buzz: lift the whole run uniformly. The Beam re-syncs each
        // stem's drawn extension from the override when it formats, so setting
        // the length here is enough.
        const beamed = new Set<number>();
        for (const run of upRuns) {
          if (run.some((i) => buzzIdx.includes(i))) run.forEach((i) => beamed.add(i));
        }
        beamed.forEach((i) =>
          (up[i] as StaveNote).setStemLength(Stem.HEIGHT + BUZZ_STEM_EXTRA_PX),
        );
        // Isolated (flagged) buzz: no Beam to push the override into the stem, so
        // re-apply the stem direction to force the re-sync (safe — the note isn't
        // beamed). Lift more to clear the flag.
        for (const i of buzzIdx) {
          if (beamed.has(i)) continue;
          const n = up[i] as StaveNote;
          n.setStemLength(Stem.HEIGHT + BUZZ_STEM_EXTRA_FLAGGED_PX);
          n.setStemDirection(n.getStemDirection());
        }
      }
      const upBeams = upRuns.map(
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

      if (labelOrnaments) {
        injectOrnamentLabels(
          container,
          specs,
          primary,
          STAVE_Y + STAFF_LINE_SPACING * 4 + 50,
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
