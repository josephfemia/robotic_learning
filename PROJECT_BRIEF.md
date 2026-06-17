# Robot Learning Study Companion — Project Brief & Handoff

> A single-file, interactive study website for the ETH Zürich course
> **"Robot Learning: From Fundamentals to Foundation Models"** (Spring 2026, taught by Oier Mees, course code 263-5911-00L).
> This document is a complete handoff so a fresh agent (e.g. Claude Code) can continue developing it without prior context.

---

## 1. What this project is

A self-learner is studying the ETH "Robot Learning" course from the public YouTube lectures and wanted a companion website that teaches all **12 lectures** deeply, in the explanatory style of **Karpathy / 3Blue1Brown / Welch Labs** — clean prose that builds up to each conclusion naturally, paired with **interactive visualizations** the reader can manipulate.

The entire deliverable is **one self-contained HTML file**: `robot-learning-companion.html` (~381 KB, ~3,430 lines). All HTML, CSS, and JavaScript are inline. The only external dependencies are loaded from CDNs at runtime:
- **KaTeX 0.16.9** (math rendering) from cdnjs
- **Google Fonts**: Archivo, Source Serif 4, IBM Plex Mono

There is **no build step, no framework, no bundler, no server**. Open the file in a browser and it works. It must stay this way (see Constraints).

### The learner's profile (design target)
- Strong background in **ML, mathematics, and actuarial science**.
- **Weaker on robotics and reinforcement learning** specifically.
- Wants depth across all 12 lectures, taught so you "arrive at the main conclusion almost naturally."
- Appreciates **finance/actuarial bridges** (analogies mapping RL concepts to actuarial ones) — these are a recurring feature and can be toggled on/off.

---

## 2. The asks made so far (chronological)

The project was built and then refined over several review rounds. The recurring request pattern was:

1. **Review the content and suggest improvements.**
2. **Review from an *entry-level ML engineer* perspective** — find gaps that need more bridging.
3. **Review from a *senior ML engineer / AI researcher* perspective** — find things that may be wrong or need additions.
4. **Suggest new interactives/visuals** to improve understanding.
5. **(Added later)** Ensure all content is covered in a **Karpathy / 3Blue1Brown / Welch Labs** style — understandable, with conclusions arrived at naturally.
6. **(Added later)** Ensure all **interactives/visuals are 3Blue1Brown-quality** teaching tools.
7. **(Added later)** Investigated whether **manim** (3b1b's Python animation engine) could be used. **Conclusion: no** — manim renders pre-baked video via Python+FFmpeg+OpenGL, which (a) can't run in a browser/single-file context, (b) produces non-interactive video, and (c) would bloat the file. The agreed path for "more 3b1b-like" is a **custom SVG/Canvas motion layer** (eased tweens, fade/grow-in, SVG "write-on", focus pulse), NOT a heavy dependency. A small `R.animate` easing helper already exists in the file as the first piece of this.

These review rounds have already been **implemented** — the file is in a mature state. Each round added content depth, entry-level scaffolding, senior-level caveats, and new interactives.

---

## 3. Current state — what's already in the file

### Structure (15 `<section class="lecture">` blocks, toggled by a flat sidebar nav)
- **Start** page (overview, honesty disclosures about sources)
- **Primer** (Part A: robotics fundamentals — kinematics, dynamics, DOF, manipulator equation; Part B: MDPs, Bellman, value/policy)
- **L1** Introduction
- **L2** Control & MDPs
- **L3** Imitation Learning
- **L4** RL I (value-based)
- **L5** RL II (policy gradients, PPO, SAC, offline RL)
- **L6** Generative Models (diffusion, flow matching)
- **L7** Sequence Modeling & Transformers
- **L8** World Models (Dreamer/RSSM)
- **L9** Generalist Policies / VLAs
- **L10** Embodied Reasoning & Test-time Scaling
- **L11** Frontier
- **L12** Guest Lectures (Dieter Fox, Pieter Abbeel)
- **Review** section (★ aggregates all quizzes with live scoring, shuffle, group-by-lecture)

### Pedagogical components (CSS classes / patterns)
- `.bridge` — actuarial→RL analogy panels (e.g. annuity recursion ↔ Bellman; credibility Z ↔ learning rate α; control variates ↔ baselines; reparam trick ↔ SAC; importance sampling ↔ PPO ratio). Toggleable via `#bridgeToggle` (adds `body.hide-bridges`).
- `.recap` and `.recap-box` — "In words" plain-English recaps after dense derivations. **NOTE: two slightly different visual styles exist; unifying them is an open polish item.**
- `<details class="dive">` — "Going deeper" collapsibles.
- `.papers` cards, `.resources` boxes.
- `.quiz` with `.q[data-correct]` + `.opt[data-k]` — graded via event delegation on `document`.
- `.meta-strip` with `.chip` (Prereqs / Time / Watch-first / Tools) per lecture.
- `.callout.miscon` — "Watch out for" misconception lists, one per lecture.
- `.xref` — auto-generated cross-reference links ("Lecture N", "(LN)", "the Primer") that jump between sections. Built by a regex auto-linker in the utility script.
- Prev/next pagers via `data-go` attributes.
- Progress bar ("Policy improvement N/12") + per-lecture Mark-Complete buttons, persisted via `window.storage` key `rlc-progress-v1` (with in-memory fallback — **NO localStorage**, see Constraints).

### 29 interactive widgets (inline SVG/Canvas + JS)
All built on a shared global helper object **`window.RLLAB`** (defined in a `<script>` near the KaTeX block). Each widget is an IIFE guarded by `if(!stage)return;`. The widget IDs (`id="lab-XXX"` with `XXX-stage` / `XXX-ctrl` containers):

| Lecture | Widget id | Teaches |
|---|---|---|
| Primer | `disc` | discount factor γ / effective horizon |
| Primer | `arm` | 2-link arm forward kinematics |
| L1 | `paradigm` | decision-flow: which learning paradigm fits |
| L2 | `grid` | gridworld value iteration |
| L2 | `pid` | PID control (Kp/Ki/Kd tuning) |
| L3 | `drift`, `curve` | compounding error funnel; O(εT) vs O(εT²) |
| L3 | `mean` | imitation mode-collapse |
| L3 | `causal` | causal confusion |
| L4 | `bandit` | ε-greedy vs UCB exploration |
| L4 | `mctd` | Monte Carlo vs TD convergence |
| L4 | `triad` | deadly triad (toggle 3 legs → divergence). **Faithful Sutton & Barto two-state construction; diverges only at 3/3.** |
| L5 | `pg` | REINFORCE policy gradient (animated, canvas) |
| L5 | `base` | baseline variance reduction |
| L5 | `clip` | PPO clipping |
| L5 | `gae` | GAE λ-dial |
| L5 | `reparam` | score-function vs reparameterization gradient |
| L5 | `domrand` | domain randomization robustness |
| L6 | `diff` | diffusion denoising (canvas) |
| L6 | `flowode` | flow-matching ODE integration (canvas) |
| L7 | `attn` | attention heatmap over a trajectory |
| L7 | `dt` | Decision Transformer return conditioning |
| L7 | `chunk` | action chunking / receding horizon |
| L8 | `wm` | world-model dream rollout |
| L9 | `xembod` | cross-embodiment transfer (incl. negative transfer) |
| L10 | `saycan` | SayCan: LLM prior × affordance (animated) |
| L10 | `bon` | best-of-N with imperfect verifier (reward hacking) |
| L11 | `worldview` | Sutton/LeCun/Brooks ternary map |
| L12 | `arc` | whole-course synthesis map |

### `window.RLLAB` API (use these when adding/editing widgets)
- `E(tag, attrs)` — create SVG element
- `TX(x, y, str, {anchor, size, weight, fill, base, sans})` — text
- `SVG(parent, w, h)` — create responsive svg (returns the svg node)
- `clr(node)` — clear children
- `ce(tag, cls, txt)` — create HTML element
- `clamp(v,a,b)`, `lerp(a,b,t)`, `randn()` — math helpers
- `slider(host, {label,min,max,step,value,fmt,on})` → `{input, set(v)}`
- `btn(host, label, cls, on)` — button (cls `'primary'` for accent)
- `legend(host, [[color,label]…])`
- `animate(dur, step(easedT), done)` — eased tween (the start of the "manim-grammar" motion layer)
- `C` — color palette: `{orange, cyan, green, red, violet, grid, axis, ink, dim}`

**Widget conventions:**
- SVG/Canvas text uses **Unicode** math (γ, μ, σ², ≈) — NOT LaTeX (KaTeX has already run by the time widgets draw).
- LaTeX (`\( \)` inline, `$$ $$` display) is fine in HTML prose/captions.
- Each widget figure: `<figure class="lab" id="lab-XXX"><figcaption class="lab-cap"><span class="lab-kicker">INTERACTIVE</span>…</figcaption><div class="lab-stage" id="XXX-stage"></div><div class="lab-controls" id="XXX-ctrl"></div><p class="lab-note">…</p></figure>`

### Design tokens (CSS variables)
- `--paper #FAFBFC`, `--ink #161B22`, `--cobalt #2742CC`, `--signal` (orange) `#E8590C`
- `.lab-stage` dark background `#0F1422`
- Fonts: Archivo (sans), Source Serif 4 (serif body), IBM Plex Mono (mono)

### Script load order (IMPORTANT — don't break this)
1. KaTeX `<script src>` (CDN)
2. `RLLAB` helper definition
3. The ~30 per-widget IIFE `<script>` blocks
4. Nav/quiz/progress IIFE (calls `renderMathInElement` on load; handles `data-go`, quiz grading, progress save/load)
5. **UTILITY** script (last before `</body>`): bridge toggle, review-deck population + scoring, cross-reference autolinker, aria-label pass on widget SVGs

---

## 4. Verified course facts (don't re-derive — these were researched & confirmed)

- **12 lectures**, listed above. Course page: `https://cvg.ethz.ch/lectures/Robot-Learning/`
- Lecture slides exist at `https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lectureN_<name>.pdf` but are **image-based (no extractable text)** — content was built from the syllabus + papers + domain knowledge. **This is disclosed honestly on the Start page.**
- ETH recordings: `https://video.ethz.ch/lectures/d-infk/2026/spring/263-5911-00L/...`
- YouTube playlist: `PLPU18BnWYUZJx3_d901-GD6BGpeWwE2vx`
- **Recency-sensitive paper/model names were web-verified as REAL and correctly attributed:** π0 (arXiv 2410.24164, flow matching on PaliGemma), π0.5 (2504.16054), π0-FAST (Pertsch 2025), π*0.6 / RECAP (2511.14759), DSRL/Wagenmaker (2506.15799), Diffuser, IBC, Decision Transformer, Dreamer/RSSM, RT-1/RT-2, OXE, Octo, OpenVLA. The math (policy gradient, baselines/causality, GAE, PPO clip, DDPG/SAC, diffusion ε-loss, flow-matching velocity target, Ross & Bagnell O(εT²)) was audited and is correct.

### ⚠️ Known caveat to verify
Some **course-logistics links were pattern-constructed** during the original build: a GitHub repo (`github.com/mees-robot-learning-course/ethz-course-2026`) and homework paths, plus specific ETH video IDs. They **resolve (HTTP 200)** but the homework folder contents were never visually confirmed. **A fresh agent should click through and confirm these, and fix any that 404.** This is the single biggest open accuracy risk.

---

## 5. Hard constraints (must preserve)

1. **Single self-contained HTML file.** No build step, no external JS bundles. CDN `<link>`/`<script>` for KaTeX + Google Fonts only.
2. **NO `localStorage` / `sessionStorage`.** Persistence uses `window.storage` (key `rlc-progress-v1`) with an in-memory fallback. Browser storage APIs are intentionally avoided (artifact-sandbox compatibility).
3. **Widget SVG text = Unicode, prose math = LaTeX.** (KaTeX runs once on load; widgets draw afterward.)
4. **Every inline `<script>` must pass `node --check`.** Validate after edits (see Dev workflow).
5. **Tag balance + math-delimiter balance** must hold (`$$` even; `\(` count == `\)` count).
6. No literal `</script>` inside JS strings.
7. Widget motion uses the in-file `R.animate` layer — do **not** add GSAP/anime.js/manim (they aren't available in the target sandbox and break the single-file rule).

---

## 6. Suggested dev workflow (for Claude Code)

```bash
# 1. Edit robot-learning-companion.html

# 2. Validate every inline script parses:
python3 - <<'PY'
import re, subprocess
html = open('robot-learning-companion.html').read()
scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)
fails = 0
for i, s in enumerate(scripts):
    open(f'/tmp/c{i}.js','w').write(s)
    r = subprocess.run(['node','--check',f'/tmp/c{i}.js'], capture_output=True, text=True)
    if r.returncode != 0:
        fails += 1; print(f"FAIL block {i}\n{r.stderr[:400]}")
print(f"inline JS: {len(scripts)}  failures: {fails}")
# tag balance
for tag in ['section','figure','figcaption','div','p','script','a','details','summary']:
    o=len(re.findall(rf'<{tag}[\s>]',html)); c=len(re.findall(rf'</{tag}>',html))
    if o!=c: print(f"MISMATCH {tag}: {o}/{c}")
# math + ids
print("$$ even:", html.count('$$')%2==0, "| \\( == \\):", len(re.findall(r'\\\(',html))==len(re.findall(r'\\\)',html)))
stages = re.findall(r'id="([a-z]+)-stage"', html)
print("stages missing JS:", [s for s in set(stages) if f"getElementById('{s}-stage')" not in html])
PY

# 3. For widgets with numeric/simulation logic, smoke-test the math in Node
#    before trusting the visual (e.g. the deadly-triad must diverge ONLY at 3/3 legs).
```

Open the file directly in a browser to eyeball rendering (KaTeX + fonts need network).

---

## 7. Open items / good next steps (not yet done)

These were identified in review rounds but **not yet implemented**:

1. **Verify the constructed course links** (GitHub repo, homework, ETH video IDs); fix 404s. *(Highest priority — accuracy.)*
2. **Unify the two recap styles** (`.recap` vs `.recap-box`) into one visual treatment.
3. **Extend the `R.animate` motion layer** into a full "manim-grammar" toolkit (eased tweens everywhere, fade/grow-in for new elements, SVG "write-on" via `stroke-dasharray`, focus-pulse highlight) and retrofit it across all 29 widgets for consistent motion. Currently only a few widgets animate (e.g. `pg`, `saycan`); most snap between states.
4. **Animated policy-gradient equation-transform (L5)** — morph ∇𝔼[R] term-by-term into the REINFORCE estimator (the most "3b1b-shaped" missing visual).
5. **Derive-it-yourself Bellman widget (Primer Part B)** — the one place that still "tells rather than builds."
6. **Entry-level gaps:** a softmax/temperature mini-primer (used in several widgets); a dynamics (inertia/Coriolis) visual to complement the kinematics-only `arm` widget.
7. **Senior-honesty notes:** explicitly label the `triad`, `bon`, and `xembod` widgets as *schematic toy models* (the triad note should say it's the textbook two-state construction, not a literal DQN).
8. **L12** is the lightest section — could be deepened.
9. **Accessibility/polish:** keyboard nav, "next unfinished lecture" affordance.

---

## 8. File manifest (what's included in this handoff)

- `robot-learning-companion.html` — the complete project (open in a browser to run).
- `PROJECT_BRIEF.md` — this document.

> There are no other source files. The project is intentionally a single HTML file; everything (markup, styles, all 29 interactive widgets, quizzes, navigation) lives inside it.
