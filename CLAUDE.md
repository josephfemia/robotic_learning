# CLAUDE.md — working notes for this repo

Guidance for Claude Code (and humans) working on the Robot Learning Companion.

## What this is

An interactive Vue 3 + Vite + Tailwind study site for the ETH "Robot Learning"
course (12 lectures). It was migrated from a single self-contained HTML file
(now frozen at `reference/robot-learning-companion.html`) into a modular app, then
its content and interactives were uplifted toward 3Blue1Brown quality. The design
specs, implementation plans, content-review backlog, and link audit live under
`docs/superpowers/`.

## Run / build / test

```bash
./launch.sh        # install (first run) + dev server at http://localhost:5173
npm run dev        # dev server
npm run build      # production build → dist/  (honors VITE_BASE for GH Pages)
npm test           # vitest — runs the pure numeric cores in src/logic/
```

Always run `npm test` and `npm run build` before considering a change done.

## Architecture

- **Sections** (`src/sections/*.vue`) — one component per nav entry (Start, Primer,
  L1–L12, Review). Prose + math live here. Each section's root is
  `<section class="lecture" :id>`; visibility is driven by `App.vue`'s `visibleId`.
- **Widgets** (`src/widgets/*.vue`) — each renders a `<Lab>` shell and draws into
  its stage (SVG/Canvas) in `onMounted` using the shared helpers in
  `src/widgets/rllab.js` (`R.E/TX/SVG/clr/slider/btn/legend/C`).
- **Logic cores** (`src/logic/*.js`) — the numeric guts of widgets, kept **pure**
  (no DOM) and **vitest-pinned** in `*.test.js`. Widgets import these; never inline
  simulation math you can't test.
- **Composables** (`src/composables/`) — `useKaTeX` (renderMath), `useXref`
  (cross-reference auto-linker), `useProgress` (progress state), `useBridges`
  (actuarial-bridge toggle), `useAnimate` (motion toolkit: `tween`, `easings`,
  `writeOn`, `growIn`, `focusPulse`, `prefersReducedMotion`).
- **App shell** (`src/App.vue`, `components/`) — sidebar nav, topbar/mobile drawer,
  progress bar, pager/complete bar, quiz system, review deck.
- **Drift harness** (`tools/drift/`) — `inventory.mjs` + `content-diff.mjs` compare
  the app against the frozen `reference/` original (used during the migration; now
  a regression detector for untouched chrome).

## Invariants — do not break these

1. **Widget SVG/Canvas text is Unicode** (γ, λ, σ², ∇, →) — **never LaTeX**. KaTeX
   is for prose only and has already run by the time widgets draw.
2. **Prose math is KaTeX**: `\( … \)` inline, `$$ … $$` display. Keep delimiters
   balanced. In `.vue` templates, **HTML-escape raw `<`/`>` inside math as
   `&lt;`/`&gt;`** or the Vue template parser will choke (e.g. Robbins–Monro
   `\sum\alpha^2 &lt; \infty`).
3. **Persistence uses `window.storage`** (key `rlc-progress-v1`) with an in-memory
   fallback. **No `localStorage`/`sessionStorage`.**
4. **Motion is the in-house `useAnimate` layer.** No manim / GSAP / anime.js.
   Discrete state changes should ease (via `tween`); slider drags stay instant;
   everything degrades to instant under `prefers-reduced-motion`.
5. **Every widget with simulation math has a pure `logic/` core + vitest test.**
   Don't change a core's numerics without updating its pinned test.
6. **Label hygiene:** no SVG text may overlap a drawing element or another label —
   check at slider/button extremes. Reserve header bands, move headers to clear
   corners, rotate y-axis titles, or use the legend instead of inline labels.

## Conventions

- Widget pattern: copy an existing widget (e.g. `DiscWidget.vue`) — `<Lab ref="lab"
  id title :note>`, read `lab.value.stage` / `lab.value.ctrl` in `onMounted`.
- New interactive 3b1b checklist: clear question → manipulable variable → visible
  consequence → stated takeaway; include a reduced-motion path.
- Quizzes live in `src/data/quizzes.js` (single source; rendered in-section and in
  the Review deck). Nav model in `src/data/nav.js`.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. `VITE_BASE` is
derived from the repo name; `vite.config.js` reads it. Set repo Pages source to
"GitHub Actions".

## Verified facts (don't re-derive)

The math (policy gradient, baselines/causality, GAE `(1−λ)λ^{n−1}`, PPO clip,
DDPG/SAC, diffusion ε-loss, flow-matching velocity target, Ross & Bagnell O(εT²))
was audited and is correct. Recency-sensitive paper names/attributions
(π0 / π0.5 / π*0.6, RT-1/RT-2, OXE, Octo, OpenVLA, DreamerV3, DPO/GRPO) were
web-verified. Course recordings are the **YouTube** links on the official course
page (`https://cvg.ethz.ch/lectures/Robot-Learning/`); the GitHub repo + homework
paths are real (confirmed). See `docs/superpowers/phase2-link-audit.md`.
