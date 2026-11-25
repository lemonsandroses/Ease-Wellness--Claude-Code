# Obsidian Bloom

The Ease design system. iOS-first, dark-only.

> **Backlit stained glass, liquid lip gloss and cyber-silk on obsidian.**

Everything here lives in [`src/index.css`](../src/index.css). Tailwind v4 reads
the `@theme` block, so every token below is also a utility class —
`--color-gloss` gives you `text-gloss`, `bg-gloss`, `border-gloss`.

---

## The three rules

**1. Nothing is pure neutral.** Every surface carries a violet undertone. Pure
grey on black reads as "unstyled dark mode"; a violet-shifted obsidian reads as
atmosphere. This one decision does more for the mood than any amount of
decoration.

**2. Light comes from behind.** Panels are lit at their top edge by a hairline
specular, the way light passes through stained glass rather than bouncing off a
card. Shadows push down, glow bleeds up.

**3. Magenta is a signal, not a surface.** Gloss is reserved for the single most
important thing on screen — one per view. Gold and rhinestone are micro-accents
measured in single pixels, never fills.

---

## Colour

### Surfaces

A tight obsidian ramp. The steps are close together on purpose: on an OLED
phone, big jumps between surfaces look like mistakes, while a tight ramp plus a
lit edge reads as real depth.

| Token | Hex | Use |
|---|---|---|
| `void` | `#06040B` | Page floor, behind everything |
| `obsidian` | `#0C0816` | Base surface, sheets |
| `onyx` | `#140E22` | Raised — rails, tooltips |
| `slate` | `#1C1430` | Elevated — inputs, unselected chips |
| `quartz` | `#271C42` | Highest — pressed, selected |

### Lines

Hairlines do the structural work that drop shadows do in a light UI.

| Token | Hex | Use |
|---|---|---|
| `veil` | `#241A3C` | Default hairline |
| `veil-strong` | `#38294F` | Emphasised hairline, dividers |

### Text

Never `#FFF`. Pure white on near-black vibrates; a warm-violet pearl sits on
obsidian without buzzing. Every step clears **WCAG AA (4.5:1)** on a card.

| Token | Hex | Contrast on card | Use |
|---|---|---|---|
| `pearl` | `#F6F1F8` | 16.1:1 | Primary, headlines |
| `silk` | `#C8BDD8` | 10.0:1 | Body copy |
| `ash` | `#B4A8C8` | 8.0:1 | Captions, `.eyebrow`, chart axes |
| `dusk` | `#8C80A8` | 4.9:1 | Faint, inactive icons — the floor |

### Accents

| Token | Hex | Use |
|---|---|---|
| `gloss` | `#FF2D87` | **The brand.** One signal per view |
| `gloss-bright` | `#FF7AB8` | Specular, text on a gloss veil |
| `gloss-deep` | `#A8004B` | Pressed |
| `gloss-veil` | `#330D24` | Opaque magenta-into-obsidian wash |
| `plasma` | `#7B4DFF` | Second voice — estimates, anything provisional |
| `plasma-bright` | `#AE93FF` | Text on a plasma veil |
| `plasma-veil` | `#1B1340` | Opaque violet-into-obsidian wash |
| `gilt` | `#E3B873` | Gold micro-accent — 1px only |
| `rhinestone` | `#EFE6FF` | Specular dots and beads |
| `mint` | `#5FE3C0` | Positive signal, kept out of the brand set |
| `alarm` | `#FF8A6B` | Errors — coral, deliberately far from gloss in hue |

The veils are **opaque mixes**, not alpha. They composite correctly over any
surface in the ramp, which alpha washes do not.

### The contrast trap

`gloss` reads fine as *ink* on obsidian (5.1:1) but **cannot carry white text as
a ground** — white on `#FF2D87` is only 3.5:1. So:

- Gloss as a fill under **text** → label is `text-void` (5.8:1).
- Gloss as a fill under an **icon** → white is fine (icons are held to 3:1).
- The primary button gradient starts at `#E01C77`, a step deeper than `gloss`,
  which clears 4.5:1 for its white label without losing the hue.

---

## Type

Two voices. The system only breaks when they get mixed inside one line.

**Playfair Display** is the editorial voice — high-contrast, with ball terminals
that keep it playful where a Bodoni would be severe. Headlines and numerals only.

**Futura PT** (Jost as the OFL fallback) is the structural voice — geometric,
quiet, never competes. Everything that explains or labels.

| Class | What it is |
|---|---|
| `.display-xl` | Screen masthead. `line-height: 1` — never tighter, or Playfair's long descenders get sliced when a headline wraps |
| `.display` | Panel headings, 25–29px |
| `.numeral` | Instrument readings, tabular figures |
| `.eyebrow` | HUD telemetry label. 0.2em tracking is what makes it read as a readout rather than a heading |
| `.lit` | Backlit gradient text. Costs a paint layer — **one per screen** |

### Heading hierarchy

- Screen `<h1>` → `.display-xl .lit` (the one backlit element)
- Panel `<h2>` → `.display text-pearl`
- Sheet `<h2>` → `.display text-pearl` (a sheet is already focused; a second
  backlit headline competes with the action it is asking for)

---

## Surfaces

`.card` — smoked glass with the atmosphere showing through, lit along its top
edge by `::before`. That single hairline is what makes it read as glass rather
than fill.

`.card-lit` — the one hero panel per screen. Gloss border and a bloom beneath.
Use via `<Card lit>`.

`.gilt-hair` — a 1px gold tracery line. For something genuinely earned (a
streak, a milestone), never as trim.

`.atmosphere` — three fixed radial pools behind every screen, plus a drawn
starfield and a grain layer. Fixed, not animated: a permanently moving
background is exhausting on a screen someone opens twenty times a day. The grain
is load-bearing — obsidian gradients band badly on 8-bit phone panels and the
noise dithers the steps away.

The iOS launch image is generated from the *same three gradients at the same
alphas*, so the native launch screen and the first web frame are one continuous
picture.

---

## HUD

`.hud-rule` — a divider drawn with a repeating gradient so it carries tick
marks. An instrument scale, not a line.

`.hud-track` / `.hud-fill` — measured values. The fill runs plasma → gloss with
a glow, so progress reads as something lighting up.

The cycle ring carries a per-day tick scale outside the arc, which is what makes
it an instrument you can read a position off rather than a decoration.

---

## Motion

Unchanged from before the redesign — see [`src/lib/motion.ts`](../src/lib/motion.ts).
Two springs (`snap`, `glide`), one celebration (`pop`), one easing.

One addition: `.bloom`, a 6-second shallow breath under the cycle ring. Long and
shallow on purpose — it should read as alive, never as a loading state. Opacity
tops out at 0.32; anything higher floods the ring and the arcs disappear into
the haze.

Everything respects `prefers-reduced-motion`.

---

## The cycle ring

Four phases close a hue loop: magenta at the bleed, violet as it builds, pale
lilac at the brightest point, then orchid carrying it back round to magenta. A
ring whose colour returns to where it started is the whole idea of a cycle.

| Phase | Hex |
|---|---|
| Menstrual | `#FF2D87` |
| Follicular | `#7B4DFF` |
| Ovulatory | `#AE93FF` |
| Luteal | `#D14FC4` |

Gold is deliberately absent here. It is a micro-accent in this system, and
across an arc this long it desaturates into a muddy tan that belongs to no part
of the palette. The one place gilt appears as a stroke is the third chart
series, where categorical distinctness is a functional requirement — and there
it is 2px, not a fill.

---

## Platform

Dark has to be declared in four places or the app flashes white on launch:

1. `index.html` — `theme-color`, `color-scheme`, and an inline `body`
   background (the web view paints before CSS lands)
2. `capacitor.config.ts` — `backgroundColor` for the web view itself
3. `ios/App/App/Info.plist` — `UIUserInterfaceStyle: Dark`, which also makes
   the web view's *native* chrome dark: date pickers, selection handles,
   scrollbars
4. `LaunchScreen.storyboard` + the `Splash` image asset

Safari's native date/time picker glyph is near-black and invisible on obsidian;
`index.css` inverts it, which is the only hook available.
