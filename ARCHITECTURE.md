# Architecture

## Web Audio Scheduler (the most important file in the codebase)

A naive metronome using `setInterval` will drift, hiccup under load, and stall when the tab loses focus. The lookahead scheduler pattern solves all of these by separating the "decide what to play" loop from the "play it" mechanism.

### The pattern

```
┌─────────────────────────────────────────────────────────────┐
│  JS lookahead loop  (setInterval, 25ms)                     │
│  ───────────────────────────────────────────────────────    │
│  while (nextNoteTime < audioContext.currentTime + 0.1):     │
│      scheduleClick(nextNoteTime, isAccent)                  │
│      advance nextNoteTime by (60 / bpm / subdivision)       │
│      advance beat/bar/note counters                         │
│      check for: dropout state, ramp step, rep completion    │
│      emit "beatScheduled" event for visual layer            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ schedules audio events
┌─────────────────────────────────────────────────────────────┐
│  Web Audio API hardware clock                               │
│  oscillator.start(scheduledTime)  ← this is sample-accurate │
└─────────────────────────────────────────────────────────────┘
```

### Constants

```typescript
const LOOKAHEAD_MS = 25;        // how often the JS loop runs
const SCHEDULE_AHEAD_SEC = 0.1; // schedule up to 100ms in the future
```

### Click synthesis

Synthesize clicks rather than load samples. Three distinct sounds:

```typescript
function scheduleClick(time: number, level: ClickLevel) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain).connect(audioContext.destination);
  
  const profile = CLICK_PROFILES[level];
  osc.frequency.value = profile.freq;
  gain.gain.setValueAtTime(profile.gain, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  osc.start(time);
  osc.stop(time + 0.05);
}

type ClickLevel = "downbeat" | "beat" | "subdivision" | "accent";

const CLICK_PROFILES: Record<ClickLevel, { freq: number; gain: number }> = {
  downbeat:    { freq: 1500, gain: 0.40 },  // beat 1 of each bar
  beat:        { freq: 1000, gain: 0.25 },  // other beats
  subdivision: { freq:  800, gain: 0.15 },  // off-beat subdivisions
  accent:      { freq: 1500, gain: 0.55 },  // pattern accent (v2 only)
};
```

The `accent` level is used in Exercise mode (Phase 10) when a pattern note has `accent: true` AND the click subdivision matches the pattern subdivision. In all other cases, the standard `downbeat`/`beat`/`subdivision` levels apply.

Ghost notes do not affect click playback — the click stays uniform whether a pattern note is ghosted or not. Ghost notation is a visual cue for the player.

### Mute behavior

The scheduler always advances counters and emits the `beatScheduled` event. During a muted bar, it skips `scheduleClick` but the event still fires (so the visual indicator and notation cursor still update).

### Stopping cleanly

Keep references to scheduled oscillators in the lookahead window so they can be cancelled on stop. Or accept that up to ~100ms of clicks may play after stop (acceptable, simpler).

### Suspending and resuming

When the user pauses, call `audioContext.suspend()`. The context time freezes, so when you resume, you can recompute `nextNoteTime` from the new `audioContext.currentTime` and continue cleanly.

### BPM changes mid-play (for ramp)

When the ramp adjusts BPM, the next scheduled click recalculates its interval from the new BPM. Already-scheduled clicks in the lookahead window play at the old BPM — this creates a smooth 1-bar transition rather than an abrupt shift.

## Notation Rendering (VexFlow)

### Library

VexFlow 4.x via `npm install vexflow`. Use the SVG renderer, not Canvas (better for highlighting individual notes via CSS class toggling).

### Render once per exercise

Render the VexFlow output once when the exercise loads. Cache the resulting SVG. Do not re-render on each beat — VexFlow's full layout pass is ~5-20ms and would create perceptible UI jank.

### Drum notation specifics (standard 5-line drum staff)

Render exercises on a standard 5-line percussion staff using VexFlow's percussion clef. This matches the notation convention used in current editions of *Stick Control*, *Syncopation*, *Master Studies*, and most contemporary drum method books. The 5-line staff is also what Phase 10's multi-voice rendering targets, so v1 rendering is on the same staff structure as v2 — only the events within the staff change between phases.

```typescript
const stave = new Stave(0, 0, width);
stave.setClef("percussion");  // 5-line percussion clef
stave.addTimeSignature(formatTimeSignature(exercise.timeSignature));
```

**Snare position on the staff**: All v1 exercises are snare-only. The snare is conventionally written on the **middle line of the staff** (3rd line from the bottom). In VexFlow's pitch addressing, this is `c/5` for the percussion clef, with stems pointing up.

Phase 10 will add other voices at their conventional staff positions (kick below the staff, hi-hat and cymbals above, toms at various lines), but the snare's middle-line position is the same in v1 and v2 — no migration of staff position is needed when Phase 10 lands.

### Note generation from exercise pattern (v1)

The pattern is a 2D array: outer dimension is bars, inner is events within each bar. Render each bar as its own `Stave` on the 5-line staff, placed horizontally side by side with bar lines between them. All bars share the same width allocation within the canvas.

```typescript
function barToVexNotes(bar: PatternEvent[], subdivision: Subdivision): StaveNote[] {
  return bar.map((event) => {
    if (event === "rest") {
      return new StaveNote({
        keys: ["c/5"],
        duration: subdivisionToVexRestDuration(subdivision),
      });
    }
    // v1: only snare hits with sticking
    const note = new StaveNote({
      keys: ["c/5"],
      duration: subdivisionToVexDuration(subdivision),
    });
    note.addModifier(
      new Annotation(event.sticking)
        .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
        .setFont("Arial", 12, "normal"),
      0
    );
    return note;
  });
}

function renderExercise(exercise: Exercise, canvasWidth: number) {
  const bars = exercise.pattern;            // PatternEvent[][]
  const barCount = bars.length;
  const barWidth = (canvasWidth - 40) / barCount;  // 40 = clef + time sig allocation
  
  // Staff sizing: increase line spacing from VexFlow default 10 to 16 for prominence.
  // See DESIGN-v2.md "Notation canvas" for rationale.
  const STAFF_LINE_SPACING = 16;
  
  bars.forEach((bar, barIndex) => {
    const stave = new Stave(
      barIndex === 0 ? 0 : 40 + barWidth * barIndex,
      0,
      barWidth + (barIndex === 0 ? 40 : 0),
      { spacing_between_lines_px: STAFF_LINE_SPACING }
    );
    if (barIndex === 0) {
      stave.setClef("percussion");
      stave.addTimeSignature(formatTimeSignature(exercise.timeSignature));
    }
    stave.draw();
    
    const notes = barToVexNotes(bar, exercise.subdivision);
    const beams = Beam.generateBeams(notes);
    Formatter.FormatAndDraw(context, stave, notes);
    beams.forEach((b) => b.setContext(context).draw());
  });
}
```

Only the first bar gets the clef and time signature; subsequent bars are bare staves continuing from the previous bar. Beam groups are computed per-bar (beams don't cross bar lines). Staff line spacing is overridden to 16px (default 10px) for visual prominence — VexFlow scales all child glyphs (noteheads, stems, accidentals, clef) proportionally.

Sticking labels use 18px sans-serif (override VexFlow's default 12px) to remain readable at the larger staff size:

```typescript
note.addModifier(
  new Annotation(event.sticking)
    .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
    .setFont("-apple-system, system-ui, sans-serif", 18, "500"),
  0
);
```

### Multi-voice rendering (v2, Phase 10)

Phase 10 adds voice-specific noteheads, stem directions, and multi-voice composition to the existing 5-line drum staff (already used in v1). VexFlow handles multi-voice via separate `Voice` objects for stems-up content (cymbals, snare) and stems-down content (kick, hi-hat foot), formatted together onto the same `Stave`. The staff structure itself does not change between v1 and v2 — only the events within it.

Voice-to-key mapping (uses VexFlow's standard percussion pitches):

```typescript
const VOICE_TO_VEX: Record<Voice, { key: string; notehead: string; stemDirection: "up" | "down" }> = {
  "snare":         { key: "c/5", notehead: "normal",   stemDirection: "up" },
  "kick":          { key: "f/4", notehead: "normal",   stemDirection: "down" },
  "hihat-closed":  { key: "g/5/x2", notehead: "x",     stemDirection: "up" },
  "hihat-open":    { key: "g/5/x3", notehead: "x",     stemDirection: "up" },  // open marker added as modifier
  "hihat-foot":    { key: "d/4/x2", notehead: "x",     stemDirection: "down" },
  "ride":          { key: "f/5/x2", notehead: "x",     stemDirection: "up" },
  "ride-bell":     { key: "f/5/d3", notehead: "diamond", stemDirection: "up" },
  "crash":         { key: "a/5/x2", notehead: "x",     stemDirection: "up" },
  "tom-high":      { key: "e/5", notehead: "normal",   stemDirection: "up" },
  "tom-mid":       { key: "b/4", notehead: "normal",   stemDirection: "up" },
  "tom-low":       { key: "a/4", notehead: "normal",   stemDirection: "down" },
};
```

Pattern-to-VexFlow conversion in v2:
1. Walk the pattern. For each `Hit`, partition its voices by stem direction (up vs down).
2. Build two parallel arrays of `StaveNote`s: one for stems-up voices, one for stems-down voices.
3. At any position where one side has no voice, insert a hidden rest in that side to keep voices aligned in time.
4. Create two `Voice` objects (numerator beats per measure, with the configured `beat_value`).
5. Format them together with `Formatter.joinVoices([upVoice, downVoice]).format(...)`.
6. Beam each voice independently with `Beam.generateBeams()`.

Modifiers per hit:
- Accent → `Articulation("a>")` attached to the note
- Ghost → notehead style "parentheses" (custom modifier or hand-drawn)
- Sticking → `Annotation` below the staff (or above, for stems-down notes)
- Ornament → `GraceNoteGroup` prepended to the note (flam = 1 grace, drag = 2 graces, ruff = 3 graces, buzz = special z-shaped notehead grace)

### Schema migration (v1 → v2)

A single pure function handles upgrade at load time. The 2D pattern shape is unchanged between v1 and v2 — only the per-event content changes (and the time signature was already an object in v1):

```typescript
function migrateExerciseSet(raw: unknown): ExerciseSetV2 {
  const set = parseAndValidate(raw);  // zod or hand-rolled
  if (set.schemaVersion === 2) return set;
  if (set.schemaVersion === 1) {
    return {
      ...set,
      schemaVersion: 2,
      exercises: set.exercises.map(ex => ({
        ...ex,
        pattern: ex.pattern.map(bar =>          // outer: bars
          bar.map(event =>                       // inner: events in bar
            event === "rest"
              ? "rest"
              : { voices: ["snare"], sticking: event.sticking }
          )
        ),
      })),
    };
  }
  throw new Error(`Unsupported schemaVersion: ${set.schemaVersion}`);
}
```

This runs once per set on load. The migrated set is held in memory; the on-disk file is not rewritten.

### Current-note highlighting (works for both v1 and v2)

The highlight is a three-layer treatment: a background band (peripheral), notehead color + glow (focal), and a brief scale transform (motion). See DESIGN-v2.md "Active note highlight" for the visual rationale.

**Three SVG layers per note:**

After VexFlow renders, the DOM contains the staff and notes. For each note, inject a `<rect>` band element into a dedicated layer beneath the notes:

```typescript
function injectBandLayer(svg: SVGElement, staveBars: Stave[], bars: PatternEvent[][]) {
  const ns = "http://www.w3.org/2000/svg";
  const bandLayer = document.createElementNS(ns, "g");
  bandLayer.setAttribute("class", "band-layer");
  // Insert as the first child so it renders behind everything else
  svg.insertBefore(bandLayer, svg.firstChild);
  
  bars.forEach((bar, barIndex) => {
    const stave = staveBars[barIndex];
    const yTop = stave.getYForLine(0) - 4;
    const yBottom = stave.getYForLine(4) + 4;
    const height = yBottom - yTop;
    
    bar.forEach((event, noteIndex) => {
      if (event === "rest") return;  // no band on rests
      const noteEl = document.getElementById(`note-${barIndex}-${noteIndex}`);
      if (!noteEl) return;
      // Get notehead center x from the rendered SVG
      const bbox = (noteEl.querySelector(".vf-notehead") as SVGGraphicsElement).getBBox();
      const noteX = bbox.x + bbox.width / 2;
      
      const band = document.createElementNS(ns, "rect");
      band.setAttribute("id", `band-${barIndex}-${noteIndex}`);
      band.setAttribute("class", "highlight-band");
      band.setAttribute("x", String(noteX - 8));
      band.setAttribute("y", String(yTop));
      band.setAttribute("width", "16");
      band.setAttribute("height", String(height));
      band.setAttribute("rx", "3");
      band.setAttribute("opacity", "0");
      bandLayer.appendChild(band);
    });
  });
}
```

Each note's `<g>` element gets a stable `id` of `note-{barIndex}-{noteIndex}`. Each band gets a matching `band-{barIndex}-{noteIndex}`.

**Highlight on/off:**

When the scheduler emits `beatScheduled`, the notation component updates two elements: the band (opacity), and the note group (CSS class for color + glow + scale).

```typescript
function setActiveNote(barIndex: number, noteIndex: number, prev?: { barIndex: number; noteIndex: number }) {
  // Clear previous
  if (prev) {
    document.getElementById(`note-${prev.barIndex}-${prev.noteIndex}`)
      ?.classList.remove("note-active");
    document.getElementById(`band-${prev.barIndex}-${prev.noteIndex}`)
      ?.setAttribute("opacity", "0");
  }
  // Activate current
  document.getElementById(`note-${barIndex}-${noteIndex}`)
    ?.classList.add("note-active");
  document.getElementById(`band-${barIndex}-${noteIndex}`)
    ?.setAttribute("opacity", "1");
}
```

**CSS:**

```css
.highlight-band {
  fill: theme('colors.sky.500');           /* light mode */
  fill-opacity: 0.25;
  transition: opacity 60ms ease-out;
}
.dark .highlight-band {
  fill: theme('colors.sky.400');           /* dark mode */
}

/* Color: tint the whole note group (notehead glyph, stem, and the sticking
   text inside .vf-annotation) to the accent. Cheap; no filter cost. */
.note-active,
.note-active :is(path, text) {
  fill: theme('colors.sky.500');
  stroke: theme('colors.sky.500');
}
.dark .note-active,
.dark .note-active :is(path, text) {
  fill: theme('colors.sky.400');
  stroke: theme('colors.sky.400');
}

/* Layer 2 (glow) + Layer 3 (scale) — applied to the notehead glyph + stem
   ONLY, not the whole .note-active <g>. VexFlow nests the sticking
   annotation inside .vf-notehead (at .vf-notehead > .vf-annotation > text),
   so we use the direct-child combinator on .vf-notehead to grab the
   notehead glyph while leaving the annotation alone. Filter or scale on
   the parent <g> would (a) rasterize the sticking text through the
   drop-shadow and smudge it, and (b) make the R/L characters jitter on
   every beat. Both are visible defects; the scoped selector avoids them. */
.note-active .vf-notehead > text,
.note-active .vf-stem {
  filter: drop-shadow(0 0 4px theme('colors.sky.500'))
          drop-shadow(0 0 8px theme('colors.sky.400'));
  transform: scale(1.2);
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 60ms ease-out;
}
```

The `transform-box: fill-box` is critical — it makes `transform-origin: center` pivot around each scaled element's own bbox center rather than the SVG canvas origin. Without it, the scale transform shifts the note's position.

**Reduced motion:**

When `prefers-reduced-motion: reduce` is set, drop the scale transform and the transition timing — keep the band opacity change and the color/glow. The motion layer is removed but the focal and peripheral layers remain.

```css
@media (prefers-reduced-motion: reduce) {
  .note-active .vf-notehead > text,
  .note-active .vf-stem {
    transform: none;
  }
  .highlight-band {
    transition: none;
  }
}
```

Cheap, fast, smooth. No React re-renders, just DOM attribute and class toggling. The three layers cost ~5 DOM operations per note transition, well within budget even at 180 BPM with 16th notes.

### Note index tracking across bars

The pattern is a 2D array: `pattern[barIndex][noteIndex]`. As the scheduler advances through a rep, it tracks both:

- `currentBarIndex`: which bar of the pattern is currently playing (0 to `pattern.length - 1`)
- `currentNoteInBar`: which note position within that bar (0 to `pattern[currentBarIndex].length - 1`)

When the last note of the last bar plays, the rep counter increments and both indices reset to 0 for the next rep.

For highlighting in notation, each rendered note's SVG element has an id of `note-{barIndex}-{noteIndex}` so the highlighter can address it directly:

```typescript
const el = document.getElementById(`note-${currentBarIndex}-${currentNoteInBar}`);
```

This eliminates the modulo-based wrapping logic that was needed when the renderer only displayed one bar — the renderer now displays all bars, and each note has a unique address.

## State Management (Zustand)

Four stores in `src/state/`:

### `metronome.ts`
Live metronome state — the things that change while playing.

```typescript
{
  // config
  bpm: number
  timeSignature: { numerator: number; denominator: 2 | 4 | 8; displayAs?: "cut" | "common" }
  subdivision: Subdivision
  accentPattern: boolean[]
  preRollEnabled: boolean
  
  // play state
  isPlaying: boolean
  isPreRolling: boolean
  currentBeat: number       // beat within current bar
  currentBarIndex: number   // index into pattern[], 0-based
  currentNoteInBar: number  // index within pattern[currentBarIndex], for highlighting
  
  // features
  dropout: DropoutConfig | null
  ramp: RampConfig | null
  repCounter: { barsPerRep: number; targetReps: number; currentReps: number }
  
  // actions
  start(): void
  stop(): void
  setBpm(bpm: number): void
}
```

### `exercises.ts`

Holds the loaded sets, the active set, and the current exercise position. Note that `availableSets` is loaded once at app startup by importing all JSON files in `src/data/exercises/`; `loadedSet` is the single fully-loaded active set's data.

```typescript
{
  availableSets: ExerciseSetSummary[];  // {id, title, exerciseCount} for the set selector
  activeSetId: string;                  // "stick-control"
  loadedSet: ExerciseSet | null;        // full data for the active set
  currentExerciseId: string;            // exercise.id within loadedSet (not array index)
  setStates: Record<string, SetState>;  // per-set state (see SPEC §7)
  autoStartNext: boolean;
  
  loadSet(setId: string): Promise<void>;       // switches active set, restores its SetState
  setExerciseById(exerciseId: string): void;   // jump by id (not index)
  nextExercise(): void;                        // crosses section boundaries
  previousExercise(): void;
  markCurrentComplete(): void;                 // updates exerciseProgress, advances
  
  // Selectors
  getCurrentExercise(): Exercise | null;
  getCurrentSection(): Section | null;
  getExercisesBySection(): Map<string, Exercise[]>;  // ordered map for selector grid
}
```

**Why `currentExerciseId` instead of `currentExerciseIndex`:** Exercises can be reordered, added, or removed in the JSON over time. Indexing by id makes the SetState resilient to those changes — if exercise #3 is renumbered or moved, the user's saved position still resolves correctly. If an exercise referenced by id is missing from the loaded set (e.g., it was deleted), fall back to the first exercise in the set.

When `currentExerciseId` changes, the active exercise's config (time signature, subdivision, and `pattern.length` as the bar count) is pushed into the `metronome` store, and the Notation component re-renders all bars.

### `progress.ts`

Wraps the `ExerciseProgress` Dexie table. Updated incrementally whenever a session finishes; never recomputed from scratch.

```typescript
{
  getProgress(setId: string, exerciseId: string): Promise<ExerciseProgress | null>;
  getProgressForSet(setId: string): Promise<ExerciseProgress[]>;
  getCompletedCount(setId: string): Promise<number>;
  getCompletedCountInSection(setId: string, sectionId: string): Promise<number>;
  
  // Called from sessions.ts when a session is finalized
  recordSession(session: Session, setDefaults: { defaultBpm: number }): Promise<void>;
  
  // Bulk operations
  resetSetProgress(setId: string): Promise<void>;  // for "Reset progress" button
}
```

The `recordSession` function applies the completion definition from SPEC §7:

```typescript
async function recordSession(session: Session, setDefaults: { defaultBpm: number }) {
  if (session.mode !== "exercise") return;
  if (!session.exerciseSetId || !session.exerciseId) return;
  
  const id = `${session.exerciseSetId}:${session.exerciseId}`;
  const existing = await db.exerciseProgress.get(id);
  
  const sessionMeetsCompletion =
    session.repsCompleted >= session.targetReps &&
    session.endBpm >= setDefaults.defaultBpm;
  
  const updated: ExerciseProgress = {
    id,
    setId: session.exerciseSetId,
    exerciseId: session.exerciseId,
    completed: (existing?.completed ?? false) || sessionMeetsCompletion,
    bestBpm: sessionMeetsCompletion
      ? Math.max(existing?.bestBpm ?? 0, session.endBpm)
      : (existing?.bestBpm ?? null),
    totalReps: (existing?.totalReps ?? 0) + session.repsCompleted,
    totalSessions: (existing?.totalSessions ?? 0) + 1,
    firstCompletedAt: existing?.firstCompletedAt ?? (sessionMeetsCompletion ? Date.now() : null),
    lastPracticedAt: Date.now(),
  };
  
  await db.exerciseProgress.put(updated);
}
```

Completion is **monotonic** — once an exercise is marked complete, it stays complete even if subsequent sessions don't meet the threshold. This is intentional: re-practicing an already-completed exercise at a lower tempo shouldn't "uncomplete" it.

### `sessions.ts`
Wrapper around Dexie. Exposes:
- `saveSession(session: Session): Promise<number>`
- `getAllSessions(): Promise<Session[]>`
- `getSessionsByDateRange(start, end): Promise<Session[]>`
- `getSessionsByExercise(setId: string, exerciseId: string): Promise<Session[]>`  // requires setId now
- `getRecentExercisesForSet(setId: string, limit: number): Promise<{exerciseId: string; lastPracticedAt: number}[]>`  // for "Recent" row in selector
- `deleteSession(id: number): Promise<void>`
- `exportAllAsJson(): Promise<Blob>`
- `importFromJson(blob: Blob, mode: "merge" | "replace"): Promise<{imported: number; skipped: number}>`

When a session is saved, `sessions.ts` calls `progress.recordSession(session, setDefaults)` to update the progress table.

### `settings.ts`
Last-used settings persisted to localStorage. Hydrates on app mount. Writes debounced (300ms) on change. Includes:
- `lastMode: "free" | "exercise"`
- `lastActiveSetId: string` (replaces the old positionBySet)
- `setStates: Record<string, SetState>` (per-set state objects)
- All other Free mode settings (BPM, time sig, subdivision, accent pattern, dropout, ramp)
- All toggle settings (pre-roll, auto-stop, count-in enabled, count-in bars, theme)

## Visual Beat Indicator + Notation Cursor

The audio scheduler emits a `beatScheduled` event for each scheduled note (every subdivision, not just every beat) with:

```typescript
{
  scheduledTime: number;     // audioContext time
  beatNumber: number;        // beat within bar
  noteIndexInBar: number;    // subdivision index within bar
  isDownbeat: boolean;
  isMuted: boolean;
}
```

Subscribers compute their own delay from `audioContext.currentTime` and schedule a DOM update at the right moment:

```typescript
scheduler.on('beatScheduled', (evt) => {
  const delayMs = (evt.scheduledTime - audioContext.currentTime) * 1000;
  setTimeout(() => {
    setActiveBeat(evt.beatNumber);
    // also update notation cursor here
  }, delayMs);
});
```

This decouples audio timing from React rendering. The scheduler runs at 25ms intervals; React only re-renders on the actual beat boundary.

## Persistence

### localStorage (settings + exercise position)
```
key: "metronome-settings-v1"
value: JSON.stringify(settings)
```
Single key, single blob, versioned in the key name for migrations.

### IndexedDB via Dexie (sessions + progress + user sets)
```typescript
class MetronomeDB extends Dexie {
  sessions!: Table<Session, number>;
  exerciseProgress!: Table<ExerciseProgress, string>;
  userSets!: Table<UserSet, string>;
  
  constructor() {
    super('MetronomeDB');
    this.version(1).stores({
      sessions: '++id, startTime, mode, exerciseSetId, exerciseId, exerciseName',
      exerciseProgress: 'id, setId, completed, lastPracticedAt',
      userSets: 'id, importedAt'
    });
  }
}

type UserSet = {
  id: string;                   // matches ExerciseSet.id
  importedAt: number;           // unix ms
  data: ExerciseSet;            // the full set object as imported
};
```

Indexes:
- `sessions.exerciseSetId` + `sessions.exerciseId`: scoped queries like "all sessions for Stick Control exercise sc-05"
- `exerciseProgress.setId`: fetch all progress rows for the active set in one query (used by the selector)
- `exerciseProgress.completed`: count completed exercises per set efficiently
- `exerciseProgress.lastPracticedAt`: find recent exercises for the "Recents" row in the selector
- `userSets.importedAt`: list imported sets in import-order for the Settings UI

## Exercise Data Loading

Sets come from two sources: bundled JSON files in `src/data/exercises/` (compiled into the app at build time) and user-imported JSON stored in IndexedDB (loaded at runtime). The app merges these into a single registry that the rest of the code reads from.

### Bundled sets

Loaded at build time via Vite's glob import:

```typescript
const bundledModules = import.meta.glob('../data/exercises/*.json', { eager: true });

async function loadBundledSets(): Promise<LoadedSet[]> {
  const sets: LoadedSet[] = [];
  for (const [path, module] of Object.entries(bundledModules)) {
    try {
      const raw = (module as { default: unknown }).default;
      const set = validateExerciseSet(raw);
      sets.push({ ...set, origin: "bundled" });
    } catch (err) {
      console.error(`Failed to load bundled set from ${path}:`, err);
      // Non-blocking; surfaced in UI for that specific set
    }
  }
  return sets;
}
```

Only content the developer is authorized to distribute belongs in `src/data/exercises/`. See SPEC §7 "Exercise set management" for the policy.

### User-imported sets

Stored in a Dexie table, loaded at app startup alongside bundled sets. The schema for the new table is in the "Persistence" section above; the loader is:

```typescript
async function loadUserSets(): Promise<LoadedSet[]> {
  const records = await db.userSets.toArray();
  return records.map(r => ({ ...r.data, origin: "user-imported" as const }));
}
```

### Combined registry

At app startup, both sources are loaded and merged:

```typescript
type LoadedSet = ExerciseSet & { origin: "bundled" | "user-imported" };

async function loadAllSets(): Promise<LoadedSet[]> {
  const [bundled, userImported] = await Promise.all([
    loadBundledSets(),
    loadUserSets(),
  ]);
  // User-imported wins on id collision (shouldn't happen — import flow prevents it,
  // but defensive in case of data corruption)
  const byId = new Map<string, LoadedSet>();
  for (const set of bundled) byId.set(set.id, set);
  for (const set of userImported) byId.set(set.id, set);
  return Array.from(byId.values());
}
```

The `origin` field is what the UI uses to render the "user-imported" badge in the selector and to enable Export/Delete buttons in Settings (only valid for user-imported sets).

### Import flow

```typescript
type ImportResult =
  | { ok: true; set: ExerciseSet }
  | { ok: false; error: string }
  | { ok: false; conflict: { existing: boolean; bundled: boolean; suggestedNewId: string } };

async function importUserSet(file: File): Promise<ImportResult> {
  const text = await file.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Not a valid JSON file." };
  }
  
  let set: ExerciseSet;
  try {
    set = validateExerciseSet(raw);
  } catch (err) {
    return { ok: false, error: `Schema validation failed: ${(err as Error).message}` };
  }
  
  const existing = await db.userSets.get(set.id);
  const bundled = bundledSetIds.has(set.id);
  if (existing || bundled) {
    return {
      ok: false,
      conflict: {
        existing: !!existing,
        bundled,
        suggestedNewId: generateUniqueId(set.id),
      },
    };
  }
  
  await db.userSets.put({ id: set.id, importedAt: Date.now(), data: set });
  return { ok: true, set };
}
```

Conflict resolution UI: when a collision occurs, prompt the user with options "Replace existing", "Keep both (rename imported as `{suggestedNewId}`)", or "Cancel". If the existing set is bundled (not user-imported), the "Replace" option is disabled — bundled sets cannot be overwritten.

### Export flow

```typescript
async function exportUserSet(setId: string): Promise<Blob> {
  const record = await db.userSets.get(setId);
  if (!record) throw new Error(`No user-imported set with id ${setId}`);
  const json = JSON.stringify(record.data, null, 2);
  return new Blob([json], { type: "application/json" });
}
```

The exported file is byte-equivalent to a clean re-export of the set, suitable for re-importing into another browser or another user's app.

### Delete flow

```typescript
async function deleteUserSet(setId: string): Promise<void> {
  await db.userSets.delete(setId);
  // Deliberately preserved:
  //   - SetState in localStorage (current exercise, BPM) — restored if re-imported
  //   - Session log entries referencing this set
  //   - ExerciseProgress rows for this set
}
```

If the user re-imports a set with the same id, their previous state and progress are automatically restored.

### Schema validation

Run validation on both bundled and user-imported sets. Use Zod (or a hand-rolled equivalent) for:

- Top-level fields present with correct types
- Each `section` has unique `id` within the set
- Each `exercise.sectionId` references an existing section
- Each `exercise.id` is unique within the set
- Each `exercise.pattern` is a non-empty 2D array with all bars equal length
- Each pattern event is `"rest"` or `{ sticking: "R" | "L" }`
- Time signature numerator is 2-13, denominator is 2/4/8

On validation failure, return a structured error with a specific message (e.g., "Section 'triplets' referenced by exercise 'sc-25' is not defined in the sections array") so users transcribing their own content can fix their JSON without reading source code.

## Why these choices

**Vite over Next.js**: single-page app, no SSR. Vite imports JSON natively and HMR is fast.

**Zustand over Redux/Context**: scheduler needs synchronous reads from outside React. Zustand's `getState()` works perfectly; Context doesn't.

**IndexedDB over localStorage for sessions**: sessions can accumulate. IndexedDB handles this trivially, supports indexed queries.

**Synthesized clicks**: no asset loading, instant start, drum metronome clicks don't need to be beautiful — they need to be precise.

**VexFlow over MuseScore / abc.js / OpenSheetMusicDisplay**: lightweight, programmatic API, SVG output, drum notation support, no dependency on importing MusicXML. We're constructing notation from a simple sticking array, not rendering external scores.

**JSON for exercises (not TypeScript)**: human-editable, no recompile to add exercises, easy to swap sets, easy to share or version.

**No backend**: zero deployment, zero auth, zero ongoing service. JSON export covers backup.

## Future: audio analysis (v2, not in v1 scope)

The metronome can optionally export a click schedule JSON on stop. The user records audio separately in Logic Pro. A standalone Python tool (Librosa + madmom) ingests the wav plus the click schedule, performs onset detection, aligns to the schedule, and computes per-note timing drift. Stays in Python, not in the web app.

The schema for the click schedule export:

```typescript
type ClickSchedule = {
  sessionId: number;
  startedAt: number;
  exerciseId?: string;       // if Exercise mode
  pattern?: Sticking[];      // expected stickings, for sticking-aware drift analysis
  events: Array<{
    timeOffsetMs: number;
    bar: number;
    beat: number;
    noteIndexInBar: number;
    expectedSticking?: "R" | "L" | "-";
    bpm: number;
    isAccent: boolean;
    isMuted: boolean;
  }>;
};
```

For Exercise mode sessions, the schedule includes the expected sticking per event, which opens up later analysis like "your left hand is consistently 8ms behind your right" — exactly the kind of insight that's hard to get any other way.
