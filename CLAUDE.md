# Practice Metronome App

A drum practice tool combining a precision metronome with a structured exercise mode for working through method books (Stick Control being the primary target). Built for personal use during structured drum practice.

This is single-user, local-only software. No backend, no auth, no cloud sync.

## Required Reading

Four documents define this project. Read them in this order:

1. **CLAUDE.md** (this file) — project conventions, tech stack, phasing
2. **SPEC.md** — functional requirements (what features exist and how they behave)
3. **ARCHITECTURE.md** — technical design (scheduler pattern, state management, rendering)
4. **DESIGN.md** — visual design language (layout, typography, color, component patterns)

When DESIGN.md and SPEC.md conflict on visual/layout questions, DESIGN.md wins. When they conflict on functional questions, SPEC.md wins.

## Two modes

The app has two top-level modes:

1. **Free mode** — general-purpose metronome with rep counting, click dropout, and tempo ramping. Use this for warm-ups, song practice, internal-time training.
2. **Exercise mode** — loads a structured exercise set (Stick Control by default), displays drum notation for the current exercise, runs the metronome pre-configured for the exercise (16th notes, 4/4, 2 bars per rep, 20 reps target by default), then auto-advances to the next exercise on completion.

Both modes share the same underlying metronome engine, session log, and settings.

## Tech Stack

- **Vite + React + TypeScript** — build tooling and UI
- **Tailwind CSS** — styling, no other CSS frameworks
- **Zustand** — state management; no Redux, no Context API for shared state
- **Dexie** — IndexedDB wrapper for session log
- **VexFlow** — music notation rendering for Exercise mode
- **Web Audio API** — native, no library; scheduler pattern is critical (see ARCHITECTURE.md)

When the user says "the app" they mean this React app. They will record audio separately in Logic Pro; do NOT add in-browser audio recording in v1.

## Commands

```bash
npm install         # install dependencies
npm run dev         # start dev server on localhost:5174
npm run build       # production build to dist/
npm run preview     # preview production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run format      # prettier --write .
```

Always run `typecheck` and `lint` before declaring work complete.

## Project Structure (target)

```
src/
  audio/
    scheduler.ts        # lookahead scheduler, core timing engine
    sounds.ts           # synthesized click sounds
  state/
    metronome.ts        # Zustand store: BPM, time sig, play state
    sessions.ts         # session persistence (Dexie wrapper)
    settings.ts         # last-used settings (localStorage)
    exercises.ts        # current exercise set, position, progress
  components/
    ModeToggle/         # switch between Free and Exercise modes
    Free/
      Display.tsx       # large rep counter + BPM display
      Controls.tsx      # BPM, time sig, subdivision controls
      DropoutPanel.tsx
      RampPanel.tsx
    Exercise/
      Notation.tsx      # VexFlow drum notation renderer
      ExerciseHeader.tsx # exercise name, progress (5 of 72), reps
      ExerciseControls.tsx # BPM, skip/back, reset progress
      SetSelector.tsx   # choose which exercise set to load
    Shared/
      BeatIndicator.tsx
      SessionLog.tsx
  data/
    exercises/
      stick-control.json
      # future: syncopation.json, master-studies.json, custom.json
  db/
    schema.ts           # Dexie schema
  types/
    index.ts            # shared TypeScript types
  App.tsx
  main.tsx
```

## Critical Implementation Notes

### Web Audio scheduler — READ ARCHITECTURE.md BEFORE TOUCHING audio/scheduler.ts

Browser timers (`setTimeout`, `setInterval`) are NOT reliable for audio timing. The scheduler must use the lookahead pattern. See ARCHITECTURE.md for the full pattern.

### Audio context initialization

Browsers require a user gesture before creating or resuming an AudioContext. Create or resume the context inside the first "Start" button click handler. Don't create it on app mount.

### Decouple visual rendering from audio scheduling

The audio scheduler runs on its own 25ms loop. Visual beat indicators AND the notation cursor highlight must NOT be driven by that loop directly — they subscribe to a `beatScheduled` event and schedule their own visual update for the right moment using the audio time. See ARCHITECTURE.md.

### VexFlow rendering

Render the notation once per exercise (not per beat). Use a separate overlay or class toggle to highlight the current note position — re-rendering VexFlow on every beat will tank performance. See ARCHITECTURE.md for the rendering approach.

### Exercise data is JSON, not hardcoded

Exercises live in `src/data/exercises/*.json` and are loaded at runtime. Schema is defined in `types/index.ts`. The user will add to and edit these JSON files directly — keep the format clean and human-editable.

### Persistence boundaries

- **localStorage**: last-used settings, current exercise position (so reloading the app resumes where the user left off)
- **IndexedDB (Dexie)**: session log
- **JSON export**: user-triggered backup of all sessions

Never store audio in the browser. Audio recording lives in Logic Pro (v2 concern, do not build now).

## Code Style

- TypeScript **strict mode** on
- No `any`; use `unknown` and narrow
- Functional components only
- Tailwind utility classes; no CSS modules, no styled-components
- Prefer composition over prop drilling; lift state to Zustand if it crosses 2+ component levels
- File names: `PascalCase` for components, `camelCase` for utilities and stores
- Exports: named exports preferred; default exports only for page-level components

## Out of Scope for v1

Do NOT build any of these without being explicitly asked:

- User accounts, multi-user, cloud sync
- In-browser audio recording or MediaRecorder usage
- Audio playback of backing tracks
- A notation EDITOR (rendering only; exercises edited as JSON)
- Mobile app wrapping
- Polyrhythm overlays
- Sample-based click sounds (synthesized only in v1)
- Importing exercises from MusicXML or other formats

## Phasing

Build in this order. Don't start a phase until the previous one is complete and tested.

1. **Phase 1**: Core metronome in Free mode (BPM, time sig, subdivision, accent on 1, start/stop, visual beat indicator)
2. **Phase 2**: Rep counter (bars-per-rep, target reps, auto-stop)
3. **Phase 3**: Exercise mode skeleton (mode toggle, exercise data loading, exercise header showing position)
4. **Phase 4**: VexFlow notation rendering for current exercise (standard 5-line drum staff with percussion clef, snare on middle line, v1 schema)
5. **Phase 5**: Auto-advance to next exercise on rep target, current-note highlight during playback, count-in between exercises (configurable bars, plays when auto-start is enabled)
6. **Phase 6**: Session log (auto-capture for both modes, list view, JSON export)
7. **Phase 7**: Click dropout (Free mode primary use case)
8. **Phase 8**: Tempo ramp (works in both modes)
9. **Phase 9**: Polish (tap tempo, pre-roll countdown, keyboard shortcuts, guided tour for Free and Practice modes per SPEC §13)
10. **Phase 10**: Multi-voice schema and renderer (v2 schema in SPEC §12). Expand `PatternEvent` to support multiple drum voices, accents, ghost notes, ornaments. Expand notation rendering to a 5-line drum staff with voice-specific noteheads and stem directions. Add accent-based click volume modulation. Migration function for v1→v2 at load time. JSON authored by hand in this phase.
11. **Phase 11**: In-app pattern editor (visual sticking/voice grid, live VexFlow preview, save to IndexedDB user-data overlay store)

Exercise mode (Phases 3-5) is prioritized ahead of dropout/ramp because it's the user's primary use case. Multi-voice support (Phase 10) is the gateway to Syncopation, Master Studies, and groove-based books.
