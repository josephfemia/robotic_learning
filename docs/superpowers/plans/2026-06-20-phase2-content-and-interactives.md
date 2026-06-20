# Phase 2 — Content & Interactives Uplift Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the (now Vue+Tailwind) Robot Learning Companion's content and interactives to Karpathy / 3Blue1Brown / Welch-Labs quality — addressing request tasks 5–11 and the deferred open items — without regressing the faithful Phase-1 port.

**Architecture:** Five workstreams executed roughly in the spec's order — (E-accuracy) link verification → (A) in-house motion toolkit → (C) new interactives → (B) multi-perspective content review → (D) pedagogy pass → (E-remaining) polish/a11y. The guardrail flips from Phase 1's "no drift" to **"no regressions"**: numeric cores stay vitest-green, no facts/math broken, accessibility preserved, build clean. Review-heavy workstreams (B, D) are **backlog-first**: a tracked list of located changes is produced and **the user approves it before bulk edits land**.

**Tech Stack:** Vite + Vue 3 + Tailwind + vitest (unchanged). In-house SVG/Canvas motion (`useAnimate` extended). NO manim / GSAP / anime.js. KaTeX for prose math; Unicode for widget text. `window.storage` persistence (no localStorage).

**Spec:** `docs/superpowers/specs/2026-06-17-content-and-interactives-phase2-design.md`
**Inputs:** `DRIFT_FIXME.md` (Phase-1 backlog), `PROJECT_BRIEF.md` §4 (constructed-link risk), `reference/robot-learning-companion.html` (now a regression detector for untouched chrome).

**Standing rules:** Every new widget ships a pure `src/logic/<name>.js` core + vitest test. Commit per task. Run `npm test` + `npm run build` before marking a task done. Each new interactive must satisfy the 3b1b checklist: **clear question → manipulable variable → visible consequence → stated takeaway**, with a `prefers-reduced-motion` path.

---

## File structure (created/modified by this plan)

```
src/composables/useAnimate.js        (MODIFY — extend into motion toolkit) + useAnimate.test.js (NEW)
src/widgets/
  SoftmaxWidget.vue        (NEW, C#3 — Primer Part B)
  DynamicsWidget.vue       (NEW, C#4 — Primer Part A)
  PgTransformWidget.vue    (NEW, C#1 — L5 equation-morph)
  BellmanDeriveWidget.vue  (NEW, C#2 — Primer Part B)
src/logic/
  softmax.js, dynamics.js, bellman.js  (NEW + .test.js each)
src/sections/*.vue         (MODIFY — wire new widgets; apply approved review/pedagogy edits; senior-honesty labels; deepen L12; recap unification)
src/assets/styles.css      (MODIFY — unify .recap / .recap-box into one treatment)
src/components/Sidebar.vue, App.vue  (MODIFY — a11y: keyboard nav, "next unfinished" affordance)
docs/superpowers/
  phase2-link-audit.md         (NEW — every link + HTTP status + content-confirmation + fix)
  phase2-review-backlog.md     (NEW — located content-change proposals; USER-APPROVED before edits)
  phase2-pedagogy-backlog.md   (NEW — narrative/interactive proposals; USER-APPROVED before edits)
DRIFT_FIXME.md               (MODIFY — burn down as items are addressed)
```

---

## Task 0: Link & accuracy verification (Workstream E-accuracy — FIRST, highest value)

**Files:** Create `docs/superpowers/phase2-link-audit.md`; Modify section `.vue` files to fix bad links.

- [ ] **Step 1:** Enumerate every external link/URL in `src/sections/*.vue` and `src/data/*` (grep `href=`, `http`). Build a table in `phase2-link-audit.md`: URL · where used · purpose.
- [ ] **Step 2:** For each, use WebFetch to confirm it **resolves AND its content is the intended resource** (not just HTTP 200). Pay special attention to the brief's flagged risks (§4): the constructed GitHub repo `github.com/mees-robot-learning-course/ethz-course-2026`, homework paths, and specific ETH video IDs.
- [ ] **Step 3:** For any 404 or wrong-content link: find the correct URL (course page `https://cvg.ethz.ch/lectures/Robot-Learning/`, YouTube playlist `PLPU18BnWYUZJx3_d901-GD6BGpeWwE2vx`, etc.) or remove/soften the claim. Record the fix + new status in the audit.
- [ ] **Step 4:** Apply fixes to the section files. Run `npm run build`. 
- [ ] **Step 5:** Re-run the content drift harness on touched sections to confirm only the intended link text/href changed (no collateral prose change).
- [ ] **Step 6: Commit** — `fix(phase2): verify + repair course-logistics links (content-confirmed)`. Update the relevant `DRIFT_FIXME.md` link item.

**Acceptance:** every link in the audit is fetched-and-content-confirmed or removed; zero known 404s; audit doc committed.

---

## Task 1: Motion toolkit — extend `useAnimate` into the "manim-grammar" (Workstream A)

**Files:** Modify `src/composables/useAnimate.js`; Create `src/composables/useAnimate.test.js`.

- [ ] **Step 1: Write failing tests** for the pure pieces: `easings` map (`linear`, `quadInOut` = the existing curve, `cubicInOut`) each maps 0→0 and 1→1 and is monotonic; `prefersReducedMotion()` honored by a `tween()` wrapper that, when reduced motion is on, invokes `step(1)` once and `done()` without rAF.
- [ ] **Step 2:** Run `npm test -- useAnimate` → FAIL.
- [ ] **Step 3:** Implement, preserving the existing `animate(dur, step, done)` signature unchanged (Phase-1 widgets depend on it). Add: `easings`, `tween(dur, {ease, onStep, onDone, reducedMotion})`, `growIn(el)`, `writeOn(pathEl)` (stroke-dasharray/offset), `focusPulse(el)`. All additive — do not change `animate`'s behavior.
- [ ] **Step 4:** Run tests → PASS. `npm run build`.
- [ ] **Step 5: Commit** — `feat(phase2): extend useAnimate into reusable motion toolkit (+tests)`. Update the `DRIFT_FIXME.md` motion-layer item.

**Acceptance:** existing `animate` unchanged (Phase-1 widgets still pass all 443 tests); new helpers unit-tested; reduced-motion degrades to instant.

---

## Task 2: Softmax / temperature mini-primer (Workstream C#3 + entry-level gap)

**Files:** Create `src/logic/softmax.js` (+ `.test.js`), `src/widgets/SoftmaxWidget.vue`; Modify `src/sections/PrimerSection.vue` (Part B) + xref links from widgets that use softmax.

- [ ] **Step 1: Failing test** — `softmax(logits, T)`: outputs sum to 1; `T→0` approaches argmax one-hot; `T→∞` approaches uniform; monotonic in logits. Pin concrete values.
- [ ] **Step 2:** `npm test -- softmax` → FAIL → implement → PASS.
- [ ] **Step 3:** `SoftmaxWidget.vue` (DiscWidget pattern): bars of probabilities over a few actions; a **temperature** slider; show the question→manipulate→consequence→takeaway. Unicode text only.
- [ ] **Step 4:** Add a short prose intro in Primer Part B + wire the widget; add xrefs from `bandit`/`pg`/`saycan` notes pointing here.
- [ ] **Step 5:** `npm test` + `npm run build`; reduced-motion check.
- [ ] **Step 6: Commit** — `feat(phase2): softmax/temperature mini-primer interactive (Primer B)`.

---

## Task 3: Dynamics visual — inertia / Coriolis (Workstream C#4 + entry-level gap)

**Files:** Create `src/logic/dynamics.js` (+ `.test.js`), `src/widgets/DynamicsWidget.vue`; Modify `src/sections/PrimerSection.vue` (Part A, beside `arm`).

- [ ] **Step 1: Failing test** — pin the manipulator-equation terms `M(q)q̈ + C(q,q̇)q̇ + g(q) = τ` for a 2-link arm: `M` symmetric positive-definite; gravity term sign; Coriolis vanishes at zero velocity. Pin sample values.
- [ ] **Step 2:** test FAIL → implement → PASS.
- [ ] **Step 3:** `DynamicsWidget.vue` complementing the kinematics-only `arm`: visualize how inertia/Coriolis/gravity torques vary with configuration & velocity (sliders for joint velocity / payload). 3b1b checklist; Unicode text.
- [ ] **Step 4:** Wire into Primer Part A after the `arm` widget + a sentence of prose connecting kinematics→dynamics.
- [ ] **Step 5:** `npm test` + build; reduced-motion.
- [ ] **Step 6: Commit** — `feat(phase2): manipulator-dynamics interactive (Primer A)`.

---

## Task 4: Animated policy-gradient equation-transform (Workstream C#1 — the headline 3b1b visual)

**Files:** Create `src/widgets/PgTransformWidget.vue` (reuses `src/logic/policyGradient.js`); Modify `src/sections/L5Section.vue`.

- [ ] **Step 1:** (Logic reused/extended in `policyGradient.js` if needed — add a test pinning the identity `∇𝔼[R] = 𝔼[∇log π · R]` on a toy discrete case.)
- [ ] **Step 2:** `PgTransformWidget.vue` using the Task-1 motion toolkit: morph `∇_θ 𝔼_τ[R(τ)]` term-by-term into the REINFORCE estimator `𝔼_τ[Σ ∇_θ log π_θ(a_t|s_t) · R(τ)]` — write-on/fade each step with a "next step" control; each stage annotated with the why (log-derivative trick). Unicode/■ glyphs (NOT LaTeX) in the SVG; the surrounding prose keeps KaTeX.
- [ ] **Step 3:** Wire into L5 near the REINFORCE derivation; reduced-motion shows all stages statically.
- [ ] **Step 4:** `npm test` + build.
- [ ] **Step 5: Commit** — `feat(phase2): animated policy-gradient equation-transform (L5)`. Burn down the matching `DRIFT_FIXME`/open-item.

---

## Task 5: Derive-it-yourself Bellman widget (Workstream C#2)

**Files:** Create `src/logic/bellman.js` (+ `.test.js`), `src/widgets/BellmanDeriveWidget.vue`; Modify `src/sections/PrimerSection.vue` (Part B).

- [ ] **Step 1: Failing test** — `bellmanStep(V, P, r, gamma)` one sweep; pin that iterating converges to the fixed point on a tiny MDP and that it matches the closed-form on a 2-state chain.
- [ ] **Step 2:** test FAIL → implement → PASS.
- [ ] **Step 3:** `BellmanDeriveWidget.vue` that **builds** the equation rather than telling it: the learner assembles `V(s) = r + γ Σ P V(s')` by choosing terms / stepping the recursion and watching values fill in. 3b1b checklist.
- [ ] **Step 4:** Replace the "tells rather than builds" spot in Primer Part B; keep prose intro.
- [ ] **Step 5:** `npm test` + build; reduced-motion.
- [ ] **Step 6: Commit** — `feat(phase2): derive-it-yourself Bellman widget (Primer B)`. Burn down open-item.

---

## Task 6: Senior-honesty labels on schematic widgets (Workstream B-senior, quick win)

**Files:** Modify `src/widgets/TriadWidget.vue`, `BonWidget.vue`, `XembodWidget.vue` (their `note` props).

- [ ] **Step 1:** Add a one-line "schematic toy model" caveat to each note: `triad` = textbook two-state construction (not a literal DQN); `bon`/`xembod` = illustrative toy models. Keep existing note text; append the caveat.
- [ ] **Step 2:** Confirm these are additive (no numeric change); `npm test` + build.
- [ ] **Step 3: Commit** — `docs(phase2): label triad/bon/xembod as schematic toy models`. Burn down the matching `DRIFT_FIXME` item.

---

## Task 7: Content review rounds → backlog (Workstream B) — **USER CHECKPOINT**

**Files:** Create `docs/superpowers/phase2-review-backlog.md`; then Modify section files per approved backlog.

- [ ] **Step 1:** Dispatch three review passes (subagents) over all 15 sections, each returning a structured backlog of **located** proposals (file · section · exact change · rationale), NO edits yet:
  - **General (task 5):** clarity, flow, redundancy, ordering.
  - **Entry-level ML lens (task 6):** missing bridges/scaffolding for a learner weak on robotics/RL.
  - **Senior ML/researcher lens (task 7):** anything wrong, oversimplified, or missing nuance; recency-sensitive claims to re-verify.
- [ ] **Step 2:** Consolidate + dedupe into `phase2-review-backlog.md`, grouped by section, each item tagged severity (correctness / clarity / nice-to-have).
- [ ] **Step 3: 🚦 USER CHECKPOINT** — present the backlog; the user approves / trims / reprioritizes **before any bulk edits**.
- [ ] **Step 4:** Apply approved items in reviewable batches (per-section commits). After each batch: senior-lens re-check of changed prose for introduced errors; `npm run build`; drift harness on touched sections (expect *intended* changes only).
- [ ] **Step 5: Commit** per batch — `content(phase2): <section> review edits (approved backlog)`.

**Acceptance:** backlog doc committed; every approved item done or explicitly deferred; no introduced factual/math errors (senior re-check); build green.

---

## Task 8: Pedagogy / 3b1b narrative pass (Workstream D) — **USER CHECKPOINT**

**Files:** Create `docs/superpowers/phase2-pedagogy-backlog.md`; then Modify section files + widget notes per approved backlog.

- [ ] **Step 1:** Pass over each section assessing "does it arrive at the conclusion naturally?" and over each interactive against the 3b1b checklist (question→manipulate→consequence→takeaway). Produce `phase2-pedagogy-backlog.md` of located narrative/interactive improvements.
- [ ] **Step 2: 🚦 USER CHECKPOINT** — user approves the pedagogy backlog before edits.
- [ ] **Step 3:** Apply approved narrative edits + interactive tweaks in batches; re-verify numerics unchanged (tests green) and changed prose re-checked for correctness.
- [ ] **Step 4: Commit** per batch — `content(phase2): pedagogy pass — <section>`.

---

## Task 9: Polish & accessibility (Workstream E-remaining)

**Files:** Modify `src/assets/styles.css` (recap unification), `src/sections/L12Section.vue` (deepen), `src/components/Sidebar.vue` + `src/App.vue` (a11y).

- [ ] **Step 1: Recap unification** — unify `.recap` and `.recap-box` into one visual treatment in `styles.css`; update any section markup that used the dropped variant. Visual spot-check both old usages render with the unified style.
- [ ] **Step 2: Deepen L12** (lightest section) — add depth per the approved review backlog (guest-lecture arcs: Dieter Fox, Pieter Abbeel). Keep within scope; commit.
- [ ] **Step 3: Accessibility** — keyboard navigation for the sidebar nav (arrow/enter), a "next unfinished lecture" affordance, and focus management on section switch. Manual keyboard test + confirm focus-visible styles intact.
- [ ] **Step 4:** `npm test` + build; reduced-motion sweep on all new widgets.
- [ ] **Step 5: Commit** — `feat(phase2): recap unification, L12 depth, keyboard a11y`. Burn down matching `DRIFT_FIXME` items.

---

## Task 10: Motion retrofit (Workstream A, best-effort)

**Files:** Modify widget `.vue` files, highest-traffic first.

- [ ] **Step 1:** Retrofit existing snap-between-states widgets onto the Task-1 toolkit **one at a time**, priority to the most motion-relevant (e.g. `grid`, `mctd`, `gae`, `clip`). Each: add eased transitions / focus-pulse without changing numerics.
- [ ] **Step 2:** After each widget: `npm test` (numerics unchanged), visual spot-check, reduced-motion check, commit `feat(phase2): motion retrofit — <widget>`.
- [ ] **Step 3:** `log()` which widgets were retrofitted vs deferred (full-29 coverage is a goal, not a gate — per spec §2A).

---

## Task 11: Final regression sweep + acceptance

- [ ] **Step 1:** `npm test` all green (Phase-1 + new logic cores); `npm run build` clean.
- [ ] **Step 2:** Drift harness as **regression detector**: untouched chrome/sections unchanged; changed regions match the approved backlogs (intended changes only).
- [ ] **Step 3:** Links: zero known 404s; audit doc current.
- [ ] **Step 4:** Accessibility: keyboard-navigable; reduced-motion paths work.
- [ ] **Step 5:** Backlogs (`review`, `pedagogy`) and `DRIFT_FIXME.md` each fully closed or explicitly deferred with reason.
- [ ] **Step 6: Commit** — `chore(phase2): final regression sweep — content & interactives uplift complete`.

---

## Sequencing & checkpoints

0 → 1 → (2,3,4,5 new interactives) → 6 → **7 (user checkpoint)** → **8 (user checkpoint)** → 9 → 10 → 11.

Tasks 0–6 and 9 are concrete and proceed without gating. Tasks 7 and 8 are **backlog-first with explicit user approval** before bulk content edits — this is the sprawl control from the spec. Stop and surface the backlog at each 🚦.
