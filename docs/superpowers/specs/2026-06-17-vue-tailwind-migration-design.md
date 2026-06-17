# Robot Learning Companion — Vue + Tailwind Migration (Phase 1) — Design

**Date:** 2026-06-17
**Status:** Approved for spec review
**Author:** Claude (Opus 4.8) with Joseph Femia

---

## 1. Purpose & scope

Migrate the existing single-file study site `robot-learning-companion.html`
(3,430 lines; **12 lectures (L1–L12) plus Start, Primer, and Review** — 14
`data-go` nav entries; 29 interactive widgets) into a modern
**Vite + Vue 3 + Tailwind** project that mirrors the
sibling project `../jepa_learning/` (Vite + Tailwind + `launch.sh` + vitest +
GitHub-Pages workflow), but using **Vue** instead of React.

This is a **full idiomatic rewrite** (chosen over a wrap-the-original port)
held to a **zero-drift mandate**: the rebuilt site must be character-identical
in content and pixel-identical in styling to the original. The original HTML
file is frozen as the **golden reference** and we diff against it constantly.

### Explicitly out of scope (→ Phase 2, separate spec)
Tasks 5–11 from the request — content review rounds (general, entry-level ML,
senior ML/researcher), new interactives/visuals, 3Blue1Brown-style pedagogy
polish, and the manim-vs-animation-library investigation beyond the chosen
in-house motion layer. **Phase 2 begins only after the drift harness confirms a
clean port.**

### Decisions locked during brainstorming
| Decision | Choice |
|---|---|
| Sequencing | Faithful port first (this spec); review rounds later (Phase 2). |
| Migration approach | **Approach 2** — full idiomatic Vue rewrite, with constant harsh drift review. |
| Animation | In-house SVG/Canvas motion layer — port `R.animate` into a `useAnimate` composable and extend later. **manim ruled out** (pre-baked Python video, non-interactive, can't run in-browser). |
| Persistence | **Keep the `window.storage` abstraction** exactly as-is (in-memory fallback; no `localStorage` by default). |
| Style fidelity | Pixel-faithful; zero visual change in this phase. |
| Visual drift gate | **Near-zero tolerance, manual sign-off** per section/widget. |
| Original bugs | **Preserve faithfully**; log to a `DRIFT_FIXME.md` list for Phase 2. Do NOT fix during migration. |

---

## 2. Architecture & stack

- **Build:** Vite (matching jepa's `vite.config.js`, including `base` env for GH Pages).
- **Framework:** Vue 3, SFCs with `<script setup>`.
- **Styling:** Tailwind 3 + PostCSS + autoprefixer. Design tokens go in
  `tailwind.config.js theme.extend`; bespoke component looks reproduced via
  `@layer components` / `@apply` in `src/assets/styles.css`.
- **Math:** KaTeX (CDN `<link>` for CSS in `index.html`, JS auto-render invoked
  from a composable after section mount — same delimiters as original).
- **Fonts:** Google Fonts (Archivo, Source Serif 4, IBM Plex Mono) via
  `index.html` `<link>` — identical to original.
- **Testing:** vitest (numeric logic) + a Playwright-driven drift harness.

### Proposed structure
```
robotic_learning/
├─ launch.sh                  # mirrors jepa: install-on-first-run, exec npm run dev
├─ index.html                 # app shell + CDN <link>s (KaTeX CSS, fonts)
├─ package.json               # vue, vite, @vitejs/plugin-vue, tailwind, vitest
├─ vite.config.js             # base: process.env.VITE_BASE || "/"
├─ tailwind.config.js         # design tokens (paper, ink, cobalt, signal, …), fonts
├─ postcss.config.js
├─ .gitignore                 # node_modules, dist, .vite, .playwright-mcp, *.local
├─ reference/
│  └─ robot-learning-companion.html   # FROZEN golden original (read-only ref)
├─ src/
│  ├─ main.js
│  ├─ App.vue                 # layout: fixed sidebar nav + content area
│  ├─ assets/
│  │  └─ styles.css           # @layer base/components; ported component CSS
│  ├─ data/                   # structured content
│  │  ├─ nav.js               # section list / ordering
│  │  ├─ lectures/*.js        # prose + metadata per section (if data-driven)
│  │  ├─ quizzes.js           # quiz items (question, opts, data-correct)
│  │  └─ xrefs.js             # cross-reference link table
│  ├─ composables/
│  │  ├─ useKaTeX.js          # renderMathInElement wrapper
│  │  ├─ useProgress.js       # window.storage shim (key rlc-progress-v1)
│  │  ├─ useQuiz.js           # grading via the original scheme
│  │  ├─ useBridges.js        # bridge on/off toggle (body.hide-bridges equiv)
│  │  ├─ useXref.js           # auto-linker over rendered prose
│  │  └─ useAnimate.js        # R.animate easing port
│  ├─ widgets/
│  │  ├─ rllab.js             # E/TX/SVG/clr/ce/clamp/lerp/randn/slider/btn/legend/C
│  │  └─ <Widget>.vue × 29    # reactive widget components
│  ├─ logic/                  # PURE numeric cores + tests
│  │  ├─ valueIteration.js (+ .test.js)
│  │  ├─ deadlyTriad.js     (+ .test.js)   # must diverge ONLY at 3/3
│  │  ├─ gae.js, ppoClip.js, diffusion.js, … (+ tests)
│  └─ sections/              # Start, Primer, L1–L12, Review SFCs
└─ tools/drift/              # the drift-detection harness (scripts + baselines)
```

---

## 3. Component & data design

### 3.1 App shell (`App.vue`)
Recreates the fixed dark sidebar (`--sidebar-w:300px`) + scrollable content
column, flat section nav (15 buttons; `data-target` equivalent), progress bar
("Policy improvement N/12"), bridge toggle, prev/next pagers (14 targets;
`data-go` equivalent). Single source of truth for the
active section. No router needed (original is a single-page section-toggler);
section visibility is reactive state.

### 3.2 Sections (`src/sections/*`)
One SFC per section: `Start`, `Primer`, `L1`…`L12`, `Review`. Prose is rendered
from structured `data/` where it's clean to do so; dense mathematical prose may
live in the section template directly. The data-vs-template split is purely an
implementation convenience and does **not** relax the gate. **Hard rule:**
rendered visible text (post-KaTeX) is character-identical to the original,
whether it originates from `data/` or a template (enforced in §5).

### 3.3 Widgets (`src/widgets/*.vue`, 29 total)
Reactive Vue components. Controls (`slider`, `btn`, `legend`) become Vue-driven,
but **all simulation math is delegated to pure functions in `src/logic/`**.
SVG/Canvas drawing uses the `rllab.js` helpers ported from `window.RLLAB`. Each
widget keeps its original `id` and teaching behavior. Widget SVG/Canvas text
stays **Unicode** (γ, μ, σ², ≈), never LaTeX — same rule as original.

Widget inventory (must all exist, verified in §5): `disc, arm, paradigm, grid,
pid, drift, curve, mean, causal, bandit, mctd, triad, pg, base, clip, gae,
reparam, domrand, diff, flowode, attn, dt, chunk, wm, xembod, saycan, bon,
worldview, arc`.

### 3.4 Composables
Each cross-cutting behavior from the original's nav/quiz/progress and utility
scripts becomes a composable (listed in the tree). `useProgress` preserves the
`window.storage` get/set contract and `rlc-progress-v1` key verbatim.

---

## 4. Styling strategy (pixel-exact Tailwind)

1. **Tokens → config.** All CSS custom properties (`--paper #FAFBFC`,
   `--ink #161B22`, `--cobalt #2742CC`, `--signal #E8590C`, `--right`, `--wrong`,
   `--panel`, `--line`, `.lab-stage` dark `#0F1422`, fonts) become
   `tailwind.config.js` theme values **and** remain available as CSS variables
   for the ported component CSS.
2. **Utilities for layout.** Spacing/flex/grid/typography via Tailwind utilities.
3. **Bespoke looks reproduced exactly.** The semantic component treatments
   (`.bridge`, `.recap`/`.recap-box`, `.dive`, `.papers`, `.quiz`, `.opt`,
   `.meta-strip`/`.chip`, `.callout.miscon`, `.xref`, `.lab`/`.lab-cap`/
   `.lab-stage`/`.lab-controls`/`.lab-note`, `.notice`) are reproduced under
   `@layer components` (via `@apply` or raw CSS) so the look is guaranteed, not
   approximated. The two distinct recap styles are **preserved as-is** (unifying
   them is a Phase-2 item).
4. **Reduced-motion** media query and `:focus-visible` outline ported verbatim.

---

## 5. The drift harness (centerpiece)

Lives in `tools/drift/`. Run after **every** section and widget, and again at
phase end. Driven by the available Playwright browser tools against two targets:
the frozen `reference/robot-learning-companion.html` and the running dev app.

**Gate: near-zero tolerance, manual sign-off.** Any visible difference is a
defect to resolve or explicitly justify in writing per region — not silently
tolerated.

### Checks
1. **Visual diff.** Screenshot the original and the new app at identical
   viewports (≥1 mobile, ≥1 desktop width) per section and per widget initial
   state; pixel-compare matched regions. Harsh-critic review of every delta.
2. **Content diff.** Extract visible text (post-KaTeX) from both DOMs, normalize
   whitespace, assert **character-identical**. Catches dropped, reordered, or
   reworded prose and captions.
3. **Numeric diff.** vitest pins each `src/logic/` core's outputs; spot-checked
   against the original algorithm (e.g. deadly-triad diverges only at 3/3;
   gridworld value-iteration sweep values; GAE/PPO-clip curves).
4. **Structural inventory.** Assert counts/identifiers match the original:
   **12 lectures (L1–L12) + Start, Primer, Review** = 15 sidebar nav buttons
   (`data-target`), with 14 prev/next pager targets (`data-go`; no pager links to
   Review). All 29 widget IDs present (note `mctd` and `triad` are **distinct**
   widgets — do not dedupe), **40 quiz `data-correct` answers** with matching
   `.opt[data-k]` options, xref targets, `$$` delimiter balance, `\(`==`\)`.

### Sign-off artifact
Each section/widget records a pass/justified-diff entry. Genuine original bugs
discovered go into `DRIFT_FIXME.md` (Phase-2 backlog) and are **reproduced
faithfully** in the port, never fixed here.

---

## 6. Tooling & scripts

- **`launch.sh`** (mirrors jepa, `set -euo pipefail`, `cd "$(dirname "$0")"`,
  install on first run, `exec npm run dev` → `http://localhost:5173`).
- **`package.json` scripts:** `dev` (vite), `build`, `preview`, `test`
  (vitest run), `test:watch`, and `drift` (run the harness).
- **GitHub Pages workflow** mirroring jepa's `VITE_BASE` deploy (optional, ported
  for parity).

---

## 7. Verification & acceptance criteria

The migration is **done** only when all hold:
1. `launch.sh` boots the dev server; site is fully navigable.
2. All 12 lectures (L1–L12) + Start/Primer/Review render; all 29 widgets present
   and interactive with behavior matching the original.
3. **Drift harness passes** on every section and widget: content
   character-identical, visuals at near-zero pixel tolerance (manual sign-off),
   numerics pinned, structural inventory matches.
4. `npm test` (vitest) green; every inline-script invariant from the original
   that still applies is preserved.
5. `window.storage` contract + `rlc-progress-v1` key behavior preserved.
6. `DRIFT_FIXME.md` captures every original bug found (none fixed this phase).
7. No manim / GSAP / anime.js added; motion is the in-house `useAnimate` port.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Numeric drift in widget rewrites | Pure logic cores + vitest pins; spot-check vs original. |
| Pixel drift from Tailwind reset/AA | Near-zero-tolerance visual diff + manual harsh-critic sign-off; reproduce bespoke CSS exactly. |
| Content reworded during restructure | Character-identical text diff gate. |
| KaTeX render-timing differences | Render in composable after mount; diff post-render DOM text. |
| Scope creep into Phase 2 | Hard phase boundary; improvements logged, not implemented. |
| Hidden original bugs treated as drift | `DRIFT_FIXME.md`; preserve faithfully. |

---

## 9. Phase 2 preview (not this spec)

After a clean port: content review rounds (general / entry-level ML /
senior researcher), new 3b1b-style interactives, equation-morph animations,
derive-it-yourself Bellman widget, recap-style unification, link verification,
L12 depth — each with its own spec → plan → implementation cycle.
