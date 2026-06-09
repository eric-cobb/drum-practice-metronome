# Practice Metronome

A drum practice tool combining a precision metronome with structured exercise mode for method-book practice. Built for the specific needs of drummers working through rudimental method books (Stick Control, Syncopation, Master Studies, etc.) but useful for any musician who needs a flexible metronome with session tracking.

**Status:** Active development. Free to use, no account required, no data leaves your browser.

## Features

### Free mode — general-purpose metronome
- BPM, time signature, subdivision controls
- Configurable accent patterns
- Click dropout (scheduled or random) for internalizing tempo
- Tempo ramp for pushing speed gradually
- Rep counter with target reps and auto-stop
- Session logging with per-exercise tempo history

### Exercise mode — structured practice
- Pre-loaded exercise sets with drum notation
- Auto-advance through exercises on rep target
- Count-in between exercises
- Notation highlighting with the current note
- Multi-bar pattern support
- Per-exercise completion tracking
- Per-set position and tempo persistence

### Bring your own exercises
The app ships with a small set of foundational rudimental patterns. If you own a method book (Stick Control, Syncopation, Master Studies, etc.), you can transcribe your copy into a JSON file using the documented schema and import it into the app. Imported exercise sets stay in your browser — they are never uploaded to any server.

A schema reference is built into the app (Settings → Exercise sets → Schema reference) so you can transcribe without reading the source code.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Zustand (state)
- Dexie (IndexedDB)
- VexFlow (notation rendering)
- Web Audio API (timing)

No backend. No accounts. No analytics. All data is stored locally in your browser via IndexedDB and localStorage.

## Running Locally

```bash
git clone https://github.com/YOUR_USERNAME/practice-metronome.git
cd practice-metronome
npm install
npm run dev
```

The dev server runs on `localhost:5174` by default.

## Building for Production

```bash
npm run build
npm run preview  # to preview the production build locally
```

The `dist/` folder contains a static site that can be hosted on any static-file host (GitHub Pages, Vercel, Netlify, Cloudflare Pages, etc.).

## Project Documentation

Architecture, specification, and design decisions are documented in:

- [`CLAUDE.md`](./CLAUDE.md) — project conventions, tech stack, build phasing
- [`SPEC.md`](./SPEC.md) — functional requirements
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical design, including the Web Audio scheduler pattern
- [`DESIGN-v2.md`](./DESIGN-v2.md) — visual design language, information architecture, and component patterns (`DESIGN-v1-archive.md` is the superseded original, kept for history)

These documents are the source of truth for what the app does and how it's built.

## Content Distribution Policy

The patterns in `src/data/exercises/` are either original work or public-domain rudimental vocabulary. Method-book content (e.g., the curated exercise sequence of *Stick Control for the Snare Drummer*) is copyrighted and is not included in the distribution — users who own the book are encouraged to transcribe their own copy via the in-app import flow.

If you want to contribute additional bundled exercises, please make sure they are either your own original work or content you have explicit permission to distribute. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for details.

## Privacy

This app is designed to keep your practice data on your device. Specifically:

- **All practice data stays in your browser.** Session history, exercise progress, imported exercise sets, and app settings are stored in your browser's local storage (IndexedDB and localStorage). None of this data is sent to any server, ever.
- **No accounts, no logins, no tracking pixels.** There are no third-party trackers, no advertising scripts, no fingerprinting, no cookies set for tracking purposes.
- **Anonymous usage analytics via Vercel Web Analytics.** The deployed version of the app uses Vercel's built-in analytics to count page views and see roughly where visitors come from (country, referring site, browser). This data is anonymous — no personal identifiers, no cookies, nothing that could identify an individual user. It exists so I can tell whether the app is being used and where the audience is, which is useful for deciding what to build next. You can verify this in Vercel's documentation. If you run the app locally via `npm run dev`, no analytics are collected at all.
- **Your imported exercise sets are yours alone.** Method-book transcriptions you import via the in-app file picker live only in your browser. They are never uploaded, never shared, never visible to me or anyone else. If you want to share a transcription with a friend who also owns the book, use the in-app export feature — you control where the JSON goes.

## License

MIT — see [`LICENSE`](./LICENSE) for the full text. The MIT license applies to the application code. User-imported exercise content is the property of whoever transcribed it and is not covered by this license.

## Acknowledgments

Built with Claude Code. Designed by a drummer for drummers.
