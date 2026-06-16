// Free-mode metronome config persistence (SPEC §8). Exercise mode persists its
// settings per-set (see exercises.ts SetState); Free mode had nothing, so a
// reload reset BPM / time signature / subdivision / accent pattern to defaults.
// This saves the Free-mode config and restores it at startup. Validated on read,
// since corrupt localStorage must not feed a bad subdivision/denominator into
// the scheduler (applyConfig clamps numeric ranges but not the enums).

import { readLocal, writeLocal } from '../storage';
import {
  SUBDIVISION_ORDER,
  type Denominator,
  type MetronomeConfig,
  type Subdivision,
  type TimeSignature,
} from '../types';

const KEY = 'metronome-free-config';

/** The subset of the metronome config we persist for Free mode. */
type FreeConfig = Pick<
  MetronomeConfig,
  'bpm' | 'timeSignature' | 'subdivision' | 'barsPerRep' | 'targetReps' | 'accentPattern'
>;

export function saveFreeConfig(config: FreeConfig): void {
  writeLocal(KEY, JSON.stringify(config));
}

function isTimeSignature(v: unknown): v is TimeSignature {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    Number.isInteger(t.numerator) &&
    (t.denominator === 2 || t.denominator === 4 || t.denominator === 8) &&
    (t.displayAs === undefined || t.displayAs === 'cut' || t.displayAs === 'common')
  );
}

/** Read + validate the persisted Free config. Returns a partial config with only
 *  the fields that parsed cleanly (applyConfig clamps numeric ranges), or null. */
export function loadFreeConfig(): Partial<MetronomeConfig> | null {
  const raw = readLocal(KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  const out: Partial<MetronomeConfig> = {};

  if (typeof p.bpm === 'number' && Number.isFinite(p.bpm)) out.bpm = p.bpm;
  if (isTimeSignature(p.timeSignature)) {
    out.timeSignature = {
      numerator: (p.timeSignature as TimeSignature).numerator,
      denominator: (p.timeSignature as TimeSignature).denominator as Denominator,
      displayAs: (p.timeSignature as TimeSignature).displayAs,
    };
  }
  if (SUBDIVISION_ORDER.includes(p.subdivision as Subdivision)) {
    out.subdivision = p.subdivision as Subdivision;
  }
  if (typeof p.barsPerRep === 'number' && Number.isFinite(p.barsPerRep)) {
    out.barsPerRep = p.barsPerRep;
  }
  if (typeof p.targetReps === 'number' && Number.isFinite(p.targetReps)) {
    out.targetReps = p.targetReps;
  }
  if (Array.isArray(p.accentPattern) && p.accentPattern.every((x) => typeof x === 'boolean')) {
    out.accentPattern = p.accentPattern as boolean[];
  }

  return Object.keys(out).length > 0 ? out : null;
}
