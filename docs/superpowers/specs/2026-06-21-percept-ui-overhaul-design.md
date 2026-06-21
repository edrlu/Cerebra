# percept — UI/UX Overhaul Design Guide

**Date:** 2026-06-21
**Status:** Approved design direction · planning only (no implementation yet)
**Renames:** `Cerebra` → `percept`

---

## 1. Vision

percept is a neuroscience-grounded creative platform: generate an ad with AI, predict how the
human brain responds to it (Meta TRIBE v2), then cut and regenerate the weak moments — and
measure again. Today that loop is real but **hidden** behind two flatly-named tabs and a dense,
hackathon-grown CSS layer.

This overhaul gives percept a single, calm identity: **Apple-like minimalism** — lots of negative
space, one idea per screen, cinematic reveals, progressive disclosure. The product should feel
like a precision instrument that happens to be effortless, not a dashboard that dumps everything
at once.

### Design decisions locked in this round
| Decision | Choice |
| --- | --- |
| Name | **percept** (lowercase wordmark) |
| Aesthetic direction | **Apple-like minimalism** |
| Scope | **Visual system + IA/flow rework** (not just a reskin) |
| Color philosophy | **Near-monochrome** — neutral chrome; color reserved entirely for the brain + the four cortical-system hues |

### Guiding principles (the test for every decision)
1. **One thing per screen.** A single primary action; everything else is secondary or hidden.
2. **The data is the only color.** Chrome is warm near-black + white/ink. The brain and its four
   systems carry 100% of the saturation. If a UI element is colored "for decoration," it's wrong.
3. **Reveal, don't dump.** Headline number first; axes, legends, channels, anatomy on demand.
4. **Calm over clever.** Motion clarifies; it never performs. Hairlines over shadows. Space over rules.
5. **Honest instrument.** State the model's limits plainly and quietly — never as a scare, never hidden.

---

## 2. The rename: Cerebra → percept

### Wordmark
- Lowercase `percept`, set in the UI sans at ~19px / weight 500 / tracking −0.6px.
- Replace the current three-bar mark (`.wordmark-mark i × 3`) with a single **aperture/perception
  mark**: a thin-stroke ring with a small solid center dot (an eye/lens reading the world), or a
  minimal 3-bar "signal" reduced to a single filled dot. Monochrome only (`--ink`), ~16px.
- Drop the orange `.wordmark-dot` period (it was the only brand color in the chrome — incompatible
  with near-monochrome). If a terminal accent is wanted, use `--ink-faint`.

### Rename map (14 files contain `cerebra`/`Cerebra`)
Functional/visible strings (must change):
- `package.json` — `"name": "cerebra"` → `"percept"`.
- `app/layout.tsx` — `metadata.title` / `description` (currently "Cerebra — TRIBE v2 video response explorer").
- `app/page.tsx` — wordmark text, `ASK CEREBRA` panel label, "How Cerebra reads an ad" modal
  heading + body, footer copy, `status = "TRIBE V2"` pill (keep).
- `app/components/Studio.tsx` — 3 comment/label references; check the "agency theme" comment.
- `app/color-schemes.ts` — scheme `description` mentions "Cerebra".
- `README.md` (7), `pipeline/README.md` (12) — docs.
- `instrumentation.ts`, `app/lib/regen.ts`, `app/lib/studioOptimizer.ts` (5),
  `app/api/regenerate/file/route.ts`, `app/api/transcribe/route.ts` — mostly comments/log strings;
  rename for consistency, verify none are used as on-disk path keys before changing.

Do **not** blind-`sed`: confirm each occurrence isn't a literal used as a storage key, env var, or
external identifier. `package-lock.json` (2) updates naturally on the next install.

---

## 3. The big UX move — one narrative: Create → Measure → Refine

Replace the two ambiguous tabs ("Studio" / "Sample clip") with a **three-stage arc** that is both
navigation and story:

```
   ① CREATE            ② MEASURE              ③ REFINE
   make the ad   →    see the brain    →    cut + regenerate
   (Studio)          respond (TRIBE v2)     weak moments
                                               │
                                               └── re-measure ↺
```

- **Create** — the Studio. A single centered command center: brief in (voice or text) → RAG
  optimizer → generated video. The result flows forward into Measure.
- **Measure** — upload a clip *or* receive one from Create → TRIBE v2 prediction. The brain is a
  calm hero with **one engagement number**. The dense surfaces (four systems, region anatomy,
  charts) live behind progressive disclosure.
- **Refine** — the same clip plus the timeline / splice / segment-regeneration editor, foregrounded.
  Cut a 5s/10s slot, regenerate via Pika, merge in place, then loop back to Measure.

### Navigation: the progress rail
- A horizontal **3-step rail** in the top bar replaces `.topbar-tabs`.
- Each step: a number/label; the current step uses `--ink`, completed steps show a hairline check,
  upcoming steps sit at `--ink-faint`. A thin connector line joins them.
- The rail is clickable (free navigation) but visually reads as a journey, not random tabs.
- Steps gate gracefully: Measure/Refine without a clip show calm empty states (see §6.6), never
  dead ends.

### Connective tissue: the engagement pill
- A single **engagement score** pill (the four-system peak, 0–100) persists in the top-right across
  all three stages — the one metric that always travels with you. Tabular figures so it doesn't
  jitter as it updates. This is percept's "hero number," carried everywhere.

---

## 4. Design tokens

> All values are proposals tuned for the near-monochrome dark identity. They consolidate the
> current `--ink/--paper/--surface…` variables and **retire** the dual color-scheme system
> (`color-schemes.ts`) in favor of one definitive theme. (A light theme can come later; it is out
> of scope for this round.)

### 4.1 Color — chrome (neutral, no accent)
```
--canvas:           #0A0A0B   /* app background (warm near-black, not pure #000) */
--surface-raised:   #141416   /* rails, top bar */
--surface-card:     #1A1A1D   /* panels, cards */
--surface-popover:  #212126   /* menus, modals */
--surface-hover:    #232328   /* hover / selected row */

--ink:              #F6F6F7   /* primary text + the primary button fill */
--ink-muted:        #9A9AA2   /* secondary text, captions */
--ink-faint:        #62626A   /* tertiary text, disabled, upcoming nav */

--hairline:         rgba(255,255,255,.08)   /* default borders, dividers */
--hairline-strong:  rgba(255,255,255,.14)   /* emphasis borders, active edge */

--focus-ring:       rgba(255,255,255,.20)   /* 0 0 0 3px */
--scrim:            rgba(0,0,0,.55)          /* modal backdrop (+ blur 8px) */
```

**The "accent" is contrast, not hue.** The primary action is a **solid `--ink` (near-white) fill
with `--canvas` text** — an ElevenLabs-style ink pill. Secondary = transparent + hairline. Active
states = `--surface-hover` + a 1px `--hairline-strong` left edge. No saturated color appears in the
chrome anywhere.

### 4.2 Color — data (the only saturated color, locked)
**Four cortical systems** (categorical, never recolored, always paired with a label/shape):
```
AUD   Auditory / speech-music    #E0A35C   (amber)
LANG  Language / message         #E47A86   (rose)
ATTN  Attention + salience       #9AA6F2   (periwinkle)
VIS   Visual / motion            #5EC8B8   (teal)
```
Spread across the hue wheel for categorical separation; refine for WCAG contrast on `--surface-card`
and verify deuteranopia/protanopia legibility (amber vs rose is the risk pair — always back it with
the system's short code + position, never color alone).

**Activation heatmap** (the 3D brain — sequential intensity): adopt true **inferno** (perceptually
uniform), replacing the current near-inferno `HOT_STOPS`:
```
HOT_STOPS = ["#000004","#420A68","#932667","#DD513A","#FCA50A","#FCFFA4"]
            low/quiet  ───────────────────────────────────→  peak
```
- **Threshold to transparency:** below ~0.35 normalized, fade toward transparent so quiet regions
  recede (the current shader already uses `smoothstep(0.35,1.0,a)` for emissive — extend the same
  idea to opacity). Honest fade-out reads as rigor.
- Keep the matte substrate already in code: `MeshStandardMaterial roughness 0.74 / metalness 0`,
  gyrus/sulcus curvature shading (`#eeece8` → `#aeaaa2`). Never add specular gloss.
- Pair every heatmap with a small **colorbar legend** showing the numeric range + unit.

Context separates heatmap warmth from the AUD/LANG warm system hues: the heatmap lives **only** on
the 3D surface (continuous ramp); system hues live **only** in lists/legends/charts (discrete dots).
Never place a categorical system dot directly on the brain.

### 4.3 Typography
Two families only (retire the DM Serif Display + DM Mono + Manrope trio):
```
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
--font-mono: "Geist Mono", "SF Mono", ui-monospace, monospace;
```
On Apple hardware `-apple-system` renders SF Pro natively — maximally Apple, zero licensing.

Scale (px / line-height / weight / tracking):
| Role | Size | LH | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Display XL (hero) | 72 | 1.02 | 300 | −2.5px |
| Display | 52 | 1.05 | 320 | −2px |
| Title 1 | 34 | 1.1 | 500 | −0.8px |
| Title 2 | 26 | 1.2 | 500 | −0.5px |
| Headline | 19 | 1.3 | 540 | −0.3px |
| Body | 16 | 1.5 | 400 | 0 |
| Small | 14 | 1.5 | 400 | 0 |
| Caption / eyebrow | 12 | 1.4 | 500 | +0.4px |
| Mono data | 13 | 1.4 | 450 | 0 |

- **Hierarchy via weight + tracking, not just size.** Large type goes *thin* (300–320) with tight
  tracking — the signature luxury move.
- **Eyebrows / micro-labels:** mono, `--ink-faint`, tracking +0.4–0.6px. Prefer sentence case or
  restrained small-caps over the current shouty ALL-CAPS; if uppercase, keep it low-contrast.
- **All live numbers use `font-variant-numeric: tabular-nums`** so digits don't reflow as values tick.

### 4.4 Spacing, radius, elevation
```
Spacing (4px base): 2 4 8 12 16 20 24 32 40 48 64 96 128
Radius:  control 8 · card 12 · panel 14 · modal 16 · pill 999 (status/score only)
Padding: card 24 · dense row 12 · tight control 8
```
- **Elevation = surface step + 1px hairline.** Real shadows only for true overlays:
  `0 16px 40px rgba(0,0,0,.45)`.
- **Translucency** (`backdrop-filter: blur(24px)` + ~72% surface tint) only for floating nav, a
  command palette, and modal scrims — never on static content panels.
- **Sections divided by whitespace, not rules.** Reserve hairlines for genuine structural edges.

### 4.5 Motion
```
Micro feedback:   120–160ms
UI transitions:   200–300ms
Hero reveals:     400–600ms       (exits faster than enters)
Easing:           standard cubic-bezier(0.4,0,0.2,1); entrances ease-out (0,0,0.2,1)
Springs:          stiffness ~220, damping ~26  (3D brain orbit, draggable cut bands, score morph)
Scroll reveals:   stagger children ~60ms
```
Animate: opacity, transform, scale, shared-element morphs, the brain. **Don't** animate decoratively,
per-list-item, or anything that should feel instant. Always honor `prefers-reduced-motion`.

---

## 5. Layout & responsive system (CSS debt cleanup)

The single biggest fragility today is `app/globals.css` (~542 lines) carrying **~8 stacked,
mutually-overriding `@media (min-width:701px)` / `901px` desktop blocks** that re-declare the same
grid repeatedly. The overhaul must collapse these into **one** token-driven layout layer.

**Target architecture:**
- A single source of truth for the app shell grid (no re-declared `.workspace-grid` blocks).
- Three breakpoints, declared once each: compact `<700px`, medium `700–1100px`, wide `>1100px`.
- The shell is a flex column: `top bar (fixed height) → stage content (1fr, scroll-contained) →
  optional footer`. Each *stage* owns its own internal grid; stages don't fight over one global grid.
- Max content width ~1280px for reading surfaces; the editor/timeline may bleed full-bleed
  intentionally (keep that one trick, documented).
- Prefer CSS custom properties + `clamp()` for fluid type/spacing over breakpoint-specific overrides.

Acceptance: deleting any one media query must not silently restore a broken earlier layout (i.e., no
layout depends on a later block undoing an earlier one).

---

## 6. Screen-by-screen specification

### 6.1 Global shell
- **Top bar** (~52px, `--surface-raised`, bottom hairline):
  - Left: percept wordmark + mark.
  - Center-left: the **Create · Measure · Refine** progress rail.
  - Right: **engagement pill** (persistent score) · **TRIBE v2** status (live dot, `--ink-muted`) ·
    settings (gear) · about (info).
- **Footer:** one quiet line — the population-model honesty note + a "How this works" text link.
  Hidden on the height-constrained desktop editor view (as today), shown on scrollable views.

### 6.2 Stage ① Create (Studio)
Goal: one calm command center, not an agency dashboard.
- **Hero input:** a single large prompt/brief field, centered, with a mic affordance for voice.
  Placeholder: "Describe the ad you want to make." Below it, a row of **example prompt chips**
  (industry presets) for cold-start.
- **Secondary options demoted:** industry, aspect ratio, model — collapsed under a single "Options"
  disclosure, not shown by default (textbook progressive disclosure).
- **RAG pipeline as quiet progress, not spectacle:** the four steps (RAG corpus → Retrieve → Append
  → Generate) render as a slim, single-line stepper that advances; completed steps collapse to a
  one-line summary. The retrieval trace/IDs live behind a "Show retrieval" expander for the curious.
- **Result:** the generated clip plays in a restrained phone/preview frame. A single primary action:
  **"Measure this clip"** (ink pill) — carries the video forward into Stage ②.
- **Empty state:** just the hero input + chips on the calm canvas. No panels.

### 6.3 Stage ② Measure (the brain hero)
Goal: the emotional centerpiece. One brain, one number, calm.
- **Layout (wide):** the **3D brain is the hero**, centered/left in deep negative space (dark stage,
  subtle grid mask, no boxes around it). To one side: the **hero engagement number** (large tabular
  numeral + small muted unit + a thin sparkline of net engagement beneath). That's the whole
  above-the-fold story.
- **Progressive disclosure of the dense data** (currently all shown at once):
  - *Four systems:* a compact list, each row = system hue dot + name + live value. Tapping a row
    promotes that system to the sparkline/mini-chart. Anatomy ("Auditory cortex (A1, belt…)") and
    the impact blurb appear in the expanded row, not inline by default.
  - *Region/anatomy detail:* behind the row expansion or a side detail view — not a permanent wall.
  - *Net vs Split charts:* the **Net** sparkline is the default headline; the four-system **Split**
    view is a toggle, not a second always-on chart.
- **Caption on the brain:** "Now driving → {dominant system}" with the system's hue — the single
  live annotation, bottom-left, low-contrast.
- **Orientation:** keep free orbit + a small reset; add a tiny corner orientation cue and canonical
  view snap (lateral/medial). Labels off by default.
- **Empty state:** a dim ghost brain behind a centered dropzone — "Drop a video to see how the brain
  responds" + a secondary "or generate one in Create."
- **Loading:** a single honest status line ("Running TRIBE v2 prediction · {filename}") with the
  brain subtly "warming." Offline/error degrades to the existing sample-preview note, stated quietly
  inline — never an alarming banner.

### 6.4 Stage ③ Refine (the editor)
Goal: cut weak moments and regenerate, with the editor surface foregrounded but still calm.
- **Timeline collapsed by default** (Descript pattern): the net-engagement ribbon shows as a slim
  strip; the full frame-strip / splice track expands when the user enters cut mode.
- **Splice flow** (preserve all current behavior): toggle "Splice" → drag to cut a slot (snaps to
  5s/10s) → the cut joins a **"Segments to regenerate"** list → "Regenerate" runs Pika via the
  agent → the merged clip drops back in place. Keep drag-to-move and click-to-remove on a band.
- **Segment cards:** restyle the current cards in the new system — segment thumbnail (loops just the
  slot), slot label, and a single state-aware action (Regenerate → live status with elapsed timer →
  Download / re-measure). Status is a quiet inline progression, not a toast storm.
- **Activity log** (today's "ASK CEREBRA" panel): reframe as a calm **Activity** drawer — a
  status-tracked feed of analyses and regenerations. The "Ask…" composer is **aspirational**; either
  (a) ship it honestly as a future "Ask percept" assistant clearly labeled, or (b) drop the composer
  this round and keep the honest activity feed. Recommend (b) for now.
- **After regenerate:** a clear path back to Stage ② ("Re-measure") to close the loop.

### 6.5 Settings
- Reframe the gear popover (`.appearance-menu`) as a clean settings sheet on `--surface-popover`.
- **Remove the color-scheme switcher** — percept ships one definitive dark theme as its identity.
  (Light theme is a later, separate effort.)
- **Keep** Generation model (Seedance / Kling) and Regeneration agent (Codex / Claude) as plain
  radio rows with name + one-line description.

### 6.6 Cross-cutting states
Every stage gets: a **calm empty state** (what to do next), an **honest loading state** (one status
line), and a **quiet error/offline state** (inline note, degrade to sample data). Spell these out
per stage above; they are first-class, not afterthoughts.

### 6.7 About / honesty modal
- "How percept reads an ad" — keep the existing ethical framing (population-average, four proxy
  summaries, *not* emotion/intent/memory/subcortical/diagnosis). Restyle in the new system; state
  limits in plain language, quietly. This content is a feature, not fine print.

---

## 7. Component library

Build these as the shared vocabulary (consolidating today's ad-hoc classes):

- **Button** — primary (`--ink` fill / `--canvas` text, radius 8, h 36/44, one per view), secondary
  (transparent + hairline), ghost (text, hover bg). No colored buttons.
- **Pill / badge** — status (live dot + label), the engagement score pill (tabular numeral). Pill
  radius reserved for these.
- **Card / panel** — `--surface-card` + 1px hairline + radius 12–14, padding 24, no shadow. Header
  row = eyebrow (mono, faint) + optional control.
- **Input / textarea** — transparent, hairline, focus ring `0 0 0 3px var(--focus-ring)`; the Create
  hero input is the oversized variant.
- **Disclosure row / expander** — the workhorse of progressive disclosure (system rows, options,
  retrieval trace, region anatomy).
- **Menu / modal** — `--surface-popover`, soft overlay shadow, blurred scrim, scale-in 0.96→1 / 200ms.
- **Segment card** — thumbnail + slot label + state-aware action (see §6.4).
- **Sparkline / mini-chart** — thin line, dimmed gridlines (8% white), playhead as a 1px dashed
  `--ink`/system-hue line; hover reveals axis/values.
- **3D brain stage** — dark stage, grid mask, orientation cue, colorbar legend, single live caption.
- **Progress rail** — the Create/Measure/Refine stepper-as-nav.

---

## 8. Data-visualization rules

1. **One dominant number, then the detail.** The engagement score is the hero; channels/systems are
   secondary. Never lead with a wall of bars.
2. **Hero number + sparkline**, tabular figures, unit small and muted.
3. **Perceptually-uniform colormap (inferno) only** — never rainbow/jet.
4. **Threshold weak signal to transparency** — noise fades, doesn't sit solid.
5. **Every heatmap gets a numeric colorbar** with range + unit.
6. **Dim the chrome** (gridlines, axes at ~8% white) so data is the foreground; reveal axes/legends
   on hover/focus.
7. **Lock categorical colors** (the four systems) and always pair color with a label/short code —
   never color alone.
8. **Charts collapse to shape first**: Net sparkline default, Split view on toggle.

---

## 9. Accessibility & responsive

- WCAG AA contrast for all text on `--surface-*`; verify the four system hues and ink-muted.
- Colorblind-safe: never encode meaning by color alone (system short codes, shapes, position).
- Full keyboard path through the progress rail, disclosures, timeline scrub, and modals; visible
  focus ring everywhere.
- `prefers-reduced-motion`: disable the brain idle motion, scroll reveals, and spring transitions;
  keep instant state changes.
- Responsive: compact `<700px` stacks each stage vertically (brain → number → list → timeline);
  medium `700–1100px`; wide `>1100px` uses the hero layouts above. One declaration per breakpoint.

---

## 10. Voice & microcopy

- Calm, plain, confident. Sentence case. No hype, no jargon walls.
- Limitations stated quietly and once, where relevant (footer + about modal).
- Labels describe, don't shout: "Net engagement," "Now driving," "Segments to regenerate."
- Numbers always carry a unit or scale ("/100", "s", "frames").

---

## 11. Implementation plan (phased — for when we build)

> Planning only for now. This is the recommended sequence; each phase is independently shippable and
> verifiable in the browser preview.

- **Phase 0 — Tokens + rename.** Add the token layer (§4) to `globals.css`; retire `color-schemes.ts`
  dual themes down to one. Execute the rename map (§2). Update wordmark. *Verify: app renders in the
  new palette, no "Cerebra" strings remain in visible UI.*
- **Phase 1 — CSS debt cleanup.** Collapse the stacked desktop media queries into one layout layer
  (§5). *Verify: layout is stable at all three breakpoints; no override-chains.*
- **Phase 2 — Shell + nav + flow.** Build the top bar, progress rail (Create/Measure/Refine),
  persistent engagement pill; wire stage routing + empty states. *Verify: navigate all three stages
  incl. empty states.*
- **Phase 3 — Measure redesign.** Brain hero + hero number + sparkline; move systems/regions/charts
  behind progressive disclosure; Net default / Split toggle. Swap `HOT_STOPS` → inferno + opacity
  threshold + colorbar. *Verify: upload a clip, brain + score render; disclosures work.*
- **Phase 4 — Create redesign.** Command-center input, demoted options, slim RAG stepper, restrained
  result frame, "Measure this clip" handoff. *Verify: brief → generate → handoff.*
- **Phase 5 — Refine redesign.** Collapsed-by-default timeline, restyled splice + segment cards,
  Activity drawer, re-measure loop. *Verify: cut → regenerate → merge → re-measure, full loop.*
- **Phase 6 — Polish.** Motion, springs, `prefers-reduced-motion`, focus states, responsive sweep,
  a11y/contrast audit. *Verify: keyboard + reduced-motion + mobile pass.*

A per-file change map (page.tsx, Studio.tsx, CorticalBrain.tsx, globals.css, color-schemes.ts,
layout.tsx) will be produced in the implementation plan (writing-plans step) when we proceed.

---

## 12. Out of scope (this round) & open questions

**Out of scope:** light theme; a real "Ask percept" LLM assistant; backend/model changes; a separate
marketing/landing site (we chose app-only "visual + flow rework").

**Open questions to confirm before/while building:**
1. Wordmark mark — aperture-ring vs single-dot signal? (low stakes; pick during Phase 0)
2. Activity drawer — drop the "Ask…" composer this round (recommended) or ship it labeled as future?
3. Exact final hexes for the four system hues after the contrast/colorblind audit.
4. Spec doc location preference (currently `docs/superpowers/specs/`).
