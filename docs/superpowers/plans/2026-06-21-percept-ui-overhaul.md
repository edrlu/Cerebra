# percept UI/UX Overhaul Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Source spec: `docs/superpowers/specs/2026-06-21-percept-ui-overhaul-design.md`.

**Goal:** Rebrand Cerebra → percept and overhaul the UI/UX to an Apple-like, near-monochrome,
progressive-disclosure design with a Create → Measure → Refine flow.

**Architecture:** `app/page.tsx` stays the single stateful orchestrator (playback ↔ analysis ↔ cuts
↔ regen are tightly coupled). We extract *presentational* stage components that receive props, add a
token-driven design layer + one consolidated responsive layout to `globals.css`, and replace the
two-tab IA with a three-stage progress rail. No backend/model changes.

**Tech Stack:** Next.js 16.2.9, React 19, TypeScript, Tailwind v4 (PostCSS), Three.js (CorticalBrain),
CSS custom properties. Verification: browser preview + `npm run lint` + `npm run build`.

## Global Constraints (verbatim from spec)
- Name everywhere visible: **percept** (lowercase wordmark). No "Cerebra" in visible UI.
- **Near-monochrome:** chrome is neutral (warm near-black + white/ink). The ONLY saturated color is
  the brain heatmap (inferno) + the four cortical-system hues. No colored buttons/decoration.
- Primary action = solid `--ink` fill / `--canvas` text (one primary per view). Secondary = transparent + hairline.
- Two font families only: `--font-sans` (Inter/-apple-system) + `--font-mono` (Geist Mono/SF Mono). Retire DM Serif/DM Mono/Manrope.
- Hierarchy via weight + tracking, not size jumps. Large type goes thin (300–320), tight tracking.
- All live numbers use `font-variant-numeric: tabular-nums`.
- Elevation = surface step + 1px hairline; real shadows only for true overlays. Space over rules.
- Motion: micro 120–160ms, transitions 200–300ms, hero 400–600ms; honor `prefers-reduced-motion`.
- Data: inferno heatmap, threshold weak signal to transparency, colorbar legend, color never alone.
- Preserve ALL existing functionality: upload, TRIBE v2 predict, brain orbit, net/split charts,
  filmstrip seek, splice (snap 5/10s, drag-move, click-remove), regenerate→merge→download, settings
  persistence (model/agent), info modal, demo/offline fallback.

**Verification gate for every task:** `npm run lint` clean for touched files; app compiles; the named
preview observation holds. Commit at each task's end. Run `npm run build` at end of each Phase.

---

## File Structure

- Modify `app/globals.css` — replace with token layer + one consolidated responsive layout. (Biggest change.)
- Modify `app/layout.tsx` — metadata title/description → percept; set `<html>` font + base bg class.
- Modify `app/page.tsx` — wordmark/mark, progress rail, engagement pill, stage routing, prop wiring,
  copy renames, settings/info restyle. Extract presentational pieces below.
- Create `app/components/ProgressRail.tsx` — the Create·Measure·Refine stepper-as-nav.
- Create `app/components/stages/MeasureStage.tsx` — brain hero + score + progressive-disclosure panels.
- Create `app/components/stages/RefineStage.tsx` — timeline (collapsed default) + splice + segment cards + activity.
- Modify `app/components/Studio.tsx` — becomes Create stage; command-center input, demoted options, slim RAG stepper, "Measure this clip" handoff; restyle to tokens; rename Cerebra refs.
- Modify `app/components/CorticalBrain.tsx` — `HOT_STOPS` → inferno; threshold opacity; keep matte.
- Modify `app/color-schemes.ts` — collapse to one definitive dark theme (keep token export shape used by `page.tsx`).
- Modify docs (`README.md`, `pipeline/README.md`) + comment-only refs (`instrumentation.ts`,
  `app/lib/regen.ts`, `app/lib/studioOptimizer.ts`, `app/api/regenerate/file/route.ts`,
  `app/api/transcribe/route.ts`) — rename Cerebra → percept (verify none are on-disk path keys first).
- Modify `package.json` — `"name": "percept"`.

---

## Phase 0 — Tokens, fonts, rename foundation

### Task 0.1: Design-token + font layer in globals.css
**Files:** Modify `app/globals.css:1-4` (font `@import` + `:root`).
- [ ] Replace the Google Fonts `@import` with Inter + Geist Mono:
  `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');`
- [ ] Add a `:root` token block with the spec §4 tokens (surfaces, ink, hairlines, focus ring, scrim,
  radii, font vars: `--font-sans`, `--font-mono`). Keep existing variable NAMES that `page.tsx`/components
  consume (`--ink`,`--muted`,`--paper`,`--app-bg`,`--surface`,`--surface-raised`,`--surface-hover`,
  `--line`,`--line-strong`,`--orange`→ neutralize,`--stage*`,`--chart*`, etc.) by MAPPING them to the
  new palette, so nothing breaks before components are migrated. (`--orange`/accent → `--ink`; soft → surface.)
- [ ] Set `body { font-family: var(--font-sans); background: var(--canvas); color: var(--ink); }` and add `font-variant-numeric: tabular-nums` utility class `.tnum`.
- [ ] **Verify (preview):** load `/` — app renders in near-monochrome (no orange), text in Inter, no broken layout.
- [ ] **Commit:** `style(percept): add near-monochrome token + font layer`

### Task 0.2: Collapse color-schemes.ts to one theme
**Files:** Modify `app/color-schemes.ts`; check usage in `app/page.tsx` (`COLOR_SCHEMES`, `DEFAULT_COLOR_SCHEME`, `familyColors`, `tokens`).
- [ ] Keep the exported shape (`COLOR_SCHEMES`, `DEFAULT_COLOR_SCHEME`, `ColorSchemeId`, `familyColors`, `tokens`) so `page.tsx` compiles, but reduce to a single `dark` scheme whose `tokens` match Task 0.1 and `familyColors` = the four refined system hues `["#E0A35C","#E47A86","#9AA6F2","#5EC8B8"]`. Set `ColorSchemeId = "dark"`.
- [ ] Update the scheme `name`/`description` (remove "Cerebra"); this is the only theme.
- [ ] **Verify (preview):** app still renders; the appearance menu shows one theme (switcher removed in Task 4.x).
- [ ] **Commit:** `refactor(percept): single definitive dark theme`

### Task 0.3: Rename Cerebra → percept (strings + metadata + package)
**Files:** `package.json`, `app/layout.tsx`, `README.md`, `pipeline/README.md`, comment refs in
`instrumentation.ts`, `app/lib/regen.ts`, `app/lib/studioOptimizer.ts`, `app/api/regenerate/file/route.ts`, `app/api/transcribe/route.ts`.
- [ ] `package.json`: `"name": "percept"`.
- [ ] `app/layout.tsx`: title `"percept — brain-response explorer for video"`, matching description.
- [ ] Grep each remaining file; replace visible/string "Cerebra"→"percept", "cerebra"→"percept". **Before each:** confirm it is not used as a filesystem path key or external id (esp. `regen.ts`, `file/route.ts`). Comments are safe to change.
- [ ] (page.tsx + Studio.tsx visible strings handled in their phases.)
- [ ] **Verify:** `grep -rni cerebra app/ *.md *.json instrumentation.ts` shows only non-visible/path-safe leftovers (ideally none). `npm run lint`.
- [ ] **Commit:** `chore(percept): rename Cerebra → percept across metadata/docs/comments`

### Phase 0 gate: `npm run build` passes.

---

## Phase 1 — Consolidated responsive layout

### Task 1.1: Replace stacked desktop media queries with one layout layer
**Files:** Modify `app/globals.css` (the ~8 stacked `@media (min-width:701px|901px)` blocks, lines ~29–end).
- [ ] Delete the override-chain of repeated `.workspace-grid`/`.app-shell` desktop blocks. Author ONE set of three breakpoints: compact `<700`, medium `700–1100`, wide `>1100`.
- [ ] App shell = flex column: top bar (fixed h) → stage region (`flex:1; min-height:0`) → footer (only on scroll views). Each stage owns its internal grid; no single global grid that stages fight over.
- [ ] Keep the intentional full-bleed editor track trick, but document it with one comment.
- [ ] Use `clamp()` for fluid type/spacing where it removes a breakpoint override.
- [ ] **Verify (preview):** resize across 390px / 900px / 1440px — layout stable; **acceptance:** removing any one media query does not "restore" a broken earlier layout (no undo-chains). Brain, charts, timeline, panels all visible and uncropped at each width.
- [ ] **Commit:** `refactor(percept): consolidate layout into one responsive layer`

### Phase 1 gate: `npm run build` passes; manual resize sweep clean.

---

## Phase 2 — Shell: progress rail, engagement pill, stage routing

### Task 2.1: ProgressRail component
**Files:** Create `app/components/ProgressRail.tsx`; CSS in `globals.css`.
**Interfaces:** Produces `function ProgressRail(props: { stage: Stage; onStage: (s: Stage) => void; canMeasure: boolean; canRefine: boolean }): JSX.Element` where `type Stage = "create" | "measure" | "refine"`.
- [ ] Render three steps (Create / Measure / Refine) with connector hairline; current = `--ink`, done = hairline check, upcoming/disabled = `--ink-faint`. Keyboard + `aria-current`.
- [ ] **Verify (preview):** rail renders, click switches `stage`, disabled steps not clickable.
- [ ] **Commit:** `feat(percept): progress rail nav component`

### Task 2.2: Wire stage state + engagement pill into page.tsx top bar
**Files:** Modify `app/page.tsx` (header region ~636–676; `activeTab` state).
- [ ] Replace `activeTab: "studio"|"sample"` with `stage: Stage` (`"create"|"measure"|"refine"`); map old "studio"→"create", "sample"→"measure". Default `"create"`.
- [ ] Replace `.topbar-tabs` with `<ProgressRail .../>`. `canMeasure = !!analysis` (always true: demo exists) — gate Refine on `videoUrl`.
- [ ] Replace new wordmark: lowercase `percept` + aperture mark (ring + center dot) in `--ink`; remove orange dot.
- [ ] Keep the engagement score pill in top-right (already computed `score`); style as pill with tabular numeral; ensure it persists across all stages.
- [ ] **Verify (preview):** wordmark says percept; rail navigates; score pill visible on every stage.
- [ ] **Commit:** `feat(percept): stage routing + wordmark + persistent score pill`

### Phase 2 gate: navigate Create/Measure/Refine incl. empty states; `npm run build`.

---

## Phase 3 — Measure stage redesign

### Task 3.1: Inferno heatmap + opacity threshold in CorticalBrain
**Files:** Modify `app/components/CorticalBrain.tsx:11` (`HOT_STOPS`) and shader (`~131-147`).
- [ ] `HOT_STOPS = ["#000004","#420A68","#932667","#DD513A","#FCA50A","#FCFFA4"]` (6 stops). Update `uHot` uniform array length 5→6 and the `hotMap` GLSL to interpolate 6 stops (`s = t*5.0`, five segments). Update the `const hotStops` mapping and `uniform vec3 uHot[5]`→`[6]`.
- [ ] Fade weak signal: drive surface opacity/blend by `smoothstep(0.15, 0.5, a)` so sub-threshold regions recede (keep matte `roughness 0.74 / metalness 0`).
- [ ] **Verify (preview):** Measure stage — brain shows perceptually-smooth inferno; quiet regions visibly fade; no gloss.
- [ ] **Commit:** `feat(percept): inferno activation colormap + threshold fade`

### Task 3.2: MeasureStage component — brain hero + score + sparkline
**Files:** Create `app/components/stages/MeasureStage.tsx`; move the brain-stage + activations markup out of `page.tsx`’s `workspace-grid`.
**Interfaces:** Consumes props: `{ analysis, families, levels, currentIntensity, normalizedNet, dominant, regionIndex, setRegionIndex, currentIndex, netSparkPath, score }` (types from page.tsx). Produces `MeasureStage(props)`.
- [ ] Layout: brain as hero in dark stage (keep `.brain-stage`, grid mask, orbit, reset, orientation/caption). Beside it: hero engagement number (large thin tabular numeral + small muted "/100") + thin net sparkline.
- [ ] Systems list (4 rows: hue dot + name + live value); selecting a row promotes it to the mini-chart; anatomy + impact blurb appear ONLY in the expanded/selected row (progressive disclosure), not all inline.
- [ ] Cortical-proxy breakdown + model honesty strip move behind a "Details" disclosure.
- [ ] **Verify (preview):** upload a clip (or demo) → brain + big score + sparkline read as the story; rows expand on click; dense data hidden by default.
- [ ] **Commit:** `feat(percept): Measure stage — brain hero + progressive disclosure`

### Task 3.3: Net default / Split toggle + empty + loading states
**Files:** `app/components/stages/MeasureStage.tsx`, `app/page.tsx` (pass `isAnalyzing`, `file`).
- [ ] Net sparkline is the default headline; Split (four-system) is a toggle, not always-on.
- [ ] Empty state (no `videoUrl`): dim ghost brain + centered dropzone "Drop a video to see how the brain responds" + secondary "or generate one in Create".
- [ ] Loading (`isAnalyzing`): one status line "Running TRIBE v2 prediction · {file.name}"; offline/error → existing sample-preview note, stated quietly inline.
- [ ] **Verify (preview):** empty state with no upload; loading line on upload; offline note when worker down.
- [ ] **Commit:** `feat(percept): Measure net/split toggle + empty/loading states`

### Phase 3 gate: upload→measure works; disclosures work; `npm run build`.

---

## Phase 4 — Create stage redesign

### Task 4.1: Command-center input + demoted options + slim RAG stepper
**Files:** Modify `app/components/Studio.tsx`.
- [ ] One large centered brief input (keep voice/mic affordance), placeholder "Describe the ad you want to make.", with example-prompt chips for cold start.
- [ ] Demote industry / aspect / model into a single "Options" disclosure (hidden by default).
- [ ] Render the four RAG steps as a slim single-line stepper that advances; completed steps collapse to one line; retrieval trace/IDs behind "Show retrieval".
- [ ] Restyle entirely to tokens (remove any agency-theme leftovers); rename Cerebra refs.
- [ ] **Verify (preview):** Create stage is one calm command center; options collapsed; generate still runs; RAG stepper advances.
- [ ] **Commit:** `feat(percept): Create command center + slim RAG stepper`

### Task 4.2: Restrained result frame + "Measure this clip" handoff
**Files:** `app/components/Studio.tsx`, `app/page.tsx` (handler to load a generated clip into Measure).
- [ ] Generated clip plays in a restrained preview frame; single primary action "Measure this clip" (ink pill) that hands the video to the Measure stage (set file/videoUrl + `stage="measure"` + run analysis).
- [ ] **Verify (preview):** after a generation, "Measure this clip" navigates to Measure with that clip loaded (or, offline, a clear disabled/explained state).
- [ ] **Commit:** `feat(percept): Create→Measure handoff`

### Phase 4 gate: brief→generate→handoff path works; `npm run build`.

---

## Phase 5 — Refine stage redesign

### Task 5.1: RefineStage component — collapsed timeline + splice + segment cards
**Files:** Create `app/components/stages/RefineStage.tsx`; move editor-deck + segments markup from `page.tsx`.
**Interfaces:** Consumes the timeline/splice/regen props/handlers already in page.tsx (`spliceMode`, `cuts`, `draftCut`, `segments`, `regenJobs`, `regenerate`, `removeCut`, `onCut*`, `onBand*`, `scrubTo`, `filmstripFrames`, `timelineSeries`, `netTimelinePath`, `playhead`, `videoUrl`, `time`, `analysis`, `timelineMode`, `setTimelineMode`, `isPlaying`, `setPlaying`).
- [ ] Timeline collapsed by default to a slim net ribbon; full frame-strip/splice track expands on entering cut mode.
- [ ] Preserve splice exactly: toggle → drag-cut (snap 5/10s) → segment list → regenerate → status w/ elapsed → download; drag-move + click-remove on bands.
- [ ] Restyle segment cards to tokens (thumbnail loop + slot label + single state-aware action). Quiet inline status, no toast storm.
- [ ] **Verify (preview):** cut → regenerate (or queued/offline state) → segment card progresses; drag-move + remove work.
- [ ] **Commit:** `feat(percept): Refine stage — collapsed timeline + splice + segment cards`

### Task 5.2: Activity drawer + re-measure loop
**Files:** `app/components/stages/RefineStage.tsx` (or shared), `app/page.tsx`.
- [ ] Reframe the "ASK CEREBRA" panel as a calm **Activity** drawer (status-tracked feed). Drop the non-functional "Ask…" composer this round (per spec recommendation).
- [ ] After a successful regenerate/merge, surface a clear "Re-measure" action back to Measure.
- [ ] **Verify (preview):** activity feed logs analysis + regen events; "Re-measure" returns to Measure with the merged clip.
- [ ] **Commit:** `feat(percept): Activity drawer + re-measure loop`

### Phase 5 gate: full Create→Measure→Refine→re-measure loop works; `npm run build`.

---

## Phase 6 — Settings, motion, a11y, responsive polish

### Task 6.1: Settings sheet + info modal restyle
**Files:** `app/page.tsx` (appearance menu ~653–674, info modal ~760–767).
- [ ] Reframe gear popover as a clean settings sheet on `--surface-popover`. Remove the color-scheme switcher (one theme). Keep Generation model + Regeneration agent as plain radio rows.
- [ ] Restyle info modal "How percept reads an ad"; keep the ethical/honesty content; calm copy.
- [ ] **Verify (preview):** settings open/select persists (model/agent POST to `/api/settings`); info modal opens/closes.
- [ ] **Commit:** `feat(percept): settings sheet + honesty modal restyle`

### Task 6.2: Motion, focus, reduced-motion, responsive + a11y sweep
**Files:** `app/globals.css`, touched components.
- [ ] Apply motion tokens (durations/easing; springs for brain orbit + draggable bands + score morph). Add `@media (prefers-reduced-motion: reduce)` disabling idle/scroll/spring motion.
- [ ] Visible focus ring (`0 0 0 3px var(--focus-ring)`) on all interactive elements; full keyboard path (rail, disclosures, scrub, modals).
- [ ] Responsive sweep: compact stacks each stage vertically; verify 390/900/1440.
- [ ] a11y: AA contrast for text on surfaces + the 4 hues; color never the sole encoder (short codes/shapes/labels present).
- [ ] **Verify (preview):** keyboard-only pass; reduced-motion pass; mobile width pass; no contrast failures on spot-check.
- [ ] **Commit:** `polish(percept): motion, focus, reduced-motion, responsive + a11y`

### Phase 6 gate: `npm run lint` + `npm run build` clean; full manual sweep.

---

## Final: adversarial review (workflow) → fix → done
- [ ] Run a multi-dimension review (visual fidelity to spec, near-monochrome compliance, functionality regressions, a11y, responsive, CSS-debt removal) with adversarial verification; fix confirmed findings.
- [ ] Final `npm run build`; summarize the diff for the user. Do not merge to `adrian` without user say-so.

---

## Self-Review (against spec)
- **Coverage:** §2 rename → 0.3 + per-phase strings; §3 flow → Ph2; §4 tokens/type/color/motion → 0.1/6.2;
  §4.2 data color + inferno → 0.2/3.1; §5 CSS debt → Ph1; §6 screens → Ph3/4/5 incl. states; §6.5 settings → 6.1;
  §6.7 honesty → 6.1; §7 components → ProgressRail/stages + token classes; §8 data-viz → 3.1/3.2; §9 a11y/responsive → 6.2; §10 voice → copy in 3.x/4.x/6.1. All sections mapped.
- **Placeholders:** none — each task names exact files/lines + concrete change + concrete preview check.
- **Type consistency:** `Stage = "create"|"measure"|"refine"` used in ProgressRail (2.1) and page (2.2); `familyColors` 4-tuple kept (0.2) and consumed by MeasureStage (3.2). Consistent.
