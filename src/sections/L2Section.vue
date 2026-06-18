<template>
  <section class="lecture" id="l2" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 02 · FEB 23</span>
      <h2>Robot Control &amp; MDPs</h2>
      <p class="dek">From feedback control through optimal control (LQR) to the Markov Decision Process — the formal language every later lecture is written in — and the dynamic programming algorithms that solve it exactly when the model is known.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> linear algebra · basic probability</span>
      <span class="chip"><b>Time</b> ~45 min</span>
      <span class="chip"><b>Watch first</b> §2.4 + the value-iteration lab</span>
      <span class="chip"><b>Tools</b> none — paper &amp; the lab</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>The reward is <em>not</em> the goal — it's a proxy you designed. Reward ≠ task, and the gap is where things go wrong (§2.5).</li>
        <li>A known model (LQR/MPC) is frequently better than learning — don't reach for RL reflexively.</li>
        <li>\(V\) and \(Q\) are <em>expectations</em>, not guarantees about any single episode.</li>
      </ul>
    </div>

    <h3><span class="knum">2.1</span>Feedback control: the floor everything stands on</h3>
    <p>Before any learning: how do classical engineers make a motor follow a target? <strong>Feedback.</strong> Measure error \(e(t) = q_{\text{target}} - q(t)\), command effort against it. The PID controller:</p>
    <p>$$\tau(t) = K_p\, e(t) + K_i \int_0^t e(s)\,ds + K_d\, \dot e(t)$$</p>
    <p>Proportional pushes toward the target, integral kills steady-state offset, derivative damps overshoot. No model required — which is why PID runs the world's machinery. Its limit: it's <em>reactive</em> and single-axis; it doesn't anticipate dynamics, coordinate joints optimally, or trade off competing goals. For that, we make control an <strong>optimization problem</strong>.</p>

    <h4>Tune the three gains and feel the tradeoffs</h4>
    <p>PID is three knobs, and the only way to understand them is to turn them. Below, a mass must reach the dashed target line; the controller pushes it using the error, the error's integral, and its derivative. Crank \(K_p\) and it gets there faster but overshoots and rings; add \(K_d\) and the ringing damps out; if it settles just short of the line, a touch of \(K_i\) erases that steady-state gap. Push any one too far and watch it go unstable — the entire art of classical control, in one plot.</p>
    <Lab
      id="pid"
      title="PID control: the three gains, felt"
      :note="`\\(K_p\\) = how hard to push on the current error (fast but oscillatory), \\(K_d\\) = push against the rate of change (damping), \\(K_i\\) = accumulate past error (kills the final offset). The dashed line is the target; the curve is the response over time. There's no single right answer — only tradeoffs, which is exactly why the next step is to make it an optimization (LQR).`"
    />

    <h3><span class="knum">2.2</span>Optimal control and LQR: control as optimization</h3>
    <p>Pose the goal as minimizing cumulative cost over a horizon, subject to dynamics:</p>
    <p>$$\min_{u_0,\dots,u_{T-1}} \sum_{t=0}^{T-1} c(x_t, u_t) \quad \text{s.t.}\quad x_{t+1} = f(x_t, u_t)$$</p>
    <p>The crown-jewel solvable case is the <strong>Linear Quadratic Regulator</strong>: linear dynamics \(x_{t+1} = A x_t + B u_t\), quadratic cost \(c = x^\top Q x + u^\top R u\) (\(Q\): how much you hate state error; \(R\): how much you hate effort). Solving backward in time via dynamic programming, the optimal cost-to-go stays quadratic, \(V_t(x) = x^\top P_t x\), with \(P_t\) given by the <strong>Riccati recursion</strong>, and the optimal control is <em>linear state feedback</em>:</p>
    <p>$$u_t = -K_t\, x_t, \qquad K_t = (R + B^\top P_{t+1} B)^{-1} B^\top P_{t+1} A$$</p>
    <p>Three lessons to carry forward. (1) <strong>Cost-to-go is a value function</strong> — LQR's \(V_t(x)\) is the exact ancestor of RL's \(V(s)\), and the backward Riccati sweep is Bellman recursion in closed form. (2) Nonlinear systems are handled by iteratively linearizing around a trajectory (iLQR) or re-solving a short horizon every step (<strong>MPC</strong>, model-predictive control — plan, execute one step, replan). (3) All of it presumes \(f\) is known. <em>Unknown or unmodelable \(f\) is the door RL walks through.</em></p>

    <h3><span class="knum">2.3</span>The MDP: optimal control meets probability</h3>
    <p>Generalize: stochastic dynamics, general rewards, infinite horizon. A <strong>Markov Decision Process</strong> is the tuple \((\mathcal S, \mathcal A, P, r, \gamma)\): states, actions, transition kernel \(P(s'|s,a)\), reward \(r(s,a)\), discount \(\gamma\). The <strong>Markov property</strong> — the future depends on the past only through the current state — is what makes recursion (and hence everything) work. Objective: find \(\pi\) maximizing \(V^\pi(s) = \mathbb E[\sum_t \gamma^t r_t \mid s_0 = s]\).</p>
    <p>Two Bellman equations to internalize. For a <em>fixed</em> policy (evaluation):</p>
    <p>$$V^\pi(s) = \sum_a \pi(a|s)\Big[r(s,a) + \gamma \sum_{s'} P(s'|s,a)\,V^\pi(s')\Big]$$</p>
    <p>And the <strong>Bellman optimality equation</strong>, where evaluation becomes choice:</p>
    <p>$$V^*(s) = \max_a \Big[r(s,a) + \gamma \sum_{s'} P(s'|s,a)\,V^*(s')\Big]$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;the best you can do from a state is: pick the action that maximizes immediate reward plus the discounted best-you-can-do from wherever it lands you. The value of a state is defined in terms of the values of its successors — a recursion, not a forecast.</p>
    <p>A foundational (and lovely) fact: every finite MDP has at least one optimal policy that is <em>deterministic and stationary</em>, and acting greedily with respect to \(Q^*\) — \(\pi^*(s) = \arg\max_a Q^*(s,a)\) — is optimal. Knowing \(Q^*\) means the decision problem is solved by a lookup.</p>

    <h3><span class="knum">2.4</span>Solving a known MDP: dynamic programming</h3>
    <p><strong>Value iteration</strong> turns the optimality equation into an update: \(V_{k+1}(s) \leftarrow \max_a [\,r(s,a) + \gamma \sum_{s'} P(s'|s,a) V_k(s')\,]\), repeated until convergence. <strong>Policy iteration</strong> alternates full evaluation of the current policy (solve the linear system above) with greedy improvement \(\pi_{k+1}(s) = \arg\max_a Q^{\pi_k}(s,a)\); the <strong>policy improvement theorem</strong> guarantees each step is no worse, so it climbs monotonically to \(\pi^*\) in finitely many steps.</p>
    <p>Why does value iteration converge, from any initialization? Because the Bellman optimality operator \(\mathcal T\) is a <strong>\(\gamma\)-contraction</strong> in the sup-norm:</p>
    <p>$$\lVert \mathcal T V - \mathcal T W \rVert_\infty \le \gamma\, \lVert V - W \rVert_\infty$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;one sweep of the Bellman update shrinks the worst-case error in your value estimate by at least a factor of \(\gamma\). Repeat and the error is crushed geometrically toward zero — so the iteration must converge to one specific answer, regardless of where you started.</p>
    <p>By the Banach fixed-point theorem, \(\mathcal T\) has a unique fixed point — \(V^*\) — and iteration converges geometrically at rate \(\gamma\). This is the cleanest theorem in the course; savor it, because the moment we replace tables with neural networks (L4), the contraction guarantee evaporates and stability becomes an empirical art.</p>

    <details class="dive"><summary>Going deeper: proof of the contraction (it's four lines)</summary><div class="dive-body">
      <p>For any \(s\): \(\;|\mathcal T V(s) - \mathcal T W(s)| = \big|\max_a [r + \gamma \mathbb E_{s'} V(s')] - \max_b [r + \gamma \mathbb E_{s'} W(s')]\big|\).</p>
      <p>Using \(|\max_a f(a) - \max_a g(a)| \le \max_a |f(a) - g(a)|\), this is at most \(\max_a \gamma\,\big|\mathbb E_{s'|s,a}[V(s') - W(s')]\big| \le \gamma \max_{s'} |V(s') - W(s')| = \gamma \lVert V - W\rVert_\infty\). Take the sup over \(s\). ∎</p>
      <p>Note what powered it: \(\gamma &lt; 1\) and the expectation being an average (so it can't exceed the max). The same \(\gamma\) that actuaries use to make EPVs finite is here making an <em>algorithm</em> converge.</p>
    </div></details>

    <h4>Watch dynamic programming actually happen</h4>
    <p>The equations above can feel inert. So let's not solve the MDP in closed form — let's <em>watch</em> value iteration converge. Below is the classic gridworld: a \(+1\) goal, a \(-1\) pit, one wall. Every cell starts believing it's worth \(0\). Press <strong>Step</strong> to apply the Bellman optimality update everywhere at once — each cell looks at its neighbors and keeps the best <em>(reward + discounted neighbor value)</em>. Watch value bleed outward from the goal, one ring per sweep, and watch the greedy policy arrows snap into a coherent plan the instant the numbers beneath them make sense. That outward propagation <em>is</em> the \(\gamma\)-contraction (proof in the next panel), made visible.</p>
    <Lab
      id="grid"
      title="Value iteration converging on a gridworld"
      :note="`Cell color = current value estimate (green positive, red negative); cyan arrow = the greedy action it implies. <strong>Step</strong> does one synchronous Bellman sweep; <strong>Run</strong> animates to convergence. Notice the policy is correct near the goal long before distant values settle — and that raising \\(\\gamma\\) lets the goal's influence reach farther. <span class=&quot;notice&quot;>Convention: deterministic moves, a per-step living cost, state-rewards with terminals pinned at \\(\\pm1\\) — chosen for a clean, readable backup; the classic Russell–Norvig version adds 80/10/10 slip noise.</span>`"
    />

    <h3><span class="knum">2.5</span>Reward design and the limits of the formalism</h3>
    <p>The MDP assumes someone hands you \(r(s,a)\). In robotics, <em>you</em> are that someone, and it's treacherous: sparse rewards ("+1 on task success") are honest but nearly unlearnable from scratch; dense shaped rewards ("negative distance to goal + bonus for grasp + penalty for jerk...") are learnable but get gamed — the agent optimizes what you wrote, not what you meant. Hold this thought: it returns in L5 (Eureka: LLMs writing reward code) and is one reason imitation (L3) and foundation-model approaches (L9) are so attractive — they sidestep reward design entirely.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Markov chains + a decision at each step</b> (your multi-state models, but you choose the transition matrix column)</div><div class="arrow">→</div><div class="to"><b>The MDP, exactly.</b> Remove the actions and an MDP under a fixed policy <em>is</em> a Markov reward process — the object you've always priced</div></div>
      <div class="bridge-row"><div class="from"><b>Backward recursion</b>: compute year-\(T\) values, discount back (reserves, lattice/binomial option pricing)</div><div class="arrow">→</div><div class="to"><b>Value iteration / Riccati sweep</b> — same backward induction; LQR is your binomial lattice with Gaussians and quadratics</div></div>
      <div class="bridge-row"><div class="from"><b>Solving linear systems</b> \(x = b + Ax\)</div><div class="arrow">→</div><div class="to"><b>Policy evaluation</b>: \(V^\pi = r^\pi + \gamma P^\pi V^\pi \Rightarrow V^\pi = (I - \gamma P^\pi)^{-1} r^\pi\); invertibility holds because \(\gamma &lt; 1\) keeps the spectral radius below 1</div></div>
      <div class="bridge-row"><div class="from"><b>Banach fixed point / geometric series intuition</b></div><div class="arrow">→</div><div class="to"><b>Why value iteration converges</b> and why error shrinks by factor \(\gamma\) per sweep</div></div>
    </div>

    <h3><span class="knum">2.6</span>The papers, decoded</h3>
    <p>Week 2's discussion papers are a deliberate cold shower before the deep-RL enthusiasm begins:</p>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/1803.07055" target="_blank" rel="noopener">Simple random search provides a competitive approach to RL</a></div><div class="pmeta">Mania, Guy &amp; Recht · 2018</div><p class="pwhy">Augmented Random Search — perturb the weights of a <em>linear</em> policy, keep what helps — matches sophisticated deep RL on standard locomotion benchmarks. Moral: the benchmarks were weaker than believed, and baseline discipline matters. When a complicated method wins, always ask what the dumbest competitor scores.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://www.alexirpan.com/2018/02/14/rl-hard.html" target="_blank" rel="noopener">Deep Reinforcement Learning Doesn't Work Yet</a></div><div class="pmeta">Irpan · 2018 (blog essay)</div><p class="pwhy">The field's most-cited reality check: deep RL is sample-hungry, seed-sensitive, reward-hackable, and often loses to domain-specific methods. Read it as a checklist of failure modes; much of L5–L9 is the field's decade-long answer to this essay.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/1705.05363" target="_blank" rel="noopener">Curiosity-driven Exploration by Self-supervised Prediction</a></div><div class="pmeta">Pathak et al. · 2017</div><p class="pwhy">When rewards are absent or sparse, manufacture your own: reward the agent where its learned forward model predicts poorly ("curiosity"), with prediction done in a learned feature space so noise isn't intrinsically fascinating. Your first taste of intrinsic motivation — and of learned models as tools, foreshadowing L8.</p></div>
    </div>

    <Quiz lecture="l2" />

    <div class="resources">
      <div class="res-head">Lecture 2 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture2_control_mdp.pdf" target="_blank" rel="noopener">lecture2_control_mdp.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://video.ethz.ch/lectures/d-infk/2026/spring/263-5911-00L/v/L224Ovxd2l4" target="_blank" rel="noopener">ETH video portal — Lecture 2</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/aG8NPTPhwkE" target="_blank" rel="noopener">Abhishek Gupta (UW) — guest spotlight</a></li>
        <li><span class="rtag">Homework</span><a href="https://github.com/mees-robot-learning-course/ethz-course-2026/tree/main/hw2_robot_control_mdps" target="_blank" rel="noopener">HW2: Robot Control &amp; MDPs</a> — implement value/policy iteration yourself; it makes L4 trivial to follow</li>
      </ul>
    </div>

    <CompleteBar id="l2" prev="l1" next="l3" prevLabel="← L01" nextLabel="NEXT: L03 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Lab from '../components/Lab.vue';
import Quiz from '../components/Quiz.vue';
import CompleteBar from '../components/CompleteBar.vue';
import { renderMath } from '../composables/useKaTeX.js';
import { applyXref } from '../composables/useXref.js';

defineEmits(['navigate']);

const rootEl = ref(null);

onMounted(async () => {
  await nextTick();
  renderMath(rootEl.value);
  applyXref(rootEl.value);
});
</script>
