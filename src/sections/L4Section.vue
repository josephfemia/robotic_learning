<template>
  <section class="lecture" id="l4" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 04 · MAR 09</span>
      <h2>Reinforcement Learning I</h2>
      <p class="dek">Dropping the known model: learning value functions from sampled experience. Monte Carlo vs. temporal difference, Q-learning, and the deep-learning surgery (DQN) that made it work at scale — plus why continuous robot actions demand the next lecture.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> L2 · probability · gradient descent</span>
      <span class="chip"><b>Time</b> ~50 min</span>
      <span class="chip"><b>Watch first</b> the gridworld + MC-vs-TD labs</span>
      <span class="chip"><b>Tools</b> Gymnasium · PyTorch (for DQN)</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>The critic doesn't <em>pick</em> actions — it evaluates them. The policy/argmax acts.</li>
        <li>Bootstrapping isn't cheating: it's biased but usually lower-variance and faster.</li>
        <li>Off-policy learning is precisely what makes replay buffers and learning-from-demos legal — and it's the root of the deadly triad.</li>
      </ul>
    </div>

    <h3><span class="knum">4.1</span>The new regime: model-free</h3>
    <p>Lecture 2 assumed \(P(s'|s,a)\) on paper, so we could compute expectations. Now the model is gone; the agent only gets <strong>samples</strong> — transitions \((s, a, r, s')\) from acting in the world. The questions split as before: <strong>prediction</strong> (estimate \(V^\pi\) for a given \(\pi\)) and <strong>control</strong> (find \(\pi^*\)). The deep idea of this lecture: every dynamic-programming expectation from L2 can be replaced by a sample average or a stochastic step — at the price of variance, bias, and new stability questions.</p>

    <h3><span class="knum">4.2</span>Prediction: Monte Carlo vs. temporal difference</h3>
    <p><strong>Monte Carlo (MC):</strong> run full episodes, observe actual returns \(G_t\), and update toward them: \(V(s_t) \leftarrow V(s_t) + \alpha\,(G_t - V(s_t))\). Unbiased (first-visit MC is unbiased; every-visit MC is biased but consistent) — \(G_t\) really is a draw of the quantity \(V^\pi\) defines — but high variance (a whole episode's randomness piles into one number) and only usable at episode end.</p>
    <p><strong>Temporal difference (TD(0)):</strong> update after every step, toward a <em>bootstrapped</em> target:</p>
    <p>$$V(s_t) \;\leftarrow\; V(s_t) + \alpha\,\underbrace{\big[\,r_t + \gamma V(s_{t+1}) - V(s_t)\,\big]}_{\delta_t,\ \text{the TD error}}$$</p>
    <p>The target \(r_t + \gamma V(s_{t+1})\) is the Bellman equation with the expectation replaced by one sample <em>and</em> \(V^\pi\) replaced by the current estimate. Using your own estimate inside your own target is called <strong>bootstrapping</strong>. It slashes variance (only one step of randomness) and works online — at the cost of bias while \(V\) is wrong. The MC↔TD axis is a pure <strong>bias–variance tradeoff</strong>, and \(n\)-step targets \(r_t + \gamma r_{t+1} + \dots + \gamma^{n}V(s_{t+n})\) interpolate it. File this away: Lecture 5's GAE is exactly this dial, applied to advantages.</p>

    <h4>Watch unbiased-but-noisy race biased-but-stable</h4>
    <p>The bias–variance story is easier to believe once you watch it. Below, a fixed 5-state chain has true values we know; press <strong>Run episodes</strong> and watch two estimators chase them. Monte Carlo (orange) jumps around the truth — unbiased, but every episode injects a whole trajectory's noise. TD (cyan) glides in smoothly — low variance — but leans early on its own wrong guesses (bias). Neither is "right"; they sit at two ends of one ruler.</p>
    <MctdWidget />

    <h3><span class="knum">4.3</span>Control: Q-learning and SARSA</h3>
    <p>For control without a model, learn \(Q\) instead of \(V\) — then greedy action needs no \(P\): \(\pi(s) = \arg\max_a Q(s,a)\). Two classic updates, one crucial difference:</p>
    <p>$$\text{SARSA (on-policy):}\quad Q(s,a) \leftarrow Q(s,a) + \alpha\big[r + \gamma\, Q(s', a') - Q(s,a)\big],\quad a' \sim \pi(\cdot|s')$$</p>
    <p>$$\text{Q-learning (off-policy):}\quad Q(s,a) \leftarrow Q(s,a) + \alpha\big[r + \gamma\, \max_{a'} Q(s', a') - Q(s,a)\big]$$</p>
    <p>SARSA evaluates the policy it's running (including its exploration); Q-learning's \(\max\) evaluates the <em>greedy</em> policy regardless of how data was collected — it learns about the optimal policy from anyone's experience. That off-policy property is gold (reuse old data, learn from demos, replay buffers) and, simultaneously, the root of the stability problems below. With tabular values, a learning rate satisfying the Robbins–Monro conditions (\(\sum_t \alpha_t = \infty,\ \sum_t \alpha_t^2 &lt; \infty\)), and every state–action visited infinitely often, Q-learning provably converges to \(Q^*\).</p>
    <p>Exploration enters here: act greedily and you may never visit the states that would correct your \(Q\). The simplest fix, <strong>\(\epsilon\)-greedy</strong> (random action with probability \(\epsilon\)), is shockingly persistent in practice; alternatives add optimism bonuses, entropy (L5's SAC), or intrinsic curiosity rewards (the Pathak paper from week 2).</p>

    <details class="dive"><summary>Going deeper: tabular Q-learning, complete, in ~15 lines — no magic</summary><div class="dive-body">
      <p>The fastest way to demystify this lecture is to see that the <em>entire algorithm</em> fits on a notecard. The "brain" is literally a NumPy array.</p>
<pre><code>import numpy as np
Q = np.zeros((n_states, n_actions))     # the whole agent: one table of guesses

for episode in range(50_000):
    s, done = env.reset(), False
    while not done:
        # epsilon-greedy: mostly act on current beliefs, sometimes explore
        if np.random.rand() &lt; eps:
            a = np.random.randint(n_actions)
        else:
            a = np.argmax(Q[s])

        s2, r, done = env.step(a)       # one touch of the real world

        # the heart of Q-learning — one line:
        target  = r + gamma * np.max(Q[s2]) * (1 - done)
        Q[s, a] += alpha * (target - Q[s, a])

        s = s2</code></pre>
      <p>Read the update line slowly. <code>target</code> is the Bellman optimality equation with the expectation replaced by the one transition we just experienced, and \(Q^*\) replaced by our current guess (bootstrapping). <code>(1 - done)</code> zeroes the future at terminal states — death is an absorbing state of value 0, exactly your annuity recursion's boundary condition. The <code>+= alpha * (error)</code> is the credibility blend. That's it — no other state, no other math. Every deep value-based method (DQN and descendants) is <em>this loop</em> with the table swapped for a neural network — plus the scaffolding (replay buffer, target network) required to survive that swap, which is precisely what §4.4 explains.</p>
    </div></details>

    <h4>Why exploration is its own problem</h4>
    <p>Q-learning's convergence guarantee assumes you keep visiting every state-action — but a greedy agent stops exploring the moment it finds something decent, and may never discover the better option two doors down. The cleanest sandbox is a multi-armed bandit: several actions with hidden payoffs, and only your own pulls to learn from. Try the three classic strategies and watch the regret (lost reward vs. always picking the best arm) accumulate.</p>
    <BanditWidget />

    <h3><span class="knum">4.4</span>Function approximation and the DQN surgery</h3>
    <p>Robots don't have tabular states — observations are images in \(\mathbb R^{\text{millions}}\). Replace the table with a network \(Q_\phi(s,a)\) trained by regression on TD targets:</p>
    <p>$$\mathcal L(\phi) = \mathbb E_{(s,a,r,s')\sim \mathcal D}\Big[\big(\,\underbrace{r + \gamma \max_{a'} Q_{\phi^-}(s',a')}_{\text{target}} - Q_\phi(s,a)\big)^2\Big]$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;it's plain regression with a moving target: train \(Q\) to predict "reward now plus discounted best next-state value." The label is built from a frozen copy \(Q_{\phi^-}\) so you're not chasing your own tail every step — the trick that keeps the deadly triad from exploding.</p>
    <p>Naively this diverges, for a reason worth understanding: it's <em>not</em> true gradient descent on any fixed objective — the target moves with the parameters, the data distribution moves with the policy, and bootstrapped errors feed back. The folklore name for the unstable cocktail is the <strong>deadly triad</strong>: function approximation + bootstrapping + off-policy data. DQN's two famous stabilizers, visible in the loss above:</p>
    <ul>
      <li><strong>Replay buffer \(\mathcal D\)</strong>: store transitions; train on random minibatches. Breaks temporal correlation (gradient steps see ~i.i.d. data again) and reuses experience — possible <em>only because</em> Q-learning is off-policy.</li>
      <li><strong>Target network \(\phi^-\)</strong>: compute targets with a frozen, periodically-updated copy. Stops the regression from chasing its own tail; turns a moving-target problem into a sequence of quasi-stationary ones.</li>
    </ul>
    <p>One refinement worth knowing by name: the \(\max\) in the target overestimates values under noise (Jensen-flavored: \(\mathbb E[\max] \ge \max[\mathbb E]\)); taking the max over several noisy Q-estimates systematically selects whichever was luckiest, biasing the target high — and because the next bootstrap target is built from that inflated value, the overestimation feeds forward through training. <strong>Double DQN</strong> decouples action <em>selection</em> (online net) from action <em>evaluation</em> (target net) to debias it.</p>

    <h4>The bias–variance spectrum, concretely</h4>
    <p>Monte Carlo and TD aren't rival camps; they're the two ends of one ruler, and seeing that makes Lecture 5 almost free. Ask how to estimate \(V(s_t)\). The <em>one-step</em> (TD) target uses a single real reward, then trusts the current estimate: \(r_t+\gamma V(s_{t+1})\) — low variance (only one noisy reward), but biased (it leans on a guess). The <em>full</em> (MC) target waits for the real return \(G_t\) — unbiased, but high variance (it absorbs every random reward and transition to the end of the episode). In between sits the \(n\)-step target,</p>
    <p>$$ G_t^{(n)} = r_t + \gamma r_{t+1} + \dots + \gamma^{n-1} r_{t+n-1} + \gamma^{n} V(s_{t+n}). $$</p>
    <p>The more real rewards you wait for, the less you lean on the biased estimate and the more real-world noise you let in. That's the entire bias–variance dial — and in Lecture 5 it gets a smooth, continuous knob called GAE-\(\lambda\). Hold onto this picture; the interactive λ-dial there is the same idea made draggable.</p>
    <details class="dive"><summary>Going deeper: a tiny chain where deep Q-learning provably blows up (the deadly triad, concretely)</summary><div class="dive-body">
      <p>Why is the triad "deadly" rather than merely annoying? Picture Baird's counterexample in miniature: a handful of states whose values share an <em>overlapping</em> linear feature representation, trained <em>off-policy</em> with <em>bootstrapped</em> targets — all three legs present. Each update nudges the weights to shrink one state's TD error, but because the features overlap, the same nudge inflates a neighbor's predicted value. That inflated value becomes part of the next bootstrap target, which justifies inflating the weights again, which inflates the neighbor further. With no environment changing and no reward driving it, the value estimates spiral to infinity — the estimator is chasing its own moving reflection.</p>
      <p>Remove any single leg and <em>this</em> divergence vanishes: use on-policy data (the visited-state distribution self-corrects), or drop bootstrapping (Monte Carlo targets are anchored to real returns), or use a lookup table instead of function approximation (no cross-state leakage). That result is specific to this construction — the triad is a schematic toy illustrating a <em>risk</em>, not a theorem guaranteeing that any two legs are safe; other two-leg combinations can still diverge in more complex settings. This is exactly why DQN's two famous tricks target the bootstrapping leg specifically — a <strong>replay buffer</strong> (decorrelate updates) and a <strong>frozen target network</strong> (compute \(\max_{a'}Q(s',a')\) from an old, held-still copy so the target stops moving while you chase it). They don't make the triad safe in general; they stabilize the one leg you can't remove.</p>
    </div></details>

    <h4>Toggle the three legs and watch divergence appear</h4>
    <p>The claim that the triad is dangerous <em>only when all three legs are present</em> is the kind of thing you should verify, not take on faith. Below is a miniature value-learning problem with three switches: <strong>function approximation</strong> (shared features across states), <strong>bootstrapping</strong> (targets built from current estimates), and <strong>off-policy</strong> data. Flip them on one at a time and the value estimates stay bounded. Flip on all three and watch them spiral to infinity — with no reward driving it, the estimator chasing its own reflection. Remove any single leg and the divergence dies.</p>
    <TriadWidget />

    <p>Everything above leans on \(\max_{a} Q(s,a)\). A robot arm's action is a vector in \(\mathbb R^{7}\) (or \(\mathbb R^{14+}\) bimanual) — that max is a nonconvex optimization <em>per decision, per training target</em>. Discretizing 7 dimensions at 10 bins each is \(10^7\) actions. Value-based control, as stated, does not survive contact with robot action spaces. Three escapes, and the course takes all of them: (i) <em>restructure the action space</em> so the max is cheap — this week's Zeng et al. paper makes "actions" pixels of a Q-map and the max an argmax over an image; (ii) <em>learn a policy network directly</em> — Lecture 5; (iii) <em>have a policy network propose, a critic evaluate</em> — actor-critic, also Lecture 5.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Estimating EPVs from experience data</b> without a life table; experience studies</div><div class="arrow">→</div><div class="to"><b>Model-free prediction</b> — MC = "observe completed cohorts, average discounted outcomes"; TD = "update continuously from each period's data"</div></div>
      <div class="bridge-row"><div class="from"><b>Credibility blending</b>: new estimate = \(Z\cdot\)observed + \((1{-}Z)\cdot\)prior</div><div class="arrow">→</div><div class="to"><b>Every update this lecture</b>: \(V \leftarrow (1-\alpha)V + \alpha \cdot \text{target}\) — \(\alpha\) is a credibility weight applied per step</div></div>
      <div class="bridge-row"><div class="from"><b>Exponential smoothing / recursive estimators</b></div><div class="arrow">→</div><div class="to"><b>TD learning</b> — a smoothed estimator whose "observations" are partly its own previous outputs (bootstrapping); hence both its efficiency and its bias</div></div>
      <div class="bridge-row"><div class="from"><b>Fitting a curve to noisy targets</b> (regression)</div><div class="arrow">→</div><div class="to"><b>Deep Q-learning</b> — regression where the targets are generated by the model being fit, the data by the policy being learned: the deadly triad in one sentence</div></div>
    </div>

    <h3><span class="knum">4.5</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/1703.03864" target="_blank" rel="noopener">Evolution Strategies as a Scalable Alternative to Reinforcement Learning</a></div><div class="pmeta">Salimans et al. · 2017</div><p class="pwhy">Skip values <em>and</em> gradients: perturb policy parameters with Gaussian noise across a population, weight perturbations by episode return, step. Embarrassingly parallel (communication = scalar returns), indifferent to reward sparsity within episodes. Conceptual link for L5: ES estimates the same ascent direction as policy gradients, in parameter space instead of action space.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/1803.09956" target="_blank" rel="noopener">Learning Synergies between Pushing and Grasping with Self-supervised Deep RL</a></div><div class="pmeta">Zeng et al. · 2018</div><p class="pwhy">Q-learning on a real robot by redesigning the action space: actions = "push/grasp at pixel (x, y) with rotation θ," Q-function = an image-sized map per primitive, the max = an argmax over pixels. Watch it learn that an unsuccessful-looking <em>push</em> has value because it makes a future <em>grasp</em> possible — long-horizon credit assignment you can see with your eyes.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2410.21845" target="_blank" rel="noopener">Precise and Dexterous Robotic Manipulation via Human-in-the-Loop Reinforcement Learning</a></div><div class="pmeta">Luo et al. · 2024 (HIL-SERL)</div><p class="pwhy">The modern existence proof that <em>real-world</em> RL works: sample-efficient off-policy RL from images + a few demos + human interventions that both correct the robot and feed the buffer; near-perfect success on genuinely hard tasks (timing-sensitive flipping, dual-arm assembly) in 1–2.5 hours of training. The recipe — off-policy backbone, demos as scaffolding, human corrections — is where value-based methods earn their keep on hardware.</p></div>
    </div>

    <Quiz lecture="l4" />

    <div class="resources">
      <div class="res-head">Lecture 4 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture4_rl_I.pdf" target="_blank" rel="noopener">lecture4_rl_I.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://youtu.be/90raNpc11tQ" target="_blank" rel="noopener">YouTube recording — Lecture 4</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/fHHLmTu9sFk" target="_blank" rel="noopener">Aviral Kumar (CMU / Google DeepMind) — guest spotlight</a></li>
      </ul>
    </div>

    <CompleteBar id="l4" prev="l3" next="l5" prevLabel="← L03" nextLabel="NEXT: L05 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Quiz from '../components/Quiz.vue';
import CompleteBar from '../components/CompleteBar.vue';
import { renderMath } from '../composables/useKaTeX.js';
import { applyXref } from '../composables/useXref.js';
import MctdWidget from '../widgets/MctdWidget.vue';
import BanditWidget from '../widgets/BanditWidget.vue';
import TriadWidget from '../widgets/TriadWidget.vue';

defineEmits(['navigate']);

const rootEl = ref(null);

onMounted(async () => {
  await nextTick();
  renderMath(rootEl.value);
  applyXref(rootEl.value);
});
</script>
