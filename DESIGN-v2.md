# Design v2 — Practice Metronome

This document supersedes the original `DESIGN.md` entirely. It defines the visual language, information architecture, and component specs for the redesigned app. Where v2 conflicts with the original DESIGN.md, v2 wins.

## 1. Design philosophy

The app is a precision tool for daily practice, but the previous Apple-influenced minimalism left it feeling sparse and uninhabited. The redesign keeps the precision but adds visual confidence: a richer color system with a signature purple-to-cyan gradient, real depth through layered shadows and inner highlights, dense informative cards in place of cramped popovers, and a four-view information architecture in place of the previous "everything is a popover" approach.

References that informed the direction: ClickUp (organized density, colorful tiles, productivity-app polish), Stripe (high-craft technical-tool aesthetic, gradient meshes, sophisticated depth), and the general category of modern tools (Linear, Things, Tot) where dimensional but never decorative is the rule.

Two things this design is NOT:
- Decorative or playful — no animated background shapes, no quirky illustrations, no ironic copy
- Minimal in the iOS-Settings sense — surfaces have visual weight, gradients carry meaning, depth is real

The redesign is opinionated. Once committed, the purple-cyan gradient is everywhere; reversing it later would be a meaningful refactor.

## 2. Color system

### Base canvas

The page background is not a flat color. A subtle radial gradient warms the upper center and cools toward the edges:

```css
background: radial-gradient(ellipse 65% 65% at 50% 40%, #15131F 0%, #08090F 100%);
```

This is nearly imperceptible. Don't notice it consciously; do notice when it's missing.

### Surface gradients

Cards and elevated surfaces use a subtle vertical gradient from slightly lighter top to slightly darker bottom:

```css
/* Standard card (Library cards, History cards, info strip, etc.) */
background: linear-gradient(180deg, #1A1B26 0%, #10111A 100%);

/* Lighter variant for elevated popovers and the notation canvas */
background: linear-gradient(180deg, #22232F 0%, #15161F 100%);

/* Tile variant (denser, used for exercise tiles) */
background: linear-gradient(180deg, #232432 0%, #171823 100%);

/* Deep card variant (used for the session card, top bar pills) */
background: linear-gradient(180deg, #1F2030 0%, #13141C 100%);
```

### Primary accent — the gradient

The signature accent is a diagonal purple-to-cyan gradient:

```css
background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
```

A softer variant for tints and translucent overlays:

```css
background: linear-gradient(135deg, rgba(124, 58, 237, 0.18) 0%, rgba(6, 182, 212, 0.18) 100%);
```

The gradient appears in:
- The play button (most prominent)
- Tile borders and tints for active/completed exercises
- Progress bars
- Focus rings on inputs
- Active sidebar destination indicators
- Active mode toggle states
- The thin accent strip at the top of the sidebar (`url(#grad-primary)` with 0.6 opacity)

Solid purple `#8B5CF6` is used for accents that don't need the full gradient (borders, single-color icons, single-color badges). Light purple `#C4B5FD` is used for text in accent contexts.

### Gold (secondary accent)

A gold ramp is used exclusively for "mastered" state — exercises where the user's best BPM is at least 1.5× the set's default BPM:

- `#FBBF24` — primary gold
- Used at low opacity (~5-8%) for the card tint
- Used at 0.7-0.9 opacity for borders and progress bars

Gold never appears outside the mastered context. It's the visual reward for exceptional progress, scarce on purpose.

### Neutrals

Text and inactive UI elements use a constrained neutral palette:

| Use | Value |
|-----|-------|
| Primary text (white on dark) | `#FFFFFF` |
| Secondary text | `#E2E8F0` / `#CBD5E1` |
| Tertiary text / labels | `#94A3B8` |
| Muted text / inactive | `#6B7280` |
| Deepest text on background | `#9CA3AF` (for notation glyphs) |
| Border (subtle) | `#1F2030` |
| Border (visible) | `#2D2E3D` |
| Border (muted accent) | `#374151` |
| Surface deep | `#0F1018` |
| Surface darkest | `#0A0B11` |

### Semantic colors (sparingly)

- Destructive actions: red border at low opacity `#A33D2D` with text `#E58A7A`. No filled red buttons except in confirm dialogs.
- No green or blue used as primary semantic colors — purple does the work that "info" usually does, gold does "achievement."

## 3. Depth and dimensional treatment

The single biggest visual upgrade over the original design. Every elevated surface gets layered shadows plus an inner highlight stroke.

### Shadow recipes

```css
/* Cards (standard) */
box-shadow:
  0 2px 4px rgba(0, 0, 0, 0.5),
  0 8px 24px rgba(0, 0, 0, 0.35);

/* Tiles (lighter) */
box-shadow:
  0 1.5px 3px rgba(0, 0, 0, 0.45),
  0 6px 16px rgba(0, 0, 0, 0.3);

/* Popovers (heavier, floating) */
box-shadow:
  0 6px 12px rgba(0, 0, 0, 0.6),
  0 16px 48px rgba(0, 0, 0, 0.5);

/* The play button — accentuated */
box-shadow:
  0 4px 6px rgba(0, 0, 0, 0.6);
/* Plus the atmospheric bloom; see Play Button below */
```

### Inner highlight strokes

Every elevated surface gets a 1px white stroke at very low opacity along the top edge. Adds the "light catches the top edge" effect that makes surfaces feel like real material:

```css
/* Add as a separate element absolutely positioned at the top of the card, */
/* OR use a linear-gradient overlay, OR an SVG ::before pseudo-element */
position: relative;
&::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}
```

Opacity by surface type:
- Standard cards: `rgba(255, 255, 255, 0.06)`
- Tiles: `rgba(255, 255, 255, 0.08)`
- Popovers: `rgba(255, 255, 255, 0.10)`
- Active/current state surfaces: `rgba(255, 255, 255, 0.12-0.15)`

### Play button bloom

The play button is unique — it gets an extended radial bloom that suggests it's emitting light:

```css
/* The button itself */
background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);

/* Atmospheric bloom — applied as a separate element behind the button */
.play-bloom-outer {
  /* Approximately 2-2.5× the button radius */
  background: radial-gradient(circle,
    rgba(168, 85, 247, 0.5) 0%,
    rgba(124, 58, 237, 0.22) 40%,
    rgba(124, 58, 237, 0) 100%);
}

/* Inner glow on the button face itself */
.play-bloom-inner {
  background: radial-gradient(circle at center 40%,
    rgba(196, 181, 253, 0.4) 0%,
    rgba(196, 181, 253, 0) 100%);
}
```

The bloom is decorative and atmospheric; it should NOT be clickable (pointer-events: none). The actual click target is just the button.

Inner highlight rings on the button itself:
- Outer ring: `border: 1px solid rgba(255, 255, 255, 0.18)` at the button edge
- Inner ring: 0.5px white at `rgba(255, 255, 255, 0.25)`, offset slightly upward to suggest top lighting

### Light mode (mandatory)

Dark mode is the primary mode and the one the visual specs are written for. Light mode keeps the same visual language but with inverted surfaces:

- Base canvas: `radial-gradient(ellipse 65% 65% at 50% 40%, #FAFAFD 0%, #F0F1F8 100%)`
- Card surface: `linear-gradient(180deg, #FFFFFF 0%, #F8F8FB 100%)` with `border: 0.5px solid rgba(0, 0, 0, 0.08)`
- Shadows are deeper in light mode (more contrast available): `0 2px 4px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06)`
- Inner highlight strokes use `rgba(255, 255, 255, 0.8)` (still on top edge)
- Text inverts: `#0F1018` for primary, `#374151` for secondary, etc.
- Gradient accent unchanged (purple-to-cyan reads well on both modes)
- Gold unchanged

Light mode should not be an afterthought — it must look as deliberate as dark mode, just brighter and crisper rather than atmospheric.

### Reduced motion

Respect `prefers-reduced-motion`. When set:
- Scale transforms on the notation active-note are disabled (color and band remain)
- Hover transitions are instantaneous rather than eased
- The pulse/breathe animation on the play button when stopped (see below) is disabled

## 4. Typography

System sans throughout. No custom display fonts. Personality comes from color and depth, not typeface.

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
```

### Size scale

| Use | Size | Weight |
|-----|------|--------|
| View titles (Library, History, Settings) | 20px | 500 |
| View subtitles (one-line descriptors below view titles) | 12px | 400, secondary text color |
| Card titles | 15px | 500 |
| Stat card values (large numerics) | 34-56px | 500, tabular-nums |
| Stat card labels (small caps) | 10px | 500, letter-spacing 0.08em, secondary color |
| Body text | 11-12px | 400 |
| Inline labels | 9-10px | 500, letter-spacing 0.1em, ALL CAPS via CSS |
| Notation BPM (Free mode) | 56px | 500, tabular-nums |
| Notation BPM (Exercise mode) | 48px | 500, tabular-nums |
| Rep counter values | 48-56px | 500, tabular-nums |

### Sentence case throughout

Section headers use sentence case in the source ("Single Beat Combinations") but render in small-caps treatment via CSS `letter-spacing` and explicit uppercasing only where labeled. Display titles and card titles stay in sentence case as written.

### Tabular numerics

Every number that changes — BPM, reps, durations, percentages, BPM bests, exercise numbers — uses `font-variant-numeric: tabular-nums`. This prevents the page from twitching as numbers tick.

## 5. Information architecture

The app has four destinations, accessed from a persistent left sidebar on desktop or a bottom nav on mobile.

### The four views

1. **Practice** — the metronome itself. Free mode and Exercise mode toggled via a control at the top of the view. This is the only view with the play button.
2. **Library** — exercise sets, organized for browsing. Set selector, search, sectioned grid of detailed cards, import/export, schema reference.
3. **History** — session log, stat cards, recent sessions.
4. **Settings** — app-level configuration only. Theme, practice defaults, storage.

### Where each feature lives

| Feature | Location |
|---------|----------|
| Play button | Practice view, both modes |
| BPM display (editable) | Practice view |
| Rep counter | Practice view |
| Mode toggle (Free/Exercise) | Top of Practice view |
| Time signature pill | Practice view, Free mode upper pill row |
| Subdivision pill | Practice view, Free mode upper pill row |
| Dropout pill | Practice view, Free mode upper pill row |
| Ramp pill | Practice view, Free mode upper pill row |
| Notation canvas | Practice view, Exercise mode |
| Info strip (time sig, subdivision, count-in, section) | Practice view, Exercise mode below notation |
| Exercise notes card | Practice view, Exercise mode below play composition |
| Exercise selector popover | Triggered from Practice header (Exercise mode) |
| Session name input + Save session | Practice view, Free mode below play composition |
| Accent pattern editor | Practice view, Free mode below play composition |
| Exercise set selector | Top of Library view, ALSO in Practice popover |
| Search exercises | Library view, ALSO in Practice popover |
| Detailed exercise cards | Library view |
| Import set button | Library view, top-right |
| Schema reference | Library view, accessed via a link below Import |
| Stats (week/exercises/streak) | History view |
| Recent sessions list | History view |
| Export sessions JSON | History view |
| Theme toggle | Settings view |
| Count-in default | Settings view |
| Auto-start default | Settings view |
| Storage / persistence info | Settings view |
| Take the tour | Settings view |

### What the sidebar contains

- Project mark at the top (small square with "pm" or similar identifier — placeholder for now, can become a real logo later)
- The four destination icons with labels:
  - Practice (play arrow icon)
  - Library (book or folder icon)
  - History (clock icon)
  - Settings (gear icon)
- A thin accent strip at the very top of the sidebar (full-width, 6px tall, gradient at 0.6 opacity)

The active destination has:
- A 3px-wide accent bar on its left edge (gradient)
- A subtle accent-tint background (`rgba(139, 92, 246, 0.18)`)
- Light purple text color (`#C4B5FD`)
- Light purple icon color

Inactive destinations have muted gray text and icons.

### Mobile responsive

Below 768px viewport width:
- The left sidebar becomes a bottom nav with the same four destinations as horizontal icons
- The Practice view's right-side "session info" panel collapses into the info strip below the notation (no separate panel)
- The Library cards reduce from 2 columns to 1 column
- The History stat cards stack vertically (3 rows of 1)
- The exercise selector popover becomes a full-screen sheet sliding up from the bottom

## 6. Component specs

### Sidebar (desktop)

Width: 64px. Background: `#0A0B11`. Border-right: `0.5px solid #1A1B26`.

Top section (logo): 64px tall. Below it, the four destination icons each in a 64×64 hit target with a 40×40 icon area.

### Top bar (Practice view)

Height: 48px. The top bar in Practice is the only place that shows the Mode toggle and (in Exercise mode) the Current Exercise pill.

- Mode toggle: 200×28 pill with two segments (Free / Exercise), active segment uses card gradient background with the inner highlight, inactive segment is muted
- Current Exercise pill (Exercise mode only): right-aligned, 220×44, shows "CURRENT EXERCISE" small-caps label above the exercise number + name, with a chevron indicating it's clickable

The Library, History, and Settings views don't have a top bar of their own — they start directly with a view title.

### View title section

Each non-Practice view starts with:
- 20px/500 view title in primary text color
- 12px/400 single-line view description in secondary text color
- 28px of vertical padding above and below this header block

### Cards (general)

```css
border-radius: 14px;
padding: depends on contents;
background: linear-gradient(180deg, #1A1B26 0%, #10111A 100%);
border: 0.5px solid #2D2E3D;
box-shadow: 0 2px 4px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.35);
position: relative; /* for the ::before highlight */
```

### Tiles (exercise tiles in selector and Library)

Selector popover tiles: 56×56px. Border-radius: 11px.
Library cards (acting as large tiles): ~280×200px desktop, ~340×220px at wider viewports.

Common to all tiles:
- Border-radius: 11-14px
- Tile-variant gradient background
- 0.5-1.5px border depending on state (see Tile states below)
- Inner top highlight stroke
- Optional gradient soft tint overlay for accent states

### Tile states

| State | Border | Tint overlay | Badge |
|-------|--------|--------------|-------|
| Not yet attempted | `#374151` 0.5px | None | None |
| Attempted, not completed | `#374151` 0.8px | Subtle purple at 0.04 | Small circle with arc |
| Completed | `#8B5CF6` 0.8px | Purple gradient at 0.06-0.08 | Filled purple circle with white check |
| Mastered (best BPM ≥ 1.5× default) | `#FBBF24` 0.8px | Gold at 0.05-0.06 | Gold diamond badge |
| Current exercise | `#8B5CF6` 1.5px | Purple gradient at 0.10-0.12 | None, but tile has progress bar at bottom showing rep position |

### Play button

Both modes use the same construction; only size changes.

Exercise mode: 76px radius (152px diameter).
Free mode: 92px radius (184px diameter).

```css
background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
border-radius: 50%;
box-shadow: 0 4px 6px rgba(0,0,0,0.6);
position: relative;
```

The bloom is a separate element absolutely positioned behind the button, with `pointer-events: none`. The bloom's diameter is roughly 2-2.5× the button diameter.

The inner radial highlight is an overlay inside the button (also non-interactive).

When stopped, the button optionally has a very subtle breathing animation — scale 1.0 to 1.02 over 2.5 seconds, ease in out, infinite. Disabled when `prefers-reduced-motion`.

The play/pause icon inside the button is white, ~30% of the button's diameter.

### Info strip (Exercise mode, below notation)

48px tall, single horizontal row, divided into four sections by 0.5px vertical separators. Each section shows:
- A small-caps label (10px, letter-spacing 0.1em, secondary color)
- A value (12px, weight 500, primary color)

The strip uses card gradient background, standard card shadow.

### Config pills (Free mode, replacing the info strip)

84px tall card holding 4 pills in a horizontal row. Each pill is 128×52px with:
- Pill background: deep-card gradient
- 0.5px border
- Small-caps label (9px, letter-spacing 0.1em)
- Value (13-20px, weight 500)
- A `▾` chevron indicating dropdown
- Active pills (those with configuration set) have a purple border at 0.7px and a 0.06 purple tint
- Inactive pills (e.g., "Dropout: Off") have muted neutral border and muted value text

### Stat cards (History view)

180×120px. Card gradient background. Standard card shadow. Inner top highlight.

Contents:
- Small-caps label at top (10px, letter-spacing 0.08em)
- Large numeric value (34px, tabular-nums)
- Comparison/context line (11px secondary text)
- Right-aligned visualization (sparkline, progress bar, or recent-days bar chart)

### Recent session row

572×56px in the History view. Card gradient background. Standard shadow + inner highlight.

Layout left-to-right:
- 18px status indicator (filled circle for completed, empty circle for stopped, gold diamond for new-best)
- 22px gap
- Exercise name (13px/500) + set context (11px secondary)
- Right-aligned: reps and BPM (12px tabular-nums), duration (11px secondary), elapsed time (11px), exact time (10px tertiary)

New-best rows get a gold tint on the "New best —" prefix in the secondary line.

### Exercise selector popover

Anchored to the Current Exercise pill in the Practice top bar. Width 436px. Max height ~730px with internal scroll if exceeded.

- 16px border-radius
- Lighter popover gradient background
- Heavier popover shadow
- Pointer arrow (16px wide × 10px tall) connecting top of popover to anchor element

Backdrop: page behind the popover dims via a `rgba(0, 0, 0, 0.4)` overlay. Clicking the overlay closes the popover. Escape key closes it. Tab key cycles focus within it.

Contents top to bottom:
1. Set selector strip (44px tall, 1 row)
2. Search input (36px tall, 1 row)
3. Recent row with "RECENT" label and 5 small tiles
4. Separator hairline
5. Sectioned grid with collapsible sections, 6 tiles per row
6. Separator hairline
7. Auto-start toggle (toggleable inline)
8. Mark as completed + Reset progress buttons (side by side, Reset uses muted-red treatment)

### Settings sections (text spec, no mockup needed)

Each section in Settings is:
- Small-caps section label (10px, letter-spacing 0.06em)
- 12px gap
- One or more setting rows: 484px wide, 34px tall, card gradient background, 0.5px border
- Each row: label on left, control on right (toggle, value display, or dropdown)
- Gap between rows: 12px
- Gap between sections: 24px (with hairline separator centered in the gap)

Sections:
- **Appearance**: Theme (auto/light/dark dropdown)
- **Practice defaults**: Count-in between exercises (toggle), Default count-in bars (1-4 stepper), Pre-roll countdown (toggle), Auto-start next exercise (toggle)
- **Storage**: Storage status (text display with checkmark if persistent), Export sessions (button), Import sessions (button)
- **Help**: Take the tour (button with "Free mode" / "Exercise mode" options when clicked)

## 7. Animations and transitions

Sparing, purposeful, never decorative.

### Notation active-note highlight

Already specced in the original ARCHITECTURE.md — band + glow + scale on the current note. Unchanged in v2 except the accent color shifts from sky to the purple-cyan gradient. Specifically, the notehead and stem use `#8B5CF6`, the glow uses `#8B5CF6` outer + `#A78BFA` inner, the band uses `rgba(139, 92, 246, 0.25)`.

### Play button breathing animation

When stopped, the play button subtly pulses: `transform: scale(1.0 → 1.02 → 1.0)` over 2.5s, ease-in-out, infinite. Disabled when `prefers-reduced-motion`. When playing, animation stops and button stays at scale 1.0.

### Hover states

Every interactive element gets a subtle hover treatment:
- Buttons: brightness increases by ~10% via filter or background lighten
- Tiles: 1px border becomes slightly brighter, top inner highlight increases by 50%
- Sidebar destinations: muted background tint appears
- All hover transitions: 120ms ease-out

### Popover open/close

Popovers fade in with a slight scale: from `scale(0.98) opacity(0)` to `scale(1.0) opacity(1.0)` over 150ms. Closing reverses. Disabled when reduced motion (instant).

### View transitions

Switching between Practice/Library/History/Settings uses a crossfade: outgoing view fades to opacity 0 over 120ms, incoming view fades in over 120ms. The sidebar stays static. No translate or slide.

### Modal dialogs (Reset Progress confirm, etc.)

Backdrop fades in over 150ms. Dialog scales from 0.96 to 1.0 over 200ms with ease-out.

## 8. Iconography

Use [Lucide](https://lucide.dev) icon library. Outline style only, never filled. 16-24px sizing depending on context. Stroke width 1.5 by default; reduce to 1.2 for small icons (under 16px).

Key icons by view:
- Practice: `play` (or `play-circle`)
- Library: `library` (or `book-open`)
- History: `clock` (or `bar-chart-3`)
- Settings: `settings`
- Import: `upload` or `plus`
- Export: `download`
- Search: `search`
- Filter: `search`
- Delete: `trash-2`
- Schema reference: `file-code` or `code`
- Mode toggle Free: `circle` (or no icon, just text label)
- Mode toggle Exercise: `music` (or no icon)

## 9. Implementation notes

This is a substantial redesign, not a touch-up. The visual language touches every screen, the IA changes the navigation model, and component structure changes meaningfully. Implementation should be staged:

**Stage 1: Design tokens and primitives.** Create the new CSS custom properties (colors, gradients, shadows). Build the Card, Tile, Button, Input, Toggle, and Stat components as reusable primitives. Verify they render correctly in isolation.

**Stage 2: App shell.** Build the sidebar, top bar, and view-switching router. Empty placeholder content in each view. Verify navigation works and the visual language reads correctly at app-shell level.

**Stage 3: Practice view (both modes).** Migrate the scheduler, BPM display, rep counter, and notation rendering into the new layout. The audio engine and Web Audio API code does NOT change — only the surrounding UI. Replace the old pills with the new config-pill row. Build the info strip and exercise notes card. Verify both modes work end-to-end with audio.

**Stage 4: Exercise selector popover.** Build the popover with all its components (set selector, search, recents, sectioned grid, action row). Wire to existing exercise data. Verify selection updates Practice view correctly.

**Stage 5: Library view.** Build the detailed card layout with notation previews. Wire to existing exercise data. Verify navigation back to Practice works on card tap.

**Stage 6: History view.** Build the stat cards (including the sparkline visualization). Build the recent sessions list. Wire to existing session log data. Add export action.

**Stage 7: Settings view.** Build the simplified settings sections. Migrate the existing theme, count-in, persistence functionality.

**Stage 8: Polish, light mode, mobile responsive.** Verify light mode looks deliberate (not just inverted). Test mobile responsive at all breakpoints. Verify reduced-motion preference is respected.

**Stage 9: Removal of v1 code.** Delete the old DESIGN.md references and any v1-only components no longer used. Update CLAUDE.md to reflect the new component organization.

Each stage should result in a working app — not a half-built broken state. Commit at each stage boundary.

## 10. Migration strategy

The data layer doesn't change. Zustand stores, Dexie schema, session/progress tracking, exercise loader — all unchanged. The redesign is pure UI.

The old `DESIGN.md` becomes archived as `DESIGN-v1-archive.md` for historical reference. SPEC.md and ARCHITECTURE.md are updated to reference the new component structure but their core specs (the schema, the scheduler logic, the validation rules) remain authoritative.

This redesign does NOT change:
- Schema versions
- Bundled vs user-imported set architecture
- Session log structure
- Exercise progress tracking logic
- Web Audio scheduler implementation
- VexFlow rendering approach (only the color of the highlight changes)
- Multi-set support
- Tour spec (deferred to Phase 9)

This redesign DOES change:
- Every visual surface
- Where features live (IA reorganization per §5)
- Component file structure (new components, removed components)
- CSS architecture (new tokens, new utility classes)
- Routing (new four-view structure with a router)
