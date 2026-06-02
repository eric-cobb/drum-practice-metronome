# Specification: Practice Metronome App

The app has two modes (Free and Exercise) sharing a common metronome engine, session log, and settings. Sections 1–4 apply to both modes. Sections 5–6 are Free mode only. Section 7 is Exercise mode only.

## 1. Metronome (shared)

### Tempo
- **BPM range**: 30–300
- **Controls**: slider, numeric input, +/- buttons (1 BPM and 5 BPM steps), tap tempo
- **Tap tempo**: average of last 4 taps; reset tap history if >3s between taps

### Time signature
- Numerator: 2–13
- Denominator: 2, 4, or 8
- Common presets quick-select: 2/2 (cut time), 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8
- The cut time preset displays as "₵" (alla breve symbol) on the time signature pill in Free mode and on the staff in notation; otherwise 2/2 is rendered as "2/2"
- When denominator is 2, the beat unit is the half note: there are `numerator` half notes per bar. For metronome click purposes, clicks fall on the half notes (i.e., a 2/2 bar produces 2 clicks per bar at the configured BPM)
- In Exercise mode, time signature is determined by the exercise and not user-editable

### Subdivisions
- Quarter, 8th, 16th, 8th-triplet, 16th-triplet
- Subdivision clicks play at lower volume than main beats
- In Exercise mode, subdivision is determined by the exercise and not user-editable

### Accent
- Default: accent (louder + higher pitch) on beat 1 of each bar
- **Custom accent pattern** (Free mode): per-beat toggle. Persisted with settings.

### Visual beat indicator
- Pulses on each beat
- Downbeat visually distinct (color and/or size)
- Continues to pulse during muted dropout bars

### Pre-roll
- Optional 1-bar countdown before starting
- During pre-roll: count plays at the configured tempo but rep counter doesn't advance
- Toggle in settings; applies to both modes

### Start / Stop
- Single button toggles play state
- Space bar keyboard shortcut
- Stopping saves the in-progress session to the log (if any reps were completed)

## 2. Rep Counter (shared)

- **Bars per rep**: integer, default 2, range 1–16. In Free mode, this is user-configurable. In Exercise mode, this is determined by the exercise (`pattern.length`) and not user-editable.
- **Target reps**: integer, default 20, range 1–999
- **Current rep count**: large display, dominates the UI when playing
- **Auto-stop at target**: toggle, default ON. When enabled and a non-Exercise session hits target, the metronome stops and plays a completion sound. In Exercise mode, hitting target instead auto-advances to the next exercise (see §7).
- **Manual override**: +/- buttons to adjust counter mid-session
- **Visual progress**: thin progress bar under the counter showing reps / target

A "rep" is a full playthrough of `bars per rep` bars. In Exercise mode, this means playing through every bar in the exercise's pattern array once. In Free mode, it means playing through `bars per rep` bars regardless of content.

## 3. Mode Toggle (shared)

- Top-level toggle in the header: "Free" / "Exercise"
- Switching modes while playing stops the current session and saves it
- Last-used mode persists across reloads

## 4. Session Log (shared)

### Auto-capture
A session is created when Start is pressed and finalized when Stop is pressed (or auto-advance/auto-stop fires). Captured fields:

```typescript
type Session = {
  id: number;
  startTime: number;       // unix ms
  endTime: number;
  durationSeconds: number;
  mode: "free" | "exercise";
  
  // Free mode
  exerciseName: string;    // user-entered, optional
  
  // Exercise mode
  exerciseSetId?: string;  // e.g., "stick-control"
  exerciseId?: string;     // e.g., "sc-pg5-01"
  exerciseDisplayName?: string; // for log readability
  
  startBpm: number;
  endBpm: number;
  timeSignature: { numerator: number; denominator: 2 | 4 | 8 };
  subdivision: Subdivision;
  barsPerRep: number;       // For Free mode: the user-configured value.
                            // For Exercise mode: the exercise's pattern.length.
  targetReps: number;
  repsCompleted: number;
  dropoutConfig: DropoutConfig | null;
  rampConfig: RampConfig | null;
  completed: boolean;      // true if target reps was hit
  notes: string;
};
```

A session is only saved if `repsCompleted >= 1`.

### List view
- Chronological, most recent first
- Free sessions show exercise name (or "Untitled")
- Exercise sessions show exercise set + exercise display name (e.g., "Stick Control · #5 Paradiddle R")
- Click row to expand: full config + optional retrospective notes
- Filter by mode, exercise (substring), date range
- Delete individual sessions (with confirm)

### Export
- "Export all sessions" button → JSON file: `metronome-sessions-{YYYY-MM-DD}.json`
- Export format: a top-level object with `{ schemaVersion: 1, exportedAt: <iso timestamp>, sessions: Session[] }`. Wrapping the array in an object (rather than exporting a bare array) allows future format changes without breaking older importers.

### Import
- "Import sessions from JSON" button → file picker accepts a previously-exported JSON file
- Validates the file structure before importing; rejects malformed files with a clear error message in the UI
- **Merge strategy**: default behavior is to add imported sessions without overwriting existing ones. Imported sessions are matched against existing sessions by `(startTime, mode, exerciseId)` tuple — exact matches are skipped as duplicates. New sessions get fresh auto-incremented IDs (the imported `id` field is discarded).
- After import, the UI shows a summary: "Imported X new sessions, skipped Y duplicates."
- Optional "Replace all" checkbox: if enabled, the import wipes the existing session table first, then loads only the imported sessions. Requires a confirmation dialog ("This will delete all current session history. Continue?").
- Importing never modifies the on-disk JSON file; it's read-only.

### Persistent storage
- On first app load, call `navigator.storage.persist()` to request that the browser treat the app's storage as persistent and not subject to automatic eviction under storage pressure.
- This is a one-time request; the browser remembers the answer. Some browsers grant it silently for installed/bookmarked sites; others may prompt the user. Either outcome is fine — the request is best-effort and the app functions correctly regardless.
- Display the current persistence status somewhere in settings (e.g., "Storage: persistent" or "Storage: best-effort"). Useful diagnostic if the user later wonders whether their data is safe.

### Backup recommendations (shown in UI)
- A small note near the Export button: "Sessions are stored locally in your browser. Export regularly as a backup."
- Optional: nag dialog (dismissible, once per 30 days) suggesting an export if it has been more than 30 days since the last one and there are more than 20 unexported sessions.

### Stats
At the top of the session log:
- Total practice time this week
- Number of sessions this week
- For Exercise mode: highest BPM hit for each completed exercise (in the active set)
- For Free mode: highest BPM hit for each named exercise (top 5)

## 5. Click Dropout (Free mode only)

Two modes, mutually exclusive, plus "off".

### Scheduled dropout
- **Bars on**: integer, default 4, range 1–32
- **Bars off**: integer, default 2, range 1–32
- Pattern: play for `barsOn` bars, mute for `barsOff` bars, repeat
- During mute: no click audio, but visual beat indicator continues
- Click resumes precisely on the downbeat of the next "on" cycle

### Random dropout
- **Mute probability**: 0–100% per bar, default 25%
- **Max consecutive muted bars**: 1–8, default 2
- **Min bars between mutes**: 0–8, default 2
- First bar of a session is never muted

### Behavior notes
- Subdivisions are also muted during mute bars
- Rep counter continues to advance during muted bars

## 6. Tempo Ramp (Free mode, optional in Exercise mode)

- **Start BPM** and **End BPM** (each within 30–300)
- **Step size**: BPM change per step, default +2 BPM, range 1–20
- **Step trigger**:
  - "Every N reps" (default, N=2)
  - "Every N seconds" (N=30)
- **Direction**: up or down, inferred from start/end values
- **Auto-stop at end**: toggle, default ON
- **Ramp + rep counter interaction**: whichever stop condition hits first stops the metronome

In Exercise mode, the ramp can be enabled to push each exercise upward in tempo across reps, but the ramp resets to start BPM when advancing to the next exercise. Disabled by default in Exercise mode.

## 7. Exercise Mode

### Exercise set loading

The app supports multiple exercise sets (one method book per set). Sets come from two sources:

**Bundled sets** ship with the app in `src/data/exercises/` and are auto-discovered at build time. These are content the developer is authorized to distribute — public-domain rudiments, the developer's own original sequences, or content explicitly licensed for inclusion. Bundled sets cannot be deleted, modified, or replaced from within the app.

**User-imported sets** are JSON files the user imports via file picker at runtime. They live in IndexedDB, scoped to the user's browser. User-imported sets can be deleted, replaced, or exported back to JSON. The app distributes zero copyrighted content; users who own a method book transcribe their copy into a JSON file (using the documented schema) and import it into the app.

This split is intentional for a publicly shared app: it lets users practice with content from any method book they own, without the distributor having to license rights to every book. The distributor only ships content they have the right to distribute. Users keep their transcriptions local.

- Available sets at any time = bundled sets + user-imported sets
- The active set is whichever set the user most recently selected (persisted)
- Default set on first run: the first bundled set in alphabetical order by `id`
- Set selector in the Exercise Popover lists both kinds, visually distinguished (user-imported sets carry a small "user-imported" badge)
- Switching sets saves the in-progress session and restores the new set's last position
- Each set tracks its own state independently — switching sets and switching back restores everything about your previous session in that set
- Validation runs on every set at load time; malformed sets surface a clear error in the UI for that specific set; other sets continue to work normally; the app does not crash

### User-imported sets

Users add a method book to the app by:

1. Opening Settings → Exercise sets → "Import a set..."
2. Selecting a `.json` file matching the documented schema
3. The app validates the file (schema check, referential integrity for sectionId, duplicate set id check)
4. On success: the set is stored in IndexedDB, appears in the selector immediately, and is available for practice
5. On validation failure: a clear error message indicates what's wrong; no partial import

**Duplicate set ids:** If the imported set's `id` matches an existing set (bundled or user-imported), the user is prompted: "A set named X already exists. Replace it, keep both (rename imported), or cancel?" Renaming generates a unique id like `stick-control-2`.

**Editing imported sets:** Out of scope for v1 (the in-app editor is Phase 11). For now, users edit the JSON externally and re-import (replacing the existing version).

**Exporting:** Each imported set has an "Export" button in its settings entry that downloads the JSON file. Useful for backing up transcribed content or sharing with another user who also owns the same book.

**Deletion:** Each imported set has a "Delete" button with a confirmation dialog. Deleting removes the set from IndexedDB. Session log entries referencing that set are NOT deleted (they remain as historical records); the session log displays "Set: stick-control (deleted)" for orphaned references.

**Privacy note shown in the import UI:** "Imported exercise sets are stored only in your browser. They are not sent to any server. If you have rights to share a transcribed method book, you can export the JSON and share it directly with the recipient."

### Per-set state

Each set's user-facing state is tracked independently:

```typescript
type SetState = {
  setId: string;
  currentExerciseId: string;          // last exercise the user was on
  currentBpm: number;                 // last BPM used in this set
  sectionsCollapsed: Record<string, boolean>;  // which sections are collapsed in the selector
};
```

Stored in localStorage as `Record<string, SetState>` keyed by `setId`. SetState persists independently of whether the set is bundled or imported — if a user deletes an imported set and later re-imports a set with the same id, their previous state for that set is restored automatically.

### Exercise data schema

```typescript
type ExerciseSet = {
  id: string;              // "stick-control" — stable identifier, used as key in localStorage,
                           // session log, and exerciseProgress table
  title: string;           // "Stick Control for the Modern Snare Drummer"
  source: string;          // attribution / book reference
  defaultBpm: number;      // suggested starting tempo for the set
  defaultTargetReps: number; // typically 20
  schemaVersion: 1;        // bump when schema changes; see §12 for the v2 expansion in Phase 10
  sections: Section[];     // section structure, displayed in selector
  exercises: Exercise[];
};

type Section = {
  id: string;              // stable identifier, e.g., "single-beat-combinations"
                           //   (kebab-case, used as foreign key from Exercise.sectionId)
  title: string;           // display name, e.g., "Single Beat Combinations"
  order: number;           // display order within the set (lowest first)
  description?: string;    // optional, shown at the top of the section in the selector
};

type Exercise = {
  id: string;              // unique within set, e.g., "sc-05"
  number: number;          // 1, 2, 3...
  name: string;            // descriptive, e.g., "Singles R"
  sectionId: string;       // references Section.id within the same set
  
  // Pattern as a 2D array of bars.
  // Outer array: one entry per bar in the exercise.
  // Inner array: events within that bar (one entry per note position).
  // Each event = one note. The number of bars = `pattern.length`.
  // All bars play in sequence to make one repetition.
  // Bars within a rep do NOT need to be identical — many exercises in
  // method books are asymmetric over their bars (e.g., bar 1 starts on R,
  // bar 2 starts on L). The schema represents each bar explicitly.
  pattern: PatternEvent[][];
  
  timeSignature: {
    numerator: number;
    denominator: 2 | 4 | 8;
    displayAs?: "cut" | "common"; // optional notation override:
                                  // "cut" renders ₵ instead of 2/2
                                  // "common" renders 𝄴 instead of 4/4
                                  // omitted = render as "numerator/denominator"
  };
  subdivision: Subdivision; // determines note value of each pattern event
  
  // Optional overrides; if absent, use set defaults
  recommendedBpm?: number;
  targetReps?: number;
  notes?: string;          // optional practice notes
};

// Pattern events are either a single snare hit (with sticking) or a rest.
// The object-wrapped form is intentional — it allows additive expansion in Phase 10
// to multi-voice, accents, and ornaments without restructuring existing JSON.
type PatternEvent = { sticking: "R" | "L" } | "rest";
type Subdivision = "quarter" | "8th" | "16th" | "8th-triplet" | "16th-triplet";
```

**Section structure:** Sections are first-class objects rather than a free-text field on each exercise. This means renaming a section ("Single Beat Combinations" → "Single Stroke Combinations") is a one-line change in the `sections` array, and reordering sections is just adjusting `order` values. Each `Exercise.sectionId` references a `Section.id` within the same set. Validation should reject any exercise whose `sectionId` doesn't match an existing section.

**Set independence:** Each `ExerciseSet` has its own sections, exercises, and identifiers. Two sets can have sections or exercises with the same `id` (e.g., both Stick Control and Master Studies might have a `"sc-01"` exercise id) because IDs are namespaced by set — the composite `(setId, exerciseId)` is what's globally unique.

The `pattern` is a 2D array. `pattern.length` is the number of bars per rep (typically 2 for Stick Control). Each `pattern[i]` is a single bar's events; `pattern[i].length` equals the number of note positions per bar (8 eighth notes in cut time, 16 sixteenths in 4/4, etc.).

There is no separate `barsPerRep` field — the number of bars is implied by the outer array length. Validation should reject patterns where `pattern.length < 1` or where any `pattern[i].length` differs from the others (all bars in an exercise must have the same number of note positions, since they share a time signature and subdivision).

A 2-bar exercise of 8th notes in cut time looks like:
```json
"pattern": [
  [ {"sticking": "R"}, {"sticking": "L"}, ..., {"sticking": "L"} ],
  [ {"sticking": "R"}, {"sticking": "L"}, ..., {"sticking": "L"} ]
]
```

Even when the two bars are identical (as in many of Stone's early exercises), both bars must be written out explicitly. This is intentional: the notation in the app should match the notation in the book exactly, including showing both bars on the staff.

**Schema evolution note**: In Phase 10, `PatternEvent` expands to support multiple voices, accents, ghost notes, and ornaments — but the outer 2D pattern shape stays the same. The Phase 10 migration only changes what's inside each event, not the bar structure. See §12 for the v2 PatternEvent schema.

### Exercise header
Always visible in Exercise mode:
- Set title
- Current exercise: "#5 — Paradiddle R" (number + name)
- Section heading if multiple sections in set
- Progress: "Exercise 5 of 72"
- Current rep count of target reps (large)
- BPM (large, editable)

### Exercise selector

The selector is the UI for navigating to any exercise within the active set, or switching to a different set. Triggered by clicking the Exercise position text in the top bar (per DESIGN.md). Replaces the long flat dropdown that wouldn't scale past ~30 exercises.

Layout (top to bottom inside the popover):

1. **Set selector** — Compact dropdown at the top showing the active set's title and progress summary (e.g., "Stick Control — 14 of 72 complete"). Clicking it reveals all available sets, each with its own progress summary. Selecting a different set switches the entire exercise context (saves in-progress session, loads the new set, restores its last position and BPM).

2. **Search input** — A text field labeled "Filter exercises..." that filters the visible grid in real time. Matches against exercise name (substring) and exercise number (exact or prefix). Empty by default.

3. **Recent exercises** — Up to 5 most-recently-practiced exercises from the active set, shown as a horizontal row of tiles. Hidden when there are no recent sessions yet (e.g., first-time user). Clicking a tile jumps to that exercise.

4. **Sectioned grid** — The full exercise list, grouped by section. Each section has:
   - A header with the section title and a counter ("Single Beat Combinations — 8 of 24 complete")
   - A grid of numbered tiles, 8 columns wide (responsive: fewer columns on narrower viewports)
   - Sections are collapsible; the current exercise's section is expanded by default
   - Collapse state persists per-set (see SetState above)

Tile design:

- 64×64px tile, `rounded-lg`
- Large exercise number centered, exercise name in smaller text below (truncated if needed)
- Completion indicator:
  - Not yet attempted: neutral border, no fill
  - Started but not completed: neutral border, partial-fill arc on the corner
  - Completed (hit target reps at or above set's default BPM): full accent-color border, small checkmark
  - Best BPM exceeds 1.5× set default: gold accent or filled accent background (visual reward for mastery)
- Current exercise: accent-color border at full opacity, slightly larger scale (hover-like state)
- Tap target: full tile is clickable

Filter behavior: When the search field has input, sections still render but only matching exercises appear in each section's grid. Sections with zero matches collapse and show "(0 matches)" in the header.

### Completion definition

An exercise is considered **complete** when the user has logged a session where:
1. `repsCompleted >= targetReps` (full target was hit), AND
2. `endBpm >= set.defaultBpm` (at or above the set's default tempo)

This matches the pedagogical intent of method books like Stick Control: Stone wants the user to play each exercise at full target reps at a target tempo before moving on. Completing at a slow tempo doesn't satisfy the goal.

The session log captures everything needed to compute this; the `exerciseProgress` table (see below) maintains the derived state for fast lookup by the selector.

### Exercise progress tracking

Per-exercise progress is stored in a Dexie table separate from the session log. The table is updated whenever a session finishes; the session log remains the source of truth, the progress table is a derived index.

```typescript
type ExerciseProgress = {
  id: string;                      // composite key: `${setId}:${exerciseId}`
  setId: string;
  exerciseId: string;
  completed: boolean;              // satisfies the completion definition above
  bestBpm: number | null;          // highest BPM at which a completed session was logged
  totalReps: number;               // accumulated across all sessions
  totalSessions: number;
  firstCompletedAt: number | null; // unix ms
  lastPracticedAt: number | null;  // unix ms
};
```

The selector reads from this table to render completion indicators on tiles. The progress ring around the play button reads from this table aggregated across the active set's section.

### Controls
- **BPM**: editable (does not change exercise data, just session config)
- **Target reps**: editable, defaults to exercise's or set's default
- **Previous / Next exercise**: skip without completing (jumps to the previous/next exercise within the active set, crossing section boundaries if needed)
- **Reset progress**: clears completion state for the active set only (with confirm). Does not affect other sets or the session log.
- **Mark as completed**: manually mark current exercise as complete and advance (without playing target reps). Sets `completed: true` and `bestBpm` to the current BPM if higher than the previous best.

### Notation display
- Drum notation rendered via VexFlow on a standard 5-line percussion staff, with the snare written on the middle line (matching the convention used in current editions of *Stick Control* and other modern method books)
- Stickings (R/L) shown as text below each note
- Beamed in groups appropriate to subdivision (4 sixteenths = 1 beam group)
- All bars in the exercise's pattern are rendered side-by-side on the same staff line, with bar lines between them
- Current note position highlighted during playback using the band + glow + scale treatment (see DESIGN.md)
- Notation auto-scales to viewport width within the 1600px max

### Count-in between exercises
A configurable count-in plays after one exercise finishes and before the next begins, giving the user time to read the new notation and prepare.

- **Enabled**: toggle, default ON
- **Bars**: integer, 1–4, default 1
- **Click pattern**: quarter notes at the current BPM, with the downbeat accented (a "1-2-3-4" count-in feel), regardless of the next exercise's subdivision setting
- **Time signature during count-in**: matches the upcoming exercise's time signature
- **Visual**: a large overlay shows the count ("1... 2... 3... 4...") synchronized with the clicks; the new exercise's notation is visible underneath
- **Skippable**: pressing Start during the count-in skips remaining count and begins the exercise immediately on the next downbeat
- Count-in only fires when transitioning between exercises (either via auto-advance or via manual "Next exercise" while the metronome is playing). When the metronome is stopped and the user presses Start fresh on an exercise, the pre-roll setting from §1 applies instead — count-in does not duplicate pre-roll.

### Playback behavior
- On Start, metronome runs with the exercise's time signature and subdivision
- The exercise's bars are played in sequence: `pattern[0]`, then `pattern[1]`, and so on. One rep = playing through all bars in `pattern` once. The rep counter increments after the final bar of each rep.
- On hitting target reps:
  - Session is saved (completed: true)
  - Completion sound plays
  - After ~1 second pause, the next exercise loads and its notation renders
  - BPM is preserved from previous exercise (so a ramp through tempo across exercises works); target reps resets to the next exercise's default
  - If "Auto-start next exercise" is ON: count-in plays (if enabled), then the new exercise begins automatically
  - If "Auto-start next exercise" is OFF: metronome stops; user presses Start to begin (with pre-roll if enabled). Count-in does not fire in this case.
- If the user is on the last exercise in the set, completion shows a "Set complete" message instead of advancing

### Position persistence

Each set's user state is tracked independently via the `SetState` record described under "Per-set state" above. On app launch in Exercise mode, the app loads the last active set and restores its `currentExerciseId`, `currentBpm`, and selector layout (`sectionsCollapsed`). Switching sets and switching back restores each set's state exactly as it was.

### Exercise set management

The app distinguishes between bundled sets (shipped with the app) and user-imported sets (loaded at runtime from JSON files). See "Exercise set loading" earlier in this section for the full distinction.

**For developers contributing bundled sets to the public app:**

Sets shipped in `src/data/exercises/` must be content the developer is authorized to distribute. This means one of:
- Original content authored for this app
- Public-domain rudiments and patterns (the core 40 PAS rudiments, traditional military drumming patterns, etc.)
- Content explicitly licensed for inclusion in this app

Method-book content (Stick Control, Syncopation, Master Studies, Future Sounds, etc.) is copyrighted and must NOT be added as a bundled set without a license from the publisher. The patterns themselves (RLRR, RRLL, etc.) are not copyrightable, but the specific curated sequence of exercises in a published method book is — bundling a verbatim transcription of a copyrighted book infringes regardless of attestation requirements on end users.

**For users who own method books:**

Transcribe your own copy into a JSON file using the documented schema, then import it via Settings → Exercise sets → Import. The transcription stays in your browser and is never sent anywhere. You can export it to share with friends who also own the same book; you should not redistribute it publicly.

**Schema documentation:**

The app includes a "Schema reference" section in Settings that shows the JSON format with an annotated example, so users can transcribe their own books without reading the source code.

## 8. Settings & Persistence

### Persisted settings (localStorage)
- Last BPM, time signature, subdivision, accent pattern (Free mode)
- Last dropout config, last ramp config (Free mode)
- Pre-roll on/off
- Auto-stop on/off, auto-start-next-exercise on/off
- Count-in enabled, count-in bars (Exercise mode)
- UI theme (light/dark, default = follow system)
- Last mode (free/exercise)
- Last active set ID (Exercise mode)
- `SetState` record per set (current exercise, current BPM, selector collapse state — see §7)

### Persisted progress (IndexedDB via Dexie)
- `ExerciseProgress` table (see §7): one row per `(setId, exerciseId)` tuple, updated incrementally as sessions finish
- Session log (see §4): one row per completed session

## 9. Keyboard Shortcuts

- **Space**: start / stop
- **T**: tap tempo (when not focused in a text input)
- **↑ / ↓**: BPM ±1
- **Shift + ↑ / ↓**: BPM ±5
- **R**: reset rep counter to 0
- **Esc**: stop and discard current session
- **N**: next exercise (Exercise mode only)
- **P**: previous exercise (Exercise mode only)

## 10. Accessibility

- All controls keyboard-operable
- Focus indicators visible on all interactive elements
- Color state changes paired with text or icon changes
- BPM and rep counter at minimum 48px font size in playing state
- Notation labels (R/L) at minimum 16px
- Reduced motion: when `prefers-reduced-motion` is set, the beat indicator changes color instead of scaling

## 11. User Flows

### Working through Stick Control (primary flow)
1. User opens app, mode is already Exercise (persisted)
2. App resumes on exercise #5 (where they stopped yesterday)
3. Notation is rendered. BPM shows 80 (their last tempo).
4. User presses Start. Pre-roll counts off 1 bar, then metronome plays. After 20 reps, completion sound plays, session is logged.
5. After ~1s, exercise #6 loads and its notation renders. BPM stays at 80. If auto-start is ON, count-in plays (e.g., 1 bar of "1-2-3-4") then exercise #6 begins. If auto-start is OFF, metronome stops and user presses Start to begin (with pre-roll if enabled).

### Pushing a single exercise across tempos
1. In Exercise mode, user enables tempo ramp: 80 → 100, +2 every 2 reps
2. Sets target reps high (e.g., 40)
3. Presses Start. Tempo climbs across reps. When 100 is hit, current rep finishes, session saved.
4. User can manually advance to next exercise or replay this one

### Free-mode warm-up
1. User switches to Free mode
2. Sets BPM=60, 4/4, quarter subdivision
3. Sets 4-on-2-off scheduled dropout
4. Presses Start. Practices independence/internal time. Stops manually.

## 12. Multi-Voice Schema (Phase 10)

Phase 10 expands the pattern schema to support multi-voice drum patterns (Syncopation, groove-based books), accents, ghost notes, and ornaments. The v1 single-voice snare schema remains valid and is upgraded at load time.

### v2 schema

```typescript
type ExerciseSet = {
  id: string;
  title: string;
  source: string;
  defaultBpm: number;
  defaultTargetReps: number;
  schemaVersion: 2;        // bumped from 1
  sections: Section[];     // same as v1
  exercises: Exercise[];
};

// Section type is unchanged from v1

type Exercise = {
  id: string;
  number: number;
  name: string;
  sectionId: string;          // references Section.id (same as v1)
  pattern: PatternEvent[][];  // 2D: outer = bars, inner = events per bar
  timeSignature: {
    numerator: number;
    denominator: 2 | 4 | 8;
    displayAs?: "cut" | "common";
  };
  subdivision: Subdivision;
  recommendedBpm?: number;
  targetReps?: number;
  notes?: string;
};

type PatternEvent = Hit | "rest";

type Hit = {
  voices: Voice[];          // one or more drums struck on this note position
  sticking?: "R" | "L";     // hand used; omit for kick or hi-hat-foot
  accent?: boolean;         // accented (louder)
  ghost?: boolean;          // ghost note (very soft)
  ornament?: Ornament;      // grace-note attachment
};

type Voice =
  | "snare"
  | "kick"
  | "hihat-closed"
  | "hihat-open"
  | "hihat-foot"
  | "ride"
  | "ride-bell"
  | "crash"
  | "tom-high"
  | "tom-mid"
  | "tom-low";

type Ornament = "flam" | "drag" | "ruff" | "buzz";
```

### Migration from v1 to v2

A pure function `migrateV1ToV2(set: ExerciseSetV1): ExerciseSetV2` runs at load time when `schemaVersion === 1`. The 2D pattern shape and timeSignature shape are identical between v1 and v2; only `PatternEvent` changes. Per-event transformation (applied to every event in every bar of every exercise):

- `"rest"` → `"rest"` (unchanged)
- `{ sticking: "R" }` → `{ voices: ["snare"], sticking: "R" }`
- `{ sticking: "L" }` → `{ voices: ["snare"], sticking: "L" }`

The set's `schemaVersion` is updated to 2 in memory but the on-disk file is not rewritten. Users can manually upgrade their JSON files if they want, but it's not required.

### Validation rules

- `voices` must be non-empty (use `"rest"` for empty positions, not an empty `voices` array)
- `sticking` is required for hand-struck voices (snare, hi-hat, ride, crash, toms) and forbidden for foot voices (kick, hi-hat-foot)
- `accent` and `ghost` are mutually exclusive
- `ornament` is allowed on any hit; the ornament uses the same sticking as the parent hit (e.g., a flam with `sticking: "R"` is a grace note on the left followed by a right-hand main stroke, per standard convention)

### Notation rendering (v2)

The renderer extends the existing 5-line drum staff (used in v1 for snare-only notation) with additional voices at their conventional positions. The staff itself does not change shape between v1 and v2. Voice-to-staff-position mapping:

| Voice         | Staff position           | Notehead     | Stem direction |
|---------------|--------------------------|--------------|----------------|
| snare         | middle line (B4)         | normal       | up             |
| kick          | bottom space (F3)        | normal       | down           |
| hihat-closed  | above staff (F5 ledger)  | x            | up             |
| hihat-open    | above staff (F5 ledger)  | x with circle above | up      |
| hihat-foot    | below staff (D3 ledger)  | x            | down           |
| ride          | above staff (F5 ledger)  | x            | up             |
| ride-bell     | above staff (F5 ledger)  | diamond      | up             |
| crash         | above staff (A5)         | x            | up             |
| tom-high      | top space (E5)           | normal       | up             |
| tom-mid       | second line (G4)         | normal       | up             |
| tom-low       | bottom line (F4) or below| normal       | up or down     |

When a single `Hit` contains multiple voices (e.g., kick + hi-hat), the renderer places them in the appropriate VexFlow voices and stems are oriented per the table. Beaming follows the dominant voice (usually whichever is on top — hi-hat or ride).

Accents render as `>` above or below the notehead per standard convention. Ghost notes render with parenthesized noteheads. Ornaments render as grace notes attached to the parent note.

### Audio behavior (v2)

The metronome click does not play the pattern back audibly — the human plays the drums. However, the click responds to pattern accents:

- When the click subdivision matches the pattern subdivision (e.g., both are 16ths), each click that coincides with an accented pattern note plays at higher volume (~+6dB) than an unaccented one
- When the click subdivision is coarser than the pattern (e.g., click on quarters, pattern in 16ths), accent volume modulation is skipped — the click stays uniform
- Ghost notes do NOT affect click volume; they're a visual/instructional cue for the player
- Ornaments do NOT affect click playback

This keeps the click as a stable reference while still reinforcing the accent structure of the exercise.

### Session log (v2)

Sessions log `exerciseSchemaVersion` so future analysis tools know how to interpret historical sessions.

### Out of scope for Phase 10

- In-app pattern editor (deferred to Phase 11)
- Multi-bar patterns (single bar repeated remains the model; multi-bar can be added by extending `pattern` to a 2D array later if needed)
- Polyrhythmic patterns where voices have different subdivisions (e.g., snare in triplets while hi-hat in 16ths)
- Tied notes, swing/shuffle feel notation
- Audible pattern playback (drum sound synthesis)

These can be added in later phases without breaking the v2 schema.

## 13. Guided Tour (Phase 9)

The app's UI is intentionally minimal — controls are hidden behind popovers and pills rather than spelled out on the canvas. This is great for daily use but works against discoverability for new users. The guided tour provides on-demand education about the configuration affordances and what they do, in the user's actual context.

### Mechanism

Use `react-joyride` for spotlight/coachmark-style tours. Each tour is a sequence of steps; each step highlights a specific UI element with a dim overlay and a small callout panel explaining what it does and how to use it. Users advance with a "Next" button or skip with "Skip tour" at any point.

### Two tours

The app provides two separate tours, since Free mode and Exercise mode have substantially different UIs:

**Free mode tour** (~6-8 steps): the central play/stop button, BPM (clickable to open the BPM Popover), the rep counter (configurable when stopped), the control strip pills (time signature, subdivision, dropout, ramp), the mode toggle, and the top bar icons (history, settings).

**Exercise mode tour** (~5-7 steps): the exercise context text in the top bar (clickable to open the Exercise Popover), the notation canvas (with active-note highlight explanation), the BPM and rep counter (configurable), the play button with count-in behavior, and the mode toggle. Includes a sub-tour that runs when the Exercise Popover opens for the first time, covering the set selector, search, recents, sectioned grid, and bottom controls (~4-5 more steps).

Tour content is stored as JSON step configurations in `src/data/tours/free.json` and `src/data/tours/practice.json` so it can be edited without recompiling. Step content includes a `target` selector, a `title`, a `body` (markdown supported), and optional `placement` overrides.

### Trigger conditions

The tour can start in three ways:

1. **First-ever app open.** A welcome dialog appears with three buttons: "Start with Free mode tour," "Start with Practice mode tour," or "Skip — I'll explore on my own." Triggered when `localStorage.tourSeen.free` and `localStorage.tourSeen.practice` are both absent.

2. **First entry to a mode.** When the user switches to a mode they haven't seen the tour for, a small dismissable banner appears at the top: "First time here? Take a quick tour" with "Yes" and "No thanks" buttons. The banner appears only once per mode and is dismissed permanently on first interaction.

3. **On-demand.** Settings → "Take the tour" with sub-options "Free mode tour" or "Exercise mode tour." Always available; ignores prior state.

### State tracking

```typescript
// In localStorage under settings:
type TourState = {
  free: boolean;          // true once the user has completed or explicitly dismissed the Free tour
  practice: boolean;      // same for Practice mode
  skippedAt?: number;     // timestamp of last "Skip — I'll explore on my own" — suppresses
                          //   first-entry banners for 7 days, after which they may reappear
};
```

A user who completes a tour sets the corresponding flag to true. A user who explicitly clicks "Skip" on a tour also sets the flag to true (skipping equals "I've decided about this; don't re-prompt"). The on-demand entry point ignores these flags entirely.

### Behavioral rules

- **Always skippable.** Every step has a "Skip tour" affordance, not just the first one. Hitting Escape closes the tour at any step.
- **Single tour at a time.** If a tour is active and the user manually clicks something that would advance to a different step's target, the tour adapts (skips ahead or pauses), it doesn't fight the user.
- **Tour respects mode state.** Starting the Practice mode tour while in Free mode automatically switches to Practice mode first. Same in reverse.
- **Tour respects play state.** Starting a tour while the metronome is playing stops playback first, so the user can read without rhythmic distraction.
- **Tour does not appear on small screens during the tour itself.** If the user resizes the window mid-tour to a width below the responsive breakpoint, the tour gracefully ends rather than trying to re-anchor callouts.

### Visual style

The tour UI respects DESIGN.md tokens. Specifically:

- Spotlight backdrop: black at 50% opacity (`bg-black/50`)
- Callout panel: same surface, border, and shadow as the Settings sheet (rounded-xl, hairline border, neutral surface)
- "Next" button: accent color (sky-500) primary button style
- "Skip" button: neutral secondary button style
- Typography matches the rest of the UI (system sans, regular weights)

The tour should feel like a quiet part of the app, not a different product layered on top.

### Content authoring

The actual step copy (titles and bodies) is authored in Phase 9, against the live app. Writing tour text in the abstract — without seeing how the UI feels in real use — tends to produce stilted, vague text. The tour is much more useful when the copy is written by someone who has been using the app for weeks and knows what genuinely needs explanation.

Each step's body should be one or two short sentences. Long explanations defeat the purpose of a spotlight tour. If a step needs more than ~30 words, split it into multiple steps or link to a settings page where the user can explore at their own pace.

### Out of scope for Phase 9

- Inline contextual hints (small tooltips that appear once per element the first time it's encountered) — a separate, more granular pattern that can layer on top of the tour later if useful
- Localized tour content (English only for v1)
- Video or animation in tour steps (text + spotlight only)
- Persisted tour analytics (which steps users skip at, completion rates) — would require server-side tracking, deferred indefinitely

These can be added later without restructuring the tour itself.

