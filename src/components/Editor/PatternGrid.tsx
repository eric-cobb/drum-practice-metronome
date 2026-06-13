import { useMemo } from 'react';
import { useEditorStore } from '../../state/editor';
import { getBeatGrouping, subdivisionsPerPulse } from '../../meter';
import type { Exercise, Ornament } from '../../types';
import { cn } from '../ui';

const ORNAMENT_ABBR: Record<Ornament, string> = {
  flam: 'fl',
  drag: 'dr',
  ruff: 'rf',
  buzz: 'bz',
};

const CELL = 'h-9 w-9 shrink-0 text-sm tabular-nums';
const ROW_LABEL =
  'flex h-9 items-center justify-end pr-3 text-xs font-medium text-fg-tertiary';

interface Column {
  bar: number;
  pos: number;
  isBarStart: boolean;
  isBeatStart: boolean;
}

/** The visual sticking/dynamics grid for one exercise (Phase 11, snare-only).
 *  Rows = Stroke / Accent / Ghost / Ornament; columns = note positions grouped
 *  by beat and bar. Every cell is a button that cycles or toggles via the editor
 *  store; the live notation preview reflects edits immediately. */
export function PatternGrid({ exercise }: { exercise: Exercise }) {
  const cellStroke = useEditorStore((s) => s.cellStroke);
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

  const eventAt = (c: Column) => exercise.pattern[c.bar][c.pos];

  // A vertical separator at bar starts (strong) and beat starts (subtle).
  const sep = (c: Column, first: boolean) =>
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
                'flex h-5 w-9 shrink-0 items-center justify-center text-[10px] text-fg-muted',
                sep(c, i === 0),
              )}
            >
              {c.isBeatStart ? c.pos + 1 : ''}
            </div>
          ))}
        </div>

        {/* Stroke row */}
        <div className="flex items-center">
          <div className={ROW_LABEL}>Stroke</div>
          {columns.map((c, i) => {
            const ev = eventAt(c);
            const isHit = ev !== 'rest';
            const label = isHit ? (ev.sticking ?? '•') : '·';
            return (
              <div key={`${c.bar}-${c.pos}`} className={cn(sep(c, i === 0))}>
                <button
                  type="button"
                  onClick={() => cellStroke(c.bar, c.pos)}
                  aria-label={`Position ${c.pos + 1}${c.bar > 0 ? ` bar ${c.bar + 1}` : ''}: ${isHit ? `snare ${ev.sticking}` : 'rest'} — click to cycle`}
                  className={cn(
                    CELL,
                    'rounded-[7px] font-semibold transition',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isHit
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

        {/* Accent row */}
        <CellRow
          label="Accent"
          columns={columns}
          sep={sep}
          render={(c) => {
            const ev = eventAt(c);
            const on = ev !== 'rest' && !!ev.accent;
            return {
              disabled: ev === 'rest',
              on,
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
            const on = ev !== 'rest' && !!ev.ghost;
            return {
              disabled: ev === 'rest',
              on,
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
  sep: (c: Column, first: boolean) => string;
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
