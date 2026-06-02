import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { Sheet } from '../Shared/Sheet';
import { Toggle } from '../Shared/Toggle';
import { Stepper } from '../Shared/Stepper';
import {
  ChevronLeftIcon,
  CloseIcon,
  DownloadIcon,
} from '../Shared/icons';
import { useMetronomeStore } from '../../state/metronome';
import {
  useExerciseStore,
  COUNT_IN_BARS_MIN,
  COUNT_IN_BARS_MAX,
} from '../../state/exercises';
import {
  useSessionStore,
  downloadSessions,
  parseSessionImport,
} from '../../state/sessions';
import { useThemeStore, type Theme } from '../../state/theme';
import {
  getPersistenceStatus,
  type PersistenceStatus,
} from '../../db/persistence';
import type { ExerciseSet, ExerciseSetSummary } from '../../types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-2">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </h3>
      <div className="border-t border-neutral-200 dark:border-neutral-800" />
      <div className="flex flex-col gap-1 pt-3">{children}</div>
    </section>
  );
}

const secondaryButton =
  'h-9 rounded-md px-3 text-sm font-medium text-sky-600 hover:bg-sky-500/10 dark:text-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

const dangerButton =
  'h-9 rounded-md px-3 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

type SetImportMsg = { ok: boolean; text: string } | null;

interface ConflictState {
  existing: boolean;
  bundled: boolean;
  suggestedNewId: string;
  pendingSet: ExerciseSet;
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const countInEnabled = useExerciseStore((s) => s.countInEnabled);
  const setCountInEnabled = useExerciseStore((s) => s.setCountInEnabled);
  const countInBars = useExerciseStore((s) => s.countInBars);
  const setCountInBars = useExerciseStore((s) => s.setCountInBars);
  const autoStartNext = useExerciseStore((s) => s.autoStartNext);
  const setAutoStartNext = useExerciseStore((s) => s.setAutoStartNext);
  const preRollEnabled = useMetronomeStore((s) => s.preRollEnabled);
  const setPreRollEnabled = useMetronomeStore((s) => s.setPreRollEnabled);

  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const sessions = useSessionStore((s) => s.sessions);
  const importSessions = useSessionStore((s) => s.importSessions);

  const [storage, setStorage] = useState<PersistenceStatus>('unknown');
  useEffect(() => {
    void getPersistenceStatus().then(setStorage);
  }, []);

  const [replaceAll, setReplaceAll] = useState(false);
  const [importMsg, setImportMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportMsg(null);
    try {
      const parsed = parseSessionImport(JSON.parse(await file.text()));
      if (!parsed.ok) {
        setImportMsg({ ok: false, text: parsed.error });
        return;
      }
      if (
        replaceAll &&
        !window.confirm(
          'This will delete all current session history. Continue?',
        )
      ) {
        return;
      }
      const { added, skipped } = await importSessions(
        parsed.sessions,
        replaceAll,
      );
      setImportMsg({
        ok: true,
        text: `Imported ${added} new ${added === 1 ? 'session' : 'sessions'}, skipped ${skipped} ${skipped === 1 ? 'duplicate' : 'duplicates'}.`,
      });
    } catch {
      setImportMsg({ ok: false, text: 'Could not read the file as JSON.' });
    }
  };

  // --- Exercise-set state ---------------------------------------------------

  const availableSets = useExerciseStore((s) => s.availableSets);
  const importSet = useExerciseStore((s) => s.importSet);
  const replaceSet = useExerciseStore((s) => s.replaceSet);
  const saveSetAs = useExerciseStore((s) => s.saveSetAs);
  const exportSet = useExerciseStore((s) => s.exportSet);
  const deleteSet = useExerciseStore((s) => s.deleteSet);

  const [subview, setSubview] = useState<'main' | 'schema'>('main');
  const [setMsg, setSetMsg] = useState<SetImportMsg>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const setFileInputRef = useRef<HTMLInputElement>(null);

  const onPickSetFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSetMsg(null);
    const result = await importSet(file);
    if (result.ok) {
      setSetMsg({
        ok: true,
        text: `Imported '${result.set.title}' with ${result.set.exercises.length} exercises.`,
      });
      return;
    }
    if ('conflict' in result) {
      setConflict(result.conflict);
      return;
    }
    setSetMsg({ ok: false, text: result.error });
  };

  const onExportSet = async (summary: ExerciseSetSummary) => {
    try {
      const blob = await exportSet(summary.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `${summary.id}-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSetMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Export failed.',
      });
    }
  };

  const onDeleteSet = async (summary: ExerciseSetSummary) => {
    if (
      !window.confirm(
        `Delete '${summary.title}'? Your session history and progress for this set will be preserved.`,
      )
    ) {
      return;
    }
    try {
      await deleteSet(summary.id);
      setSetMsg({ ok: true, text: `Deleted '${summary.title}'.` });
    } catch (err) {
      setSetMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Delete failed.',
      });
    }
  };

  const onConflictReplace = async () => {
    if (!conflict) return;
    const result = await replaceSet(conflict.pendingSet);
    setConflict(null);
    if (result.ok) {
      setSetMsg({
        ok: true,
        text: `Replaced '${result.set.title}' with ${result.set.exercises.length} exercises.`,
      });
    } else {
      setSetMsg({ ok: false, text: result.error });
    }
  };

  const onConflictKeepBoth = async () => {
    if (!conflict) return;
    const result = await saveSetAs(
      conflict.pendingSet,
      conflict.suggestedNewId,
    );
    setConflict(null);
    if (result.ok) {
      setSetMsg({
        ok: true,
        text: `Imported as '${result.set.id}' (${result.set.exercises.length} exercises).`,
      });
    } else {
      setSetMsg({ ok: false, text: result.error });
    }
  };

  const bundledSets = useMemo(
    () =>
      availableSets
        .filter((s) => s.origin === 'bundled')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [availableSets],
  );
  // DESIGN: "Your sets" are listed in import order (most recent first). The
  // store's array already reflects insertion order from Dexie; we reverse it
  // so the freshest import is at the top.
  const userSets = useMemo(
    () => availableSets.filter((s) => s.origin === 'user-imported').slice().reverse(),
    [availableSets],
  );

  if (subview === 'schema') {
    return (
      <Sheet title="Settings" onClose={onClose}>
        <SchemaReferenceView onBack={() => setSubview('main')} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Section title="Practice">
        <div className="py-1.5">
          <Toggle
            label="Count-in between exercises"
            checked={countInEnabled}
            onChange={setCountInEnabled}
          />
        </div>
        <div className="py-1.5">
          <Stepper
            label="Count-in bars"
            value={countInBars}
            min={COUNT_IN_BARS_MIN}
            max={COUNT_IN_BARS_MAX}
            onChange={setCountInBars}
          />
        </div>
        <div className="py-1.5">
          <Toggle
            label="Auto-start next exercise"
            checked={autoStartNext}
            onChange={setAutoStartNext}
          />
        </div>
        <div className="py-1.5">
          <Toggle
            label="Pre-roll countdown"
            checked={preRollEnabled}
            onChange={setPreRollEnabled}
          />
        </div>
      </Section>

      <Section title="Exercise sets">
        <div className="pb-1 pt-1">
          <div className="text-xs font-medium text-neutral-500">Bundled</div>
          {bundledSets.length === 0 ? (
            <p className="py-1.5 text-sm text-neutral-500">
              No bundled sets shipped with this build.
            </p>
          ) : (
            <ul className="flex flex-col">
              {bundledSets.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-1.5 text-sm text-neutral-900 dark:text-neutral-50"
                >
                  <span>{s.title}</span>
                  <span className="text-xs text-neutral-500">
                    {s.exerciseCount}{' '}
                    {s.exerciseCount === 1 ? 'exercise' : 'exercises'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-2">
          <div className="text-xs font-medium text-neutral-500">Your sets</div>
          {userSets.length === 0 ? (
            <p className="py-1.5 text-sm text-neutral-500">
              No imported sets yet. If you own a method book like Stick Control
              or Syncopation, you can transcribe its exercises into a JSON file
              using the schema reference, then import it here. Imported sets
              stay on your device.
            </p>
          ) : (
            <ul className="flex flex-col">
              {userSets.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-50"
                >
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-neutral-500">
                    {s.exerciseCount}{' '}
                    {s.exerciseCount === 1 ? 'ex.' : 'ex.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onExportSet(s)}
                    aria-label={`Export ${s.title}`}
                    title="Download as JSON"
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteSet(s)}
                    aria-label={`Delete ${s.title}`}
                    title="Delete"
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:text-red-400"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <input
            ref={setFileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onPickSetFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setFileInputRef.current?.click()}
            className={secondaryButton}
          >
            Import a set…
          </button>
          <button
            type="button"
            onClick={() => setSubview('schema')}
            className={secondaryButton}
          >
            Schema reference
          </button>
        </div>
        {setMsg && (
          <p
            role="status"
            className={`pt-1 text-sm ${setMsg.ok ? 'text-sky-600 dark:text-sky-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {setMsg.text}
          </p>
        )}
      </Section>

      <Section title="Appearance">
        <div className="flex items-center justify-between gap-3 py-1.5">
          <span className="text-sm text-neutral-900 dark:text-neutral-50">
            Theme
          </span>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800"
          >
            {THEMES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={`h-8 rounded-md px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  theme === value
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Storage">
        <p className="py-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          Storage:{' '}
          <span className="text-neutral-900 dark:text-neutral-50">
            {storage === 'persistent'
              ? 'persistent ✓'
              : storage === 'best-effort'
                ? 'best-effort'
                : 'unknown'}
          </span>
        </p>
        <p className="pb-2 text-xs text-neutral-500">
          Sessions are stored locally in your browser. Export regularly as a
          backup.
        </p>
        <div className="flex flex-wrap items-center gap-3 py-1.5">
          <button
            type="button"
            onClick={() => downloadSessions(sessions)}
            disabled={sessions.length === 0}
            className={`${secondaryButton} disabled:opacity-40`}
          >
            Export sessions
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onPickFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={secondaryButton}
          >
            Import sessions
          </button>
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              className="accent-sky-500"
            />
            Replace all
          </label>
        </div>
        {importMsg && (
          <p
            role="status"
            className={`pt-1 text-sm ${importMsg.ok ? 'text-sky-600 dark:text-sky-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {importMsg.text}
          </p>
        )}
      </Section>

      {conflict && (
        <ConflictDialog
          conflict={conflict}
          onCancel={() => setConflict(null)}
          onReplace={() => void onConflictReplace()}
          onKeepBoth={() => void onConflictKeepBoth()}
        />
      )}
    </Sheet>
  );
}

// --- Schema reference subview ----------------------------------------------

/** Annotated example used by users transcribing their own books. Keep this in
 *  sync with the loader's validator (src/data/loadExerciseSet.ts) — anything
 *  shown here must round-trip cleanly through importUserSet. */
const SCHEMA_EXAMPLE = `{
  "id": "my-custom-set",            // unique slug; used as the export filename
  "title": "My Custom Set",         // shown in the set picker
  "source": "My Book, 2nd ed.",     // free-form attribution
  "defaultBpm": 80,                 // starting tempo when first opened
  "defaultTargetReps": 20,          // reps per exercise unless overridden
  "schemaVersion": 1,               // always 1 in this version

  "sections": [
    { "id": "warmups", "title": "Warm-ups", "order": 1 },
    { "id": "rolls",   "title": "Rolls",    "order": 2 }
  ],

  "exercises": [
    {
      "id": "ex-1",
      "number": 1,
      "name": "Singles R",
      "sectionId": "warmups",       // must match a section id above
      "timeSignature": { "numerator": 4, "denominator": 4 },
      "subdivision": "16th",         // "8th" | "8th-triplet" | "16th" | "16th-triplet" | "32nd"
      "recommendedBpm": 60,          // optional; overrides defaultBpm
      "targetReps": 20,              // optional; overrides defaultTargetReps
      "pattern": [
        // Two bars (= one rep). Each bar must have the same length, matching
        // the time signature × subdivision (here: 4/4 × 16th = 16 events).
        [
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" },
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" },
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" },
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, "rest"
        ],
        [
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" },
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" },
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" },
          { "sticking": "R" }, { "sticking": "R" }, { "sticking": "R" }, "rest"
        ]
      ]
    }
  ]
}`;

function SchemaReferenceView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="-mt-1 flex w-fit items-center gap-1 rounded-md py-1 pr-2 text-sm font-medium text-sky-600 hover:text-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-400"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back
      </button>
      <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-50">
        Exercise set schema
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        An exercise set is a single JSON file. Save it with any name ending in{' '}
        <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">
          .json
        </code>{' '}
        and import it with the button on the previous screen.
      </p>
      <pre className="max-h-[55vh] overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 text-[11px] leading-snug text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
        {SCHEMA_EXAMPLE}
      </pre>
      <p className="text-xs text-neutral-500">
        Imported exercise sets are stored only in your browser. They are not
        sent to any server.
      </p>
    </div>
  );
}

// --- Conflict resolution dialog --------------------------------------------

function ConflictDialog({
  conflict,
  onCancel,
  onReplace,
  onKeepBoth,
}: {
  conflict: ConflictState;
  onCancel: () => void;
  onReplace: () => void;
  onKeepBoth: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const { pendingSet, suggestedNewId, bundled } = conflict;
  const reason = bundled
    ? `'${pendingSet.id}' matches a bundled set that ships with the app. Bundled sets can't be replaced — choose "Keep both" to import this one under a new id.`
    : `'${pendingSet.id}' is already imported. Replace it with the version from the file, or keep both.`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resolve id conflict"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-50">
          Set id already in use
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {reason}
        </p>
        <p className="text-xs text-neutral-500">
          Keep both will import as{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-[11px] dark:bg-neutral-800">
            {suggestedNewId}
          </code>
          .
        </p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReplace}
            disabled={bundled}
            className={`${dangerButton} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Replace existing
          </button>
          <button
            type="button"
            onClick={onKeepBoth}
            className={secondaryButton}
          >
            Keep both
          </button>
        </div>
      </div>
    </div>
  );
}
