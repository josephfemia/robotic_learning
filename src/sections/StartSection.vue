<template>
  <section class="lecture" id="start" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">ORIENTATION</span>
      <h2>How to use this companion</h2>
      <p class="dek">A lecture-by-lecture deep guide to the ETH Zürich Robot Learning course, written for someone who already knows machine learning and mathematics — and is building the robotics and RL layers on top.</p>
    </div>

    <p><strong>What this is.</strong> A self-contained study site for all twelve weeks of <em>Robot Learning: From Fundamentals to Foundation Models</em> (Oier Mees, ETH Zürich, Spring 2026). For each lecture you get: the conceptual core with full mathematical derivations, a <strong>Bridge panel</strong> that maps each new idea onto something you already know from ML, mathematics, or actuarial science, the week's discussion papers decoded, a self-check quiz, and direct links to the official slides, recordings, and homework.</p>

    <p><strong>What this is not.</strong> I built this from the official course syllabus, the week-by-week paper lists, and deep treatments of each topic — not from the slide decks themselves (they're image-based PDFs). So the coverage matches what the course covers, but Mees's specific examples, jokes, and slide-level ordering live in the videos. Treat this site as the textbook layer underneath the lectures: watch the video, then come here to make the math and the context stick — or read here first so the lecture feels like review.</p>

    <div class="callout"><span class="co-label">Suggested loop per lecture</span>
    <strong>1.</strong> Skim the lecture section here (15 min) → <strong>2.</strong> Watch the recording at 1.25–1.5× → <strong>3.</strong> Return here for the derivations and Bridge panels → <strong>4.</strong> Read the abstract + intro + figures of each discussion paper → <strong>5.</strong> Take the quiz → <strong>6.</strong> Do the matching homework if one exists → <strong>7.</strong> Mark complete.</div>

    <div class="callout"><span class="co-label">Interactive labs</span>Throughout the lectures you'll find panels tagged <span style="font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.1em;color:#fff;background:var(--signal);padding:2px 7px;border-radius:4px">INTERACTIVE</span> — small visual sandboxes in the spirit of 3Blue1Brown for the ideas that resist words. Watch value iteration propagate across a grid, watch a policy climb a reward landscape from reward alone, drag the PPO clip until the trust region appears, watch noise resolve into two valid actions. Play with the sliders — the intuition they build is the whole point.</div>

    <details class="dive" id="glossary"><summary>Notation key &amp; glossary — open this once, refer back as needed</summary><div class="dive-body">
      <p><strong>A note on \(s\) vs \(o\).</strong> Throughout, \(s\) is the <em>state</em> (a complete description of the situation) and \(o\) is the <em>observation</em> (what the robot's sensors actually report). In a fully-observed problem they're the same; in the real world the robot sees \(o\) and must infer what it needs about \(s\). RL theory is written in \(s\); imitation and generative-policy sections often write \(o\) because a camera image is the input. When you see \(\pi(a\mid s)\) and \(\pi(a\mid o)\), read them as the same idea — map situation to action — under different observability assumptions.</p>
      <p><strong>Symbols.</strong> \(\mathbb{E}[\cdot]\) expectation (probability-weighted average) · \(\nabla_\theta\) gradient w.r.t. parameters \(\theta\) · \(\sim\) "is sampled from" · \(\arg\max_a\) the action achieving the maximum · \(\int\) integral (continuous sum) · \(\odot\) element-wise product · \(\gamma\) discount factor · \(\alpha\) learning rate / step size · \(\pi_\theta\) policy (the network) · \(\tau\) a trajectory (one episode's states+actions).</p>
      <dl class="gloss">
        <dt>policy π</dt><dd>The decision rule mapping state/observation to an action (or a distribution over actions). The thing we ultimately want.</dd>
        <dt>rollout / trajectory τ</dt><dd>One run of the policy in the environment: the sequence \((s_0,a_0,r_0,s_1,a_1,\dots)\) it produces.</dd>
        <dt>return Gₜ</dt><dd>The (discounted) sum of rewards from time \(t\) onward — the quantity every RL method is trying to make large.</dd>
        <dt>value V(s) / action-value Q(s,a)</dt><dd>Expected return from a state (V), or from taking an action in a state then following the policy (Q). "How good is it here?"</dd>
        <dt>advantage A(s,a)</dt><dd>\(Q(s,a)-V(s)\): how much better this action is than the policy's average here. The signal modern policy gradients actually use.</dd>
        <dt>on-policy vs off-policy</dt><dd><b>On-policy</b>: you may only learn from data the <em>current</em> policy generated (PPO). <b>Off-policy</b>: you can reuse old data or others' data (Q-learning, SAC) — what makes replay buffers legal. This distinction gates half of Lectures 4–5.</dd>
        <dt>episodic vs continuing</dt><dd>Tasks that end (an episode: grasp the mug, done) vs. tasks that run forever (balance indefinitely). Discounting \(\gamma\) keeps returns finite in the continuing case.</dd>
        <dt>bootstrapping</dt><dd>Updating an estimate using your own current estimate (TD's \(r+\gamma V(s')\)). Lower variance, but biased while you're still wrong.</dd>
        <dt>replay buffer</dt><dd>A stored pool of past transitions \((s,a,r,s')\) sampled in random minibatches — decorrelates updates and reuses experience. Only valid for off-policy methods.</dd>
        <dt>critic / actor</dt><dd>The <b>critic</b> is a network that estimates value (it judges); the <b>actor</b> is the policy (it acts). Actor-critic methods run both in a loop.</dd>
        <dt>score function ∇log π</dt><dd>The gradient of log-probability of an action; the core object REINFORCE multiplies by return. Its expectation is zero — the fact behind baselines.</dd>
        <dt>reparameterization trick</dt><dd>Writing a sample as a differentiable function of noise (\(a=\mu+\sigma\varepsilon\)) so gradients flow through it. The low-variance alternative to the score function; powers SAC and VAEs.</dd>
        <dt>chunking / receding horizon</dt><dd>Predicting a short sequence of future actions at once, executing the first few, then re-planning. Borrowed from MPC; central to ACT, Diffusion Policy, π0.</dd>
      </dl>
      <p style="margin-top:16px"><strong>The VLA lineage (Lecture 9), decoded once.</strong> The acronym storm in L9 is really one family tree:</p>
      <dl class="gloss">
        <dt>VLM → VLA</dt><dd>A <b>Vision-Language Model</b> (image+text in, text out) becomes a <b>Vision-Language-Action</b> model when you let its output vocabulary include motor actions. That one move is the whole paradigm.</dd>
        <dt>LfP / MCIL</dt><dd><b>Learning from Play</b> / <b>Multi-Context Imitation Learning</b>: collect unscripted teleoperated play, relabel windows in hindsight as goal-reaching demos, train one goal-conditioned policy (goal = image or sentence). Mees's research line.</dd>
        <dt>CALVIN</dt><dd>Mees's benchmark for long-horizon, language-conditioned manipulation — chains of instructions from onboard sensing.</dd>
        <dt>Gato</dt><dd>One transformer, 600+ tasks, everything serialized to tokens — the maximalist "generality by tokenization" thesis.</dd>
        <dt>RT-1 / RT-2</dt><dd><b>Robotics Transformer</b>: RT-1 scaled within one robot (actions as 256 discrete bins); RT-2 fine-tuned a pretrained VLM to emit those action tokens, importing web semantics into control.</dd>
        <dt>OXE</dt><dd><b>Open X-Embodiment</b>: a pooled corpus of 1M+ trajectories from 22 robot types; proved pooling across <em>different</em> robot bodies helps each one (positive cross-embodiment transfer).</dd>
        <dt>Octo / OpenVLA</dt><dd>Open generalist policies trained on OXE — Octo with a diffusion/flow action head, OpenVLA a 7B open re-creation of RT-2 (Mees among the authors) adaptable via LoRA.</dd>
        <dt>π0 / π0.5 / π*0.6 / π0.7</dt><dd>Physical Intelligence's line: π0 = VLM + flow-matching action expert for 50 Hz control; π0.5 = open-world generalization via heterogeneous co-training + language subtask inference; π*0.6 = RL-from-experience (RECAP: advantage-conditioned policy) that improves past demonstration quality; π0.7 (April 2026) = a steerable generalist with first signs of compositional generalization — recombining trained skills under plain-language coaching, and doing zero-shot (e.g. espresso-machine operation) what π*0.6 needed experience-RL to reach.</dd>
        <dt>LoRA</dt><dd><b>Low-Rank Adaptation</b>: fine-tune a big model by training tiny low-rank weight deltas — cheap downstream adaptation to a new robot/task on consumer GPUs.</dd>
      </dl>
    </div></details>

    <p><button class="toggle-btn" id="bridgeToggle" @click="toggleBridges">{{ bridgeButtonLabel }}</button> <span class="notice">The "Bridge" panels map ideas onto an ML + actuarial background. If that framing isn't yours, hide them — everything else stands alone.</span></p>

    <h3>What you bring vs. what you're building</h3>
    <p>Your background is unusually well-suited to this course, more than you might think. Here's the honest inventory:</p>

    <div class="cmp-scroll"><table class="cmp">
      <tr><th>You already have</th><th>Where it pays off</th></tr>
      <tr><td>Supervised learning, losses, gradients, backprop, overfitting</td><td>Imitation learning (L3) <em>is</em> supervised learning; every policy is a neural net trained by gradient descent</td></tr>
      <tr><td>Probability, expectations, conditional distributions</td><td>Every single derivation in L4–L6. RL is applied probability.</td></tr>
      <tr><td>Markov chains (actuarial multi-state models, transition matrices)</td><td>An MDP is a Markov chain you get to steer. You know 70% of L2 already.</td></tr>
      <tr><td>Discounting, expected present value, reserves, recursion relations</td><td>This is the secret weapon. The Bellman equation is an actuarial recursion. See the Primer.</td></tr>
      <tr><td>Monte Carlo simulation, stochastic scenarios</td><td>Policy evaluation, REINFORCE, and every "rollout" in the course</td></tr>
      <tr><td>Generative models if you've touched VAEs/diffusion</td><td>L6 directly; if not, L6 builds them from scratch</td></tr>
      <tr><th>You're missing</th><th>Where this site fills it</th></tr>
      <tr><td>Robotics: kinematics, dynamics, control loops, sensors, sim</td><td>The Primer, Part A + L2</td></tr>
      <tr><td>RL: the agent–environment loop, value functions, the algorithm zoo</td><td>The Primer, Part B + L2, L4, L5</td></tr>
      <tr><td>The robot-learning literature and its lineage (who did what, why it mattered)</td><td>"The papers, decoded" in every lecture + L9–L11</td></tr>
    </table></div>

    <h3>The course in one map</h3>
    <p>The twelve weeks tell a single story: <em>how do we get robots to acquire skills from data instead of hand-written equations — and what happens when we scale that up?</em></p>

    <div class="hero-grid">
      <div class="hero-card"><div class="hc-num">L01–L02</div><h4>The problem &amp; the formalism</h4><p>Why robots are hard, why learning, and the MDP language everything else is written in.</p></div>
      <div class="hero-card"><div class="hc-num">L03</div><h4>Copy the expert</h4><p>Imitation learning: the simplest idea, its failure mode (compounding errors), and the fixes.</p></div>
      <div class="hero-card"><div class="hc-num">L04–L05</div><h4>Learn from reward</h4><p>Value-based RL, then policy gradients, PPO, SAC — the engines of modern robot RL.</p></div>
      <div class="hero-card"><div class="hc-num">L06–L07</div><h4>Better policy classes</h4><p>Diffusion policies and transformers: treat action generation as generative modeling and sequence modeling.</p></div>
      <div class="hero-card"><div class="hc-num">L08</div><h4>Learn the world itself</h4><p>World models: learn dynamics, then plan or train inside the dream.</p></div>
      <div class="hero-card"><div class="hc-num">L09–L10</div><h4>Foundation models</h4><p>Vision-Language-Action models, generalist policies, LLM reasoning and test-time compute for robots.</p></div>
      <div class="hero-card"><div class="hc-num">L11–L12</div><h4>The frontier</h4><p>Open problems, three competing worldviews, and perspectives from the people who built the field.</p></div>
    </div>

    <h3>Official course materials</h3>
    <div class="resources">
      <div class="res-head">Course-wide links</div>
      <ul>
        <li><span class="rtag">Page</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/" target="_blank" rel="noopener">Official course website (syllabus, slides, schedule)</a></li>
        <li><span class="rtag">YouTube</span><a href="https://www.youtube.com/playlist?list=PLPU18BnWYUZJx3_d901-GD6BGpeWwE2vx" target="_blank" rel="noopener">Main lecture playlist (Oier Mees)</a></li>
        <li><span class="rtag">Code</span><a href="https://github.com/mees-robot-learning-course/ethz-course-2026" target="_blank" rel="noopener">Course GitHub: homework 1–4 (PyTorch, Control/MDPs, Imitation, RL)</a></li>
        <li><span class="rtag">Recordings</span><a href="https://www.youtube.com/playlist?list=PLPU18BnWYUZJx3_d901-GD6BGpeWwE2vx" target="_blank" rel="noopener">All lecture recordings (YouTube)</a></li>
      </ul>
    </div>

    <p class="note">Progress you mark here is saved in your browser (localStorage) — it survives reloads on this device, and clearing the site's data resets it. It doesn't sync across devices.</p>

    <div class="complete-bar">
      <span class="note">Ready? Start with the Primer — it's the foundation everything else stands on.</span>
      <div class="pager"><button @click="$emit('navigate', 'primer')">NEXT: THE PRIMER →</button></div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useBridges } from '../composables/useBridges.js';
import { renderMath } from '../composables/useKaTeX.js';
import { applyXref } from '../composables/useXref.js';

defineEmits(['navigate']);

const rootEl = ref(null);
const { bridgeButtonLabel, toggleBridges } = useBridges();

onMounted(async () => {
  await nextTick();
  if (rootEl.value) {
    renderMath(rootEl.value);
    applyXref(rootEl.value);
  }
});
</script>
