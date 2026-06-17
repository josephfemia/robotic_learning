# Robot Learning Companion — Content & Interactives Uplift (Phase 2) — Design

**Date:** 2026-06-17
**Status:** Draft for spec review
**Author:** Claude (Opus 4.8) with Joseph Femia
**Depends on:** Phase 1 (Vue+Tailwind migration) — begins only after the Phase 1
drift harness confirms a clean, faithful port.

---

## 1. Purpose & scope

With the site faithfully migrated to Vite + Vue 3 + Tailwind, Phase 2 raises the
**content and interactives to Karpathy / 3Blue1Brown / Welch-Labs quality**:
prose that builds to each conclusion naturally, and interactive visuals that
teach (not merely illustrate). This covers request tasks **5–11** plus the
brief's deferred "Open items" (§7 of `PROJECT_BRIEF.md`) and the
`DRIFT_FIXME.md` backlog produced in Phase 1.

**Key inversion vs Phase 1:** drift from the original is now *intended*. The
frozen `reference/robot-learning-companion.html` is **no longer authoritative for
content**. The guardrail flips from "no drift" to **"no regressions"**: facts
stay correct, math stays correct, widget numerics stay sound (vitest still pins
them), accessibility is preserved, and the build stays green.

### Locked decisions (carried from brainstorming)
| Decision | Choice |
|---|---|
| Animation engine | In-house SVG/Canvas motion layer (`useAnimate`), extended into a full "manim-grammar" toolkit. **manim stays ruled out**; no GSAP/anime.js. |
| Pedagogy target | Karpathy / 3b1b / Welch-Labs: arrive at conclusions naturally; interactives are the proof, not decoration. |
| Audience | A strong-ML / strong-math / actuarial learner, weaker on robotics + RL. Finance/actuarial "bridges" are a valued recurring feature (toggleable). |
| Review method | Multi-perspective adversarial review via subagents (entry-level lens + senior-researcher lens), producing a tracked backlog before edits. |

### Which original hard-constraints still bind
The brief's §5 "single self-contained HTML file" constraint is **superseded** by
Phase 1's Vite/Vue/Tailwind architecture (build step + bundle are now intended).
Still binding in Phase 2: **persistence via the `window.storage` shim** (no
`localStorage`/`sessionStorage`); **widget SVG/Canvas text stays Unicode**
(γ, μ, σ²) while **prose math stays LaTeX/KaTeX**; numeric widget cores must stay
correct (now enforced by vitest, not manual `node --check`).

---

## 2. Workstreams

Phase 2 is organized as five workstreams. Each review workstream first produces a
**tracked backlog of concrete, located changes** (file + section + proposed
edit + rationale), which the user can scan before bulk edits land.

### A. Motion-layer build-out ("manim-grammar")
Extend `useAnimate` from a single eased-tween helper into a small reusable
toolkit and retrofit it across the 29 widgets so motion is consistent (today
most widgets snap between states):
- eased tweens (multiple easings), value-interpolated redraws;
- **fade/grow-in** for newly added elements;
- **SVG "write-on"** via `stroke-dasharray`/`stroke-dashoffset`;
- **focus-pulse** highlight to direct attention;
- a `prefers-reduced-motion` path that degrades gracefully (instant states).

**Retrofit scope:** the toolkit itself and a `prefers-reduced-motion` path are
*committed*. Retrofitting it across all 29 widgets is **best-effort, one widget at
a time** (priority to the highest-traffic / most-motion-relevant widgets);
full-29 coverage is a goal, not a hard acceptance gate (see §4).

### B. Content review rounds (tasks 5, 6, 7)
Three passes, each yielding a backlog:
1. **General improvement (task 5):** clarity, flow, redundancy, ordering.
2. **Entry-level ML lens (task 6):** find missing bridges/scaffolding for a
   learner weak on robotics/RL. Known gaps from the brief: a **softmax/temperature
   mini-primer** (used by several widgets), a **dynamics (inertia/Coriolis)
   visual** to complement the kinematics-only `arm` widget.
3. **Senior ML / researcher lens (task 7):** find anything wrong, oversimplified,
   or missing nuance; add **senior-honesty labels** marking the `triad`, `bon`,
   and `xembod` widgets as *schematic toy models* (e.g. triad = the textbook
   two-state construction, not a literal DQN).

### C. New interactives / visuals (task 8)
Prioritized new widgets, each with a pure numeric core + vitest test:
1. **Animated policy-gradient equation-transform (L5)** — morph
   ∇𝔼[R] term-by-term into the REINFORCE estimator (the most "3b1b-shaped"
   missing visual).
2. **Derive-it-yourself Bellman widget (Primer B)** — replace the one place that
   "tells rather than builds."
3. **Softmax/temperature mini-primer** — home: **Primer Part B** (RL fundamentals),
   linked via xref from widgets that use it (`bandit`, `pg`, `saycan`, etc.).
4. **Dynamics visual** (inertia/Coriolis) — home: **Primer Part A**, beside the
   kinematics-only `arm` widget it complements.
   *Additional candidates triaged from the review backlog as capacity allows.*

### D. Pedagogy pass (tasks 9, 10)
Section-by-section narrative pass so each lecture "arrives at the conclusion
naturally," and a parallel pass ensuring every interactive is a genuine
3b1b-quality teaching tool (clear question → manipulable variable → visible
consequence → stated takeaway), not just a chart.

### E. Polish & accuracy (open items + DRIFT_FIXME)
- **Verify constructed course links** (GitHub repo, homework paths, ETH video
  IDs) by actually fetching them; **fix any 404s.** *(Highest accuracy priority —
  the brief's single biggest open risk.)*
- **Unify the two recap styles** (`.recap` vs `.recap-box`).
- **Deepen L12** (lightest section).
- **Accessibility:** keyboard nav, "next unfinished lecture" affordance.
- Burn down `DRIFT_FIXME.md` items from Phase 1.

---

## 3. Sequencing within Phase 2

1. **E-accuracy first** (link verification + fixes) — cheap, high-value, prevents
   shipping wrong links while other work proceeds.
2. **A (motion toolkit)** — foundational; later widgets and retrofits depend on it.
3. **B (review rounds)** — produce the full change backlog; user scans it.
4. **C (new interactives)** + retrofit existing widgets onto the motion toolkit.
5. **D (pedagogy/narrative pass)** — integrative, done once content is settled.
6. **E-remaining** (recap unification, L12, accessibility) + backlog burn-down.

Each workstream lands in reviewable batches (see `executing-plans` /
`requesting-code-review`), not one monolithic change.

---

## 4. Verification & acceptance criteria

The "no-regressions" guardrail and quality bar:
1. **Numerics:** every widget's pure logic core has vitest coverage and stays
   green; new widgets ship with pinned tests (e.g. softmax sums to 1; PG estimator
   matches the analytic gradient on a toy case).
2. **Factual/math correctness:** senior-researcher subagent re-reviews changed
   prose; no introduced errors. Recency-sensitive claims (model names, arXiv IDs)
   re-verified if touched.
3. **Links:** every course-logistics link **fetched and content-confirmed** —
   not merely HTTP 200 (the brief's concern is 200-but-wrong-content links, e.g.
   the constructed GitHub repo / homework paths). Each link recorded with status
   and a note that its destination is the intended resource; replace or remove any
   that 404 or point to the wrong content.
4. **Pedagogy bar:** each interactive satisfies the 3b1b checklist
   (question → manipulation → visible consequence → takeaway); reduced-motion
   path works.
5. **Accessibility:** keyboard-navigable nav + widgets where feasible; focus
   states preserved.
6. **Build/test green:** `npm run build` and `npm test` pass; no broken xrefs.
7. **Backlogs closed:** review backlogs and `DRIFT_FIXME.md` items are each either
   done or explicitly deferred with reason.

---

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Scope sprawl (endless "improvements") | Backlog-first: each round produces a finite, located list the user approves before edits. |
| Introducing factual/math errors while "improving" | Senior-lens subagent re-review of changed content; numeric tests. |
| New widgets numerically wrong | Pure core + vitest pins, same discipline as Phase 1. |
| Motion retrofit destabilizes widgets | Retrofit one widget at a time behind the motion toolkit; visual spot-check; reduced-motion fallback. |
| Constructed links still 404 | Actually fetch every link; fix or replace; record status. |
| Pedagogy edits reword correct content into subtle errors | Changed text re-checked against sources; bridges kept opt-in. |

---

## 6. Open choices (for user review)

These do not block planning but the user may steer them:
1. **New-interactive priority/breadth** — the four in §2C are the committed set;
   how aggressively to pull additional candidates from the review backlog?
2. **Actuarial bridges** — expand them (the learner values them) or hold steady?
3. **Accessibility depth** — "reasonable keyboard nav + focus" vs a fuller
   WCAG-oriented pass?

---

## 7. Relationship to Phase 1

Phase 1 delivers a provably faithful Vue+Tailwind port + the drift harness +
`DRIFT_FIXME.md`. Phase 2 consumes that clean base and deliberately improves it.
The Phase 1 drift harness is repurposed in Phase 2 as a **regression detector**
for the parts that should *not* change (layout chrome, untouched sections),
while changed regions are reviewed for quality rather than fidelity.
