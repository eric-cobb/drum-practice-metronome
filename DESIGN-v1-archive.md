# Design (v1 — ARCHIVED)

> **Archived.** This is the original v1 design language, superseded in full by
> **`DESIGN-v2.md`** (the purple-cyan redesign with the four-view IA). It is kept
> only for historical reference and no longer reflects the shipping UI. For any
> visual/layout question, read `DESIGN-v2.md`.

This document defined the visual design language and layout structure for the practice metronome app.

## Design Principles

The app follows Apple-influenced design principles. Five rules govern every decision:

1. **Defer to the content.** The notation and the live numbers (BPM, rep count) are the content. Chrome — buttons, labels, panels, borders — exists to support them, never to compete with them. If a UI element draws attention away from notation while playing, it's wrong.

2. **Progressive disclosure.** Configuration is hidden until summoned. The main view shows only what the user needs to *see* during practice, not what they might want to *change*. Settings live in popovers and sheets that appear on demand and dismiss when not needed.

3. **Direct manipulation.** Where possible, the user clicks the value they want to change, not a label or container around it. Click the BPM number to edit it. Click the exercise name to navigate exercises. Don't put a "BPM:" label next to a separate input field.

4. **Modal context.** The UI is meaningfully different when stopped vs. playing. Stopped state shows configuration prominently. Playing state shows the notation and live numbers prominently and recedes everything else. Same screen, two emphasis modes.

5. **Restraint over decoration.** Whitespace and typographic hierarchy do the work that borders, boxes, and color usually do in busier designs. Borders are hairline or absent. Backgrounds are flat. Colors are limited.

## Layout Structure

The app has two distinct layouts: **Exercise mode** centers the notation as the content; **Free mode** centers a large pulsing transport button as the content. Both share the top bar and the same design principles, but the canvas-zone treatment differs significantly. Do not try to force Free mode into Exercise mode's layout — it has different content needs and deserves its own visual composition.

### Shared: Top Bar (h-14)

A single horizontal strip with three regions:

- **Left**: Mode toggle. A segmented control with two options: "Practice" / "Free". Compact, ~120px wide, height ~32px. Inactive option has muted text; active option has full-contrast text and a subtle background fill.
- **Center**: Context. In Exercise mode, displays the current exercise position as clickable text (see Exercise Mode Layout). In Free mode, displays a borderless text input for the exercise name (placeholder: "Exercise name").
- **Right**: Two icon buttons, ~32px each, ~8px apart. History icon (clock) opens the session log view. Gear icon opens the settings sheet.

The top bar has a 1px hairline border at the bottom (`border-b border-neutral-200 dark:border-neutral-800`). No background fill — same as the canvas below.

---

### Exercise Mode Layout

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR  (h-14)                                        │
│  [Mode toggle]   Exercise position    [⏱]  [⚙]         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│   CANVAS  (flex-1)                                      │
│   Notation rendered full-width, dominant                │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [4/4]  [16ths]                              (disabled) │  ← context strip
├─────────────────────────────────────────────────────────┤
│  TRANSPORT  (h-24 stopped, h-32 playing)                │
│   BPM         [▶/⏸]         Reps                       │
└─────────────────────────────────────────────────────────┘
```

The canvas zone holds the notation, full-width with generous padding (`px-8 py-16`). The notation has no visible container — no border, no background tint, no card shadow. The active-note highlight is the dominant visual color in the canvas zone. See the "Notation canvas" section under Component Patterns for specific staff height, width, and sizing rules.

A **context strip** (h-10) sits between the canvas and the transport, showing the current time signature and subdivision as pills — the same pills used in Free mode's control strip, but in a disabled state because Exercise mode locks these to the exercise. Tapping a disabled pill shows a small inline message "Set by exercise" that fades after 2 seconds. This gives the user an always-visible reference for what the metronome is configured to do without having to read it off the notation.

Disabled pill style: `bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-500 cursor-default`. Visually similar to the off-state of optional-feature pills but with `cursor-default` (no pointer) so it's clear they're not interactive.

Dropout and Ramp pills do not appear in Exercise mode's context strip by default — they're Free mode features. If you want to enable a ramp during exercise practice (per SPEC §6), the toggle for that lives in the settings sheet, not the context strip.

The transport zone at the bottom contains BPM (left), the start/stop button (center), and the rep counter (right). The start/stop button here is the standard ~80-96px circular button — not the giant one used in Free mode, because the notation above is already providing the focal weight.

A thin progress bar (`h-0.5`) sits at the very top edge of the transport zone, showing reps-completed / target as a horizontal fill in the accent color.

#### Exercise context (top bar center, Exercise mode)

Single text element, formatted as: `"Stick Control · #5 Paradiddle R · 5 of 8"`.

- Set title: standard text color, `font-medium`
- Separator dots (`·`): muted color, with breathing room (`px-2`)
- Exercise position ("5 of 8"): muted color, smaller (`text-xs`)
- The entire string is one clickable element opening the Exercise Popover

---

### Free Mode Layout

Free mode is fundamentally different from Exercise mode: there is no notation to anchor the canvas, so the **transport itself becomes the content**. The play/stop button is enlarged to a dramatic central focal point and the BPM and rep counter join it as a single composition in the canvas zone. The bottom transport bar from Exercise mode is replaced by a minimal control strip.

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR  (h-14)                                        │
│  [Mode toggle]   [Exercise name input]    [⏱]  [⚙]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                     120                                 │  ← BPM, very large
│                                                         │
│                  ╭───────╮                              │
│                  │       │                              │  ← giant pulsing
│                  │   ▶   │                              │    play/stop button
│                  │       │                              │
│                  ╰───────╯                              │
│                                                         │
│                    5 / 20                               │  ← rep counter
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [4/4]  [16ths]  [Dropout: off]  [Ramp: off]            │  ← control strip
└─────────────────────────────────────────────────────────┘
```

#### The central composition

Three elements stacked vertically and centered horizontally in the canvas zone:

1. **BPM number** (top). System sans, `font-semibold tracking-tight tabular-nums`. Stopped: 96px (`text-8xl`). Playing: 180px (`text-[180px]`). Click to open BPM popover.
2. **Play/stop button** (middle, the focal point). Stopped: 240px diameter. Playing: 280px diameter. Treatment per "Primary button treatment" in the Buttons section — gradient, inner highlight, inner bottom shadow, outer bloom when playing. Icon: play arrow ▶ or pause bars ⏸ (~80px white glyph). Clicking toggles play state.
3. **Rep counter** (bottom). System sans, `font-semibold tracking-tight tabular-nums`. Stopped: 64px (`text-[64px]`). Playing: 112px (`text-[112px]`). Click (when stopped) to open Rep Counter Popover. Format: "5 / 20" with the slash and target reps in `text-neutral-600` muted color.

Vertical spacing between elements: `gap-8` to `gap-12` depending on viewport. The whole composition should feel weighted and balanced, like an album cover or a transit-system display — not like a form.

The BPM is deliberately larger than the rep counter (180px vs 112px playing, 96px vs 64px stopped). BPM is the more frequently changing and more critical value during practice; rep counter is supporting context.

#### The button is the beat indicator

The play/stop button is the beat indicator. There is no separate visual pulse element elsewhere on the screen. The full treatment specs (gradient, inner shadows, bloom values, sonar ring values) live in the Buttons section; the behavioral rules live here.

When playing:

- **Every beat (unaccented)**: The button briefly scales up by ~3% (1.0 → 1.03 → 1.0 over 120ms, ease-out). A soft sky-tinted sonar ring expands outward (scale 1.0 → 1.25, opacity 0.30 → 0.0, over 400ms). The button's gradient remains in the sky family throughout.
- **Accented beat**: A larger scale pulse (1.0 → 1.06 → 1.0 over 200ms). The gradient shifts from sky to cyan and the outer bloom intensifies (per the "accented beat" spec in the Buttons section). Two cyan-tinted sonar rings expand outward in sequence. The color shift decays back to sky over ~200ms after the beat.
- **Subdivision clicks**: No visual response (would be too busy). Only main beats and accented beats animate.

Accented beats are determined by the active accent pattern: by default, beat 1 of each bar is accented. Custom accent patterns (configured in the Time Signature Popover) can mark any combination of beats as accented; all such beats get the cyan-shift treatment.

The combination of the sky → cyan shift, the brighter bloom, and the doubled sonar rings is the "this is an accented beat" visual signature. Even from peripheral vision, accented beats are unmistakably different from regular beats.

#### The control strip (bottom)

A compact horizontal strip below the canvas, ~56px tall. Contains four pill toggles, left-aligned with `gap-2`:

- **Time signature pill**: shows the current value (e.g., "4/4", "6/8", "7/8"). Click opens the Time Signature Popover.
- **Subdivision pill**: shows the current value (e.g., "Quarter", "8ths", "16ths", "Triplets", "16th triplets"). Click opens the Subdivision Popover.
- **Dropout pill**: shows state and config (e.g., "Dropout: off", "Dropout: 4-on, 2-off", "Dropout: random 25%"). Click opens the Dropout Popover.
- **Ramp pill**: shows state and config (e.g., "Ramp: off", "Ramp: 60→120 +2/2 reps"). Click opens the Ramp Popover.

**Two pill styles, by purpose:**

The pills come in two visual flavors that reflect their behavioral difference:

- *Always-configured pills* (Time signature, Subdivision): These controls always have a value — there is no "off" state. Style: `bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300`. The value reads as a setting, not a toggle.
- *Optional-feature pills* (Dropout, Ramp): These are off by default and can be enabled. Style when off: `bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500` (more muted than always-configured pills, to indicate the feature isn't active). Style when on: `bg-sky-500/10 text-sky-600 dark:text-sky-400` (accent-tinted to indicate active).

This convention matters: scanning the control strip, the user can instantly tell which features are *configured to a value* vs. which are *toggled on or off*. Time signature is never "off"; Dropout often is.

The strip has a 1px hairline border at the top.

There is **no separate large start/stop button** in this strip — the central button is the only start/stop control in Free mode. Don't add a second one.

#### Stopped vs. playing in Free mode

- **Stopped**: Composition at the smaller scale (BPM 96px, button 240px, reps 64px). No outer bloom on the button — it's "lit" by the gradient but not glowing. Control strip at full opacity. Top bar at full opacity.
- **Playing**: Composition scales up dramatically (BPM 180px, button 280px, reps 112px). Button gains its outer bloom. Top bar fades to 30% opacity. Control strip fades to 30% opacity. The central composition is essentially alone on screen, pulsing with the beat.

The transition between states is 250ms ease-out for everything except the button bloom, which crossfades over 400ms for a slower "warming up" feel as playback begins.

---

### Why two layouts

Forcing both modes into a single template was the mistake in the first draft. Exercise mode has notation, which is rich content that earns its own canvas zone. Free mode has no such content, so the canvas zone in Free mode is *visually empty* unless we explicitly fill it with something compelling. The two layouts share a top bar, a popover system, a typography scale, a color palette, and a behavioral model — but their canvas treatments differ because their content differs.

This is the correct application of "defer to the content." When the content is notation, defer to it. When the content is just the metronome, the transport *becomes* the content and gets the visual treatment it deserves.



## Typography

Single typeface for the entire app: the system sans-serif. Use the following font stack on all text elements:

```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
```

This resolves to SF Pro Display on macOS/iOS, Segoe UI on Windows, and the OS default elsewhere. No web fonts are loaded — the app uses what the OS provides. This keeps the bundle small and the rendering fast, and all candidate fonts on supported platforms support tabular numerals.

**No monospace anywhere.** Earlier drafts called for monospaced display numerals; this was a mistake — it reads as "code editor" rather than "display." Use the same sans-serif as the rest of the UI for everything, with `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`) on the large display numbers (BPM, rep counter). Tabular-nums keeps the digits the same width so the numbers don't shift around when the value changes, without the typewriter aesthetic of true monospace.

### Scale (Tailwind classes)

| Use                                       | Size  | Weight | Class                                                  |
|-------------------------------------------|-------|--------|--------------------------------------------------------|
| Free mode BPM, playing                    | 180px | 600    | `text-[180px] font-semibold tracking-tight tabular-nums` |
| Free mode rep counter, playing            | 112px | 600    | `text-[112px] font-semibold tracking-tight tabular-nums` |
| Free mode BPM, stopped                    | 96px  | 600    | `text-8xl font-semibold tracking-tight tabular-nums`    |
| Exercise mode BPM/rep, playing            | 96px  | 600    | `text-8xl font-semibold tabular-nums`                   |
| Free mode rep counter, stopped            | 64px  | 600    | `text-[64px] font-semibold tracking-tight tabular-nums` |
| Exercise mode BPM/rep, stopped            | 48px  | 600    | `text-5xl font-semibold tabular-nums`                   |
| Exercise title                            | 18px  | 500    | `text-lg font-medium`                                   |
| Body / standard UI                        | 14px  | 400    | `text-sm`                                               |
| Caption / secondary                       | 12px  | 400    | `text-xs text-neutral-500`                              |
| Sticking labels (R/L)                     | 14px  | 500    | `text-sm font-medium`                                   |

Free mode display numerals are deliberately larger than Exercise mode's because Free mode has no notation to anchor the canvas — the numerals do that work themselves. In Exercise mode, the notation dominates and the BPM/reps stay supporting-sized.

Only display sizes are allowed to be large. Nothing else competes. There is no use of `text-2xl`, `text-3xl`, or `text-4xl` anywhere in normal UI — those sizes fall in a dead zone that always looks awkward.

Tracking: the Free mode display numerals use `tracking-tight` for visual density at the larger sizes. Exercise mode display numerals use default tracking. Body text uses default tracking.

## Color

Restricted palette. Two cool accents (one primary, one for beat emphasis), neutrals for everything else.

### Tokens (Tailwind)

| Token                | Light mode              | Dark mode              |
|----------------------|-------------------------|------------------------|
| Background           | `bg-white`              | `bg-neutral-950`       |
| Surface (popovers)   | `bg-white`              | `bg-neutral-900`       |
| Border (hairline)    | `border-neutral-200`    | `border-neutral-800`   |
| Text primary         | `text-neutral-900`      | `text-neutral-50`      |
| Text secondary       | `text-neutral-600`      | `text-neutral-400`     |
| Text muted           | `text-neutral-400`      | `text-neutral-600`     |
| Accent (primary)     | `bg-sky-500`            | `bg-sky-400`           |
| Accent text          | `text-sky-600`          | `text-sky-400`         |
| Active note          | `fill-sky-500`          | `fill-sky-400`         |
| Beat accent          | `bg-cyan-400`           | `bg-cyan-300`           |
| Beat accent ring     | `border-cyan-400`       | `border-cyan-300`       |

The primary accent is **sky** — a bright cool blue. Used for the resting/regular state of the play/stop button, the active note highlight in notation, the progress bar in the transport zone, focus rings on interactive elements, and active-state pill toggles.

The **beat accent** is **cyan** — a brighter, more saturated neighbor to sky on the color wheel. Used exclusively on **accented beats** of the metronome (by default beat 1 of each bar; custom accent patterns add more). On an accented beat, the play/stop button briefly shifts its gradient from sky → cyan, the sonar ring expanding from the button is cyan-tinted, and the outer bloom intensifies. The shift is the visual signature of "this is an accented beat" without leaving the cool color family.

Neither accent is **ever** used as a background for large surfaces, never for body text, never for borders. Restraint is the point.

### Background and surface

Light mode background is pure white. Dark mode background is `neutral-950` — a deep near-black that's easier on the eyes than pure black during long practice sessions. Popovers and sheets are one shade lighter in dark mode (`neutral-900`) to convey elevation without adding shadows.

### Borders

Hairlines only. 1px, neutral-200 in light mode, neutral-800 in dark mode. Used to separate the three zones (top bar, canvas, transport). Not used inside zones — spacing handles separation within a zone.

## Spacing

Strict 8px grid. Use Tailwind's default spacing scale (4, 8, 12, 16, 24, 32, 48, 64). Generous spacing inside zones, tight spacing between related controls.

- Zone padding: `px-8 py-16` on the Exercise mode canvas (generous vertical for the prominent notation), `px-6` on the top bar and transport. Free mode canvas uses default flexbox centering without explicit padding since the composition is intrinsically centered.
- Between primary controls: `gap-6` to `gap-8`
- Between related controls (e.g., BPM number and its ± buttons in popover): `gap-2`
- Around popover content: `p-4`

## State-Based UI: Stopped vs. Playing

The same layout shifts emphasis based on state. The principle is identical in both modes: chrome politely withdraws when you start playing, leaving you with the content (notation + transport in Exercise mode; the central composition in Free mode). When you stop, chrome fades back in.

### Exercise mode

**Stopped state:**
- Transport zone: 96px tall (`h-24`)
- BPM and rep numbers: 48px (`text-5xl`)
- Start/stop button: 80px diameter
- Context strip: full opacity
- Settings gear and history icon: full opacity
- Canvas notation: full opacity

**Playing state:**
- Transport zone grows: 128px tall (`h-32`)
- BPM and rep numbers: 96px (`text-8xl`)
- Start/stop button: 96px diameter
- Context strip: 30% opacity
- Settings gear, history icon, and mode toggle: 30% opacity
- Canvas notation: full opacity, active note highlight more prominent

### Free mode

**Stopped state:**
- BPM number: 96px (`text-8xl`)
- Play/stop button: 240px diameter, no outer bloom, gradient only, play icon
- Rep counter: 64px (`text-[64px]`)
- Control strip: full opacity
- Settings gear, history icon, mode toggle: full opacity

**Playing state:**
- BPM number: 180px (`text-[180px]`)
- Play/stop button: 280px diameter, gradient + outer bloom, pause icon, scale-pulses on every beat
- Rep counter: 112px (`text-[112px]`)
- Control strip: 30% opacity
- Settings gear, history icon, mode toggle: 30% opacity
- On accented beats: button gradient shifts to cyan, bloom intensifies, two cyan-tinted sonar rings expand outward
- On unaccented beats: subtle scale pulse only, with a single softer sky-tinted sonar ring

### Transition

Between states: 250ms, ease-out. Use Tailwind's `transition-all duration-250 ease-out`. If `prefers-reduced-motion` is set, the transition is instant.

## Component Patterns

### Popovers

Used for: BPM editor, rep counter config, exercise navigation, time signature config (including accent pattern), subdivision selection, dropout config, ramp config.

- Anchored to the element that triggered them
- Width: typically 280-320px
- Background: surface token (`bg-white dark:bg-neutral-900`)
- Border: 1px hairline
- Shadow: very subtle, `shadow-lg shadow-neutral-200/50 dark:shadow-neutral-950/50`
- Corner radius: `rounded-xl` (12px)
- Padding: `p-4`
- Dismiss: click outside, press Escape, or interact with another element
- Animation: 150ms fade + 4px slide-up on open; instant on close

### Sheet / Modal (Settings)

Used for: settings, session log view (could be sheet or full-screen).

- Slides up from bottom on mobile-width viewports, modal-centered on desktop
- Dimmed backdrop: `bg-black/20`
- Max width on desktop: ~600px
- Sheet content scrollable independently of the main view
- Dismiss: click backdrop, press Escape, or "Done" button in sheet header

### Pill toggle (control strip / context strip)

Compact buttons used in the bottom strip for settings and feature toggles. All share the same shape and size: `h-8 px-3 rounded-full text-sm`.

Four variants, distinguished by purpose:

- **Always-configured** (Time signature, Subdivision in Free mode): `bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300`. Used for settings that always have a value. The pill displays the current value (e.g., "4/4", "16ths"). Click opens the corresponding popover.
- **Optional-off** (Dropout/Ramp when disabled): `bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500`. Slightly more muted than always-configured pills to indicate the feature isn't active. Click opens the popover where it can be enabled.
- **Optional-on** (Dropout/Ramp when enabled): `bg-sky-500/10 text-sky-600 dark:text-sky-400`. Accent-tinted to indicate the feature is currently active. The pill displays the active configuration (e.g., "Dropout: 4-on, 2-off"). Click opens the popover to edit or disable.
- **Disabled** (Time signature, Subdivision in Exercise mode): `bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-500 cursor-default`. Visually similar to optional-off but with `cursor-default` and no hover state. Click shows an inline message "Set by exercise" that fades after 2 seconds; does not open a popover.

Hover state for all interactive variants: 5% brightness shift on background. Focus ring per the accessibility rules.

### Buttons

Three button types, no others:

- **Primary (start/stop)**: circular, with rich treatment (see "Primary button treatment" below). White icon (`#fafafa`), centered.
- **Secondary (popover actions like "Done", "Cancel")**: text button, `text-sm font-medium`, accent text color, no background, no border
- **Icon (settings gear, history clock)**: 32px square, no background, hover state adds `bg-neutral-100 dark:bg-neutral-800`

No bordered buttons. No outlined buttons. No "ghost" buttons with different styles. Three types, that's it.

The play icon inside the primary button is two vertical bars (pause) when playing, a centered triangle (play) when stopped. Bars are `10px × 40px` with `gap-2`, white with a subtle drop shadow (`box-shadow: 0 1px 2px rgba(0,0,0,0.25)`) for definition against the gradient background.

#### Primary button treatment

The primary (start/stop) button is the only element in the app that uses gradient and bloom. Everything else stays flat. This restraint is what makes the button feel like the focal point — adding similar treatment to chrome would dilute the effect.

**Resting state (stopped):**
```css
background: radial-gradient(circle at 32% 28%, #7dd3fc 0%, #38bdf8 40%, #0ea5e9 75%, #0284c7 100%);
box-shadow:
  inset 0 1px 1px rgba(255, 255, 255, 0.18),
  inset 0 -8px 18px rgba(3, 105, 161, 0.4),
  0 6px 18px rgba(0, 0, 0, 0.32);
```

No outer bloom when stopped — the button is "lit" but not glowing.

**Playing state, regular beat:**
Same gradient as resting, but with an outer bloom added and a soft sonar ring during the beat pulse:

```css
background: radial-gradient(circle at 32% 28%, #7dd3fc 0%, #38bdf8 40%, #0ea5e9 75%, #0284c7 100%);
box-shadow:
  inset 0 1px 1px rgba(255, 255, 255, 0.18),
  inset 0 -8px 18px rgba(3, 105, 161, 0.4),
  0 0 32px rgba(14, 165, 233, 0.32),
  0 6px 18px rgba(0, 0, 0, 0.32);
```

On each beat, briefly scale 1.0 → 1.03 → 1.0 over 120ms. A soft sky-tinted ring expands outward from the button edge and fades, animating `scale` from 1.0 to 1.25 and `opacity` from 0.30 to 0.0 over 400ms. Ring is a separate absolutely-positioned `div` with `border: 2px solid #38bdf8; border-radius: 50%`.

**Playing state, accented beat:**
On an accented beat (downbeat by default, or any beat enabled in the accent pattern), the gradient shifts from sky to cyan and the bloom intensifies:

```css
background: radial-gradient(circle at 32% 28%, #a5f3fc 0%, #67e8f9 35%, #22d3ee 75%, #0891b2 100%);
box-shadow:
  inset 0 1px 1px rgba(255, 255, 255, 0.35),
  inset 0 -8px 20px rgba(8, 145, 178, 0.45),
  0 0 56px rgba(34, 211, 238, 0.65),
  0 6px 20px rgba(0, 0, 0, 0.35);
```

On the accented beat, scale 1.0 → 1.06 → 1.0 over 200ms. Two cyan-tinted sonar rings expand outward: a primary ring (scale 1.0 → 1.35, opacity 0.55 → 0.0, over 500ms) and a secondary ring lagging slightly behind (scale 1.0 → 1.55, opacity 0.22 → 0.0, over 600ms, started 80ms after the first).

The color shift back to sky after an accented beat is **not instantaneous** — it decays over ~200ms with `transition: background 200ms ease-out, box-shadow 200ms ease-out`. This avoids a hard flicker between sky and cyan and gives the accent a "ringing" feel.

The light-mode equivalents shift one shade up the ramp (sky-300 → sky-400 → sky-500 → sky-600; cyan-200 → cyan-300 → cyan-400 → cyan-500) since light-mode backgrounds need slightly less saturated tones to feel balanced. Implement via CSS variables that swap on the dark/light mode toggle.

**Reduced motion:**
When `prefers-reduced-motion: reduce` is set, replace all scale pulses and sonar rings with a brief brightness shift: the button's box-shadow outer bloom briefly increases opacity (0.32 → 0.5 → 0.32 over 200ms on beats; 0.32 → 0.85 → 0.32 over 300ms on accented beats with simultaneous color shift to cyan). No scale, no rings.

## Component-Specific Redesigns

### Mode toggle

A small segmented control in the top-left of the top bar. Two segments: "Practice" / "Free". The active segment has a subtle filled background (`bg-neutral-100 dark:bg-neutral-800`) and full-contrast text. The inactive segment is text-only at muted contrast. Total height 32px, width approximately 120px.

### Exercise context (top bar center)

Single text element, formatted as: `"Stick Control · #5 Paradiddle R · 5 of 8"`.

- Set title: standard text color, `font-medium`
- Separator dots (`·`): muted color, with breathing room (`px-2`)
- Exercise position ("5 of 8"): muted color, smaller (`text-xs`)
- The entire string is one clickable element
- Hover: text gains a subtle underline or the muted parts brighten
- Click: opens the **Exercise Popover**

In Free mode, this region instead shows a borderless text input for the exercise name, with placeholder text in the muted color.

### Exercise Popover

The Exercise Popover is the navigation hub for exercises. Triggered from the exercise context text in the top bar. Replaces the flat dropdown approach because exercise sets can have 200+ exercises and a long flat list is not navigable. The popover is taller and wider than standard popovers (typically 480px wide × up to 70vh tall, scrollable internally) because it's the primary navigation surface for the active set.

Layout (top to bottom):

```
┌──────────────────────────────────────────────────────┐
│  Stick Control ▼               14 of 72 complete     │  ← set selector + summary
├──────────────────────────────────────────────────────┤
│  🔍 Filter exercises...                              │  ← search input
├──────────────────────────────────────────────────────┤
│  Recent                                              │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                            │  ← recent tiles
│  │5 │ │3 │ │7 │ │2 │ │9 │                            │
│  └──┘ └──┘ └──┘ └──┘ └──┘                            │
├──────────────────────────────────────────────────────┤
│  ▼ Single Beat Combinations      14 of 24 complete   │  ← section header
│                                                      │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐                    │  ← exercise grid
│  │1✓││2✓││3✓││4✓││5◉││6 ││7 ││8 │                    │
│  └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘                    │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐                    │
│  │9 ││10││11││12││13││14││15││16│                    │
│  └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘                    │
│  ...                                                 │
│                                                      │
│  ▶ Triplets                       0 of 16 complete   │  ← collapsed section
│                                                      │
│  ─────────────────────────────────────────────────   │
│  ☐ Auto-start next exercise                          │
│  Mark current as completed                           │
│  Reset progress for this set                         │
└──────────────────────────────────────────────────────┘
```

**Set selector (top row):**

Shows the active set's title with a dropdown chevron. Right side shows the set's completion summary ("14 of 72 complete"). User-imported sets carry a small "User" badge to the right of the title (`text-xs px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600`).

Clicking the selector opens a dropdown listing all available sets, grouped:

- **Bundled** (built-in sets that shipped with the app), each with title + completion summary
- **Your sets** (user-imported), each with title + "User" badge + completion summary

If no user-imported sets exist, the "Your sets" group is replaced with a single muted row: "Import sets in Settings →" which acts as a shortcut to open the Settings sheet's Exercise sets section.

Selecting a different set:

- Saves any in-progress session for the current set
- Loads the new set's data
- Restores the new set's `SetState` (current exercise, BPM, section collapse state)
- Re-renders the selector against the new set's structure

**Search input:**

A text field with a magnifying-glass icon and "Filter exercises..." placeholder. Filters the grid below in real time as the user types, matching against exercise number (exact or prefix: "5", "12") and name (case-insensitive substring: "paradiddle"). When search is active:

- Sections with no matches are auto-collapsed and show "(no matches)" muted in the header
- Sections with matches stay expanded regardless of their normal collapse state
- The Recent row is hidden while search has input (otherwise it's confusing to see filtered grid + unfiltered recents)
- Clearing the search restores normal expand/collapse state

**Recent row:**

Up to 5 most-recently-practiced exercises from the active set, shown as a horizontal row of tiles using the same tile design as the grid. Sourced from the `exerciseProgress` table sorted by `lastPracticedAt`. Hidden when the user has no recent sessions for this set yet (e.g., first-time user, just-switched-set).

**Sectioned grid:**

The full exercise list grouped by section. Each section has:

- A header with the section title (left), a collapse chevron (▼ expanded, ▶ collapsed), and a completion counter (right, e.g., "14 of 24 complete")
- Clicking the header toggles collapse state (persisted to `SetState.sectionsCollapsed`)
- An exercise grid below, 8 columns wide on desktop, scaling to 4 columns on narrower viewports (smooth responsive breakpoint at ~600px wide popover)

Default expand state:
- The section containing the current exercise: expanded
- All other sections: collapsed
- User toggles override the default; collapse state persists per set

**Tile design:**

64×64px tile, `rounded-lg`. Contents:

- Exercise number in large monospace-equivalent (tabular-nums) text, centered
- Exercise name below, truncated to fit, smaller text
- State indicator (top-right corner or as border treatment):

| State                                          | Visual                                              |
|------------------------------------------------|------------------------------------------------------|
| Not yet attempted                              | Neutral border, no fill                              |
| Attempted, not completed (`completed: false`, `totalSessions > 0`) | Neutral border, small arc indicator in top-right corner showing progress |
| Completed                                      | Accent border at full opacity, small ✓ in top-right  |
| Completed at high tempo (bestBpm ≥ 1.5× set default) | Filled accent background (light tint), ✓ in corner |
| Current exercise                               | Accent border at full opacity + slight inner shadow + `scale(1.05)` (visual emphasis) |

Hover/focus: subtle background lift (`bg-neutral-100 dark:bg-neutral-800` on top of current tile style). Tap target is the full tile.

**Bottom controls:**

Below the section list, separated by a hairline:

- "Auto-start next exercise" toggle (persisted to settings)
- "Mark current as completed" — secondary button, marks the current exercise as completed (writes to `exerciseProgress`) without playing reps, then advances
- "Reset progress for this set" — secondary button with confirm dialog, clears all `exerciseProgress` rows for the active set (does not touch other sets or session log)

**Dimensions and responsive behavior:**

- Width: 480px on desktop (wider than standard popovers because the grid needs room)
- Max height: 70vh; content scrolls internally
- On viewports below 600px wide: full-width sheet that slides up from the bottom instead of a popover (similar to Settings sheet)
- The section grid columns reduce to 4 on narrow widths automatically

### BPM Popover

Triggered from the BPM number. Contents:

```
┌─────────────────────────────────────┐
│           120                       │  ← large editable number
│  ●─────────────────                  │  ← slider, 30-300
│  [−]  [Tap tempo]  [+]              │  ← buttons
└─────────────────────────────────────┘
```

The number at top is the canonical input. Click to edit directly. Slider provides quick coarse adjustment. ± buttons step by 1 BPM (Shift-click = ±5). Tap tempo uses the current tap behavior from SPEC §1.

### Rep Counter Popover

Triggered from the rep counter when stopped. Contents:

```
┌─────────────────────────────────────┐
│  Bars per rep        [  2  ]        │
│  Target reps         [ 20  ]        │
│                                     │
│  ☑ Auto-stop at target              │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Reset counter to 0                 │  ← secondary button
└─────────────────────────────────────┘
```

When playing, the rep counter is not clickable — it's a live display only.

### Time Signature Popover

Triggered from the time signature pill in the Free mode control strip. Contents:

```
┌─────────────────────────────────────┐
│  Time signature                     │
│                                     │
│  Numerator      [ −  4  + ]         │  ← stepper, range 2-13
│  Denominator    ( ) 2  ( ) 4  (●) 8 │  ← radio
│                                     │
│  Common                             │
│  [₵]   [2/4]  [3/4]  [4/4]          │  ← preset grid (₵ = cut time / 2/2)
│  [5/4] [6/8]  [7/8]  [9/8]  [12/8]  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Accents                            │
│  [1] [2] [3] [4]                    │  ← per-beat toggles
│   ●   ○   ○   ○                     │  ← filled = accented
└─────────────────────────────────────┘
```

The numerator stepper accepts 2-13. The denominator radio shows 2, 4, or 8 (per SPEC §1). Common-presets are buttons that set both numerator and denominator in one click; clicking one immediately updates the values in the stepper and radio above. The cut time preset (`₵`) is equivalent to selecting 2/2 — both produce identical metronome behavior and notation, with the only difference being the staff displays the `₵` symbol in cut time and `2/2` otherwise. Internally, both are stored as `{ numerator: 2, denominator: 2 }`; the cut time visual is a display flag on the time signature object.

The **Accents** section shows one toggle per beat in the current numerator. Filled circle = accented (louder click); empty circle = unaccented. By default, beat 1 is accented and the rest are not. Changing the numerator regenerates this row to match the new beat count, preserving accents at positions that still exist (e.g., going from 4/4 to 5/4 adds a new unaccented beat 5; going from 4/4 to 3/4 drops beat 4).

The popover is wider than the standard 280-320px (use 360px) to accommodate the preset grid.

### Subdivision Popover

Triggered from the subdivision pill in the Free mode control strip. Contents:

```
┌─────────────────────────────────────┐
│  Subdivision                        │
│                                     │
│  (●) Quarter notes      ♩           │
│  ( ) 8th notes          ♫           │
│  ( ) 16th notes         ♬           │
│  ( ) 8th triplets       ♫³          │
│  ( ) 16th triplets      ♬³          │
└─────────────────────────────────────┘
```

A simple vertical radio list with the five subdivision options from SPEC §1. Optional small musical glyphs on the right for visual reinforcement (not required if rendering is awkward).

Standard popover width (~280-320px).

### Notation canvas

The notation is the content of Exercise mode and should be sized as such — large, dominant, and confidently filling the canvas zone. Earlier drafts of this spec made the notation too small relative to the page; this section corrects that.

**Width:**

- Spans the canvas width minus padding (`px-8` on viewport edges)
- Max-width 1600px on ultra-wide displays (raised from 1200px — modern desktops are wider than the spec assumed)
- On viewports below 1600px, the notation fills the available width minus padding
- Centers horizontally when narrower than the viewport

**Staff height (the bigger lever):**

VexFlow's default staff line spacing (`Stave.options.spacing_between_lines_px`) is 10px, which produces a small staff regardless of width. Override this for prominence:

```typescript
const stave = new Stave(x, y, width, {
  spacing_between_lines_px: 16,  // increased from default 10
});
```

With 16px line spacing, the staff body itself is 64px tall (4 spaces × 16px), and the overall stave including ledger space and modifiers ends up around 110-130px. This is what makes the notation feel like it has presence rather than sitting modestly on a large page.

**Note size scales with line spacing automatically:** VexFlow scales noteheads, stems, beams, accidentals, time signatures, and the clef proportionally to the line spacing. Bumping `spacing_between_lines_px` from 10 to 16 doesn't require any other size adjustments — everything grows together.

**Sticking labels** sit below the staff with `font-size: 18px font-weight: 500` (up from 12px) to remain readable at the larger staff size. Use sans-serif to match the rest of the UI: `font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif`.

**Vertical placement:**

The notation is vertically centered in the canvas zone, with generous breathing room above and below. Padding inside the canvas is `py-16` minimum (64px top and bottom) so the staff doesn't crowd the top bar or context strip.

**Active note highlight (band + glow + scale):**

The active note uses a three-layer treatment that engages three different visual systems simultaneously — color/glow for focal attention, scale for motion detection, and a vertical band for peripheral tracking. This combination is essential for readability at fast tempos (140+ BPM) and for keeping the position visible when the user's eye drifts to other parts of the screen.

The three layers:

1. **Highlight band (peripheral layer)** — A translucent vertical accent-colored band sits *behind* the active notehead, spanning the full staff height plus a small margin above and below. Specs:
   - Width: ~16px (about 2-3× the notehead width)
   - Height: full staff height + 8px (4px above the top line, 4px below the bottom line)
   - Fill: accent color at 25% opacity (`fill-sky-500/25` light, `fill-sky-400/25` dark)
   - Corner radius: ~3px (slight softening, not pill-shaped)
   - Rendered as a `<rect>` element in a dedicated SVG layer *below* the notes layer, so the notehead and stem draw on top of the band

2. **Notehead color + glow (focal layer)** — The active notehead itself shifts color and gains an outer glow:
   - Notehead `fill`: accent color (`fill-sky-500` light, `fill-sky-400` dark)
   - Stem `stroke`: same accent color
   - SVG `filter`: `drop-shadow(0 0 4px <accent>) drop-shadow(0 0 8px <accent-lighter>)` — a two-layer drop shadow that creates a soft outer bloom around the notehead and stem. Applied to the notehead glyph and stem elements specifically, **not** the parent note group; a filter on the whole group rasterizes everything together and smudges the sticking text below
   - Sticking label below the staff also brightens to the accent color (color only — no glow)

3. **Scale (motion layer)** — The active notehead and stem scale up by ~20% (`transform: scale(1.2)`) with `transform-box: fill-box` so each pivots around its own bbox center rather than the SVG origin. **The sticking label below the staff is intentionally excluded from the scale**: scaling the R/L characters on every beat makes them jitter and harder to read, and the motion-detection goal is satisfied by the note glyph alone. The exclusion is achieved by applying the transform to the notehead glyph and stem elements rather than the whole note group. This produces a brief but perceptible "pop" of motion as the highlight moves from note to note, which catches peripheral vision the way a static color change cannot.

**Transition timing:**

The highlight applies instantly when a new note becomes active (no fade-in — the music demands precision). The previous note's highlight clears at the same moment. There is no easing on the on/off transitions; visual lag relative to the audio would feel like the notation is "behind the beat" and undermine the practice value.

The scale transform does have a very brief easing for natural feel — `transform: scale(1.2) transition: transform 60ms ease-out` — but the duration is short enough that it never feels delayed.

**Accent beat note handling:**

The notation highlight uses the same color (sky) regardless of whether the beat is accented or not — accent emphasis lives on the play button, not duplicated on the notation. Trying to also shift the notation highlight to cyan on accented beats produces visual noise that competes with the play button's accent indication.

**Implementation note for VexFlow rendering:**

The band layer requires rendering an additional SVG element per note that is *not* part of VexFlow's standard output. After VexFlow draws the staff and notes, post-process the SVG to inject a band `<rect>` for each note position. The band's x-coordinate is the notehead's x-coordinate; its y-range spans from `stave.getYForLine(0) - 4` to `stave.getYForLine(4) + 4`. The bands start with `opacity: 0` and are toggled by the highlighter at runtime.

See ARCHITECTURE.md "Current-note highlighting" for the exact DOM manipulation pattern.

**No container chrome:**

The notation has no border, no background tint, no card shadow. It is just notation on the page background. This is intentional — adding a container would compete with the staff lines themselves for visual structure.

**Bar separation:**

When rendering multi-bar exercises (e.g., Stick Control's 2-bar patterns), bar lines are drawn between bars but the staff continues uninterrupted across them. Both bars share the same vertical strip; they're horizontal neighbors on one continuous staff, not separate stacked staves.

### Settings sheet

Triggered from the gear icon. Contents:

```
┌─────────────────────────────────────────────────────┐
│  Settings                                  [Done]   │  ← sheet header
├─────────────────────────────────────────────────────┤
│  Practice                                           │
│  ─────────────────────────────────                  │
│  Count-in between exercises             [on]        │
│  Count-in bars                          [  1  ]     │
│  Auto-start next exercise               [off]       │
│  Pre-roll countdown                     [on]        │
│                                                     │
│  Exercise sets                                      │
│  ─────────────────────────────────                  │
│  Bundled                                            │
│    • Foundational Rudiments  (24 exercises)         │
│    • Standard 40 Rudiments   (40 exercises)         │
│                                                     │
│  Your sets                                          │
│    • Stick Control           (72 ex.) [↓] [✕]       │
│    • Master Studies          (52 ex.) [↓] [✕]       │
│                                                     │
│  [Import a set...]            [Schema reference]    │
│                                                     │
│  Appearance                                         │
│  ─────────────────────────────────                  │
│  Theme       ( ) Light                              │
│              ( ) Dark                               │
│              (●) Auto                               │
│                                                     │
│  Storage                                            │
│  ─────────────────────────────────                  │
│  Storage: persistent ✓                              │
│  [Export sessions]                                  │
│  [Import sessions]                                  │
└─────────────────────────────────────────────────────┘
```

Sections separated by section labels (muted text) and hairline rules. Each setting row is `py-3` with the label left, the control right.

**Exercise sets section behavior:**

- "Bundled" subsection lists sets shipped with the app, in alphabetical order by title. Each shows the set's title and exercise count. No action buttons (bundled sets can't be modified).
- "Your sets" subsection lists sets imported by the user via file picker, in import order (most recent first). Each row has two icon buttons:
  - **↓ (download)** — exports the set as a JSON file, named `{set-id}-{YYYY-MM-DD}.json`
  - **✕ (delete)** — shows a confirm dialog ("Delete '{set title}'? Your session history and progress for this set will be preserved."), then removes the set from IndexedDB
- "Import a set..." button opens a file picker filtered to `.json`. On selection:
  - Valid + no conflict: set is added immediately, the "Your sets" list updates, a brief confirmation appears ("Imported 'Set Title' with 72 exercises.")
  - Valid + id collision: a modal dialog appears with options "Replace existing" (disabled if existing is bundled), "Keep both (renamed)", "Cancel"
  - Invalid JSON: error message with the specific validation failure
- "Schema reference" button opens a small subview showing the JSON schema with an annotated example exercise. Lets users transcribe their own books without reading source code. Includes a brief note: "Imported exercise sets are stored only in your browser. They are not sent to any server."

If there are no user-imported sets yet, the "Your sets" subsection shows a brief explanatory message instead of a list: "No imported sets yet. If you own a method book like Stick Control or Syncopation, you can transcribe its exercises into a JSON file using the schema reference, then import it here. Imported sets stay on your device."

### Session log view

Opened from the history (clock) icon in the top bar. Renders as a sheet on mobile or full-screen overlay on desktop. NOT visible from the main practice view.

Layout:

```
┌─────────────────────────────────────────────────────┐
│  History                                  [Done]    │
├─────────────────────────────────────────────────────┤
│  This week                                          │
│  ─────────────────────────────────                  │
│  47 min  •  6 sessions                              │
│                                                     │
│  Best tempos                                        │
│  #1 Singles R          completed @ 95 BPM           │
│  #2 Singles L          completed @ 92 BPM           │
│  #3 Doubles R          completed @ 78 BPM           │
│                                                     │
│  Recent sessions                                    │
│  ─────────────────────────────────                  │
│  Today, 2:14 PM                                     │
│   #5 Paradiddle R  •  80 BPM  •  20/20  •  4:32   │
│  Today, 2:08 PM                                     │
│   #4 Doubles L     •  78 BPM  •  20/20  •  3:48   │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

Each session row is a clickable element that expands inline to show full config and the notes field. No card containers, no row backgrounds — just typography and spacing.

### Removed elements

The following UI elements should be **deleted** from the current implementation, not refactored:

- Any header/banner above the top bar
- Any persistent section headings inside the practice view ("Metronome Settings", "Exercise Controls", etc.)
- Any visible card containers, bordered boxes, or background-tinted panels around groups of controls
- Any in-line BPM, time signature, or subdivision controls outside their respective popovers (in Exercise mode, time sig and subdivision are exercise-determined and not editable; in Free mode, they live in their own popover or in settings)
- Any session log display on the main practice view
- Any "About" or "Help" text on the main view (if you want help, put it in the settings sheet as a section)
- Any explicit "Stop" button separate from start/stop toggle
- Any visible counter or display for "current beat within bar" or "current bar within exercise" — these are visualized by the notation highlight, not by separate numeric displays

## Motion

Apple-style motion is smooth, brief, and purposeful. No bounce animations, no spring overshoots in the main UI.

- Popover open/close: 150ms fade + 4px translate
- State transitions (stopped ↔ playing): 250ms ease-out for layout; 400ms crossfade for the play button bloom (slower for a "warming up" feel)
- Active note highlight (Exercise mode): instant (the music demands precision; visual lag is unacceptable)
- Play/stop button — unaccented beat (Free mode): scale 1.0 → 1.03 → 1.0 over 120ms ease-out; single sky-tinted sonar ring (scale 1.0 → 1.25, opacity 0.30 → 0.0, over 400ms)
- Play/stop button — accented beat (Free mode): scale 1.0 → 1.06 → 1.0 over 200ms; gradient shifts from sky to cyan instantly; two cyan-tinted sonar rings expand outward in sequence (primary: scale 1.0 → 1.35, opacity 0.55 → 0.0, over 500ms; secondary: scale 1.0 → 1.55, opacity 0.22 → 0.0, over 600ms, started 80ms after the primary); gradient decays back to sky over 200ms after the beat
- Play/stop button pulse (Exercise mode): same scale-only pulses on the smaller central button; sonar rings omitted (notation highlight already provides rhythmic visual feedback); accent beat still triggers cyan shift on the button itself
- Progress bar fill: smooth interpolation, ~250ms per rep increment

Honor `prefers-reduced-motion`: skip the state transitions, replace all button scale pulses and sonar rings with a brief outer-bloom brightness shift (per the reduced-motion spec in the Buttons section); keep the active note highlight (it's not animation, it's instant state).

## Accessibility within minimal design

Minimal design must not sacrifice accessibility.

- All interactive elements have visible focus rings: `focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none`
- Color is never the sole indicator of state (the active note has color AND position highlight in the cursor; settings toggles have ON/OFF text alongside the switch)
- Touch targets minimum 44x44px on mobile, even when visual element is smaller
- All popovers and sheets trap focus while open and restore focus on close
- The start/stop button has `aria-label="Start metronome"` / `aria-label="Stop metronome"`
- The BPM and rep displays are announced to screen readers when they change (use `aria-live="polite"`)
- The notation has an `aria-label` describing the current exercise ("Stick Control exercise 5, paradiddle starting on right hand, 16th notes in 4/4")

## What this is NOT

To prevent scope creep in the refactor:

- This is not a design system. There's no component library to build, no Figma file to reference, no Storybook to set up. Apply these patterns directly in components.
- This is not iOS. The app runs in a browser, on a desktop monitor or iPad, not as a native iOS app. Apple *influence* on design, not Apple *platform* conventions (no iOS tab bars, no iOS-style back swipe, etc.).
- This is not a complete redesign of behavior. Functionality stays the same as defined in SPEC.md. Only the visual presentation and the layout structure change.
- This is not a chance to add new features. If a feature isn't in SPEC.md, it isn't in the refactor.

## Refactor Approach

When refactoring existing components:

1. Start with the page-level layout (the three-zone structure). Get the shell right first.
2. Move existing controls into their new homes (popovers, settings sheet, etc.) without changing their internal logic.
3. Apply typography and color tokens. Replace any hardcoded colors with the tokens above.
4. Implement the stopped/playing state transitions.
5. Delete the removed elements listed above.
6. Verify all existing Phase 1-6 functionality still works in the new layout before declaring the refactor complete.

Do not redesign one component at a time on the existing scrolling layout. The whole point is to change the layout structure; trying to make the existing structure prettier defeats the purpose.
