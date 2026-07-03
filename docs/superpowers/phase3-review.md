# Phase 3 — Six-Lens Re-Review (2026-07-02)

Produced by six independent parallel review passes over all 15 sections, all 33 widgets,
`quizzes.js`, and `nav.js`:

1. **General content quality** — structure, balance, quizzes, cross-linking
2. **Entry-level ML engineer** — gap hunt (persona: supervised learning + basic prob/linalg, nothing else)
3. **Senior researcher** — correctness & currency, web-verified as of 2026-07-02
4. **New interactives** — proposals for concepts carried by prose/ASCII alone
5. **Narrative arc** — Karpathy / 3Blue1Brown / Welch Labs standard, every section graded
6. **Widget audit** — all 33 widgets vs the CLAUDE.md checklist; 12 visually spot-checked at
   slider/button extremes via Playwright (Clip, Gae, Base, Arm, Dynamics, Softmax,
   BellmanDerive, Causal, Mean, Bandit, Saycan, Chunk)

Every pass was primed with `phase2-review-backlog.md`; nothing below re-suggests applied
Phase-2 items or re-litigates deferred ones without new grounds.

## Executive verdict

The site is in genuinely strong shape: the senior pass re-derived or spot-checked everything
off the verified-facts list and found **no load-bearing mathematical error**; the narrative
pass graded 8 of 13 arcs A (L3 and L5 are the house template); the widget pass rated a third
of the widgets true 3b1b-grade explanations. Four systemic issues account for most of the
backlog below:

- **Phase-2 seams.** The "additive/surgical" guardrail grafted correct sentences onto
  passages that already made the same point, leaving duplications, 60-word run-ons, and
  paragraphs in the wrong order (worst: L8 §8.3; also L2 §2.2, L4 §4.4, L7 §7.2, L9 §9.5,
  L10 §10.6, L6 §6.3). Found independently by lenses 1 and 5. A single de-seaming pass is
  the highest-value action.
- **The generative-ML prerequisite gap.** The course builds its RL core from zero, but the
  pivot to generative ML (L5 §5.6 → L6–L8) silently assumes KL divergence, entropy,
  importance sampling, and VAE/ELBO — twice with "you know this math" asides addressed to a
  different reader. The Primer covers everything the RL lectures assume and none of what the
  generative lectures assume.
- **Widget wiring debt.** Four widgets inline copies of their pinned logic cores (the cores
  are imported only by their own tests), so the vitest pins do not pin the running code —
  exactly the drift invariant 5 exists to prevent. Plus two visually confirmed label
  overlaps at reachable extremes.
- **L9 currency drift.** The site's knowledge horizon is ~Feb 2026; the field moved Mar–Jun
  2026 almost entirely inside L9's scope (π0.7, Gemini Robotics 1.5, GR00T N1/N2).

## Convergent findings (2+ independent lenses — highest confidence)

| Finding | Lenses | Items |
|---|---|---|
| L7 §7.2 caveat paragraphs are swapped ("stitching" used before defined) | 1, 5 | B3 |
| L4 §4.4 bias–variance block misplaced; duplicates §4.2; breaks triad arc | 1, 5 | B4 |
| L8 §8.3 states the KL/dream point 3×, training block after imagination, DreamerV3 sentence repeats itself, "maximize ELBO" vs minimized loss | 1, 5, 3 | B1 |
| L9 §9.5 π*0.6 sentence has parentheses nested two deep | 1, 5 | B5 |
| L2 §2.2 LQR seam: run-on cost-to-go sentence + K_t pulled from a hat | 1, 5 | B2 |
| L8 is the most under-visualized lecture (WmWidget = dashboard; RSSM prose-only) | 4, 6 | F4, G1 |
| L4 §4.4 triad widget lead-in contradicts the dive's own retraction | 3, (1) | E7 |

---

## A. Functional & invariant P1s

**A1 · StartSection.vue l.93 + `useProgress.js` — progress persistence is broken on the
deployed site, and the Start page describes a deployment that no longer exists.**
`window.storage` is referenced only in `src/composables/useProgress.js`; nothing defines it,
so on GitHub Pages the in-memory fallback always runs and progress silently vanishes on
reload. The Start note ("saved when this page runs inside Claude… artifact storage…") is
false for the primary audience on the first page they read. Two options: (a) revisit
invariant 3 — it was an artifact-era constraint; on GH Pages, `localStorage` is the normal
choice; or (b) keep the constraint and fix the prose: *"Progress you mark here lasts for the
current browser session — treat the checkmarks as a study aid while you work, not a
permanent record."* Decision needed before editing.

**A2 · Four orphaned logic cores (invariant 5).** `driftFunnel.js`, `meanCollapse.js`,
`policyGradient.js`, `ppoClip.js` are imported **only by their own tests**; the widgets
inline identical math instead: DriftWidget.vue:32-34 (rollout walk), MeanWidget.vue:45,50
(Gaussians), PgWidget.vue:90-113 (full REINFORCE update), ClipWidget.vue:46 (clip
objective). Formulas currently match character-for-character, but any widget-side edit
drifts silently. Fix: rewire the four widgets to import their cores. Partial case:
DiffWidget's sampler step-size/noise-decay constants are inline (DiffWidget.vue:92-96).

**A3 · ClipWidget label overlap at ε=0.05 (visually confirmed).** X-axis labels `0.95`,
`r=1`, `1.05` (ClipWidget.vue:41-43, all at `y0+16`) merge into a smear at the slider
minimum. Stagger or hide the outer labels when ε < ~0.1.

**A4 · GaeWidget label overlap at λ=1 (visually confirmed).** Header "GAE λ = 1.00 ·
effective horizon ≈ full episode" (GaeWidget.vue:51, at `y1−8`) sits on the bar tops when
all bars hit the ceiling — and λ=1 is a preset button. Reserve a header band or cap bar
height below the header line.

**A5 · ChunkWidget stride>chunk artifact (visually confirmed).** Sliders allow stride 12
with chunk 4; the executed path then bridges 8-step gaps where no action was planned
(ChunkWidget.vue:54 — `started` flag connects across nulls). Clamp stride ≤ chunk or break
the path at gaps.

**Minor motion/wiring slips (P3, same theme):** SaycanWidget uses `R.animate` (no
reduced-motion path) instead of `tween` (SaycanWidget.vue:59); SoftmaxWidget tweens on every
slider input event, violating "drags stay instant" (SoftmaxWidget.vue:144-149); Flowode
"Re-sample noise" and Paradigm selections are discrete changes with no ease. Dead imports
masking inline duplication: MctdWidget.vue:14 (`trueValues` recomputed inline),
SoftmaxWidget.vue:14 (`entropy`), BellmanDeriveWidget.vue:14 (`solveBellman`),
GridWidget.vue:14 (`STEP_R, ACT, inBounds, nextCell`).

**Clean passes:** no LaTeX in any stage, no `localStorage`/`sessionStorage` anywhere in
`src/`, every simulation widget has a tested core on disk (the failure is wiring, not
absence).

---

## B. De-seaming pass (Phase-2 graft artifacts)

**B1 · L8Section.vue §8.3 (ll.30–37).** The posterior/prior-swap point is made three times;
the training-objective block (33–37) comes *after* the imagination paragraph (31), so the
section reads model → policy training → back to model training. Fix: move the "Concretely,
Dreamer learns five small networks…" block to directly after l.30; cut l.30's final
"Training is a sequential ELBO…" sentence (keep "exactly your VAE machinery, unrolled
through time" as the equations' lead-in). The DreamerV3 sentence opens with "one fixed
configuration spans Atari, control suites, and Minecraft" and ends "…which is what let a
single fixed config span Atari to Minecraft" — end it at "neutralizes one source of that
brittleness." Also (lens 3): "trained to **maximize** a sequential ELBO" is followed by a
loss to *minimize* — write "trained on a sequential ELBO (written below as the loss to
minimize)".

**B2 · L2Section.vue §2.2 (ll.35–36).** Two applied backlog items stacked into one 60+-word
sentence. Replacement: *"Solving backward in time via dynamic programming, the optimal
cost-to-go stays quadratic: \(V_t(x) = x^\top P_t x\), with \(P_t \succeq 0\) (a cost-to-go
is never negative) given by the **Riccati recursion**. Why quadratic forever? Plug a
quadratic \(V\) into the Bellman backup — linear dynamics, quadratic cost, minimize over
\(u\) — and out comes a function still quadratic in \(x\); that closure is what makes LQR
exactly solvable. The optimal control is linear state feedback:"* Plus the K_t rabbit
(lens 5): after "minimizing over \(u\)", add *"— and that minimization is just calculus on
a quadratic: set the \(u\)-gradient of the backup to zero and solve the linear system,
which is where \(K_t\)'s solve-shaped \((R + B^\top P_{t+1}B)^{-1}\) comes from —"*.

**B3 · L7Section.vue §7.2 (ll.39–40).** Swap the two paragraphs — the "honest 2024+ update"
(l.39) references a conceptual worry and uses "stitching" a paragraph before l.40 defines
either. New order: DT mechanism → conceptual caveat (l.40, opening unchanged) → empirical
confirmation, reworked opening: *"And this stopped being just a conceptual worry around
2024 — it's now an empirical result: on tasks that demand stitching (sparse-reward
navigation like AntMaze, where the optimal path must be assembled from fragments of many
suboptimal trajectories), return-conditioned sequence models underperform
dynamic-programming offline methods (IQL, CQL) that bootstrap values. Conditioning
interpolates; bootstrapping composes."* After swapping, trim the now-redundant "can't
stitch" restatement. DtWidget already sits correctly after both.

**B4 · L4Section.vue §4.4 (ll.82–85).** The h4 "The bias–variance spectrum, concretely"
interrupts the deadly-triad arc between Double DQN and the Baird dive, and duplicates §4.2
(which already introduces n-step targets and makes the same GAE forward-reference at l.30).
Fix: move ll.82–85 to the end of §4.2, immediately after `<MctdWidget />`; delete l.30's
"File this away…" sentence (the relocated block's closing says it better); splice onto the
widget with *"You just watched the two endpoints of that ruler race. Now name the points in
between."* §4.4 then runs clean: loss → triad named → stabilizers → Double DQN → dive →
TriadWidget → the continuous-action wall.

**B5 · L9Section.vue §9.5 (l.43).** The RECAP sentence nests parentheses two deep. Promote
to sentences: *"The RECAP recipe: train a value function on mixed-quality experience; label
each past action with its advantage (L5) and feed that label as a conditioning token —
Decision-Transformer DNA, with advantage in place of return-to-go (L7); at test time,
condition on 'high advantage' to elicit better-than-average behavior; add expert
corrections. Result: roughly doubled throughput…"* Consider splitting §9.5's mega-paragraph
at the π0 / π0.5 / π*0.6 boundaries.

**B6 · L10Section.vue §10.6 (ll.45–46).** Verification asymmetry stated twice in adjacent
paragraphs. Merge: end l.45 at "…as hard as the task itself"; keep l.46's new content (why
math/code scaled first; RLHF reward-model gaming), cut its grasp clause, let its closing
"Read … as the question" sentence replace l.45's "Where verification is cheap…rules."

**B7 · L6Section.vue §6.3 (l.39).** A ~120-word six-sentence parenthetical holds the
section's most important content (the score/SDE lens + the applied disambiguation). Drop
the parentheses; make it a paragraph beginning "An equivalent lens: …". (Superseded by C3
if the full §6.3 reorder is done.)

---

## C. Narrative reorders (lens 5; grades: A ×8, B ×5 — weakest arcs below)

**C1 · Primer Part B — the "build it from scratch" widget sits below the equation it claims
to precede.** l.69's "Before we take that equation as given, build it" comes three lines
*after* the Bellman equation and the "Memorize the shape" instruction. Fix: move the h4 +
`<BellmanDeriveWidget />` above l.64; drafted seams — widget intro: *"Before I hand you the
equation these definitions obey, earn it. Below is a tiny 4-state world: only the last
state pays. Click a state to ask 'given what I currently think my successors are worth,
what am I worth?' — repeat until nothing changes. The update you are clicking is the most
important equation in the course."* Post-widget: *"What you just built has a name. Because
returns are recursive (\(G_t = r_t + \gamma G_{t+1}\)), value functions obey the **Bellman
equation**: … Memorize the shape — you just watched it stabilize."* Also give Part B an
opening tension before "Here is the formal frame" (l.58): *"Part A left you with a loop
that fires many times a second. Part B is the bookkeeping that loop needs: if the reward
for an action arrives three hundred steps later, what number should the agent write next to
that action today? Getting that ledger right — coherently, recursively, under uncertainty —
is the entire formal content of Lectures 2–10. Here is the frame they all share."*

**C2 · L2 §2.4 — GridWidget drifted below the proof it was written to precede.** The
widget intro (l.62) says "proof in the **next panel**" but the proof is above it. Move the
h4 + `<GridWidget />` to after the value/policy-iteration paragraph (l.49), before "Why
does value iteration converge…". Rewritten seams — widget intro: *"Before asking why this
must converge, watch it converge. … Watch value bleed outward from the goal, one ring per
sweep — and notice the thing that needs explaining: the values don't oscillate or wander;
every sweep visibly tightens them. That regularity is the theorem of the next paragraph,
the \(\gamma\)-contraction, made visible."* Contraction paragraph, new opening: *"Why did
that outward propagation settle so obediently, from any initialization? Because the Bellman
optimality operator \(\mathcal T\) is a \(\gamma\)-contraction in the sup-norm:"*

**C3 · L6 §6.3 — diffusion's central move is recipe-first; the mechanism hides in a
parenthetical.** "You've learned the distribution" is asserted three times before the
score-lens explanation arrives (l.39, inside the parenthetical of B7), while the widget
intro (l.48) contains exactly the right intuition — after everything. Reorder to intuition
→ widget → training recipe. Drafted opening (abridged; lens 5 has the full two paragraphs):
*"Rungs 1–4 each changed what the network outputs. Diffusion changes what the network*
does. *Recall the two islands of valid demo actions from Lecture 3… suppose the network
emitted a* direction*: given any candidate action, the arrow \(\nabla_a \log p(a\mid o)\)
toward more-plausible ones… Two obstacles: far from the data the arrows are undefined, and
we'd need to learn them everywhere. Noise fixes both at once… The miracle is what 'learn
the arrows' costs: at blur level \(k\), the arrow pointing back toward the data is (up to
scale) just the noise you mixed in — so training is a regression: noise an action yourself,
ask the network to name the noise."* Then the closed form and ε-loss as the implementation;
`<DiffWidget />` right after the intuition; shrink l.39's parenthetical to the score-vs-score
disambiguation (preserve backlog item 9) + the "useful simplification" caveat.

**C4 · L5 §5.7 — SAC formula-before-motivation (spot).** Insert before the entropy
objective: *"DDPG and TD3 explore by bolting hand-tuned noise onto a deterministic actor —
a schedule the objective knows nothing about, and the source of much of the brittleness
just described. SAC's move: make exploration part of the objective itself, by paying the
policy for staying random:"*

**C5 · Spot fixes.** L8 meta-strip chip says "the imagination-rollout lab (§8.5)" but the
only widget is in §8.3 → "the trust-a-dream lab (§8.3)". L10 §10.5: pull ICRT's mechanism
up from the paper card into the prose: *"— an ability that emerges only because training
spans many tasks, forcing the model to infer 'which task is this?' from the prompt rather
than memorize any one."* L5 §5.2: the REINFORCE-code dive forward-references §5.3/§5.4 —
move it to just after §5.4's BaseWidget, where its "delete the normalize-G line" punchline
lands on built context (also fixes L5's one pacing lump: four consecutive fold/lab panels).

---

## D. Entry-level bridges (lens 2; persona: supervised learning only)

The RL core (Primer, L2–L5 §5.5) needs nothing. The generative pivot needs these, at first
use (no Primer restructuring required):

**D1 · P1 · L6 §6.2 Rung 4 — VAE/ELBO assumed wholesale** ("the standard ELBO… You know
this math" — false for the persona; load-bearing for ACT (L7) and Dreamer (L8)). Insert:
*"(Never met a VAE? Two networks: an encoder \(q(z|x)\) compresses a datapoint into a small
random code \(z\); a decoder \(p(x|z)\) reconstructs it. Maximizing \(\log p(x)\) directly
is intractable — it hides an integral over every possible \(z\) — so you maximize the ELBO
(Evidence Lower BOund), a tractable stand-in: reconstruction log-likelihood minus a KL
penalty keeping codes near a standard Gaussian. Reconstruct well ⇒ \(z\) captures the data;
codes near Gaussian ⇒ you can sample fresh \(z\) at test time. A conditional VAE (CVAE)
feeds an extra input — here the observation — to both networks.)"* Also L8 §8.3: after
"maximize a sequential ELBO" add "(equivalently, minimize the loss below)" — merges with B1.

**D2 · P1 · L5 §5.6 — the PPO ratio appears from nowhere** (importance-sampling
justification lives only in the toggleable bridge). Insert after defining \(r_t\): *"Why a
ratio? Two observations. First, samples from \(\pi_{\theta_{\text{old}}}\) can still
estimate expectations under \(\pi_\theta\) if each sample is reweighted by how much likelier
the new policy makes it — that weight is \(r_t\) (statisticians call this importance
sampling), and it's what lets one batch of rollouts survive several gradient epochs. Second,
the surrogate \(\mathbb E[r_t(\theta)\hat A_t]\) has exactly §5.4's gradient where it
matters: \(\nabla_\theta r_t = r_t\nabla_\theta\log\pi_\theta\), and at
\(\theta=\theta_{\text{old}}\), \(r_t=1\) — so its gradient there is
\(\mathbb E[\nabla\log\pi\cdot\hat A]\). PPO clips that surrogate:"* Also expand TRPO once.

**D3 · P2 · L5 §5.6 — KL divergence never defined** (recurs in L8's loss, L11). One
parenthetical at first prose use: *"(KL divergence, if new: the standard measure of how
different two distributions are, \(\mathrm{KL}(p\Vert q)=\mathbb E_{x\sim p}[\log p(x)-\log
q(x)]\ge 0\), zero only when they match; asymmetric, so not a true distance. You already
use it implicitly — cross-entropy = entropy + KL.)"*

**D4 · P2 · L6 §6.2 Rung 3 — energy ↔ probability keystone missing.** Insert before "Train
contrastively": *"An energy is an unnormalized negative log-probability: define
\(p(a|o)=e^{-E_\theta(o,a)}/Z(o)\), so low energy ⇔ plausible action and the policy's
argmin is the distribution's mode. The catch is the denominator:"*

**D5 · P2 · L5 §5.7 — reparameterization mechanism unstated; \(\odot\) undefined.** Insert:
*"(\(\odot\) = elementwise product.) The point: the randomness now lives entirely in
\(\varepsilon\), which contains no \(\theta\) — given a draw of \(\varepsilon\), the action
is an ordinary differentiable function of \(\theta\), so gradients flow from \(Q_\phi\)
through \(a\) into \(\mu_\theta,\sigma_\theta\) by plain backprop."* And in the §5.2 dive:
"you know from VAEs" → "you may know from VAEs".

**D6 · P2 · L5 §5.7 — entropy \(\mathcal H\) undefined; the jump to \(\alpha\log\pi\)
unexplained.** Insert after the objective: *"(\(\mathcal H(\pi(\cdot|s))=\mathbb
E_{a\sim\pi}[-\log\pi(a|s)]\) — expected surprise: spread-out policy, high entropy. That
definition is why the actor loss below reads \(\alpha\log\pi-Q\): per sampled action the
bonus is \(-\alpha\log\pi\), negated because we minimize.)"*

**D7–D15 · P2/P3 quick glosses** (drafted text in lens-2 report, preserved here abridged):
- **L3 §3.2**: \(J(\cdot)\) used two lectures before defined — add *"(writing \(J(\pi)\)
  for the policy's expected total reward over an episode — the Primer's objective in one
  symbol; Lecture 5 adopts it officially)"*.
- **L2 §2.2**: flag the control dialect switch — *"Control theory's dialect first: state is
  \(x\) (the Primer's \((q,\dot q)\)), the action is called the control \(u\), and instead
  of maximizing reward we minimize cost \(c\) — the same problem with the sign flipped."*
- **L7 §7.1**: gloss token/QKV — *"(a token = one slot in the input sequence, embedded as a
  vector — a word-piece in an LLM; here one state, one action, or one image patch.
  \(Q,K,V\) stack those vectors as rows; \(\sqrt d\) merely rescales dot products so the
  softmax doesn't saturate.)"*
- **L7 §7.2**: worked return-to-go stream — *"a three-step episode with rewards
  \(r=(1,0,2)\) has returns-to-go \(\hat R=(3,2,2)\), so the training stream reads
  \((3,s_0,a_0,\;2,s_1,a_1,\;2,s_2,a_2)\)… prompt 3 and the model emits the actions that,
  in the data, tended to follow a promise of 3."*
- **L5 §5.5**: the one-line proof that \(\delta_t\) is unbiased for \(A^\pi\):
  \(\mathbb E[\delta_t\mid s_t,a_t]=r+\gamma\,\mathbb E[V^\pi(s_{t+1})]-V^\pi(s_t)=Q^\pi-V^\pi=A^\pi\).
- **L3 §3.1**: show Gaussian-MLE = MSE:
  \(\log\mathcal N(a;\mu_\theta(s),\sigma^2 I)=-\lVert a-\mu_\theta(s)\rVert^2/2\sigma^2+\text{const}\).
- **L4 watch-out box**: "critic" used a lecture early — *"A learned value function (L5 will
  name it the 'critic') doesn't pick actions — it evaluates them."*
- **L9 §9.3**: gloss LoRA — *"(LoRA: freeze the pretrained weights and train tiny low-rank
  correction matrices inserted into each layer — fine-tuning at a small fraction of the
  parameters and memory)"*.
- **L10 §10.2**: gloss affordance — *"('affordance' — robotics-speak for what the current
  scene physically lets you do; here, each skill's estimated success probability from the
  current observation.)"*

---

## E. Correctness & currency (lens 3; verdict: no load-bearing math errors)

**E1 · P2 ERROR · L3 §3.2 — BC bound's sign is backwards under the site's own return
convention.** Everywhere else \(J\) means expected return, under which
\(J(\pi_{\text{BC}})-J(\pi^*) \le 0\); Ross & Bagnell state the bound in **cost**. Fix:
write \(J(\pi^*) - J(\pi_{\text{BC}}) \le O(\epsilon T^2)\), or keep the order and add
"(here \(J\) is total cost, Ross & Bagnell's convention)". (Distinct from the deferred
horizon-convention item.) Note E1 interacts with D7 (which glosses \(J\) as *reward*) —
apply together.

**E2 · P2 ERROR · L6 §6.5 + quizzes.js l6-3 — DSRL's advantage misattributed to
dimensionality.** The latent noise has the *same* dimension as the action chunk it decodes
(112-D for a 16×7 chunk — larger than the raw 7-D action space); the real benefits are
demo-shaped support, black-box access, off-policy efficiency (arXiv 2506.15799). Fix:
"…same dimension as the action chunk, but every point decodes to a plausible, demo-like
action — hardware-safe exploration with only black-box access to the frozen policy." Quiz
l6-3 option A: "low-dimensional" → "demo-shaped".

**E3 · P1 STALE · L9 §9.5 (+ table + Start glossary) — the π line ends at π*0.6; π0.7
shipped April 2026** (arXiv 2604.15483; operates an espresso machine zero-shot at a level
matching RL-finetuned specialists, reframing §9.5's espresso-as-RECAP showcase). Append:
*"**π0.7 (April 2026)** pushes the arc one step further: a steerable generalist showing the
first signs of *compositional* generalization — recombining trained skills under
plain-language coaching in unseen kitchens — and doing zero-shot what π*0.6 needed
experience-RL to reach, e.g. espresso-machine operation out of the box."* Plus a table row
and glossary mention.

**E4 · P2 MISSING · L9 §9.3–9.4 + L10 §10.4 — no post-2023 Google DeepMind, no NVIDIA.**
Gemini Robotics 1.5 (arXiv 2510.03342: multi-embodiment VLA that thinks before acting +
GR-ER 1.5, motion transfer across ALOHA/Franka/Apollo) is the flagship instance of both
L9's cross-embodiment thesis and L10 §10.4's embodied chain-of-thought. NVIDIA GR00T N1
(arXiv 2503.14734) → N2 (GTC 2026; jointly predicts actions *and* next observations)
converges on L8's world-action-model thesis. Fix: one sentence/table row in L9 §9.3, one
clause in L10 §10.4, optional GR00T clause near the open-models discussion.

**E5 · P3 · L5 §5.3 — the reward-to-go gradient silently drops the \(\gamma^t\) weight**
relative to §5.1's objective (standard practice; cf. Nota & Thomas, arXiv 1906.07073). One
parenthetical: *"(strictly, each term inherits a \(\gamma^t\) weight from the discounted
objective; standard practice — and every implementation, including ours below — drops it)"*.

**E6 · P3 STALE · L11 §11.1 — JEPA is no longer only a blueprint.** V-JEPA 2-AC (June
2025, arXiv 2506.09985): ~1M hours video pretraining + 62h unlabeled DROID → zero-shot
MPC-style pick-and-place on real Frankas. One clause keeps the LeCun corner honest.

**E7 · P3 OVERSTATED · L4 §4.4 TriadWidget lead-in — contradicts the dive's own
retraction** (new grounds: the two paragraphs now disagree on the page). Fix: "Remove any
single leg and — in this construction — the divergence dies," and soften "only when all
three legs are present". Merges with B4's §4.4 cleanup.

**E8 · P3 MISSING · L5 §5.8 — sim-to-real arsenal omits real-to-sim system
identification** (measure/fit masses, frictions, latencies; ANYmal's actuator nets —
Hwangbo et al., Science Robotics 2019 — are ETH heritage). One clause: *"…and *real-to-sim
system identification*: measure or fit reality's parameters (even training a small network
to mimic the actuators, as in ANYmal's actuator nets) so the randomized family is centered
on the truth."*

Checked and clean (for the record): manipulator equation/Jacobian, PID/LQR/Riccati gain,
sup-norm contraction, \((I-\gamma P^\pi)^{-1}\), first-visit MC, Robbins–Monro, Double-DQN
Jensen, PPO/TRPO semantics, DDPG/TD3/SAC + tanh Jacobian, diffusion score relation,
RSSM/ELBO, DT/ACT/ALOHA numbers, RT-1/RT-2/OXE/Octo/OpenVLA/Gato figures,
SayCan/Voyager/ICRT/Eureka/HIL-SERL, L11 worldviews, all 38 quiz answers, DreamZero
(arXiv 2602.15922 — real), Ted Xiao @ Project Prometheus, Dieter Fox @ UW+AI2, Archit
Sharma @ GDM, L10 paper attribution (Chen et al. with Mees).

---

## F. Existing-widget upgrades (lens 6; dashboard → explanation)

Strongest five (the bar): BellmanDerive, Diff, PgTransform, Pg, Chunk. Weakest, worst-first
(the ONE upgrade each):

**F1 · P1 · CausalWidget** — pure dashboard, visually confirmed: two bars lerping between
four hardcoded constants (`incl ? 1.0 : 0.92` / `incl ? 0.06 : 0.86`,
CausalWidget.vue:28-46); the mechanism exists only in captions. Upgrade: draw the causal
graph (pedestrian → expert-brakes → brake-light) with the policy's learned arrow visibly
attaching to the brake-light during training, then a deploy timeline where the light never
illuminates so the car never brakes; removing the feature animates the arrow re-attaching
to the pedestrian.

**F2 · P2 · XembodWidget** — constants + closed form restating the note
(XembodWidget.vue:46-67). Upgrade: embodiments' data pools as discs whose pairwise overlap
= the shared-structure slider, overlap region visibly flowing into the target robot's bar;
at low overlap the flow thins to nothing (negative transfer).

**F3 · P2 · BonWidget** — outcome-only curve (BonWidget.vue:57-68); the verifier picking a
fluent failure is never shown. Upgrade: scatter N candidates on a true-quality ×
verifier-score plane and circle the argmax-by-verifier; with a weak verifier one Resample
visibly lands the circle on a high-score/low-truth point — reward hacking, watched once.

**F4 · P2 · WmWidget** — two closed-form exponentials; the compounding process is not
enacted (DriftWidget already shows the mechanism for BC). Upgrade: a rollout fan — imagined
trajectories diverging from the real one, latent narrow / pixel wide; the trustworthy zone
is where the fans still hug the real line. (Complementary to G1, which shows the
belief-update mechanism.)

**F5 · P2 · DtWidget** — closed-form curve; "leaving the support" is a color change at
`MAX_DATA`, not data. Upgrade: scatter the dataset's return dots under the axis so support
literally runs out where the curve turns red.

**F6 · P2 · BaseWidget** — visual/prose mismatch confirmed: framing promises bars that
"split" as b slides, but sign comes from `scoreᵢ` not `Rᵢ−b` (BaseWidget.vue:36-39); the
two real claims live in numeric readouts. Upgrade: a variance-vs-b curve with a dot riding
it (dip at b*≈mean becomes shape) + a mean-gradient needle that conspicuously refuses to
move. Fix the L5 framing sentence to match.

**F7 · P2 · SaycanWidget** — the multiplicative gate rendered as 9.5px side-numbers
(SaycanWidget.vue:50-51, confirmed); single binary control; `R.animate` (no reduced-motion).
Upgrade: each row as two thin factor bars (say × can) visually multiplying into the product
bar — toggling the sponge visibly crushes the *can* factor; switch to `tween`.

**F8 · P2 · CurveWidget** — closed-form polylines; the *reason* for T² is prose-only.
Upgrade: at the marker, draw the triangular stack of per-step damages (height T−t) filling
under the BC curve — the triangle's area visibly *is* εT².

**F9 · P3 · DynamicsWidget** — per-joint bar normalization is misleading (equal torques
render at different lengths, confirmed; DynamicsWidget.vue:205); sign is text-only; dead
`TAU_SCALE`. Upgrade: one shared N·m scale diverging from a zero line, or torque arcs at
the joints with radius ∝ magnitude.

**F10 · P3 · SoftmaxWidget** — mechanism invisible (logits never drawn); tween-on-drag;
unused `entropy` import. Upgrade: ghost logit bars behind the probability bars — order
preserved, gaps amplified/erased as T moves; make the slider instant.

**F11 · P3 · AttnWidget (borderline)** — affinities are opaque pseudo-random, so "*why*
does query 11 attend to key 2?" is unanswerable. Upgrade: hover reveals the selected row's
query–key match bars.

---

## G. New interactives (lens 4; ranked; ⭐ = "if you build only these")

Coverage: saturated — Primer (5), L5 (7), L3 (4); starved relative to conceptual density —
**L8** (1), **L9** (1), **L11** (1); point gaps — L2 has no lab *on* LQR, L7 §7.5
tokenization is prose-only.

**G1 ⭐ · "Filter, then dream" (L8 §8.3, after the ELBO recap box).** Question: what changes
inside the model when it stops observing and starts imagining? Manipulate: drag the
observe→dream boundary; toggle prior quality; resample. Visible: belief mean + uncertainty
band snapping tight after each observation tick, then ballooning past the boundary;
untrained prior explodes immediately. Takeaway: *"The posterior corrects with each
observation; the prior must predict without one — the KL term trains the prior to imitate
the posterior, and that hand-off is what lets Dreamer train a policy inside a dream."*
SVG; core: pinned random walk + one-line Kalman-style blend + prediction-only variance
growth. **M**.

**G2 ⭐ · Tokenization: what 256 bins cost (L7 §7.5; serves L9's RT-2/OpenVLA rows).**
Question: when actions become tokens, what exactly is lost? Manipulate: bins/dim (2→256,
log); independent-marginals vs joint toggle. Visible: correlated 2-D action ridge snapping
to grid centers (quantization error climbs); marginals mode shows the product distribution
as a checkerboard cross with mass in corners no demonstrator ever visited. Takeaway:
*"Binning buys a language-model vocabulary at two prices — precision quantized by the grid,
and per-dimension factorization that invents action combinations outside the data;
continuous diffusion/flow heads exist to refund both."* SVG heatmap; core: pinned 2-D
Gaussian ridge, quantize, joint vs outer-product histograms. **M**.

**G3 ⭐ · The n=20 eval: an underpowered coin flip (L11 §11.2, after the Evaluation
paragraph).** Question: can 20 trials tell an 80% policy from a 90% one? Manipulate:
trials/policy (10→500, log); true rates; rerun. Visible: two Wilson CIs overlapping
massively at n=20, "paper verdict" readout flipping between reruns with a
how-often-wrong tally; required-n lands in the hundreds. Takeaway: *"At the field's typical
20 trials, the difference between a demo and a breakthrough is inside the error bars —
evaluation, not modeling, is the binding scientific constraint."* SVG; core: binomial +
Wilson + min-n. **S** — highest insight-per-effort; aimed at the actuarial reader.

**G4 · LQR: watch the optimizer choose the gains you hand-tuned (L2 §2.2, after `u=−Kx`).**
One slider `log(q/r)`; same visual grammar as PidWidget; live Riccati-derived K readout;
nothing to tune and no way to make it ring — that's the point. Takeaway: state one number
and the Riccati recursion hands you the gains you tuned by feel in the PID lab; its
cost-to-go is the course's first value function. Core: 2-state discrete Riccati + rollout.
**M**.

**G5 · Q-learning crawls where value iteration sweeps (L4 §4.3, after ε-greedy).** Same
gridworld language as L2's GridWidget, but values fill patchily along visited corridors;
at ε=0 it locks onto the first decent corridor and the far side never learns — "visited
infinitely often" failing before your eyes. Core: tabular Q-learning over
`gridValueIteration.js`'s pinned grid. **M/L**.

**G6 · The forward process: where the training signal comes from (L6 §6.3, before the
ε-loss).** Noise-step slider k; a bimodal action density (L3's left/right modes) melting
into one Gaussian as k rises, sampled points carrying ε-prediction target arrows — crisply
bimodal at low k, unimodal at high k. Takeaway: training never denoises; it's regression to
name the noise at every blend level, and the learned score belongs to the *noised*
distribution. **S/M**. Pairs naturally with C3's reorder.

**G7 · Hindsight relabeling: manufacturing supervision from play (L9 §9.2).** Drag a window
along one meandering play trajectory; endpoint sprouts a goal flag; harvest sweeps the
window and the demo counter spins to hundreds from one trajectory vs "scripted collection:
3 demos". **S/M**.

**G8 · Why max over noisy guesses lies upward (L4 §4.4, after Double DQN).** N equal-value
actions, noisy estimates, argmax overshoot accumulating in a bias bar; Double-DQN toggle
(independent evaluation draw) collapses the bias, not the noise. **S**.

**G9 · DAgger mechanically: the funnel tightens (L3 §3.3, replacing/augmenting FIG 3.1).**
Round-by-round: expert labels appear on drifted states, coverage band widens, next bundle
hugs tighter; per-round max-drift falls geometrically. **M**. (L3 already best-served —
mid-priority.)

**G10 · Thinking at 50 Hz (L10 §10.4).** Thinking budget (tokens→ms) vs world speed; delayed
actions lag then oscillate; success-vs-budget curve has an interior optimum sliding left as
the world speeds up. **M**.

**Static-figure upgrades:** Primer FIG P1 (perception–action loop — the site's first figure
is box-drawing ASCII; redraw as house-styled SVG, optional slow pulse around the loop) and
L3 FIG 3.1 (DAgger loop — subsumed by G9, or minimally an SVG cycle with "who does what"
callouts). Correctly left as-is: the L4/L5 code listings, L1/L9 tables.

---

## H. Quizzes & furniture (lens 1)

**H1 · P1 · quizzes.js — L12 has one question; its two arcs untested.** Add e.g.:
"Abbeel's apprenticeship-learning work with Ng is the intellectual grandparent of which
course thread?" (correct: L3 imitation) and "Fox's *Probabilistic Robotics* lineage —
Bayesian filtering, belief tracking — most directly anticipates which modern component?"
(correct: the RSSM's learned latent belief state, L8). Update the "all 38 self-check
questions" header comment.

**H2 · P2 · quiz coverage gaps.** (1) Flow matching (L6 §6.4 + FlowodeWidget, π0's action
head) unquizzed — "Why did π0 choose a flow-matching head over diffusion for 50 Hz
control?" (near-straight ODE paths → few function evals). (2) Deadly triad — "DQN's target
network addresses which instability, specifically?" (3) Primer has three questions, none on
Part B's core objects — add a γ-as-effective-horizon (\(1/(1-\gamma)\)) question. L6-2 and
L7-2 both quiz chunking; l6-2 is the natural swap-out.

**H3 · P2 · L11 §11.2 — the last three ledger items crammed into one paragraph** (Data,
Evaluation, Reliability each get a full one). Split Long-horizon/Touch/Humanoid into three
paragraphs; connect continual learning to Voyager's skill library (L10) and touch to the
Primer's contact thesis. ~15 lines closes L11's density gap. (G3's eval widget lands here
too.)

**H4 · P3 · resource-promise breaks.** L1 has no papers-decoded block; L10's resources have
no Recording line (course page lists none — link audit) — both silent, unlike L11's
exemplary note. Fix with one explanatory line each, L11-style.

**H5 · P3 · L7 l.55 — wrong cross-reference** "the bias–variance dial of §7.1" → the
tradeoff lives in the Watch-out box / §7.3. **H6 · P3 · L5 ll.200–201** — L5 is the only
lecture whose quiz gets a numbered heading ("§5.11 Self-check"); delete the h3 to match the
other eleven. **H7 · P3 · Primer** — only section without a meta strip (no time estimate).

---

## Suggested sequencing

1. **A-block** (functional/invariant: storage decision, core rewiring, confirmed overlaps,
   Chunk clamp) — mechanical, testable, no content risk.
2. **B-block de-seaming + C-block reorders** — one prose editing pass, section by section
   (B and C touch the same files; do L4 (B4+E7), L8 (B1+D1's tail), L2 (B2+C2), L6 (B7 or
   C3+G6), L7 (B3), L9 (B5+E3), L10 (B6) together).
3. **D-block bridges + E-block corrections** — additive sentences, low risk; apply E1 with
   D7.
4. **H-block quizzes/furniture** — quick wins.
5. **F/G widget work** — F1 (Causal) and the ⭐ trio G1–G3 first; each new widget needs a
   pure core + pinned test per invariant 5.

Full lens reports (verbatim agent outputs) were not preserved separately; this document is
the consolidated record.

---

## Implementation status (2026-07-03, branch `phase3-uplift`)

All blocks applied across three commits (prose pass; widget pass; audit fixes). A
three-way final audit (spec compliance, content seams, browser functional/visual pass)
verified: every item present or consciously deviated, zero console errors, quiz system
and localStorage persistence working. Approved deviations: Gemini Robotics table row
skipped (sentence only); L1 papers note uses neutral phrasing; BonWidget note/framing
switched to the numerically honest rise-peak-decline story; DriftWidget adopted the
core's t=0-on-demo-line semantics; quiz count is now 42. Known cosmetic non-issue:
DynamicsWidget's arm crosses the decorative ground hatching at extreme joint angles.
