// Exercise selector (DESIGN §Exercise Popover, SPEC §7). The primary navigation
// surface for the active set: set picker, search, recent tiles, sectioned grid
// of completion-aware tiles, and bottom controls (auto-start, mark complete,
// reset progress). Replaces the flat dropdown.

import { useEffect, useMemo, useState } from 'react';
import {
  useExerciseStore,
  selectCurrentExercise,
  selectCurrentSection,
} from '../../state/exercises';
import {
  useProgressStore,
  getCompletedCount as getCompletedCountDb,
} from '../../state/progress';
import { useMetronomeStore } from '../../state/metronome';
import { useUiStore } from '../../state/ui';
import { getRecentExercisesForSet } from '../../state/sessions';
import { goToNext, switchSet } from '../../audio/transport';
import { stopMetronome } from '../../audio/scheduler';
import { Popover } from '../Shared/Popover';
import { Toggle } from '../Shared/Toggle';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
} from '../Shared/icons';
import type {
  Exercise,
  ExerciseProgress,
  ExerciseSetSummary,
  Section,
} from '../../types';

const userBadge =
  'rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';

const RECENTS_LIMIT = 5;
const HIGH_TEMPO_MULTIPLIER = 1.5;

// --- Matching ---------------------------------------------------------------

/** Substring match against `#N` or the exercise name (case-insensitive). The
 *  raw number is matched as a prefix so "5" matches #5 but also #50, #51, … */
function matchesQuery(exercise: Exercise, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase().trim();
  if (!lower) return true;
  const numStr = String(exercise.number);
  if (numStr === lower || numStr.startsWith(lower)) return true;
  return exercise.name.toLowerCase().includes(lower);
}

// --- Tile -------------------------------------------------------------------

interface TileProps {
  exercise: Exercise;
  progress: ExerciseProgress | null;
  defaultBpm: number;
  isCurrent: boolean;
  onClick: () => void;
}

/** 64×64 numbered tile with completion-state visual treatment (DESIGN §Tile design). */
function Tile({
  exercise,
  progress,
  defaultBpm,
  isCurrent,
  onClick,
}: TileProps) {
  const attempted = progress !== null && progress.totalSessions > 0;
  const completed = progress?.completed ?? false;
  const highTempo =
    completed && (progress?.bestBpm ?? 0) >= defaultBpm * HIGH_TEMPO_MULTIPLIER;

  // Base + state classes. Current always wins on border emphasis.
  const stateClass = isCurrent
    ? 'border-sky-500 dark:border-sky-400 shadow-inner scale-[1.05] z-10'
    : completed
      ? `border-sky-500 dark:border-sky-400 ${highTempo ? 'bg-sky-500/10 dark:bg-sky-400/10' : ''}`
      : 'border-neutral-200 dark:border-neutral-800';

  const labelTitle = `#${exercise.number} ${exercise.name}${completed ? ` — best ${progress!.bestBpm} BPM` : ''}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={labelTitle}
      aria-label={labelTitle}
      aria-current={isCurrent ? 'true' : undefined}
      className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-lg border bg-transparent text-neutral-900 transition-all hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-neutral-50 dark:hover:bg-neutral-800 ${stateClass}`}
    >
      <span className="text-base font-semibold tabular-nums leading-none">
        {exercise.number}
      </span>
      <span className="mt-1 w-full truncate px-1 text-[10px] text-neutral-500 dark:text-neutral-400">
        {exercise.name}
      </span>
      {/* Corner state indicator */}
      {completed && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 text-sky-600 dark:text-sky-400"
        >
          <CheckIcon className="h-3 w-3" />
        </span>
      )}
      {!completed && attempted && (
        <span
          aria-hidden
          title="In progress"
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sky-500/70 dark:bg-sky-400/70"
        />
      )}
    </button>
  );
}

// --- Section group ----------------------------------------------------------

interface SectionGroupProps {
  section: Section;
  exercises: Exercise[];
  forceOpen: boolean;
  collapsed: boolean;
  onToggle: () => void;
  progressById: Record<string, ExerciseProgress>;
  defaultBpm: number;
  currentExerciseId: string;
  onPickExercise: (id: string) => void;
  searchActive: boolean;
}

function SectionGroup({
  section,
  exercises,
  forceOpen,
  collapsed,
  onToggle,
  progressById,
  defaultBpm,
  currentExerciseId,
  onPickExercise,
  searchActive,
}: SectionGroupProps) {
  const completed = exercises.filter(
    (ex) => progressById[ex.id]?.completed,
  ).length;
  const total = exercises.length;
  // While search is active, no matches → muted header + no grid.
  const noMatches = searchActive && exercises.length === 0;
  const open = forceOpen ? true : !collapsed;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={searchActive}
        aria-expanded={open}
        className="flex items-center justify-between gap-3 rounded-md py-1 text-left text-sm hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:text-neutral-50"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-neutral-500" aria-hidden>
            {open ? (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="font-medium text-neutral-900 dark:text-neutral-50">
            {section.title}
          </span>
        </span>
        <span className="text-xs text-neutral-500">
          {noMatches ? '(no matches)' : `${completed} of ${total} complete`}
        </span>
      </button>
      {open && exercises.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {exercises.map((ex) => (
            <Tile
              key={ex.id}
              exercise={ex}
              progress={progressById[ex.id] ?? null}
              defaultBpm={defaultBpm}
              isCurrent={ex.id === currentExerciseId}
              onClick={() => onPickExercise(ex.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// --- Set picker -------------------------------------------------------------

function SetRow({
  summary,
  done,
  selected,
  onSelect,
}: {
  summary: ExerciseSetSummary;
  done: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-neutral-800 ${
        selected ? 'text-sky-600 dark:text-sky-400' : ''
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span>{summary.title}</span>
        {summary.origin === 'user-imported' && (
          <span className={userBadge}>User</span>
        )}
      </span>
      <span className="text-xs text-neutral-500">
        {done} of {summary.exerciseCount}
      </span>
    </button>
  );
}

function SetPicker({
  activeSetId,
  setSummaries,
  completionBySet,
  onSelect,
  onOpenSettings,
}: {
  activeSetId: string;
  setSummaries: ExerciseSetSummary[];
  completionBySet: Record<string, number>;
  onSelect: (setId: string) => void;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = setSummaries.find((s) => s.id === activeSetId);
  const activeCompleted = completionBySet[activeSetId] ?? 0;
  const activeTotal = active?.exerciseCount ?? 0;

  // Close when clicking outside the dropdown panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-set-picker]')) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!active) return null;

  const bundled = setSummaries.filter((s) => s.origin === 'bundled');
  const user = setSummaries.filter((s) => s.origin === 'user-imported');

  return (
    <div data-set-picker className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Switch exercise set"
        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-neutral-800"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {active.title}
          </span>
          {active.origin === 'user-imported' && (
            <span className={userBadge}>User</span>
          )}
          <ChevronDownIcon className="h-3.5 w-3.5 text-neutral-500" />
        </span>
        <span className="text-xs text-neutral-500">
          {activeCompleted} of {activeTotal} complete
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-2 shadow-lg shadow-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-neutral-950/50">
          {bundled.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                Bundled
              </div>
              {bundled.map((s) => (
                <SetRow
                  key={s.id}
                  summary={s}
                  done={completionBySet[s.id] ?? 0}
                  selected={s.id === activeSetId}
                  onSelect={() => {
                    setOpen(false);
                    if (s.id !== activeSetId) onSelect(s.id);
                  }}
                />
              ))}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <div className="px-2 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Your sets
            </div>
            {user.length > 0 ? (
              user.map((s) => (
                <SetRow
                  key={s.id}
                  summary={s}
                  done={completionBySet[s.id] ?? 0}
                  selected={s.id === activeSetId}
                  onSelect={() => {
                    setOpen(false);
                    if (s.id !== activeSetId) onSelect(s.id);
                  }}
                />
              ))
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="rounded-md px-2 py-1.5 text-left text-sm text-neutral-500 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-neutral-800"
              >
                Import sets in Settings →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Body -------------------------------------------------------------------

const secondaryButton =
  'h-9 rounded-md px-3 text-sm font-medium text-sky-600 hover:bg-sky-500/10 dark:text-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

export function ExercisePopoverBody({ close }: { close: () => void }) {
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
  // Build the (section, exercises[]) groups locally — computing this through a
  // Zustand selector returns a fresh array each call and triggers an infinite
  // re-render loop (Zustand compares with Object.is).
  const sectionedExercises = useMemo(() => {
    if (!loadedSet) return [];
    const sorted = [...loadedSet.sections].sort((a, b) => a.order - b.order);
    return sorted.map((section) => ({
      section,
      exercises: loadedSet.exercises.filter((e) => e.sectionId === section.id),
    }));
  }, [loadedSet]);

  const progressBySet = useProgressStore((s) => s.bySet);
  const markCompleted = useProgressStore((s) => s.markCompleted);
  const resetProgress = useProgressStore((s) => s.reset);
  const bpm = useMetronomeStore((s) => s.bpm);

  // Memoize so the effect deps below don't churn on every render.
  const progressForActiveSet = useMemo(
    () => progressBySet[activeSetId] ?? {},
    [progressBySet, activeSetId],
  );
  const sectionsCollapsedForSet =
    setStates[activeSetId]?.sectionsCollapsed ?? {};

  const [search, setSearch] = useState('');
  const searchActive = search.trim().length > 0;

  // Per-set completion counts for the set picker. Loaded from Dexie on mount
  // (and when the active set's progress cache changes, since the active set's
  // count is derivable from cache).
  const [completionBySet, setCompletionBySet] = useState<
    Record<string, number>
  >({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      availableSets.map(async (s) => ({
        id: s.id,
        n: await getCompletedCountDb(s.id),
      })),
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

  // Recent exercises (newest first, deduped). Hidden when search is active.
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

  // Jump to a different exercise within the same set: stop any in-progress
  // session first so the recorder saves it under the OUTGOING exercise.
  const pickExercise = (id: string) => {
    if (id !== currentExerciseId) stopMetronome();
    setExerciseById(id);
    close();
  };

  // Filter the sectioned grid through the search query.
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
      <p className="py-6 text-center text-sm text-neutral-500">
        No exercise set loaded.
      </p>
    );
  }

  return (
    <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
      <SetPicker
        activeSetId={activeSetId}
        setSummaries={availableSets}
        completionBySet={completionBySet}
        onSelect={(id) => {
          // Use the transport helper so an in-progress session for the outgoing
          // set is stopped (and saved) before the switch.
          switchSet(id);
        }}
        onOpenSettings={() => {
          close();
          openSettings();
        }}
      />

      <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

      <label className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 dark:border-neutral-800">
        <SearchIcon className="h-4 w-4 text-neutral-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter exercises…"
          aria-label="Filter exercises"
          className="h-9 flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-50"
        />
      </label>

      {!searchActive && recentExercises.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Recent
          </div>
          <div className="flex flex-wrap gap-2">
            {recentExercises.map((ex) => (
              <Tile
                key={ex.id}
                exercise={ex}
                progress={progressForActiveSet[ex.id] ?? null}
                defaultBpm={loadedSet.defaultBpm}
                isCurrent={ex.id === currentExerciseId}
                onClick={() => pickExercise(ex.id)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-4">
        {filteredSections.map(({ section, exercises }) => (
          <SectionGroup
            key={section.id}
            section={section}
            exercises={exercises}
            // While search is active, force-open sections that have matches so
            // the user always sees their hits regardless of collapse state.
            forceOpen={searchActive && exercises.length > 0}
            collapsed={
              sectionsCollapsedForSet[section.id] ??
              // Default: only the current exercise's section is expanded.
              section.id !== currentSection?.id
            }
            onToggle={() =>
              setSectionCollapsed(
                section.id,
                !(
                  sectionsCollapsedForSet[section.id] ??
                  section.id !== currentSection?.id
                ),
              )
            }
            progressById={progressForActiveSet}
            defaultBpm={loadedSet.defaultBpm}
            currentExerciseId={currentExerciseId}
            onPickExercise={pickExercise}
            searchActive={searchActive}
          />
        ))}
      </div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

      <div className="flex flex-col gap-2 pb-1">
        <Toggle
          label="Auto-start next exercise"
          checked={autoStartNext}
          onChange={setAutoStartNext}
        />
        <button
          type="button"
          onClick={() => {
            void markCompleted(activeSetId, currentExercise.id, bpm).then(() =>
              goToNext(),
            );
            close();
          }}
          className={`${secondaryButton} self-start`}
        >
          Mark current as completed
        </button>
        <button
          type="button"
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
          className="h-9 self-start rounded-md px-3 text-sm font-medium text-red-600 hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400"
        >
          Reset progress for this set
        </button>
      </div>
    </div>
  );
}

/** The Popover-wrapped selector. ExerciseContext supplies the trigger. */
export function ExercisePopover({
  trigger,
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => React.ReactNode;
}) {
  return (
    <Popover
      placement="bottom"
      align="center"
      label="Exercise navigation"
      widthClass="w-[480px]"
      trigger={trigger}
    >
      {(close) => <ExercisePopoverBody close={close} />}
    </Popover>
  );
}
