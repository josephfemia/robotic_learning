<template>
  <section class="lecture" id="l6" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 06 · MAR 23</span>
      <h2>Generative Models</h2>
      <p class="dek">Action generation as generative modeling: from the multimodality problem that breaks MSE regression, through energy-based and variational policies, to diffusion policies and flow matching — the action heads inside today's best robot systems.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> L3 · VAEs/ELBO helpful · probability</span>
      <span class="chip"><b>Time</b> ~50 min</span>
      <span class="chip"><b>Watch first</b> the diffusion + flow-matching labs</span>
      <span class="chip"><b>Tools</b> PyTorch · a diffusion-policy repo</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>Diffusion here isn't denoising images — it's <em>sampling actions</em> from \(p(a\mid o)\).</li>
        <li>The network estimates the score of the <em>noised</em> distribution, not the clean one (§6.3).</li>
        <li>More sampling steps = slower; for a 50 Hz controller, step count is a latency budget (this is why flow matching exists).</li>
      </ul>
    </div>

    <h3><span class="knum">6.1</span>The problem this lecture solves</h3>
    <p>Recall Lecture 3's quiet bombshell: human demonstrations are <strong>multimodal</strong>. Grasp the mug by the handle or the rim; pass the obstacle left or right; many valid action sequences per situation. A deterministic regressor — or a single Gaussian — fits the conditional <em>mean</em> of incompatible modes and produces actions no demonstrator ever took. The fix is to stop predicting actions and start <strong>modeling the conditional distribution \(p(a\,|\,o)\)</strong> in its full, lumpy, multimodal glory — then act by sampling. Conveniently, modeling complex high-dimensional distributions is exactly what the generative-modeling revolution (GANs → VAEs → EBMs → diffusion → flow matching) learned to do for images. This lecture imports that toolbox into the policy.</p>

    <h3><span class="knum">6.2</span>The expressiveness ladder</h3>
    <p><strong>Rung 1 — Mixture density networks.</strong> Output \(K\) Gaussians' means, variances, and weights; train by negative log-likelihood. Handles a few modes; struggles as dimension and mode count grow; mode collapse and numerical fiddliness in practice.</p>
    <p><strong>Rung 2 — Discretize + autoregress.</strong> Bin each action dimension (say 256 bins), predict bins with a softmax, optionally autoregressively across dimensions. Cross-entropy on bins represents arbitrary 1-D multimodality painlessly. This humble move powers RT-1/RT-2 in Lecture 9 — actions as tokens — at the cost of resolution and dimension-wise factorization artifacts.</p>
    <p><strong>Rung 3 — Implicit, energy-based policies (IBC).</strong> Learn a scalar energy \(E_\theta(o,a)\); define the policy implicitly: \(\pi(o) = \arg\min_a E_\theta(o,a)\). Train contrastively (InfoNCE): push the demo action's energy below sampled negatives'. Arbitrarily expressive — including representing <em>discontinuous</em> policies (snap decisions at thresholds), which smooth regressors fundamentally can't — but inference is an inner optimization, and training needs careful negative sampling because the partition function \(Z(o) = \int e^{-E_\theta(o,a)}da\) is intractable (your "normalizing constants are the enemy" instinct from probabilistic ML applies verbatim).</p>
    <p><strong>Rung 4 — Conditional VAEs.</strong> Encode action (sequences) into a latent \(z\) with the standard ELBO; decode conditioned on observation. Multimodality lives in \(z\). You know this math; its robot career peaks as the backbone of ACT in Lecture 7.</p>

    <h3><span class="knum">6.3</span>Diffusion policies: the current workhorse</h3>
    <p>Diffusion models learn distributions by learning to <em>undo noise</em>. Forward process: gradually corrupt data \(x_0\) with Gaussian noise over \(K\) steps. The closed form everyone uses (with \(\bar\alpha_k\) the cumulative noise schedule):</p>
    <p>$$q(x_k \mid x_0) = \mathcal N\big(\sqrt{\bar\alpha_k}\, x_0,\; (1-\bar\alpha_k)\, I\big)$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;the forward process just blends the clean action with noise: at step \(k\), keep a \(\sqrt{\bar\alpha_k}\) fraction of the data and add the rest as Gaussian noise. One closed form jumps straight to any noise level.</p>
    <p>Train a network \(\varepsilon_\theta\) to predict the noise that was added — the (simplified) loss is just regression:</p>
    <p>$$\mathcal L = \mathbb E_{x_0, k, \varepsilon\sim\mathcal N(0,I)}\Big[\big\lVert\, \varepsilon - \varepsilon_\theta\big(\sqrt{\bar\alpha_k}x_0 + \sqrt{1-\bar\alpha_k}\,\varepsilon,\; k\big)\big\rVert^2\Big]$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;training is one regression: show the network a noised action plus the step number \(k\), and ask it to name the noise that was mixed in. Get that right at every level and you've learned the distribution.</p>
    <p>Sampling runs the reverse: start from pure noise, iteratively denoise. (Equivalent lens: \(\varepsilon_\theta\) is proportional to the <em>score</em> of the <em>noised</em> distribution, \(\nabla_{x}\log p_k(x) \approx -\varepsilon_\theta/\sqrt{1-\bar\alpha_k}\), and sampling follows the reverse-time SDE — loosely, annealed gradient ascent on log-density with the noise scale shrinking over steps. That's why diffusion captures multimodality so well: each mode is a basin, and the trajectory each sample takes — set by its noise seed and the injected noise — decides which basin it lands in. The picture "fixed log-density, climb the gradient" is a useful simplification, not the exact dynamics.)</p>
    <p><strong>Diffusion Policy</strong> (Chi et al.) applies this with three robotics-specific design moves that matter as much as the math:</p>
    <ul>
      <li><strong>Generate action <em>chunks</em>, not single actions:</strong> the "data" \(x_0\) is a sequence of the next \(H\) actions (e.g. 16), conditioned on recent observations. Sequence-level modeling captures temporal correlation in demos and fights compounding error: committing to a coherent short plan beats re-deciding (and re-erring) every 20 ms. Note the bias–variance echo: chunking trades reactivity for consistency.</li>
      <li><strong>Receding-horizon execution:</strong> execute the first few actions of the chunk, re-observe, regenerate — MPC's rhythm (Lecture 2) with a generative model where the optimizer used to be.</li>
      <li><strong>Visual conditioning + the right backbone:</strong> observation features condition the denoiser (CNN or transformer variants); the result trains stably by plain supervised learning (it's still BC! just with an expressive likelihood) and set the state of the art across manipulation benchmarks.</li>
    </ul>

    <h4>From noise to a decision — and back to multimodality</h4>
    <p>Diffusion can sound mysterious, so here is the whole idea in one image. A diffusion model learns to reverse a noising process; equivalently, it learns the <em>score</em> \(\nabla_a \log p(a\mid o)\) — the direction in action space that makes an action more plausible. Sampling just starts from random noise and repeatedly steps along that direction. Press <strong>Denoise</strong> and watch a cloud of pure noise resolve into the two valid action modes — "go left" and "go right," the same maneuvers the averaging trap destroyed two lectures ago.</p>
    <DiffWidget />

    <h3><span class="knum">6.4</span>Flow matching: diffusion's faster sibling</h3>
    <p>Same goal, neater mechanics: define a continuous path from noise to data, \(x_t = (1-t)\,\varepsilon + t\,x_0\) (straight-line interpolation, \(t\in[0,1]\)), and regress a velocity field onto the path's constant velocity:</p>
    <p>$$\mathcal L = \mathbb E_{x_0,\varepsilon,t}\Big[\big\lVert\, v_\theta(x_t, t) - (x_0 - \varepsilon)\big\rVert^2\Big]$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;on the straight line from noise to data the velocity is the constant arrow \(x_0-\varepsilon\); the network just learns to point that way at every point and time. No noise schedule, no long denoising chain.</p>
    <p>Sampling integrates the learned ODE \(\dot x = v_\theta(x,t)\) from noise to data — straighter paths, far fewer function evaluations than diffusion's many denoising steps, which matters when the policy must emit 50 action chunks per second on a real robot. This is the action head inside π0 (Lecture 9). If you remember one sentence: <em>flow matching ≈ diffusion with straight roads.</em></p>

    <h4>Sampling as ODE integration — the "straight roads" payoff</h4>
    <p>Flow matching's advantage is mechanical, and you can watch it. Sampling is just integrating the learned velocity field \(\dot x = v_\theta(x,t)\) from noise (\(t=0\)) to data (\(t=1\)) — each step is one network evaluation. Because the learned paths are nearly straight, you can take <em>few</em> big steps and still arrive; diffusion's curved, noisy reverse process needs many. Slide the step count and watch coarse-but-fast become smooth-but-exact, and notice how few steps can misroute the samples that start near the decision boundary between the two action modes.</p>
    <FlowodeWidget />

    <h3><span class="knum">6.5</span>Closing the loop with RL</h3>
    <p>Generative policies are trained by imitation — capped at demo quality (Lecture 3's ceiling). Can RL improve a diffusion policy? Directly backpropagating returns through a multi-step sampler is painful. The DSRL paper below offers an elegant dodge: freeze the diffusion policy and let RL act in its <em>latent noise space</em> — the RL agent picks the seed/noise, the frozen policy decodes it to actions. The diffusion model becomes a learned, safe, demo-shaped action space for RL: tiny action dimension, all actions plausible, hardware-safe exploration. A perfect L5↔L6 marriage, and a sign of where the field is heading (you'll see RL-over-VLA again as π*0.6 in Lecture 9).</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>"Regression to the mean" on multimodal targets</b></div><div class="arrow">→</div><div class="to"><b>The whole reason for this lecture</b>: \(\mathbb E[a|o]\) between valid modes is invalid; model \(p(a|o)\), then sample</div></div>
      <div class="bridge-row"><div class="from"><b>VAE / ELBO machinery</b></div><div class="arrow">→</div><div class="to"><b>CVAE policies</b> — same derivation, conditioned on observations; resurfaces as ACT's backbone (L7)</div></div>
      <div class="bridge-row"><div class="from"><b>Intractable normalizing constants</b> (Bayesian computation)</div><div class="arrow">→</div><div class="to"><b>Why IBC trains contrastively</b> — InfoNCE sidesteps \(Z(o)\) exactly the way your MCMC instincts expect</div></div>
      <div class="bridge-row"><div class="from"><b>Diffusion for images</b> (if you've met DDPMs)</div><div class="arrow">→</div><div class="to"><b>Diffusion Policy</b> — identical math; "image" = an action chunk; conditioning = observations; the innovations are robotics-shaped (chunking, receding horizon)</div></div>
      <div class="bridge-row"><div class="from"><b>Numerical ODE integration</b></div><div class="arrow">→</div><div class="to"><b>Flow-matching inference</b> — sampling is literally integrating a learned vector field; step count = your latency budget</div></div>
    </div>

    <h3><span class="knum">6.6</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2205.09991" target="_blank" rel="noopener">Planning with Diffusion for Flexible Behavior Synthesis (Diffuser)</a></div><div class="pmeta">Janner, Du et al. · 2022</div><p class="pwhy">Diffuse entire <em>trajectories</em> (states + actions jointly) and steer generation with guidance toward high reward or goal states — planning as conditional sampling rather than search. The trajectory-level sibling of Diffusion Policy, and the cleanest demonstration that "plan" and "sample from a generative model" can be the same operation. Bridges this lecture to world models (L8).</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2109.00137" target="_blank" rel="noopener">Implicit Behavioral Cloning</a></div><div class="pmeta">Florence et al. · 2021</div><p class="pwhy">The EBM policy paper: argmin-of-energy policies beat explicit regression dramatically on tasks with discontinuities and multimodality — with theory for <em>why</em> (implicit functions represent discontinuities that continuous explicit maps cannot). Read §2 for the cleanest statement of the expressiveness argument in the literature.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2506.15799" target="_blank" rel="noopener">Steering Your Diffusion Policy with Latent Space Reinforcement Learning</a></div><div class="pmeta">Wagenmaker et al. · 2025 (DSRL)</div><p class="pwhy">§6.5's idea executed: treat the frozen diffusion policy's noise as the action space; run sample-efficient off-policy RL there; improve real-robot behavior in tens of episodes without touching policy weights. Note the guest-lecture symmetry: Wagenmaker is week 5's spotlight speaker — RL and generative policies are one conversation now.</p></div>
    </div>

    <Quiz lecture="l6" />

    <div class="resources">
      <div class="res-head">Lecture 6 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture6_generative.pdf" target="_blank" rel="noopener">lecture6_generative.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://youtu.be/qd6Ldsuu46I" target="_blank" rel="noopener">YouTube recording — Lecture 6</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/tvFvIEOBKfM" target="_blank" rel="noopener">Cheng Chi (Sunday Robotics; Diffusion Policy &amp; UMI lead) — guest spotlight</a></li>
      </ul>
    </div>

    <CompleteBar id="l6" prev="l5" next="l7" prevLabel="← L05" nextLabel="NEXT: L07 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Quiz from '../components/Quiz.vue';
import DiffWidget from '../widgets/DiffWidget.vue';
import FlowodeWidget from '../widgets/FlowodeWidget.vue';
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
