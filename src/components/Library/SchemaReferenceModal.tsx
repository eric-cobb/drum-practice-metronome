import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Modal } from '../ui';

/** A clean, copy-pasteable example (valid JSON — no comments). The plain-language
 *  breakdown above explains each field, so the example stays uncluttered. */
const SCHEMA_EXAMPLE = `{
  "id": "my-custom-set",
  "title": "My Custom Set",
  "source": "My Book, 2nd ed.",
  "defaultBpm": 80,
  "defaultTargetReps": 20,
  "schemaVersion": 1,
  "sections": [
    { "id": "warmups", "title": "Warm-ups", "order": 1 }
  ],
  "exercises": [
    {
      "id": "ex-1",
      "number": 1,
      "name": "Singles",
      "sectionId": "warmups",
      "timeSignature": { "numerator": 4, "denominator": 4 },
      "subdivision": "8th",
      "recommendedBpm": 60,
      "pattern": [
        [
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, "rest"
        ],
        [
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, "rest"
        ]
      ]
    }
  ]
}`;

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-fg/10 px-1 py-0.5 text-[11px] text-fg">{children}</code>
  );
}

/** One level of the structure tree: a label, a description, and (nested) children. */
function Node({
  label,
  children,
  nested,
}: {
  label: ReactNode;
  children: ReactNode;
  nested?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-sm text-fg-secondary">
        <span className="font-medium text-fg">{label}</span> — {children}
      </div>
      {nested && <div className="ml-3 flex flex-col gap-2 border-l border-line pl-4">{nested}</div>}
    </div>
  );
}

export function SchemaReferenceModal({ onClose }: { onClose: () => void }) {
  const [showJson, setShowJson] = useState(false);
  const Chevron = showJson ? ChevronDown : ChevronRight;

  return (
    <Modal onClose={onClose} label="Exercise set format" className="max-w-4xl">
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-medium text-fg">Exercise set format</h3>
          <p className="text-sm text-fg-secondary">
            An exercise set is a single <Code>.json</Code> file — your own transcription of a
            method book you own. Here's how it's structured:
          </p>
        </div>

        <div className="surface-deep flex flex-col gap-3 rounded-[12px] p-4">
          <Node
            label="The set"
            nested={
              <>
                <Node label="sections">
                  the named groups your exercises fall into (e.g. "Single Beat Combinations").
                  Each has an <Code>id</Code>, <Code>title</Code>, and <Code>order</Code>.
                </Node>
                <Node
                  label="exercises"
                  nested={
                    <Node label="pattern">
                      the notes themselves — a list of <strong className="text-fg">bars</strong>,
                      each a list of <strong className="text-fg">notes</strong> (two bars usually
                      make one rep). Every note is a sticking — <Code>{'{ "sticking": "R" }'}</Code>{' '}
                      or <Code>{'{ "sticking": "L" }'}</Code> — or a <Code>"rest"</Code>.
                    </Node>
                  }
                >
                  the individual patterns. Each has a <Code>number</Code>, <Code>name</Code>, the{' '}
                  <Code>sectionId</Code> it belongs to, a <Code>timeSignature</Code>, a{' '}
                  <Code>subdivision</Code> (<Code>8th</Code>, <Code>16th</Code>, …), and a{' '}
                  <Code>pattern</Code>.
                </Node>
              </>
            }
          >
            basic info: <Code>id</Code>, <Code>title</Code>, <Code>source</Code>, and the default{' '}
            <Code>defaultBpm</Code> / <Code>defaultTargetReps</Code>.
          </Node>
        </div>

        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-fg-secondary">
          <li>Every bar in an exercise must have the same number of notes.</li>
          <li>
            That count is the time signature × subdivision — e.g. 4/4 in 8ths is 8 notes per bar,
            4/4 in 16ths is 16.
          </li>
          <li>
            Section <Code>id</Code>s are referenced by each exercise's <Code>sectionId</Code>, so
            they must match.
          </li>
        </ul>

        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowJson((v) => !v)}
            aria-expanded={showJson}
            className="flex items-center gap-1.5 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Chevron size={14} strokeWidth={1.5} className="text-fg-tertiary" aria-hidden />
            Full JSON example
          </button>
          {showJson && (
            <pre className="surface-deep mt-3 overflow-auto rounded-[10px] p-3 text-[11px] leading-snug text-fg-secondary">
              {SCHEMA_EXAMPLE}
            </pre>
          )}
        </div>

        <p className="text-xs text-fg-muted">
          Imported sets are stored only in your browser. They are not sent to any server.
        </p>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="surface-deep h-9 rounded-[10px] px-4 text-sm font-medium text-fg hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
