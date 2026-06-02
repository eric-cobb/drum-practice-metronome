# Contributing

Thanks for your interest in contributing. This document covers how to work with the codebase, what kinds of contributions are welcome, and the policies around exercise content.

## Getting Set Up

```bash
git clone https://github.com/eric-cobb/drum-practice-metronome.git
cd drum-practice-metronome
npm install
npm run dev
```

Before submitting a PR, run:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run format      # prettier --write .
```

## What Kinds of Contributions Are Welcome

**Code:** Bug fixes, performance improvements, accessibility improvements, new features that align with the project's documented direction (see `CLAUDE.md` for phasing and `SPEC.md` for features).

**Documentation:** Improvements to `README.md`, `CONTRIBUTING.md`, the schema reference, accessibility documentation, anything that helps users understand or use the app.

**Bundled exercise content:** New exercise sets in `src/data/exercises/` — but only under the conditions described below.

**Tests:** Test coverage for the scheduler, the schema validator, the session log, and the import/export flows is always welcome.

## Bundled Exercise Content Policy

The exercise sets bundled with the app in `src/data/exercises/` must be content the contributor is authorized to distribute. This means one of:

- **Original work** authored by you, with no derivation from copyrighted method books
- **Public-domain rudimental patterns** — the core PAS rudiments, traditional military drumming patterns, exercises from method books whose copyright has expired (this is a narrow category in modern drum literature — please check carefully)
- **Content explicitly licensed for inclusion in this app** — if you have written permission from a publisher to include their content, attach the permission documentation to your PR

**What is NOT acceptable as a bundled contribution:**

- Verbatim transcriptions of copyrighted method books (Stick Control, Syncopation, Master Studies, Future Sounds, Stone Killers, anything from current Hal Leonard / Alfred / Modern Drummer Publications catalogs, etc.)
- Reordered or "inspired by" versions of copyrighted method-book sequences where the pedagogical sequence is preserved enough to be a derivative work
- Exercise sets containing instructional text or commentary copied from copyrighted sources

The patterns themselves (RLRR, RRLL, paradiddles, etc.) are not copyrightable — they're universal drum vocabulary. What is copyrightable is the specific curated sequence and ordering chosen by a published method book's author. If your contribution feels like it might tread on that line, please ask before submitting.

**If you want to practice with a copyrighted book inside this app**, you can transcribe your personal copy into a JSON file and import it via Settings → Exercise sets → Import. The app is designed for exactly this case: it provides the tool, and individuals provide their own personal copies of the content. Imported sets stay in the user's browser and are never sent to any server.

## Code Conventions

See `CLAUDE.md` for the full conventions, but the highlights:

- TypeScript strict mode; no `any`
- Functional React components only
- Tailwind for styling, no CSS modules or styled-components
- Named exports preferred; default exports only for page-level components
- File names: PascalCase for components, camelCase for utilities and stores

## Pull Request Process

1. Fork the repository and create a feature branch (`git checkout -b feature/your-feature-name`)
2. Make your changes in focused, atomic commits
3. Run `npm run typecheck` and `npm run lint` before pushing
4. Open a PR against the `main` branch with a clear description of what changed and why
5. Be ready for feedback — small back-and-forth is normal

## Reporting Issues

If you find a bug, please open an issue with:

- A clear description of what happened
- What you expected to happen instead
- Steps to reproduce (be specific — "the metronome drifted" needs context like BPM, time signature, browser, how long it ran before drift was noticed)
- Browser and OS

For feature requests, open an issue with the prefix `[Feature]` and describe the use case, not just the proposed feature. Use cases drive better design than feature lists.

## Code of Conduct

Be kind. Assume good faith. Disagree on technical merits, not on personalities. If a discussion isn't productive, step away and come back later.
