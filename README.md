# Robot Learning Companion

An interactive study companion for the ETH Zürich course **"Robot Learning: From
Fundamentals to Foundation Models"** (Spring 2026, Oier Mees, 263-5911-00L).
It teaches all 12 lectures deeply — in the explanatory spirit of Karpathy /
3Blue1Brown / Welch Labs — with dense prose, full derivations, and **33
interactive visualizations** you can manipulate.

Built for a learner with a strong ML + mathematics (and actuarial) background who
is building up the robotics and RL layers. Optional **finance/actuarial "bridge"
panels** map RL ideas onto concepts you may already know.

## Quick start

```bash
./launch.sh          # installs deps on first run, then starts the dev server
# → http://localhost:5173
```

Or directly:

```bash
npm install
npm run dev          # dev server
npm run build        # production build → dist/
npm run preview      # preview the production build
npm test             # vitest (numeric widget cores)
```

## What's inside

- **15 sections** — Start, the Primer (robotics + MDP fundamentals), Lectures 1–12,
  and a Review mode that aggregates every quiz with live scoring.
- **33 interactive widgets** — value iteration, PID, imitation drift, the deadly
  triad, REINFORCE, PPO clipping, GAE, diffusion/flow-matching, attention,
  world-model rollouts, SayCan, best-of-N, and more — plus new explainers:
  softmax/temperature, manipulator dynamics, a derive-it-yourself Bellman widget,
  and an animated policy-gradient → REINFORCE equation transform.
- **Quizzes** per lecture, self-checking, with a shuffle/group Review deck.
- **KaTeX** math, cross-reference auto-linking, progress tracking, and a
  keyboard-navigable sidebar.

## Tech stack

Vite · Vue 3 (`<script setup>`) · Tailwind CSS · vitest. Math via KaTeX (CDN).
Widget motion uses a small in-house SVG/Canvas animation layer (no heavy deps).

## Project layout

```
src/
  sections/     one component per section (StartSection, PrimerSection, L1…L12, ReviewSection)
  widgets/      33 interactive widgets + rllab.js (shared SVG/Canvas drawing helpers)
  logic/        pure, vitest-pinned numeric cores for the widgets (+ *.test.js)
  composables/  useKaTeX, useXref, useProgress, useBridges, useAnimate (motion toolkit)
  components/   Sidebar, TopBar, ProgressBar, Pager, CompleteBar, Lab, Quiz/Question/ReviewDeck
  data/         nav, quizzes, xref tables
  assets/       styles.css (design tokens + component styles)
reference/      frozen single-file original (the migration's golden reference)
tools/drift/    drift/regression harness (inventory + content-diff)
docs/superpowers/  design specs, implementation plans, review backlog, link audit
```

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. The Vite `base` path is derived automatically from the
repository name (`/<repo>/` for a project page, `/` for a `<user>.github.io`
repo), so no manual configuration is needed. Ensure the repo's **Settings →
Pages → Source** is set to **GitHub Actions** (the workflow auto-enables this).

To deploy:

```bash
git push origin main      # the Actions workflow builds + deploys
```

## License / attribution

Course content and lecture structure belong to ETH Zürich and the course
instructors; this companion is an independent study aid built from the public
syllabus, papers, and recordings. See the Start page for honest sourcing notes.
