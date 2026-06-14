import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
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
import { useTourStore } from '../../state/tour';
import {
  getPersistenceStatus,
  type PersistenceStatus,
} from '../../db/persistence';
import { Button, Toggle, Stepper, cn } from '../ui';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.06em] text-fg-tertiary">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

/** A settings row (DESIGN-v2 §6): card surface, label left, control right. When
 *  `label` is omitted the child is a self-labeled control (Toggle/Stepper) and
 *  fills the row. */
function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="surface-card flex min-h-[44px] items-center rounded-[10px] px-4 py-2">
      {label ? (
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-sm text-fg">{label}</span>
          <div className="shrink-0">{children}</div>
        </div>
      ) : (
        <div className="w-full">{children}</div>
      )}
    </div>
  );
}

function Hairline() {
  return <div className="my-6 h-px bg-line" />;
}

export function SettingsView() {
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
  const startTour = useTourStore((s) => s.start);

  const sessions = useSessionStore((s) => s.sessions);
  const importSessions = useSessionStore((s) => s.importSessions);

  const [storage, setStorage] = useState<PersistenceStatus>('unknown');
  useEffect(() => {
    void getPersistenceStatus().then(setStorage);
  }, []);

  const [replaceAll, setReplaceAll] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        !window.confirm('This will delete all current session history. Continue?')
      ) {
        return;
      }
      const { added, skipped } = await importSessions(parsed.sessions, replaceAll);
      setImportMsg({
        ok: true,
        text: `Imported ${added} new ${added === 1 ? 'session' : 'sessions'}, skipped ${skipped} ${skipped === 1 ? 'duplicate' : 'duplicates'}.`,
      });
    } catch {
      setImportMsg({ ok: false, text: 'Could not read the file as JSON.' });
    }
  };

  return (
    <div className="mx-auto max-w-[520px] px-8 py-7">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-medium text-fg">Settings</h1>
        <p className="text-xs text-fg-secondary">
          Appearance, practice defaults, and local storage.
        </p>
      </div>

      <Section title="Appearance">
        <Row label="Theme">
          <div role="radiogroup" aria-label="Theme" className="surface-deep inline-flex rounded-lg p-0.5">
            {THEMES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cn(
                  'h-7 rounded-md px-3 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  theme === value ? 'surface-card text-fg' : 'text-fg-tertiary hover:text-fg-secondary',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Hairline />

      <Section title="Practice defaults">
        <Row>
          <Toggle
            label="Count-in between exercises"
            checked={countInEnabled}
            onChange={setCountInEnabled}
          />
        </Row>
        <Row>
          <Stepper
            label="Default count-in bars"
            value={countInBars}
            min={COUNT_IN_BARS_MIN}
            max={COUNT_IN_BARS_MAX}
            onChange={setCountInBars}
          />
        </Row>
        <Row>
          <Toggle label="Pre-roll countdown" checked={preRollEnabled} onChange={setPreRollEnabled} />
        </Row>
        <Row>
          <Toggle
            label="Auto-start next exercise"
            checked={autoStartNext}
            onChange={setAutoStartNext}
          />
        </Row>
      </Section>

      <Hairline />

      <Section title="Storage">
        <Row label="Storage">
          <span className="text-sm tabular-nums text-fg-secondary">
            {storage === 'persistent'
              ? 'Persistent ✓'
              : storage === 'best-effort'
                ? 'Best-effort'
                : 'Unknown'}
          </span>
        </Row>
        <Row label="Export sessions">
          <Button
            variant="secondary"
            size="sm"
            disabled={sessions.length === 0}
            onClick={() => downloadSessions(sessions)}
          >
            Export
          </Button>
        </Row>
        <Row label="Import sessions">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-fg-tertiary">
              <input
                type="checkbox"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              Replace all
            </label>
            {/* No `accept` filter — see LibraryActions: the application/json
                MIME can grey out .json files in the OS dialog. */}
            <input ref={fileRef} type="file" onChange={onPickFile} className="hidden" />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Import
            </Button>
          </div>
        </Row>
        {importMsg && (
          <p
            role="status"
            className={cn('px-1 text-xs', importMsg.ok ? 'text-[color:var(--color-accent-text)]' : 'text-danger-text')}
          >
            {importMsg.text}
          </p>
        )}
        <p className="px-1 text-[11px] text-fg-muted">
          Sessions are stored locally in your browser. Export regularly as a backup.
        </p>
      </Section>

      <Hairline />

      <Section title="Help">
        <Row label="Take the tour">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => startTour('free')}>
              Free mode
            </Button>
            <Button variant="ghost" size="sm" onClick={() => startTour('practice')}>
              Exercise mode
            </Button>
            <Button variant="ghost" size="sm" onClick={() => startTour('library')}>
              Library
            </Button>
          </div>
        </Row>
      </Section>
    </div>
  );
}
