# Phase 2 — Content Review Backlog (Task 7)

Consolidated from a senior-researcher (correctness) pass and an entry-level-ML (gap) pass over all 15 sections. User delegated approval ("finish Phase 2 autonomously"), so apply/defer decided here as the harsh-critic gate. The general-clarity lens is folded into application (content was assessed "exceptionally well-scaffolded"; no third pass).

Guardrail: edits are **additive/surgical** (a sentence or clause); no numerics change; KaTeX delimiters and quizzes preserved; build + tests stay green.

## APPLY — correctness (senior)
1. **L5 §5.5 + L4 §4.4 — GAE n-step weight exponent.** Prose states weight `(1−λ)λ^n` on the n-step term; the standard identity is `(1−λ)λ^{n−1}` on the n-step advantage (n=1,2,…). *Correctness-critical.* Fix the exponent in the prose (the `gae` widget note already carries the simplification caveat). 
2. **L4 §4.3 — Q-learning convergence conditions.** "decaying α" → Robbins–Monro (`Σα=∞, Σα²<∞`) AND every state–action visited infinitely often.
3. **L4 §4.4 — deadly-triad overstatement.** Soften "remove any single leg and divergence dies / any two ⇒ safe" to "in this construction, removing any one leg stops *this* divergence," and label it the schematic two-state-style toy (not a theorem, not a literal DQN). (Matches the widget's own schematic note.)
4. **L3 §3.3 — DAgger "regret".** "achieves regret linear in horizon" → "achieves a performance gap linear in horizon, O(εT) (its per-round online-learning regret vanishes)."
5. **Primer Part C — Bellman state-reward form.** Add a clause noting `V(s)=r(s)+γΣP V(s')` is the fixed-policy, state-reward special case (chosen to match the annuity recursion), distinct from Part B's `E[r(s,a)+γV(s')]`.
6. **L9 — OXE counts.** Note 800k/970k are *filtered training subsets* of the 1M+ OXE corpus (so the differing numbers don't read as errors).

## APPLY — entry-level bridges (one sentence each)
7. **Primer Part A — manipulator equation lead-in.** Before the displayed `M q̈ + C q̇ + g = τ`: "Kinematics ignored forces; dynamics reintroduces them. Newton's law for an arm — mass × acceleration = forces — takes this matrix form:". (Also flagged by senior #1.)
8. **L5 §5.2 — log-derivative micro-expansion.** Add the explicit algebra `∫∇P·R dτ = ∫P·(∇P/P)·R dτ = ∫P·∇logP·R dτ`, and "an integral of P(·)×(…) is an expectation over τ∼P."
9. **L6 §6.3 — disambiguate "score".** One clause: here *score* = `∇ₓ log p` (gradient w.r.t. the sample, Stein sense), NOT L5's `∇_θ log π` (w.r.t. parameters) — same word, different variable.
10. **L5 §5.7 — DDPG deterministic gradient.** One sentence: because `a=μ_θ(s)` is deterministic, Q is differentiable through θ by the chain rule — no action-expectation to differentiate, so no score-function trick (the deterministic extreme of §5.2's fork).
11. **L8 §8.3 — RSSM prior/posterior swap.** One sentence: posterior `q(z|h,o)` runs while real observations stream (peeks at o); prior `p(z|h)` takes over in imagination (no o); the KL trains the prior to match the posterior — that swap is what lets you dream forward.

## APPLY — minor (cheap, clearly valuable)
12. L4 §4.4 — Double DQN: half-sentence on "max over noisy estimates picks the luckiest → biased high → bootstrapping compounds it."
13. L2 §2.2 — LQR: half-sentence on why cost-to-go stays quadratic (quadratic V + linear dyn + quadratic cost is closed under the Bellman backup).
14. L10 §10.6 — gloss System-1/System-2 (fast automatic vs slow deliberate — borrowed cog-sci labels).
15. L4 §4.2 — MC unbiased: "(first-visit MC unbiased; every-visit biased but consistent)."
16. L6 §6.2 — InfoNCE one-clause gloss (push true action's energy down, sampled negatives' up — trains E's shape without the normalizer Z).
17. L9 §9.5 — π*0.6 advantage-conditioning: one sentence making the mechanism concrete (label past actions with advantage, feed as a conditioning token like DT's return-to-go; condition on "high advantage" at test).

## DEFER / NO-CHANGE (recorded, not applied)
- Senior #3 (LQR P⪰0), #8 (horizon convention), #11 (PPO 20% gloss — already caveated below it), #12 (SAC tanh Jacobian — optional "going deeper"), #6/#16/#17/#13/#14/#19/#20/#21/#22: verified correct, no change.
- Anything that would change a widget's numerics (out of scope; logic cores are pinned).
