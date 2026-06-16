import { useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '../../state/editor';
import { getBeatGrouping, subdivisionsPerPulse } from '../../meter';
import { VOICE_ORDER, VOICE_LABEL, orderVoices } from './editorModel';
import type { Exercise, Ornament, Voice } from '../../types';
import { cn } from '../ui';

const ORNAMENT_ABBR: Record<Ornament, string> = {
  flam: 'fl',
  drag: 'dr',
  ruff: 'rf',
  buzz: 'bz',
};

// 44px tap targets on touch screens (SPEC §10); a touch more compact on desktop.
const CELL = 'h-11 w-11 sm:h-9 sm:w-9 shrink-0 text-sm tabular-nums';
// Fixed width (matches the position-number row's spacer) so every row's cells
// start at the same x — otherwise the varying label widths ("Stroke" vs "Orn.")
// shift each row's columns out of alignment.
const ROW_LABEL =
  'flex h-9 w-16 shrink-0 items-center justify-end pr-3 text-xs font-medium text-fg-tertiary';

interface Column {
  bar: number;
  pos: number;
  isBarStart: boolean;
  isBeatStart: boolean;
}

type Sep = (c: Column, first: boolean) => string;
type EventAt = (c: Column) => Exercise['pattern'][number][number];

/** The visual sticking/voice grid for one exercise (Phase 11). Rows: one Snare
 *  lane (cycles the snare's sticking, rest → R → L → rest), one toggle lane per
 *  other voice in the exercise (hi-hat, kick, toms, cymbals…), an "Add voice"
 *  control, then the per-position Accent / Ghost / Ornament modifier rows.
 *  Columns are note positions grouped by beat and bar; the live notation preview
 *  reflects edits immediately. */
export function PatternGrid({ exercise }: { exercise: Exercise }) {
  const cellStroke = useEditorStore((s) => s.cellStroke);
  const cellVoice = useEditorStore((s) => s.cellVoice);
  const cellAccent = useEditorStore((s) => s.cellAccent);
  const cellGhost = useEditorStore((s) => s.cellGhost);
  const cellOrnament = useEditorStore((s) => s.cellOrnament);

  const columns = useMemo<Column[]>(() => {
    const { isCompound } = getBeatGrouping(exercise.timeSignature);
    const perPulse = subdivisionsPerPulse(
      exercise.subdivision,
      isCompound,
      exercise.timeSignature.denominator,
    );
    const cols: Column[] = [];
    exercise.pattern.forEach((bar, barIndex) => {
      bar.forEach((_, pos) => {
        cols.push({
          bar: barIndex,
          pos,
          isBarStart: pos === 0,
          isBeatStart: pos % perPulse === 0,
        });
      });
    });
    return cols;
  }, [exercise.pattern, exercise.timeSignature, exercise.subdivision]);

  // Non-snare voices used anywhere in the pattern (the snare has its own lane).
  const presentVoices = useMemo<Voice[]>(() => {
    const set = new Set<Voice>();
    exercise.pattern.forEach((bar) =>
      bar.forEach((ev) => {
        if (ev !== 'rest') {
          for (const v of ev.voices) if (v !== 'snare') set.add(v);
        }
      }),
    );
    return orderVoices([...set]);
  }, [exercise.pattern]);

  // Voice rows the user added via "Add voice" but hasn't filled in yet. Reset
  // when switching exercises (rows then reflect what that exercise actually uses).
  const [added, setAdded] = useState<Voice[]>([]);
  useEffect(() => setAdded([]), [exercise.id]);

  const nonSnareLanes = useMemo<Voice[]>(
    () => orderVoices([...new Set<Voice>([...presentVoices, ...added])]),
    [presentVoices, added],
  );
  const addable = VOICE_ORDER.filter(
    (v) => v !== 'snare' && !nonSnareLanes.includes(v),
  );

  // Lanes in canonical staff order: the Snare lane sits at the snare's slot,
  // each shown non-snare voice gets a toggle lane.
  const lanes = VOICE_ORDER.flatMap<
    { kind: 'snare' } | { kind: 'voice'; voice: Voice }
  >((v) => {
    if (v === 'snare') return [{ kind: 'snare' }];
    return nonSnareLanes.includes(v) ? [{ kind: 'voice', voice: v }] : [];
  });

  const eventAt: EventAt = (c) => exercise.pattern[c.bar][c.pos];

  // A vertical separator at bar starts (strong) and beat starts (subtle).
  const sep: Sep = (c, first) =>
    first
      ? ''
      : c.isBarStart
        ? 'border-l-2 border-fg/25 ml-1 pl-1'
        : c.isBeatStart
          ? 'border-l border-fg/10'
          : '';

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-full flex-col gap-1">
        {/* Position numbers (per-bar, beat-aligned) */}
        <div className="flex items-end">
          <div className="w-16 shrink-0" />
          {columns.map((c, i) => (
            <div
              key={`${c.bar}-${c.pos}`}
              className={cn(
                'flex h-5 w-11 shrink-0 items-center justify-center text-[10px] text-fg-muted sm:w-9',
                sep(c, i === 0),
              )}
            >
              {c.isBeatStart ? c.pos + 1 : ''}
            </div>
          ))}
        </div>

        {/* Voice lanes (Snare = sticking cycle; others = on/off toggles) */}
        {lanes.map((lane) =>
          lane.kind === 'snare' ? (
            <SnareLane
              key="snare"
              columns={columns}
              sep={sep}
              eventAt={eventAt}
              onCell={cellStroke}
            />
          ) : (
            <VoiceLane
              key={lane.voice}
              voice={lane.voice}
              columns={columns}
              sep={sep}
              eventAt={eventAt}
              onCell={cellVoice}
            />
          ),
        )}

        {/* Add a voice row */}
        {addable.length > 0 && (
          <div className="flex items-center">
            <div className={ROW_LABEL} />
            <select
              aria-label="Add voice"
              value=""
              onChange={(e) => {
                const v = e.target.value as Voice;
                if (v) setAdded((a) => [...a, v]);
              }}
              className="surface-deep h-8 rounded-[7px] px-2 text-xs text-fg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="" disabled>
                + Add voice…
              </option>
              {addable.map((v) => (
                <option key={v} value={v}>
                  {VOICE_LABEL[v]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="my-1 h-px bg-fg/10" />

        {/* Accent row */}
        <CellRow
          label="Accent"
          columns={columns}
          sep={sep}
          render={(c) => {
            const ev = eventAt(c);
            return {
              disabled: ev === 'rest',
              on: ev !== 'rest' && !!ev.accent,
              glyph: '>',
              onClick: () => cellAccent(c.bar, c.pos),
              aria: `Accent at position ${c.pos + 1}`,
            };
          }}
        />

        {/* Ghost row */}
        <CellRow
          label="Ghost"
          columns={columns}
          sep={sep}
          render={(c) => {
            const ev = eventAt(c);
            return {
              disabled: ev === 'rest',
              on: ev !== 'rest' && !!ev.ghost,
              glyph: '( )',
              small: true,
              onClick: () => cellGhost(c.bar, c.pos),
              aria: `Ghost note at position ${c.pos + 1}`,
            };
          }}
        />

        {/* Ornament row */}
        <CellRow
          label="Orn."
          columns={columns}
          sep={sep}
          render={(c) => {
            const ev = eventAt(c);
            const orn = ev !== 'rest' ? ev.ornament : undefined;
            return {
              disabled: ev === 'rest',
              on: !!orn,
              glyph: orn ? ORNAMENT_ABBR[orn] : '–',
              small: true,
              onClick: () => cellOrnament(c.bar, c.pos),
              aria: `Ornament at position ${c.pos + 1}${orn ? `: ${orn}` : ''} — click to cycle`,
            };
          }}
        />
      </div>
    </div>
  );
}

/** The snare lane: cycles the snare's sticking (rest → R → L → rest) while
 *  preserving any other voices in the hit. */
function SnareLane({
  columns,
  sep,
  eventAt,
  onCell,
}: {
  columns: Column[];
  sep: Sep;
  eventAt: EventAt;
  onCell: (bar: number, pos: number) => void;
}) {
  return (
    <div className="flex items-center">
      <div className={ROW_LABEL}>Snare</div>
      {columns.map((c, i) => {
        const ev = eventAt(c);
        const hasSnare = ev !== 'rest' && ev.voices.includes('snare');
        const label = hasSnare ? (ev.sticking ?? '•') : '·';
        return (
          <div key={`${c.bar}-${c.pos}`} className={cn(sep(c, i === 0))}>
            <button
              type="button"
              onClick={() => onCell(c.bar, c.pos)}
              aria-label={`Snare at position ${c.pos + 1}${c.bar > 0 ? ` bar ${c.bar + 1}` : ''}: ${
                hasSnare ? (ev.sticking ?? 'no sticking') : 'off'
              } — click to cycle`}
              className={cn(
                CELL,
                'rounded-[7px] font-semibold transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                hasSnare
                  ? 'surface-deep text-fg hover:brightness-110'
                  : 'text-fg-muted hover:bg-fg/5',
              )}
            >
              {label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** A non-snare voice lane: each cell toggles that voice on/off at the position. */
function VoiceLane({
  voice,
  columns,
  sep,
  eventAt,
  onCell,
}: {
  voice: Voice;
  columns: Column[];
  sep: Sep;
  eventAt: EventAt;
  onCell: (bar: number, pos: number, voice: Voice) => void;
}) {
  return (
    <div className="flex items-center">
      <div className={ROW_LABEL}>{VOICE_LABEL[voice]}</div>
      {columns.map((c, i) => {
        const ev = eventAt(c);
        const on = ev !== 'rest' && ev.voices.includes(voice);
        return (
          <div key={`${c.bar}-${c.pos}`} className={cn(sep(c, i === 0))}>
            <button
              type="button"
              onClick={() => onCell(c.bar, c.pos, voice)}
              aria-pressed={on}
              aria-label={`${VOICE_LABEL[voice]} at position ${c.pos + 1}${c.bar > 0 ? ` bar ${c.bar + 1}` : ''}: ${on ? 'on' : 'off'}`}
              className={cn(
                CELL,
                'rounded-[7px] text-base transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                on
                  ? 'bg-accent/20 text-accent'
                  : 'text-fg-muted hover:bg-fg/5',
              )}
            >
              {on ? '●' : '·'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface CellSpec {
  disabled: boolean;
  on: boolean;
  glyph: string;
  small?: boolean;
  onClick: () => void;
  aria: string;
}

/** A toggle/cycle row (Accent / Ghost / Ornament) sharing the grid geometry. */
function CellRow({
  label,
  columns,
  sep,
  render,
}: {
  label: string;
  columns: Column[];
  sep: Sep;
  render: (c: Column) => CellSpec;
}) {
  return (
    <div className="flex items-center">
      <div className={ROW_LABEL}>{label}</div>
      {columns.map((c, i) => {
        const spec = render(c);
        return (
          <div key={`${c.bar}-${c.pos}`} className={cn(sep(c, i === 0))}>
            <button
              type="button"
              onClick={spec.onClick}
              disabled={spec.disabled}
              aria-label={spec.aria}
              aria-pressed={spec.on}
              className={cn(
                CELL,
                'rounded-[7px] transition disabled:opacity-25',
                spec.small ? 'text-xs' : 'text-base font-bold',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                spec.on
                  ? 'bg-accent/20 text-accent'
                  : 'text-fg-tertiary hover:bg-fg/5',
              )}
            >
              {spec.glyph}
            </button>
          </div>
        );
      })}
    </div>
  );
}
