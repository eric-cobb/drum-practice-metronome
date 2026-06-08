import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  useExerciseStore,
  selectCurrentExercise,
  selectCurrentSection,
} from '../../../state/exercises';
import {
  useProgressStore,
  getCompletedCount as getCompletedCountDb,
} from '../../../state/progress';
import { useMetronomeStore } from '../../../state/metronome';
import { useUiStore } from '../../../state/ui';
import { getRecentExercisesForSet } from '../../../state/sessions';
import { goToNext, switchSet } from '../../../audio/transport';
import { stopMetronome } from '../../../audio/scheduler';
import type { Exercise } from '../../../types';
import { Button, Tile, Toggle } from '../../ui';
import { SetPicker } from './SetPicker';
import { SectionGroup } from './SectionGroup';
import { tileStateFor } from './tileState';

const RECENTS_LIMIT = 5;

/** Substring match against `#N` (prefix) or the exercise name (SPEC §7). */
function matchesQuery(exercise: Exercise, q: string): boolean {
  const lower = q.toLowerCase().trim();
  if (!lower) return true;
  const numStr = String(exercise.number);
  if (numStr === lower || numStr.startsWith(lower)) return true;
  return exercise.name.toLowerCase().includes(lower);
}

const hairline = 'h-px bg-fg/10';

/** The shared contents of the exercise selector (SPEC §7): set picker, search,
 *  recents, sectioned grid, and the action row. Wrapped by the desktop popover
 *  or the mobile sheet (which own positioning, backdrop, and scroll). */
export function SelectorBody({ close }: { close: () => void }) {
  const loadedSet = useExerciseStore((s) => s.loadedSet);
  const availableSets = useExerciseStore((s) => s.availableSets);
  const openSettings = useUiStore((s) => s.openSettings);
  const activeSetId = useExerciseStore((s) => s.activeSetId);
  const currentExerciseId = useExerciseStore((s) => s.currentExerciseId);
  const setStates = useExerciseStore((s) => s.setStates);
  const setExerciseById = useExerciseStore((s) => s.setExerciseById);
  const setSectionCollapsed = useExerciseStore((s) => s.setSectionCollapsed);
  const autoStartNext = useExerciseStore((s) => s.autoStartNext);
  const setAutoStartNext = useExerciseStore((s) => s.setAutoStartNext);
  const currentExercise = useExerciseStore(selectCurrentExercise);
  const currentSection = useExerciseStore(selectCurrentSection);

  const progressBySet = useProgressStore((s) => s.bySet);
  const markCompleted = useProgressStore((s) => s.markCompleted);
  const resetProgress = useProgressStore((s) => s.reset);
  const bpm = useMetronomeStore((s) => s.bpm);
  const currentRep = useMetronomeStore((s) => s.currentRep);
  const targetReps = useMetronomeStore((s) => s.targetReps);
  const currentProgress = Math.min(1, Math.max(0, currentRep / targetReps));

  // Build (section, exercises[]) groups locally — a Zustand selector returning a
  // fresh array each call would loop (Object.is compare).
  const sectionedExercises = useMemo(() => {
    if (!loadedSet) return [];
    const sorted = [...loadedSet.sections].sort((a, b) => a.order - b.order);
    return sorted.map((section) => ({
      section,
      exercises: loadedSet.exercises.filter((e) => e.sectionId === section.id),
    }));
  }, [loadedSet]);

  const progressForActiveSet = useMemo(
    () => progressBySet[activeSetId] ?? {},
    [progressBySet, activeSetId],
  );
  const sectionsCollapsedForSet = setStates[activeSetId]?.sectionsCollapsed ?? {};

  const [search, setSearch] = useState('');
  const searchActive = search.trim().length > 0;

  // Per-set completion counts for the set picker summary.
  const [completionBySet, setCompletionBySet] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      availableSets.map(async (s) => ({ id: s.id, n: await getCompletedCountDb(s.id) })),
    ).then((rows) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const r of rows) next[r.id] = r.n;
      setCompletionBySet(next);
    });
    return () => {
      cancelled = true;
    };
  }, [availableSets, progressForActiveSet]);

  // Recent exercises (newest first). Hidden while searching.
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    if (!activeSetId) return;
    let cancelled = false;
    void getRecentExercisesForSet(activeSetId, RECENTS_LIMIT).then((rows) => {
      if (!cancelled) setRecentIds(rows.map((r) => r.exerciseId));
    });
    return () => {
      cancelled = true;
    };
  }, [activeSetId, progressForActiveSet]);

  const recentExercises = useMemo(() => {
    if (!loadedSet) return [];
    const byId = new Map(loadedSet.exercises.map((e) => [e.id, e]));
    return recentIds
      .map((id) => byId.get(id))
      .filter((e): e is Exercise => e !== undefined);
  }, [recentIds, loadedSet]);

  const filteredSections = useMemo(
    () =>
      sectionedExercises.map(({ section, exercises }) => ({
        section,
        exercises: exercises.filter((e) => matchesQuery(e, search)),
      })),
    [sectionedExercises, search],
  );

  if (!loadedSet || !currentExercise) {
    return (
      <p className="py-6 text-center text-sm text-fg-tertiary">No exercise set loaded.</p>
    );
  }

  // Jump to a different exercise: stop any in-progress session first so the
  // recorder saves it under the OUTGOING exercise.
  const pickExercise = (id: string) => {
    if (id !== currentExerciseId) stopMetronome();
    setExerciseById(id);
    close();
  };

  return (
    <div className="flex flex-col gap-3">
      <SetPicker
        activeSetId={activeSetId}
        setSummaries={availableSets}
        completionBySet={completionBySet}
        onSelect={(id) => switchSet(id)}
        onOpenSettings={() => {
          close();
          openSettings();
        }}
      />

      <label className="surface-deep flex h-9 items-center gap-2 rounded-[10px] px-3">
        <Search size={16} strokeWidth={1.5} className="text-fg-tertiary" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter exercises…"
          aria-label="Filter exercises"
          className="h-9 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
        />
      </label>

      {!searchActive && recentExercises.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
            Recent
          </div>
          <div className="flex flex-wrap gap-2">
            {recentExercises.map((ex) => {
              const isCurrent = ex.id === currentExerciseId;
              return (
                <Tile
                  key={ex.id}
                  number={ex.number}
                  name={ex.name}
                  state={tileStateFor(progressForActiveSet[ex.id], loadedSet.defaultBpm, isCurrent)}
                  progress={isCurrent ? currentProgress : undefined}
                  size={56}
                  onClick={() => pickExercise(ex.id)}
                />
              );
            })}
          </div>
        </section>
      )}

      <div className={hairline} />

      <div className="flex flex-col gap-4">
        {filteredSections.map(({ section, exercises }) => (
          <SectionGroup
            key={section.id}
            section={section}
            exercises={exercises}
            forceOpen={searchActive && exercises.length > 0}
            collapsed={
              sectionsCollapsedForSet[section.id] ?? section.id !== currentSection?.id
            }
            onToggle={() =>
              setSectionCollapsed(
                section.id,
                !(sectionsCollapsedForSet[section.id] ?? section.id !== currentSection?.id),
              )
            }
            progressById={progressForActiveSet}
            defaultBpm={loadedSet.defaultBpm}
            currentExerciseId={currentExerciseId}
            currentProgress={currentProgress}
            onPickExercise={pickExercise}
            searchActive={searchActive}
          />
        ))}
      </div>

      <div className={hairline} />

      <div className="flex flex-col gap-3 pb-1">
        <Toggle
          label="Auto-start next exercise"
          checked={autoStartNext}
          onChange={setAutoStartNext}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void markCompleted(activeSetId, currentExercise.id, bpm).then(() => goToNext());
              close();
            }}
          >
            Mark current as completed
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (
                window.confirm(
                  'Reset all completion progress for this set? Session log is unaffected.',
                )
              ) {
                void resetProgress(activeSetId);
                close();
              }
            }}
          >
            Reset progress
          </Button>
        </div>
      </div>
    </div>
  );
}
