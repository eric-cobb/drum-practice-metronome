import { useMemo } from 'react';
import { useExerciseStore } from '../../state/exercises';
import { useProgressStore } from '../../state/progress';
import type { Session } from '../../types';
import { Stat } from '../ui';
import {
  last7DaySeconds,
  last7DayActive,
  rolling7Seconds,
  practiceStreak,
} from './stats';
import { formatDuration, formatDelta } from './format';

/** 7-bar mini chart of daily practice time; today (last) gets the accent. */
function WeekBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-6 items-end gap-[3px]" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={i === values.length - 1 ? 'bg-accent-gradient' : 'bg-fg/20'}
          style={{ width: 5, height: Math.max(2, Math.round((v / max) * 24)), borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

/** 7 dots marking which recent days were practiced; today (last) accented. */
function StreakDots({ active }: { active: boolean[] }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {active.map((on, i) => (
        <span
          key={i}
          className={
            on
              ? i === active.length - 1
                ? 'bg-accent-gradient'
                : 'bg-accent'
              : 'bg-fg/15'
          }
          style={{ width: 7, height: 7, borderRadius: 999 }}
        />
      ))}
    </div>
  );
}

/** Horizontal completion bar (active set). */
function CompletionBar({ fraction }: { fraction: number }) {
  return (
    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-fg/15" aria-hidden>
      <div
        className="bg-accent-gradient h-full rounded-full"
        style={{ width: `${Math.round(fraction * 100)}%` }}
      />
    </div>
  );
}

/** The three History stat cards (DESIGN-v2 §6): week practice time with a 7-day
 *  bar chart, exercises-completed with a progress bar, and a day streak with
 *  recent-day dots. */
export function StatCards({ sessions, now }: { sessions: Session[]; now: number }) {
  const loadedSet = useExerciseStore((s) => s.loadedSet);
  const activeSetId = useExerciseStore((s) => s.activeSetId);
  const progressBySet = useProgressStore((s) => s.bySet);

  const { current, previous } = useMemo(
    () => rolling7Seconds(sessions, now),
    [sessions, now],
  );
  const bars = useMemo(() => last7DaySeconds(sessions, now), [sessions, now]);
  const dots = useMemo(() => last7DayActive(sessions, now), [sessions, now]);
  const streak = useMemo(() => practiceStreak(sessions, now), [sessions, now]);

  const progress = progressBySet[activeSetId] ?? {};
  const completed = Object.values(progress).filter((p) => p.completed).length;
  const total = loadedSet?.exercises.length ?? 0;

  return (
    <div className="flex flex-wrap gap-4">
      <Stat
        label="This week"
        value={formatDuration(current)}
        context={`${formatDelta(current - previous)} vs last week`}
        visual={<WeekBars values={bars} />}
      />
      <Stat
        label="Exercises"
        value={completed}
        context={total > 0 ? `of ${total} complete` : 'no set loaded'}
        visual={total > 0 ? <CompletionBar fraction={completed / total} /> : undefined}
      />
      <Stat
        label="Streak"
        value={streak}
        context={streak === 1 ? 'day' : 'days'}
        visual={<StreakDots active={dots} />}
      />
    </div>
  );
}
