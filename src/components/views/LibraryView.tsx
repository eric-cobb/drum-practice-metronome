import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  useExerciseStore,
  selectCurrentExercise,
} from '../../state/exercises';
import {
  useProgressStore,
  getCompletedCount as getCompletedCountDb,
} from '../../state/progress';
import { useMetronomeStore } from '../../state/metronome';
import { useModeStore } from '../../state/mode';
import { useUiStore } from '../../state/ui';
import { switchSet } from '../../audio/transport';
import { stopMetronome } from '../../audio/scheduler';
import type { Exercise } from '../../types';
import { SetPicker } from '../Practice/selector/SetPicker';
import { LibraryCard } from '../Library/LibraryCard';
import { LibraryActions } from '../Library/LibraryActions';

function matchesQuery(exercise: Exercise, q: string): boolean {
  const lower = q.toLowerCase().trim();
  if (!lower) return true;
  const numStr = String(exercise.number);
  if (numStr === lower || numStr.startsWith(lower)) return true;
  return exercise.name.toLowerCase().includes(lower);
}

/** Library view — browse exercise sets (DESIGN-v2 §5). Set selector + search +
 *  import/schema entry points, then a sectioned grid of detailed cards with
 *  notation previews. Tapping a card jumps to that exercise in Practice. The
 *  data layer is unchanged — this reads the same exercise/progress stores. */
export function LibraryView() {
  const loadedSet = useExerciseStore((s) => s.loadedSet);
  const availableSets = useExerciseStore((s) => s.availableSets);
  const activeSetId = useExerciseStore((s) => s.activeSetId);
  const currentExercise = useExerciseStore(selectCurrentExercise);
  const setExerciseById = useExerciseStore((s) => s.setExerciseById);
  const setMode = useModeStore((s) => s.setMode);
  const setView = useUiStore((s) => s.setView);
  const openSettings = useUiStore((s) => s.openSettings);

  const progressBySet = useProgressStore((s) => s.bySet);
  const progressForActiveSet = useMemo(
    () => progressBySet[activeSetId] ?? {},
    [progressBySet, activeSetId],
  );

  const [search, setSearch] = useState('');

  const sectionedExercises = useMemo(() => {
    if (!loadedSet) return [];
    const sorted = [...loadedSet.sections].sort((a, b) => a.order - b.order);
    return sorted.map((section) => ({
      section,
      exercises: loadedSet.exercises
        .filter((e) => e.sectionId === section.id)
        .filter((e) => matchesQuery(e, search)),
    }));
  }, [loadedSet, search]);

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

  // Jump to an exercise: stop any session (so it saves under the outgoing
  // exercise), switch to Exercise mode + Practice view.
  const pick = (id: string) => {
    if (useMetronomeStore.getState().isPlaying) stopMetronome();
    if (useModeStore.getState().mode !== 'exercise') setMode('exercise');
    setExerciseById(id);
    setView('practice');
  };

  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-fg">Library</h1>
          <p className="text-xs text-fg-secondary">
            Browse exercise sets, import your own, and jump into any exercise.
          </p>
        </div>
        <LibraryActions />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-[320px]">
          <SetPicker
            activeSetId={activeSetId}
            setSummaries={availableSets}
            completionBySet={completionBySet}
            onSelect={(id) => switchSet(id)}
            onOpenSettings={openSettings}
          />
        </div>
        <label className="surface-deep flex h-11 flex-1 items-center gap-2 rounded-[10px] px-3">
          <Search size={16} strokeWidth={1.5} className="text-fg-tertiary" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter exercises…"
            aria-label="Filter exercises"
            className="h-11 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
          />
        </label>
      </div>

      {!loadedSet ? (
        <p className="mt-10 text-center text-sm text-fg-tertiary">No exercise set loaded.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {sectionedExercises.map(({ section, exercises }) => (
            <section key={section.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-fg">{section.title}</h2>
                <span className="text-xs tabular-nums text-fg-tertiary">
                  {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
                </span>
              </div>
              {exercises.length === 0 ? (
                <p className="text-xs text-fg-muted">No matches in this section.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {exercises.map((ex) => (
                    <LibraryCard
                      key={ex.id}
                      exercise={ex}
                      progress={progressForActiveSet[ex.id] ?? null}
                      defaultBpm={loadedSet.defaultBpm}
                      isCurrent={ex.id === currentExercise?.id}
                      onClick={() => pick(ex.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
