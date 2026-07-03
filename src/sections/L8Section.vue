<template>
  <section class="lecture" id="l8" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 08 · APR 13</span>
      <h2>World Models</h2>
      <p class="dek">The third family arrives: learn the dynamics themselves, then plan inside the model — or train a policy entirely in imagination. From Dreamer's latent state-space models to video generation as a universal policy.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> L4–L5 · VAEs · sequence models</span>
      <span class="chip"><b>Time</b> ~50 min</span>
      <span class="chip"><b>Watch first</b> the trust-a-dream lab (§8.3)</span>
      <span class="chip"><b>Tools</b> PyTorch · a Dreamer repo</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>Longer imagined rollouts are <em>not</em> better — model error compounds, so Dreamer imagines ~15 steps, not 500.</li>
        <li>The latent \(z\) is a learned belief state, not the raw image; dynamics are modeled there, not in pixels.</li>
        <li>A policy will actively exploit your world model's errors — the same disease as DDPG's actor and offline-RL extrapolation.</li>
      </ul>
    </div>

    <h3><span class="knum">8.1</span>Why learn a model at all</h3>
    <p>Model-free RL (L4–L5) burns experience: every gradient comes from real interaction, and the knowledge lands only in a policy/value function for <em>one</em> reward. A learned dynamics model \(\hat p(s'|s,a)\) changes the economics: <strong>sample efficiency</strong> (one real dataset → unlimited imagined rollouts), <strong>transfer</strong> (physics doesn't care about your task; swap rewards, reuse the model), <strong>planning</strong> (look before you leap — evaluate action candidates mentally), and <strong>a home for action-free data</strong> (video teaches dynamics even without action labels). The catch is the same one from Lecture 3, relocated: <em>compounding model error</em>. Roll a slightly-wrong model forward 50 steps and you're planning in fiction; a policy optimized against the model will, like DDPG's actor against its critic, seek out and exploit exactly the places where the model is wrong. Every method in this lecture is a strategy for harvesting the model's benefits while containing that adversarial dynamic.</p>

    <h3><span class="knum">8.2</span>Where to model: pixels are the wrong space</h3>
    <p>Predicting next camera frames pixel-by-pixel wastes capacity on irrelevant texture and is brutally hard to keep coherent. The field's answer: <strong>learn a compact latent state, and model dynamics there.</strong> Encode observations \(o_t \to z_t\); learn latent dynamics \(z_{t+1} \sim \hat p(\cdot|z_t, a_t)\); decode only as needed (for training signal). The latent \(z\) is a <em>learned, approximate belief state</em> — the POMDP medicine from the Primer, now explicit: it must summarize history well enough to predict the future. This is also your bridge from classical ideas: it's a learned, nonlinear Kalman filter — state estimation and dynamics identification fused into one network and trained end-to-end.</p>

    <h3><span class="knum">8.3</span>Dreamer: the canonical architecture</h3>
    <p>The <strong>RSSM</strong> (Recurrent State-Space Model) at Dreamer's heart maintains a state with two halves: a <em>deterministic</em> recurrent path \(h_t = f(h_{t-1}, z_{t-1}, a_{t-1})\) (memory; stable gradient highway) and a <em>stochastic</em> latent \(z_t\) (uncertainty; sampled from a prior \(p(z_t|h_t)\) when imagining, from a posterior \(q(z_t|h_t,o_t)\) when observing). The swap is the key move: the posterior \(q(z_t|h_t,o_t)\) runs while real observations stream in — it gets to peek at \(o_t\); the prior \(p(z_t|h_t)\) takes over during imagination — no \(o_t\) to peek at; the KL term trains the prior to match what the posterior would have said, which is exactly what lets you dream forward with no images.</p>
    <p>Concretely, Dreamer learns five small networks that share the latent state, trained jointly on real sequences:</p>
    <p>$$\begin{aligned} &amp;\text{encoder (posterior)} &amp;&amp; z_t \sim q_\phi(z_t \mid h_t, o_t) \\ &amp;\text{recurrent model} &amp;&amp; h_t = f_\phi(h_{t-1}, z_{t-1}, a_{t-1}) \\ &amp;\text{dynamics (prior)} &amp;&amp; \hat z_t \sim p_\phi(z_t \mid h_t) \\ &amp;\text{reward / decoder heads} &amp;&amp; \hat r_t \sim p_\phi(r_t\mid h_t,z_t),\quad \hat o_t \sim p_\phi(o_t\mid h_t,z_t) \end{aligned}$$</p>
    <p>trained on a sequential ELBO (written below as the loss to minimize) — exactly your VAE machinery, unrolled through time:</p>
    <p>$$\mathcal{L} = \sum_t \underbrace{-\log p_\phi(o_t\mid h_t,z_t) - \log p_\phi(r_t\mid h_t,z_t)}_{\text{reconstruct}} \;+\; \beta\,\underbrace{\mathrm{KL}\big(q_\phi(z_t\mid h_t,o_t)\,\|\,p_\phi(z_t\mid h_t)\big)}_{\text{make the prior predict}}$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;learn a compact latent that (a) can reconstruct what the robot saw and the reward it got, and (b) can be <em>predicted one step ahead from the latent alone</em>. The KL term is the engine: it forces the dynamics model to anticipate the next latent without peeking at the next image — turning the prior into a genuine <em>predictor</em>, not just a filter.</p>

    <h4>Watch the hand-off: filter, then dream</h4>
    <p>What actually changes inside the model at the moment it stops observing and starts imagining? Below, a hidden state meanders (the dim line) while a belief tracks it. Left of the boundary the posterior is in charge: an observation tick arrives every step, and the uncertainty band snaps tight after each one. Right of the boundary the ticks stop and the prior is on its own — prediction only, nothing to correct against — so the band balloons and the mean drifts. <strong>Drag the boundary</strong> to move the hand-off, and <strong>toggle the prior</strong> to see what the KL term buys: an untrained prior blows up the moment the data disappears; a KL-trained one degrades gracefully enough to be worth dreaming in.</p>
    <FilterDreamWidget />

    <p>Then the signature move: <strong>train the policy entirely inside the model.</strong> Freeze a batch of real states as starting points; let the policy act in latent space; roll the RSSM forward (no decoder, no simulator, thousands of parallel dreams on one GPU); train an actor-critic (L5's machinery!) on these imagined trajectories — with one upgrade unavailable in the real world: because the entire rollout is differentiable, value gradients can flow <em>backward through the dynamics</em> into the policy. Real experience updates the world model; imagination trains the behavior. DreamerV3 made this robust enough that <em>one fixed configuration</em> spans Atari, control suites, and Minecraft (collecting diamonds from scratch) — the robustness tricks (symlog value transforms, two-hot critic targets, KL free bits) are worth knowing exist, if not memorizing — and the framing to keep is that these tricks <em>are</em> the contribution, not footnotes: naive world-model RL is brittle across wildly different reward scales and observation statistics, and each trick neutralizes one source of that brittleness. The 2025 scalable-world-models work (below) pushes the same blueprint to video-model scale.</p>

    <h4>How far can you trust a dream?</h4>
    <p>A learned world model is a compression of reality, and small per-step errors compound the further you imagine. The lab plots that divergence between the dreamed trajectory and what would really happen, as a function of how many steps you roll out — and contrasts two modeling choices. A pixel-space model accumulates error fast (predicting every texture is hard and the mistakes feed forward); a compact <em>latent</em> model drifts more slowly. The shaded zone is where the dream is still trustworthy.</p>
    <WmWidget />

    <h3><span class="knum">8.4</span>Video generation as a world model — and as a policy</h3>
    <p>A text-to-video model is, functionally, a world model with a language interface: it encodes how scenes evolve. <strong>UniPi</strong> operationalizes this: given an instruction and a current image, <em>generate a video of the task being done</em>, then recover actions with a learned <strong>inverse dynamics model</strong> (state, next-state → action; cheap to train, it's supervised). The plan is literally a movie; control is captioning the movie with motor commands. Why this is strategically seductive: video models pretrain on internet-scale footage — knowledge of how doors, liquids, and hands behave — none of which a robot had to collect. The 2026 frontier (DreamZero, below) fuses the two roles: one <em>world-action model</em> that predicts video and actions jointly, acting zero-shot. Open questions are real: video is slow to generate (latency), photorealism ≠ physical correctness, and hallucinated dynamics are failure modes with torque behind them.</p>

    <div class="callout"><span class="co-label">Orientation: three ways to use a learned model</span>
    <strong>(1) Plan through it online</strong> — MPC-style search over imagined futures (precise, slow per decision). <strong>(2) Train a policy in it offline</strong> — Dreamer's imagination (fast at deployment; quality bounded by model fidelity). <strong>(3) Generate the future directly and read actions off it</strong> — UniPi/world-action models (imports internet priors; latency- and grounding-challenged). Most papers you'll ever read in this area are one of these three, plus an error-containment strategy.</div>

    <h3><span class="knum">8.5</span>Containing model error</h3>
    <p>The discipline that separates working systems from demos: keep imagined rollouts <em>short</em> (truncate before fiction accumulates — Dreamer imagines ~15 steps, not 500); replan from real observations often (MPC's receding horizon, again); let the stochastic latent carry <em>epistemic humility</em> (ensembles or variance penalties so the planner distrusts what the model hasn't seen — offline RL's pessimism, L5, in model space); and ground continually with fresh real data. Notice the pattern across the course: BC's compounding errors, offline RL's extrapolation, the critic-exploiting actor, and model exploitation are <em>the same disease</em> — optimizing against a learned approximation pushes you to where the approximation fails — and short horizons + pessimism + fresh grounding is the recurring cure.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>State-space models, Kalman filtering</b></div><div class="arrow">→</div><div class="to"><b>RSSM</b> — a learned nonlinear filter: deterministic path = state propagation, stochastic latent = posterior uncertainty, trained by ELBO instead of derived</div></div>
      <div class="bridge-row"><div class="from"><b>VAE / ELBO</b> (one more time)</div><div class="arrow">→</div><div class="to"><b>World-model training</b> — the same objective, sequential: reconstruct, and KL-pull the prior (predictor) toward the posterior (filter)</div></div>
      <div class="bridge-row"><div class="from"><b>Scenario generators in finance</b>: calibrate a model of the world, then simulate strategies inside it</div><div class="arrow">→</div><div class="to"><b>Imagination training</b> — Dreamer is exactly this; and "your strategy exploits your scenario generator's flaws" is precisely model exploitation</div></div>
      <div class="bridge-row"><div class="from"><b>Model validation discipline</b>: short extrapolations, fresh recalibration, distrust beyond data</div><div class="arrow">→</div><div class="to"><b>§8.5 wholesale</b> — short imagined horizons, frequent replanning, uncertainty penalties</div></div>
    </div>

    <h3><span class="knum">8.6</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2302.00111" target="_blank" rel="noopener">Learning Universal Policies via Text-Guided Video Generation (UniPi)</a></div><div class="pmeta">Du et al. · 2023</div><p class="pwhy">§8.4's thesis paper: instruction → generated execution video → inverse-dynamics action extraction. Read for the decomposition (planner = video model, controller = supervised IDM) and for the argument that internet video is the field's missing dataset in disguise.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2509.24527" target="_blank" rel="noopener">Training Agents Inside of Scalable World Models</a></div><div class="pmeta">Hafner et al. · 2025</div><p class="pwhy">The Dreamer line at modern scale: a world model strong enough that agents trained <em>purely inside it</em> from offline data achieve long-horizon competence (the headline: Minecraft diamonds without environment interaction during policy learning). The blueprint of §8.3 surviving scale — and the strongest current evidence for "imagination training" as a primary paradigm.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://dreamzero0.github.io/DreamZero.pdf" target="_blank" rel="noopener">World Action Models are Zero-shot Policies (DreamZero)</a></div><div class="pmeta">Ye et al. · 2026</div><p class="pwhy">The fusion: one model jointly trained for video prediction <em>and</em> action generation, transferring zero-shot to control. Hot off the press — read it as a hypothesis about where L8 and L9 converge: the world model and the policy stop being separate artifacts.</p></div>
    </div>

    <Quiz lecture="l8" />

    <div class="resources">
      <div class="res-head">Lecture 8 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture8_world_models.pdf" target="_blank" rel="noopener">lecture8_world_models.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://youtu.be/cTTmUZlOF2s" target="_blank" rel="noopener">YouTube recording — Lecture 8</a></li>
        <li><span class="rtag">Guest</span><a href="https://www.youtube.com/watch?v=fqkp_wkov6M" target="_blank" rel="noopener">Scott Reed (NVIDIA GEAR; Gato lead author) — guest spotlight</a></li>
      </ul>
    </div>

    <CompleteBar id="l8" prev="l7" next="l9" prevLabel="← L07" nextLabel="NEXT: L09 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import WmWidget from '../widgets/WmWidget.vue';
import FilterDreamWidget from '../widgets/FilterDreamWidget.vue';
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
