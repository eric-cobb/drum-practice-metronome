import { Modal } from '../ui';

/** Annotated example for users transcribing their own books. Keep in sync with
 *  the loader's validator (src/data/loadExerciseSet.ts) — anything shown here
 *  must round-trip cleanly through importUserSet. */
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
      "subdivision": "16th",         // "8th" | "8th-triplet" | "16th" | "16th-triplet"
      "recommendedBpm": 60,          // optional; overrides defaultBpm
      "targetReps": 20,              // optional; overrides defaultTargetReps
      "pattern": [
        // Two bars (= one rep). Each bar must have the same length, matching
        // the time signature × subdivision (here: 4/4 × 16th = 16 events).
        [
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, "rest"
        ],
        [
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, { "sticking": "L" },
          { "sticking": "R" }, { "sticking": "L" }, { "sticking": "R" }, "rest"
        ]
      ]
    }
  ]
}`;

export function SchemaReferenceModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} label="Exercise set schema" className="max-w-2xl">
      <div className="flex flex-col gap-3">
        <h3 className="text-[15px] font-medium text-fg">Exercise set schema</h3>
        <p className="text-sm text-fg-secondary">
          An exercise set is a single JSON file ending in{' '}
          <code className="rounded bg-fg/10 px-1 py-0.5 text-xs">.json</code>. Transcribe a
          method book you own using this shape, then import it with the button in the
          Library.
        </p>
        <pre className="surface-deep max-h-[55vh] overflow-auto rounded-[10px] p-3 text-[11px] leading-snug text-fg-secondary">
          {SCHEMA_EXAMPLE}
        </pre>
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
