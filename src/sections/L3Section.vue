<template>
  <section class="lecture" id="l3" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 03 · MAR 02</span>
      <h2>Imitation Learning</h2>
      <p class="dek">The simplest idea in robot learning — copy the expert — and the beautiful, treacherous gap between supervised learning and sequential decision making that it exposes.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> supervised learning · MLE</span>
      <span class="chip"><b>Time</b> ~40 min</span>
      <span class="chip"><b>Watch first</b> the compounding-error labs (§3.2)</span>
      <span class="chip"><b>Tools</b> PyTorch · a demo dataset</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>High held-out accuracy does <em>not</em> imply good rollouts — accuracy is measured on the expert's distribution, not the one the policy induces.</li>
        <li>BC has no reward function; it's pure supervised learning.</li>
        <li>The mean of two valid actions can be an invalid action (the averaging trap).</li>
      </ul>
    </div>

    <h3><span class="knum">3.1</span>Behavioral cloning: it's just MLE</h3>
    <p>Collect demonstrations \(\mathcal D = \{(s_i, a_i^{\text{expert}})\}\) — a human teleoperates the robot; you log observations and actions. <strong>Behavioral cloning (BC)</strong> fits a policy by maximum likelihood:</p>
    <p>$$\theta^* = \arg\max_\theta \sum_{(s,a)\in\mathcal D} \log \pi_\theta(a \mid s)$$</p>
    <p>For a Gaussian policy with fixed variance this is literally mean-squared-error regression onto expert actions (because \(\log\mathcal N(a;\mu_\theta(s),\sigma^2 I)=-\lVert a-\mu_\theta(s)\rVert^2/2\sigma^2+\text{const}\) — maximizing log-likelihood is minimizing squared error to the expert action); for discretized actions it's cross-entropy. Everything you know about supervised learning applies: architectures, augmentation, regularization. No reward function, no exploration, no instability. BC is the workhorse that quietly powers most of L6–L9's "policies trained on demonstrations." So what's the catch?</p>

    <h3><span class="knum">3.2</span>The catch: compounding errors</h3>
    <p>BC trains on the <strong>expert's</strong> state distribution \(d^{\pi^*}\) but is executed under its <strong>own</strong> distribution \(d^{\pi_\theta}\). A small error steers the robot to a state slightly off the demonstration manifold — a state the expert never visited, so the policy has no idea what to do there — producing a bigger error, and the trajectory spirals away. Supervised learning's i.i.d. assumption is violated <em>by the policy itself</em>. This is covariate shift where the model causes the shift.</p>
    <p>Ross &amp; Bagnell made it quantitative. Suppose the learned policy errs with probability \(\le \epsilon\) <em>on the expert's distribution</em>. Over a horizon of \(T\) steps (writing \(J(\pi)\) for the policy's expected total reward over an episode — the Primer's objective in one symbol; Lecture 5 adopts it officially):</p>
    <p>$$J(\pi^*) - J(\pi_{\text{BC}}) \;\le\; O(\epsilon T^2) \qquad \text{(worst case)}$$</p>
    <p><strong>Quadratic</strong> in horizon — versus the \(O(\epsilon T)\) you'd naively expect from \(T\) independent chances to err.</p>

    <details class="dive"><summary>Going deeper: where the \(T^2\) comes from (sketch you can reconstruct)</summary><div class="dive-body">
      <p>Think of the worst case: the first mistake (probability \(\le \epsilon\) per step while still on-distribution) may throw the agent into states where it has <em>no</em> guarantees — adversarially, it can incur maximal per-step regret (bounded by 1, say) for <em>all remaining steps</em>. A mistake at step \(t\) thus costs up to \(T - t\). Summing expected damage: \(\sum_{t=1}^{T} \epsilon\,(T-t) = O(\epsilon T^2)\). The construction is tight: there exist MDPs achieving it. The lesson isn't the constant — it's the <em>mechanism</em>: off-distribution states have unbounded downstream cost, so per-step accuracy on the demo distribution is the wrong currency. Long-horizon tasks amplify small cloning errors quadratically; this single fact motivates DAgger (below), action chunking (L6–L7), and much else.</p>
    </div></details>

    <h4>See the spiral, then see why it's quadratic</h4>
    <p>The \(O(\epsilon T^2)\) bound is the most important inequality in imitation learning, and it's worth feeling in two steps. First, the <em>mechanism</em>: a cloned policy is fine until one small error nudges it off the demonstrated path — and then it's in a state the expert never visited, so there's no one to copy, and it drifts further. Resample the rollouts below and watch a tight bundle fan into a divergent spray as the per-step error \(\epsilon\) grows.</p>
    <DriftWidget />
    <p>Second, the <em>scaling</em>: why \(T^2\) and not \(T\)? Because a mistake at step \(t\) doesn't cost one step — it can cost <em>all</em> \(T-t\) remaining steps, since the policy may never recover. Summing that triangular cost across the episode gives \(\sum_t (T-t)\sim T^2\). DAgger relabels the drifted states with expert actions, capping the damage at \(O(\epsilon T)\). Slide \(\epsilon\) and \(T\) and read the gap between the two curves directly.</p>
    <CurveWidget />

    <h3><span class="knum">3.3</span>DAgger: fix the distribution, not the model</h3>
    <p><strong>Dataset Aggregation</strong> attacks the mismatch directly: train on the distribution the learner actually induces.</p>
    <div class="figure"><pre>DAGGER LOOP
  1. π₁ ← BC on expert demos D
  2. for k = 1, 2, ...
       roll out π_k  →  visit states s ~ d^{π_k}      ← learner drives
       query expert for labels a* at those states     ← expert corrects
       D ← D ∪ {(s, a*)};  π_{k+1} ← train on D       ← aggregate, refit</pre>
    <div class="figcap">FIG. 3.1 — The learner generates the states; the expert supplies the answers. Distribution mismatch dissolves by construction.</div></div>

    <h4>Watch the funnel tighten, round by round</h4>
    <p>The loop above says <em>aggregate and refit</em>. Here is what that buys, mechanically: labels land exactly where the learner drifts, and the off-distribution region — where the \(O(\epsilon T^2)\) damage lives — shrinks before your eyes. Round 0 is pure BC: the same divergent funnel you saw in §3.2. Run a round and watch the expert's labels (cyan dots) appear precisely on the drifted states, the covered band swallow them, and the next bundle hug the demo line tighter — the max-drift readout falls geometrically.</p>
    <DaggerWidget />

    <p>Under a no-regret online-learning analysis (each round is an online classification problem on the evolving distribution), DAgger achieves a performance gap <strong>linear</strong> in the horizon, \(O(\epsilon T)\) (up to recoverability constants; its per-round online-learning regret \(\to 0\)) — the best you could hope for. Its practical sin: it needs an expert <em>on call</em> to label arbitrary mid-rollout states, which is expensive and awkward for humans (labeling "what would I have done here?" out of context is hard). Real systems often use softer cousins: human <em>interventions</em> during rollouts (take over when it drifts, log the corrections) — you'll meet this as HG-DAgger-style data collection and again in HIL-SERL (L4 papers).</p>

    <h3><span class="knum">3.4</span>Two subtler failure modes</h3>
    <p><strong>Multimodality.</strong> Human demos are inconsistent: facing an obstacle, half the demos go left, half right. A unimodal policy (Gaussian / MSE regression) learns the <em>mean</em> — straight into the obstacle. Averaging valid answers produces an invalid one. Remember this as the founding problem of Lecture 6: diffusion and energy-based policies exist precisely to represent multimodal \(p(a|s)\).</p>
    <p><strong>Causal confusion.</strong> More data and richer observations can make BC <em>worse</em>. The canonical example (de Haan et al.): a dashboard camera shows the car's own brake light; the network learns "brake light on → brake" — perfect training accuracy by exploiting an effect of the expert's action as if it were a cause. At test time it never initiates braking. Cloning fits correlations in \(p(a|s)\); it has no concept of intervention. Mitigations: hide nuisance channels, careful observation design, targeted interventions to break spurious correlates.</p>

    <h4>The averaging trap, in one picture</h4>
    <p>Here's the multimodality failure with nothing hidden. The demonstrations cluster into two equally valid maneuvers — swerve left, swerve right — with an obstacle dead center. A mean-squared-error policy minimizes average distance to <em>all</em> the data at once, so its single best answer is the average of left and right: straight ahead, into the obstacle. Toggle between the two policy classes and watch where each one actually sends the robot.</p>
    <MeanWidget />

    <h4>Causal confusion: when more information hurts</h4>
    <p>The other subtle failure is stranger, because it runs against every instinct: giving the policy <em>richer</em> observations can make it <em>worse</em>. The toggle below is the canonical dashcam example. Add the car's own brake-light to the observation and training accuracy jumps to a perfect 100% — the network simply reads "brake-light on → brake," an <em>effect</em> of the expert's action it mistakes for a cause. Then deploy it: there's no expert brake-light to copy, so it never initiates braking. Remove the shortcut and accuracy drops slightly, but the policy is forced to learn the real cause and actually drives.</p>
    <CausalWidget />

    <h3><span class="knum">3.5</span>What actually makes visual BC work</h3>
    <p>Modern practice, distilled: (1) <strong>Representations carry you.</strong> Pretrained or self-supervised visual encoders (the Pari et al. paper below shows BYOL features + literal nearest-neighbor lookup of demo actions is a strong policy) — most of the problem is perception. (2) <strong>Inductive bias buys data efficiency.</strong> Transporter Networks pose pick-and-place as "match a region to a placement" with translation-equivariant convolutions — tens of demos instead of thousands, by baking spatial structure into the architecture. (3) <strong>Demo collection quality dominates.</strong> Smooth, consistent, well-covered teleoperation data beats clever algorithms; interfaces (VR rigs, puppeteering setups like ALOHA in L7, handheld grippers like UMI in L6) are first-class research.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Covariate shift</b> (train/test feature distributions differ)</div><div class="arrow">→</div><div class="to"><b>Compounding errors</b> — same concept with a twist: the model's own outputs <em>generate</em> the shifted inputs, creating a feedback loop with \(O(T^2)\) damage</div></div>
      <div class="bridge-row"><div class="from"><b>MLE / cross-entropy training</b></div><div class="arrow">→</div><div class="to"><b>BC objective</b> \(\max \sum \log \pi_\theta(a^*|s)\) — identical machinery; keep \(\nabla_\theta \log \pi_\theta\) warm for L5</div></div>
      <div class="bridge-row"><div class="from"><b>Regression to the mean</b> (a phrase you've used professionally)</div><div class="arrow">→</div><div class="to"><b>The multimodality failure</b>: MSE on multimodal targets predicts the mean — here the mean is a crash</div></div>
      <div class="bridge-row"><div class="from"><b>Correlation ≠ causation</b>; proxy variables leaking the label</div><div class="arrow">→</div><div class="to"><b>Causal confusion</b> — the brake light is target leakage with motors attached</div></div>
      <div class="bridge-row"><div class="from"><b>Active learning</b> (query labels where the model is used/uncertain)</div><div class="arrow">→</div><div class="to"><b>DAgger</b> — active learning where "where the model is used" means the states its own rollouts visit</div></div>
    </div>

    <h3><span class="knum">3.6</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/1905.11979" target="_blank" rel="noopener">Causal Confusion in Imitation Learning</a></div><div class="pmeta">de Haan, Jayaraman &amp; Levine · 2019</div><p class="pwhy">Formalizes §3.4's pathology and shows the paradox experimentally: <em>more information in the observation can hurt</em>. Proposes learning over causal graphs + targeted interventions to disambiguate. Read for the framing; the brake-light example will live in your head permanently.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2112.01511" target="_blank" rel="noopener">The Surprising Effectiveness of Representation Learning for Visual Imitation</a></div><div class="pmeta">Pari, Shafiullah, Arunachalam &amp; Pinto · 2021 (VINN)</div><p class="pwhy">Decouples perception from control: self-supervised visual features (BYOL), then <em>k-nearest-neighbor</em> over demo states to pick actions. No policy network at all — and it's competitive. Moral: in visual imitation, representation quality is most of the battle.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2010.14406" target="_blank" rel="noopener">Transporter Networks: Rearranging the Visual World for Robotic Manipulation</a></div><div class="pmeta">Zeng et al. · 2020</div><p class="pwhy">Action = (where to pick, where to place) over a top-down image; exploit translational equivariance by convolving a cropped feature of the pick region over the scene to score placements. Spatial structure as inductive bias → order-of-magnitude better sample efficiency. The counterpoint to "just scale it" — architecture priors still matter when demos are scarce.</p></div>
    </div>

    <Quiz lecture="l3" />

    <div class="resources">
      <div class="res-head">Lecture 3 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture3_imitation.pdf" target="_blank" rel="noopener">lecture3_imitation.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://youtu.be/Ef4R5s1LqoQ" target="_blank" rel="noopener">YouTube recording — Lecture 3</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/qvTP6T5oq1w" target="_blank" rel="noopener">Danfei Xu (Georgia Tech) — guest spotlight</a></li>
        <li><span class="rtag">Homework</span><a href="https://github.com/mees-robot-learning-course/ethz-course-2026/tree/main/hw3_imitation_learning" target="_blank" rel="noopener">HW3: Imitation Learning</a> — you will <em>see</em> compounding errors in your own rollouts; nothing teaches §3.2 better</li>
      </ul>
    </div>

    <CompleteBar id="l3" prev="l2" next="l4" prevLabel="← L02" nextLabel="NEXT: L04 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Quiz from '../components/Quiz.vue';
import CompleteBar from '../components/CompleteBar.vue';
import DriftWidget from '../widgets/DriftWidget.vue';
import DaggerWidget from '../widgets/DaggerWidget.vue';
import CurveWidget from '../widgets/CurveWidget.vue';
import MeanWidget from '../widgets/MeanWidget.vue';
import CausalWidget from '../widgets/CausalWidget.vue';
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
