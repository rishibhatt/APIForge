---
name: APIForge
description: Paste an OpenAPI URL, get a live workspace to run, score, and generate from it.
colors:
  dark-surface: "#131315"
  dark-surface-container-lowest: "#0e0e10"
  dark-surface-container-low: "#18181b"
  dark-surface-container: "#201f22"
  dark-surface-container-high: "#2a292d"
  dark-surface-container-highest: "#353437"
  dark-primary: "#d0bcff"
  dark-primary-container: "#a078ff"
  dark-on-primary: "#1c1028"
  dark-on-surface: "#e5e1e4"
  dark-on-surface-variant: "#cbc3d7"
  dark-on-surface-subtle: "#958ea0"
  surface: "#f7f5fa"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f1eef6"
  surface-container: "#e9e5f0"
  surface-container-high: "#dfd9e8"
  surface-container-highest: "#d3cbdf"
  primary: "#6a3fd4"
  primary-container: "#7c4dc4"
  on-primary: "#ffffff"
  on-surface: "#1a1520"
  on-surface-variant: "#4a4356"
  on-surface-subtle: "#6b6478"
  roast-heat: "#ff6b4a"
  roast-heat-deep: "#e04828"
  method-get: "#0d7a5c / dark #4edea3"
  method-post: "#c45c00 / dark #fb923c"
  method-put: "#2563eb / dark #60a5fa"
  method-patch: "#7c3aed / dark #c4b5fd"
  method-delete: "#b91c1c / dark #f87171"
  gradient-primary-light: "#8a63f0 → #6a3fd4 → #5b2fc2"
  gradient-wordmark-light: "#2e1065 → #6d28d9 → #7c4dc4"
  gradient-display-accent-light: "#6a3fd4 → #9b5de5 → #d4572a"
  gradient-display-accent-dark: "#d0bcff → #e8b4d8 → #ffb38a"
  gradient-roast: "#ff8a5c → #ff6b4a → #e04828"
  poster-ground: "#131315"
  poster-accent-warn: "#ffb547"
  poster-accent-ok: "#4edea3"
  media-black: "#000"
  media-scrim: "rgba(0, 0, 0, 0.5–0.82)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 700
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "0.875rem"
    lineHeight: 1.5
  body-reading:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "17px"
    lineHeight: 1.72
  label-mono:
    fontFamily: "JetBrains Mono"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.06em"
    textTransform: uppercase
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: "12.5px"
rounded:
  hair: "1px"
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
---

# Design System: APIForge

## Overview

**Creative North Star: "The Kinetic Terminal"** (restored 2026-10-06)

APIForge is a developer instrument with a terminal soul. The original Kinetic Terminal identity is the foundation: a dark-first, near-black tonal workspace; one lavender-to-violet voice for the action that matters; JetBrains Mono uppercase micro-labels for the machine layer; Plus Jakarta Sans, heavy and tightly tracked, for the human layer; tight 2 to 8px radii; a faint engineering grid behind marketing heroes. The Oct 2026 "clean SaaS" pass contributed its usability (component structure, button hierarchy, touch sizing, states) but not its look; that look is retired.

Dark is the default theme. Light is first-class: a cool violet-tinted paper, crisp hairlines, and a deeper violet accent so the same identity reads in daylight.

**Roast My API** is the one loud surface. It keeps the system's type, grid, and radii, but swaps the violet voice for **Roast Heat** coral (`#ff6b4a`) and allows an ember glow, big uppercase display type, and stamp-style score treatments. Coral never appears outside roast entry points.

## Colors

All values are tokens in `src/styles/variables.css`: light on `:root`, dark on `.dark`. Components never use raw hex except the roast heat pair, which lives as `--color-roast-heat` / `--color-roast-heat-deep`.

- **Lavender / Violet** (dark `#d0bcff` → `#a078ff`; light `#6a3fd4` → `#7c4dc4`): the primary CTA gradient, focus, caret, selection, active tab rule, links in prose. `--gradient-primary` is a real 135deg gradient. One gradient-filled action per region.
- **Tonal ramp** (`surface-container-lowest` → `-highest`): depth comes from tone steps first, hairlines second, shadows only for overlays.
- **Method colors**: text on a 12% tint with a 28% tinted border (the old chip style). GET doubles as success, the put-patch amber as warning, error red as failure.
- **Roast Heat** coral: roast nav link, roast CTAs, roast score stamp, roast hero accent.

- **Poster palette** (fixed, theme-independent): the Roast result poster and its entry-page miniature always render on `#131315` with white/`#e5e1e4` text and a tier accent (coral bad, `#ffb547` warn, `#4edea3` ok), so screenshots and the downloaded card look identical for every viewer. Media wells are `#000` with black scrims under captions.
- **Engineering grid** (`--grid-line`, `--grid-size`): a two-axis 1px grid, masked to fade out, behind marketing heroes, the Roast hero, and the poster. It is part of the original identity, not decoration to add elsewhere.

**The One Voice Rule.** Violet gradient marks the single primary action per region. Secondary actions are tonal or outlined, never a second gradient.

## Typography

- **Plus Jakarta Sans** (400 to 800) for everything a human reads. Display 800 at -0.04em; headlines 700 at -0.03em; body 14px UI, 17px reading.
- **JetBrains Mono** for code, paths, URLs, methods, raw values, and the identity layer of uppercase micro-labels: nav links, tab labels, section labels inside tools (`FILTER BY HTTP METHOD`, `COLLECTIONS`, `PARAMETERS`), status bar. 10.5 to 11.5px, 600, +0.06em.
- **Not** an eyebrow system: no uppercase kicker above a page or section heading. Mono labels name controls and panels; headings stand alone.
- Buttons are sentence case Jakarta 600.

## Layout

64px header (fixed, translucent near-black / paper with blur, hairline that strengthens on scroll), 288px workspace sidebar, 30px status footer. Containers: 1240px header and landing, 1120px content, 720px reading column with a sticky TOC from 1100px. 4px spacing base. Gutter 24px, 16px under 640px. Breakpoints: 520, 640, 768, 960, 1100.

**The Touch-Floor Rule.** Under 768px every control is at least 40px and inputs use 16px text.

**The No-Overflow Rule.** Nothing scrolls the page horizontally. Code and tables scroll inside their own container; long URLs truncate with ellipsis or wrap with `overflow-wrap:anywhere`.

## Elevation

Tonal first. `--shadow-float` for menus, drawers, modals. Focus is a 2px violet outline at 2px offset (fields: violet border + 3px halo). The logo mark keeps a faint violet drop shadow; nothing else glows outside Roast.

## Shapes

1px for bar and meter ends, 2px tags, 4px buttons and inputs, 6px fields and editors, 8px cards and large containers. Pills (999px) only for tiny count/status badges, dots, and scrollbar thumbs. Icons: self-hosted Material Symbols Outlined subset. No emoji as icons, with one sanctioned exception: the 🔥 in the "Roast my API" nav link. Every other Roast icon is the `logo-fire.png` mark (`FireIcon` component), never a Material glyph.

## Components

- **Button primary:** `--gradient-primary` fill, `--color-cta-foreground` text, 4px radius, 36px (32 sm, 40 touch), Jakarta 600 13px. Hover: brightness lift + 1px violet ring; active: pressed down 1px; disabled 45%.
- **Button secondary:** tonal `surface-container-high` fill with hairline; hover one tone up.
- **Button ghost:** text only, hover wash.
- **Header nav link:** JetBrains Mono 11px 600 uppercase +0.06em, muted at rest, primary on hover/current with a 2px underline rule.
- **Roast nav link:** coral text, fire icon, `NEW` pill (coral fill).
- **Method badge:** mono 10.5px 700 uppercase, 2px radius, tint + tinted border.
- **Mono label:** `.monoLabel` pattern for panel/section labels inside tools.
- **Article:** Jakarta reading column, mono metadata line, violet links with offset underline, code blocks in editor chrome with a mono language tab.
