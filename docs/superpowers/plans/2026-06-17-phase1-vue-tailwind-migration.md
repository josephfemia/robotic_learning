# Phase 1 — Vue + Tailwind Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faithfully migrate the single-file `robot-learning-companion.html` (15 sections, 29 widgets, quizzes, KaTeX) into a Vite + Vue 3 + Tailwind project that is character-identical in content and pixel-identical in styling to the frozen original.

**Architecture:** Full idiomatic Vue rewrite under a zero-drift mandate. The original is frozen at `reference/robot-learning-companion.html` as the golden reference. Content lives in section SFCs + `data/` modules; cross-cutting behaviors (KaTeX, xref autolinker, progress, bridges) become composables; quizzes become a data-driven component system (so the Review deck renders from the same source, not DOM clones); each widget is a Vue component whose numeric core is an isolated, vitest-pinned pure function and whose SVG/Canvas drawing uses ported `RLLAB` helpers. A Playwright-driven drift harness diffs every section/widget against the original after each unit.

**Tech Stack:** Vite, Vue 3 (`<script setup>`), Tailwind 3 + PostCSS + autoprefixer, vitest, KaTeX (CDN), Playwright (via available browser tools) for the drift harness.

**Spec:** `docs/superpowers/specs/2026-06-17-vue-tailwind-migration-design.md`

**Conventions for every task:** TDD where logic exists (test first, watch it fail, implement, watch it pass). Commit after each task. Run the relevant drift check before marking a content/widget task done. Preserve original bugs verbatim → log to `DRIFT_FIXME.md` (never fix in Phase 1).

---

## File structure (created by this plan)

```
robotic_learning/
├─ launch.sh, index.html, package.json, vite.config.js
├─ tailwind.config.js, postcss.config.js, vitest.config.js, .gitignore
├─ reference/robot-learning-companion.html        # frozen golden copy
├─ DRIFT_FIXME.md                                 # original bugs, for Phase 2
├─ src/
│  ├─ main.js, App.vue
│  ├─ assets/styles.css
│  ├─ data/ nav.js, quizzes.js, xrefs.js, (section content as needed)
│  ├─ composables/ useKaTeX.js, useProgress.js, useXref.js, useBridges.js, useAnimate.js
│  ├─ components/ Sidebar.vue, TopBar.vue, ProgressBar.vue, Pager.vue,
│  │              CompleteBar.vue, Quiz.vue, Question.vue, ReviewDeck.vue,
│  │              Bridge.vue, Dive.vue, Callout.vue, Lab.vue
│  ├─ widgets/ rllab.js, <Widget>.vue × 29
│  ├─ logic/   <core>.js + <core>.test.js   (one per widget with numeric logic)
│  └─ sections/ StartSection.vue, PrimerSection.vue, L1Section.vue … L12Section.vue, ReviewSection.vue
└─ tools/drift/ snapshot.mjs, content-diff.mjs, inventory.mjs, README.md
```

---

## Task 0: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `postcss.config.js`, `tailwind.config.js`, `vitest.config.js`, `.gitignore`, `index.html`, `src/main.js`, `src/App.vue`, `src/assets/styles.css`, `launch.sh`
- Create: `reference/robot-learning-companion.html` (copy of original), `DRIFT_FIXME.md`

- [ ] **Step 1: Freeze the golden reference.** Copy `robot-learning-companion.html` → `reference/robot-learning-companion.html`. Create empty `DRIFT_FIXME.md` with a heading.
- [ ] **Step 2: Scaffold configs** mirroring `../jepa_learning/` but for Vue: `package.json` with deps `vue`, devDeps `vite`, `@vitejs/plugin-vue`, `tailwindcss@^3`, `postcss`, `autoprefixer`, `vitest`, `jsdom`, `@vue/test-utils`; scripts `dev/build/preview/test/test:watch/drift`. `vite.config.js` uses `@vitejs/plugin-vue` and `base: process.env.VITE_BASE || "/"`. `postcss.config.js` identical to jepa. `tailwind.config.js` content globs `./index.html`, `./src/**/*.{vue,js}`. `vitest.config.js` with `environment: 'jsdom'`. `.gitignore` from jepa (node_modules, dist, .vite, .playwright-mcp, *.local).
- [ ] **Step 3: `index.html`** — app shell with the original's `<head>` CDN refs **verbatim**: KaTeX **0.16.9 from cdnjs** (`https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css` + the matching `katex.min.js` and `contrib/auto-render.min.js` `<script defer>` — do NOT substitute jsDelivr/unpkg), the exact Google Fonts URL for Archivo/Source Serif 4/IBM Plex Mono, `<title>` identical, `<div id="app">`, `<script type="module" src="/src/main.js">`.
- [ ] **Step 4: `launch.sh`** — port jepa's verbatim, retitled ("Robot Learning course dev server → http://localhost:5173"). `chmod +x launch.sh`.
- [ ] **Step 5: Minimal `App.vue` + `main.js`** — render a "scaffold OK" placeholder importing `styles.css`.
- [ ] **Step 6: Verify boot.** Run `npm install` then `npm run build`. Expected: build succeeds. Run `./launch.sh` in background, confirm `http://localhost:5173` serves the placeholder, stop it.
- [ ] **Step 7: Commit** — `chore: scaffold Vite+Vue+Tailwind project, freeze golden reference`.

---

## Task 1: Design tokens + global styles port

**Files:** Modify `tailwind.config.js`; create/fill `src/assets/styles.css`.

- [ ] **Step 1:** Port every CSS custom property from the original `:root` (lines ~11–34: `--paper`, `--ink`, `--cobalt`, `--cobalt-dark`, `--signal`, `--signal-soft`, `--muted`, `--line`, `--panel`, `--panel-deep`, `--code-bg`, `--code-ink`, `--right`, `--right-soft`, `--wrong`, `--wrong-soft`, `--sidebar-w`, the three font stacks) into `tailwind.config.js theme.extend` (colors, fontFamily) **and** keep them as CSS variables in `styles.css :root` (component CSS references them).
- [ ] **Step 2:** Port the entire original `<style>` block (lines ~35–277) into `src/assets/styles.css` under `@layer base` (resets, `body`, typography, `a`, `:focus-visible`, reduced-motion) and `@layer components` (all `.bridge/.dive/.callout/.figure/.papers/.quiz/.opt/.expl/.resources/.complete-bar/.pager/.lecture/.cmp/.hero-*/.lab*/.meta-strip/.recap/.recap-box/.xref/.toolbox/.gloss/.toggle-btn/.notice/.review-*` rules and the `body.hide-bridges` rule) **verbatim**. Add `@tailwind base/components/utilities` directives. Keep `.lecture{display:none}` / `.visible` + `@keyframes fadein` (section show/hide will be Vue-driven but the fade is preserved as a transition).
- [ ] **Step 3: Static visual probe.** Create a throwaway route/page that renders one representative chunk of each component class (a bridge, a quiz question, a callout.miscon, a lab shell, recap + recap-box) and screenshot-compare against the matching region of the original. Resolve any pixel drift in the ported CSS. (This validates the CSS layer before content depends on it.)
- [ ] **Step 4: Commit** — `feat: port design tokens to tailwind config + global component styles`.

---

## Task 2: App shell, sidebar nav, progress, mobile drawer

**Files:** `src/App.vue`, `src/components/Sidebar.vue`, `TopBar.vue`, `ProgressBar.vue`; `src/data/nav.js`; `src/composables/useProgress.js`.

- [ ] **Step 1:** `data/nav.js` — the exact nav model from original lines ~298–319: ordered groups (Orientation / Fundamentals / Modern policy learning / Foundation models / Practice) and entries `{id, idx, label}` for `start, primer, l1…l12, review` with the **exact** labels and idx strings (`··`, `00`, `L01`…`L12`, `★`). Also export `LECTURES = ['l1'…'l12']` (progress denominator = 12) and `TITLES`/`LABELS` maps used by the topbar/complete buttons.
- [ ] **Step 2:** `useProgress.js` — reactive composable wrapping the original `window.storage` contract verbatim: key `rlc-progress-v1`, `loadProgress` (async `window.storage.get(...).then`), `saveProgress` (`window.storage.set`), `toggleComplete(id)`, derived `completedCount`. In-memory fallback when `window.storage` absent (identical behavior to original — no localStorage).
- [ ] **Step 3:** `App.vue` — recreate `.app` flex layout, fixed `.sidebar`, `.main/.content` (`max-width:760px`), the active-section state (`ref activeId`, default `start`), and `show(id)` semantics (set active, `scrollTo(0,0)`, close mobile drawer). Sections rendered via `<component :is>` or `v-show` per section keeping `.lecture/.visible` classes so the fadein keyframe fires. `Sidebar.vue` renders `nav.js`, marks `.active`/`.is-done`, emits navigation. `TopBar.vue` = mobile `.topbar` + `.scrim` drawer toggle with the exact 920px behavior. `ProgressBar.vue` = "Policy improvement N/12 iterations" + `.progress-fill` width.
- [ ] **Step 4: Drift check** — screenshot sidebar + topbar (desktop ≥1200px and mobile ≤560px) vs original; assert pixel-faithful. Confirm nav switching shows/hides the right section.
- [ ] **Step 5: Commit** — `feat: app shell, sidebar nav, progress, mobile drawer`.

---

## Task 3: Cross-cutting composables (KaTeX, xref, bridges)

**Files:** `src/composables/useKaTeX.js`, `useXref.js`, `useBridges.js`; `src/data/xrefs.js`.

- [ ] **Step 1:** `useKaTeX.js` — `renderMath(el)` calling `renderMathInElement(el, {delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}], throwOnError:false})`, guarded for availability. Sections call it in `onMounted`/after content render (scoped to the section root el, not `document.body`, to play with Vue lifecycle).
- [ ] **Step 2:** `useXref.js` — port the autolinker (original lines ~3393–3430) as a function `applyXref(rootEl)` that walks `p, li, td` text nodes within `rootEl`, applies the **exact** regex `/(Lectures?\s+)(\d{1,2})(\s*[–-]\s*(\d{1,2}))?|\bL(\d{1,2})(?=[)\].,;:])|(the\s+Primer)\b/g`, skips `.bridge/.katex/code/.recap-box/.callout/.lab-note/script/style` and existing anchors, wraps matches in `<a class="xref" data-go=…>`. Must run **after** KaTeX. Clicking an `.xref` triggers `show(data-go)` via the same nav mechanism.
- [ ] **Step 2a: ordering test** — verify xref runs after KaTeX (KaTeX wraps math in `.katex` spans the xref skips). Add a vitest/jsdom test on `applyXref` for: "Lecture 4" → link to l4, bare "L2 norm" → **not** linked, "(L5)" → linked, "the Primer" → linked to primer. Pin against the original's documented behavior.
- [ ] **Step 3:** `useBridges.js` — reactive `bridgesHidden` toggling the `hide-bridges` class on the content root (original used `body.hide-bridges`; scope to app root, CSS rule updated accordingly in styles.css). The toggle button text matches original ("Hide the finance / actuarial bridges").
- [ ] **Step 4: Commit** — `feat: KaTeX, xref autolinker, bridge-toggle composables (+ xref tests)`.

---

## Task 4: Quiz system (data-driven) + Review deck

**Files:** `src/data/quizzes.js`, `src/components/Question.vue`, `Quiz.vue`, `ReviewDeck.vue`.

> The original grades via event delegation and the Review deck **clones live quiz DOM**. Idiomatic Vue: questions live in `data/quizzes.js` (single source); sections render their quiz from it; the Review deck renders from the same data — no DOM cloning. Behavior (grade-on-click, `.right/.wrong`, explanation reveal, counter `Q1…`, score, shuffle, group-by-lecture) reproduced exactly.

- [ ] **Step 1:** `quizzes.js` — extract **all 38** questions from the original (each `.q[data-correct]` with its `.opt[data-k]` set and `.expl`), tagged by source lecture. NOTE: a raw `grep -c data-correct` on the original returns 40, but **2 of those are JavaScript references** (lines 2341, 3383) — there are exactly **38** static `class="q" data-correct` question blocks. Inventory test: assert 38 questions, each with a valid `data-correct` key present among its options.
- [ ] **Step 2:** `Question.vue` — reactive `answered` state; on option click set answered, apply `.right` to the correct option and `.wrong` to the chosen-if-wrong, reveal `.expl`. Markup/classes identical to original (`.q`, `.q-text` with `Q` counter via CSS `counter-reset`, `.opt .ok`).
- [ ] **Step 3:** `Quiz.vue` — renders a list of `Question` for a lecture (`counter-reset:q`).
- [ ] **Step 4:** `ReviewDeck.vue` — renders all questions with `reviewShuffle`/`reviewGroup` buttons (`.off` toggling), `review-src` group labels and `review-tag` chips, and live `reviewScore` "Score: R / A (of N)". Shuffle = Fisher–Yates (seeded acceptably; randomness is fine), group = by lecture. Replicates original utility-script behavior.
- [ ] **Step 5: Drift check** — render L4 quiz + Review deck; visually diff vs original; verify grading + score behavior by interaction.
- [ ] **Step 6: Commit** — `feat: data-driven quiz system + review deck`.

---

## Task 5: Widget infrastructure (RLLAB port, useAnimate, logic harness)

**Files:** `src/widgets/rllab.js`, `src/composables/useAnimate.js`, `src/components/Lab.vue`, `src/logic/` (scaffold), `tools/drift/*`.

- [ ] **Step 1:** `rllab.js` — port the drawing/util helpers verbatim as ES exports: `E, TX, SVG, clr, ce, clamp, lerp, randn`, color palette `C`. (The `slider/btn/legend` DOM-builders become Vue components/template markup in widgets, but keep equivalent helpers available for widgets that build controls imperatively to minimize drift; either path must produce the same `.ctrl/.lab-btn/.lab-legend` DOM.)
- [ ] **Step 2:** `useAnimate.js` — port `animate(dur, step, done)` **verbatim** (the exact ease `p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2`, plain rAF loop). **Do NOT add a `prefers-reduced-motion` JS branch** — the original's `animate()` never checks it; reduced-motion is handled CSS-only (the `@media (prefers-reduced-motion)` rule ported in Task 1). Adding a JS short-circuit would be behavioral drift. **Do not extend** beyond the original in Phase 1 (that's Phase 2). NOTE: `R.animate` is used by only **one** widget (`saycan`); other animated widgets use their own timers (see Task 7) — port those verbatim too, do not force them onto `useAnimate`.
- [ ] **Step 3:** `Lab.vue` — the figure shell: `<figure class="lab" :id>`, `.lab-cap` with `INTERACTIVE` `.lab-kicker`, `.lab-stage` (dark), `.lab-controls`, `.lab-note`; slots for stage/controls/note. Includes the original's `aria-label` pass (role=img, "Interactive: <caption>") on stage svg/canvas.
- [ ] **Step 4:** `logic/` scaffold + one example pure core extracted with a vitest test (pick `discount` γ effective-horizon, simplest) to establish the pattern: pure function in `logic/discount.js`, `logic/discount.test.js` pins outputs. Run `npm test` → green.
- [ ] **Step 5:** `tools/drift/` — `snapshot.mjs` (screenshot a URL region via the browser tools, save baseline + candidate), `content-diff.mjs` (extract visible text from a DOM, normalize whitespace, diff two sources), `inventory.mjs` (assert: 15 nav buttons, 14 `data-go` pager targets, 29 `lab-*` ids, 40 quiz answers, `$$` balance, `\(`==`\)`). `README.md` documents how to run each against `reference/…html` vs the dev server. These are operated via the available Playwright tools during execution.
- [ ] **Step 6: Commit** — `feat: widget infra (rllab port, useAnimate, Lab shell, logic harness, drift tools)`.

---

## Task 6: Port content sections (×15) — repeatable recipe

**Files (per section):** `src/sections/<Name>Section.vue` (+ entries already in `nav.js`, quizzes already in `quizzes.js`).

> Order: `start, primer, l1…l12, review`. Do them one at a time; each is its own commit and its own drift sign-off. Bridges/recaps/dives/callouts/meta-strips use the components from Tasks 3–4; quizzes come from `quizzes.js`.

**Per-section recipe (apply to each of the 15):**
- [ ] **a.** Create `<Name>Section.vue`. Port the section's markup from the original verbatim into the template: `.lecture-head` (ltag/h2/dek), `.meta-strip` chips, prose `<p>`, `h3/h4`, lists, `.bridge` (via `Bridge.vue`), `.dive` (via `Dive.vue`), `.callout`/`.callout.miscon`, `.figure`, `.papers`, `.resources`, `.cmp` tables, `.hero-grid`, `.recap`/`.recap-box`, `.toolbox`, `.gloss`, widget `<Lab>` placeholders (wired in Task 7), and `<Quiz lecture="…">`. Keep LaTeX delimiters (`\( \)`, `$$`) intact in text.
- [ ] **b.** On mount: `renderMath(rootEl)` then `applyXref(rootEl)` (order matters). Wire `.complete-btn` (CompleteBar) + `Pager` (`data-go` prev/next) per original.
- [ ] **c.** **Content drift check:** run `content-diff.mjs` for this section — extract visible post-KaTeX text from the original section and the new one; assert **character-identical** (normalize whitespace only). Fix any divergence. Run `snapshot.mjs` for the section at desktop+mobile; harsh-critic pixel review; resolve drift. Any genuine original bug → `DRIFT_FIXME.md`, reproduce faithfully.
- [ ] **d.** Commit — `feat: port <Name> section (content drift verified)`.

**Checklist of sections (each = one full recipe pass):**
- [ ] Start  - [ ] Primer  - [ ] L1  - [ ] L2  - [ ] L3  - [ ] L4  - [ ] L5  - [ ] L6  - [ ] L7  - [ ] L8  - [ ] L9  - [ ] L10  - [ ] L11  - [ ] L12  - [ ] Review

---

## Task 7: Port widgets (×29) — repeatable recipe

**Files (per widget):** `src/widgets/<Widget>.vue`, `src/logic/<core>.js`, `src/logic/<core>.test.js`; wired into its section's `<Lab>`.

> Widgets carry the numeric-drift risk. **Mandatory pattern:** extract all simulation math into a pure function in `logic/`, pin it with vitest against values computed from the original algorithm, then build the Vue component to render + control it via `rllab.js`/`Lab.vue`. SVG/Canvas text stays **Unicode**, never LaTeX.

**Per-widget recipe (apply to each of the 29):**
- [ ] **a. Write the failing logic test** — `logic/<core>.test.js` pinning the core's outputs (e.g. value-iteration sweep values; deadly-triad weight trajectory must diverge **only** at 3/3 legs; GAE λ curve; PPO clip ratio; softmax/ε-greedy/UCB selection). Derive expected values from the original's algorithm (read the original IIFE).
- [ ] **b. Run test → fails.** `npm test -- <core>`. Expected: FAIL (not implemented).
- [ ] **c. Implement** `logic/<core>.js` as a pure function. Run test → PASS.
- [ ] **d. Build `<Widget>.vue`** — controls (sliders/buttons matching original ranges/labels/`fmt`), draw routine using `rllab.js` helpers. **Port each widget's own timing mechanism verbatim** — do not invent or remove motion. Confirmed animated widgets and their mechanisms: `saycan` (`R.animate`/`useAnimate`), `grid` (`setInterval` ~430ms auto-run), `pg` (`setTimeout` ~280ms + rAF loop — **not** `R.animate`), `diff` (`setTimeout` ~120ms + rAF loop). All other widgets **snap** between states — preserve that. (Re-read each widget's original IIFE to confirm its exact timing before porting.) Same `id`, same `.lab-note` text, same legend.
- [ ] **e. Wire into its section's `<Lab>`** and verify it mounts (guarded like original `if(!stage)return` equivalent).
- [ ] **f. Drift check** — screenshot the widget's initial state vs original; harsh-critic pixel review. Interact (move sliders/run) and sanity-check behavior matches. Resolve drift.
- [ ] **g. Commit** — `feat: port <id> widget (numerics pinned, drift verified)`.

**Checklist of widgets by lecture (each = one full recipe pass):**
- [ ] Primer: `disc`, `arm`
- [ ] L1: `paradigm`
- [ ] L2: `grid`, `pid`
- [ ] L3: `drift`, `curve`, `mean`, `causal`
- [ ] L4: `bandit`, `mctd`, `triad`  *(triad: faithful Sutton&Barto two-state; diverges only at 3/3)*
- [ ] L5: `pg`, `base`, `clip`, `gae`, `reparam`, `domrand`
- [ ] L6: `diff`, `flowode`
- [ ] L7: `attn`, `dt`, `chunk`
- [ ] L8: `wm`
- [ ] L9: `xembod`
- [ ] L10: `saycan`, `bon`
- [ ] L11: `worldview`
- [ ] L12: `arc`

---

## Task 8: Full drift sweep + acceptance

**Files:** `DRIFT_FIXME.md`, `tools/drift/` (final run report).

- [ ] **Step 1: Inventory** — run `inventory.mjs` against the built app; assert 15 nav buttons, 14 `data-go` targets, 29 `lab-*` ids (incl. distinct `mctd`/`triad`), **38 quiz questions** (`.q[data-correct]` blocks — NOT 40; raw `grep data-correct` returns 40 due to 2 JS refs), `$$` balanced, `\(`==`\)`. All must match the original.
- [ ] **Step 2: Full content diff** — run `content-diff.mjs` across all 15 sections; assert character-identical. Any remaining diff is a defect or a logged `DRIFT_FIXME` justification.
- [ ] **Step 3: Full visual sweep** — `snapshot.mjs` every section + every widget initial state at desktop + mobile vs original; harsh-critic review; resolve or justify each delta in writing.
- [ ] **Step 4: Tests + build** — `npm test` green; `npm run build` clean; `./launch.sh` serves a fully navigable site.
- [ ] **Step 5: Acceptance** — confirm every §7 criterion of the spec holds; `DRIFT_FIXME.md` lists all original bugs found (none fixed). 
- [ ] **Step 6: Commit** — `chore: full drift sweep passed; Phase 1 migration complete`.

---

## STOP — Phase boundary

After Task 8, **stop and report**. Do **not** begin Phase 2; it awaits separate user approval per the agreed scope.
