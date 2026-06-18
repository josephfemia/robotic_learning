<template>
  <section class="lecture" id="l9" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 09 · APR 27</span>
      <h2>Generalist Robot Policies</h2>
      <p class="dek">One model, many tasks, many robots. Language-conditioned policies, the Vision-Language-Action paradigm, and the scaling race from RT-1 through OpenVLA to π — the lecture closest to the instructor's own research.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> L3 · L6 · L7 · transfer learning</span>
      <span class="chip"><b>Time</b> ~45 min</span>
      <span class="chip"><b>Watch first</b> the RT-1 → π comparison table (§9.5)</span>
      <span class="chip"><b>Tools</b> OpenVLA / Octo repos · LoRA</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>A VLA is a VLM whose output vocabulary includes actions — not a brand-new architecture.</li>
        <li>Pooling data across <em>different</em> robot bodies helps (positive cross-embodiment transfer) — the empirical surprise of OXE.</li>
        <li>Success rate under distribution shift, not training loss, is the metric that matters — and evaluation is the bottleneck (L11).</li>
      </ul>
    </div>

    <h3><span class="knum">9.1</span>From specialist to generalist</h3>
    <p>Everything so far trained one policy per task. The generalist program inverts the economics: train one policy across <em>hundreds</em> of tasks and (eventually) <em>many robot bodies</em>, so that skills share representation, new tasks need only a language prompt or a few demos, and — the deepest bet — <strong>capability scales with total data like it did for language models</strong>. Two prerequisites had to fall into place: a universal task interface (natural language: compositional, human-native, and — crucially — the input format of pretrained VLMs), and data (cross-robot demonstration pools). This lecture is the story of both.</p>

    <h3><span class="knum">9.2</span>Language-conditioned imitation and learning from play</h3>
    <p>The lineage starts here — and it's Mees's own research line, so expect lecture depth. <strong>Learning from Play (LfP):</strong> instead of curated per-task demos, collect hours of unscripted teleoperated <em>play</em> — a human freely interacting with a kitchen — then <em>relabel in hindsight</em>: any trajectory window is a demonstration of reaching its own endpoint (goal-conditioned), and a small fraction gets after-the-fact language descriptions. Multi-context imitation trains one policy \(\pi(a\,|\,o, \text{goal})\) where the goal slot accepts an image <em>or</em> a sentence mapped into a shared latent space. The economics are the point: play is cheap, dense, diverse, and never "off-task"; hindsight turns all of it into supervision (your ML instinct for "self-supervision via relabeling" applies exactly). <strong>CALVIN</strong> — Mees's benchmark — standardized evaluation for this setting: long-horizon chains of language instructions ("open the drawer… now put the block inside… now turn on the light") executed from onboard sensing. And <strong>Gato</strong> supplied the maximalist data-side thesis: one transformer, 600+ tasks (Atari, captioning, real robot stacking), everything serialized to tokens — generality demonstrated, though per-domain mastery and cross-domain <em>transfer</em> remained the open question it bequeathed to the VLA era.</p>

    <h3><span class="knum">9.3</span>The VLA paradigm: RT-1 → RT-2</h3>
    <p><strong>RT-1</strong> proved the scaling recipe on one embodiment: ~130k real demonstrations, 700+ tasks, a transformer over image tokens + language embedding, actions discretized to 256 bins per dimension (L7's tokenization choice) — 97% success on seen tasks and meaningful generalization to new combinations. <strong>RT-2</strong> then made the move that named the field: start from a pretrained <em>vision-language model</em> (web-scale knowledge of objects, relations, text) and <strong>fine-tune it to emit action tokens as if they were words</strong> — co-training on web data and robot data so the language abilities don't wash out. The payoff is <em>semantic</em> generalization no amount of robot-only data buys: "pick up the extinct animal" → the dinosaur toy; "move the can to Taylor Swift" → it knows Taylor Swift. The robot's grounding problem meets the internet's knowledge, in one set of weights. That is the Vision-Language-<em>Action</em> model: a VLM whose output vocabulary includes motor control.</p>

    <div class="callout"><span class="co-label">The VLA recipe, step by step</span>
    <strong>1.</strong> Start from a <em>pretrained</em> vision-language model (web-scale knowledge of objects, relations, language). <strong>2.</strong> Extend its vocabulary/output with <em>actions</em> — either as discrete tokens (RT-2: bin each dimension into words) or via a continuous head (Octo/π0: a diffusion or flow expert generating chunks). <strong>3.</strong> <em>Co-train</em> on web data + robot trajectories so the language/vision abilities don't wash out as it learns control (this co-training is the load-bearing trick). <strong>4.</strong> At test time, prompt with an instruction + current image; the model emits action tokens, which are detokenized into motor commands. <strong>5.</strong> Adapt cheaply to a new robot/task with a little data (LoRA fine-tuning). Every model in the table below is a different choice at steps 1–2.</div>

    <h3><span class="knum">9.4</span>Open data, open models: OXE, Octo, OpenVLA</h3>
    <p><strong>Open X-Embodiment</strong> pooled trajectories from 20+ institutions' different robots into one corpus (over a million trajectories, 22 embodiments) and showed the unreasonable result: co-training across <em>other people's robots</em> improves <em>your</em> robot — positive cross-embodiment transfer, the field's ImageNet moment for data. <strong>Octo</strong> built the open generalist on it: a transformer trunk with a <strong>diffusion action head</strong> (L6 arrives in the generalist stack — continuous, multimodal chunks instead of binned tokens; the field has since largely converged on <em>flow-matching</em> heads for the same reason §6.4 gives — fewer sampling steps at control rate) and modular goal interfaces. <strong>OpenVLA</strong> — with Mees among the authors — is the open RT-2: a 7B VLA (Llama-2 language backbone; fused DINOv2 + SigLIP vision features) trained on ~970k OXE trajectories, outperforming the 55B RT-2-X while being fully open, and demonstrating cheap downstream adaptation via LoRA fine-tuning on consumer GPUs. The strategic meaning: the VLA recipe stopped being a closed-lab capability and became infrastructure anyone (including this course's projects) can build on.</p>

    <h4>Why pooling other people's robots helps yours</h4>
    <p>The OXE result is counterintuitive enough to deserve a picture: training on data from <em>different</em> robot bodies — different arms, grippers, cameras — improves performance on the one you care about, versus training on its data alone. Add embodiments to the pool below and watch the target robot's success rise as shared structure (objects, physics, task semantics) transfers, even though no two robots are identical.</p>
    <XembodWidget />

    <h3><span class="knum">9.5</span>The π line: flow matching, open worlds, and learning from experience</h3>
    <p>Physical Intelligence's series is the current reference point, and each step answers a question this course has equipped you to ask. <strong>π0:</strong> how do you get VLM semantics <em>and</em> dexterous 50 Hz control? A PaliGemma VLM backbone with a separate <strong>flow-matching action expert</strong> (L6's §6.4, verbatim) generating continuous action chunks — trained over many embodiments, post-trained per application (laundry folding, table bussing). <strong><a href="https://arxiv.org/abs/2504.16054" target="_blank" rel="noopener">π0.5</a>:</strong> does it generalize <em>out of the lab</em>? Co-training on heterogeneous data (multi-robot, web, verbal instructions) plus a hierarchical scheme — the model first infers a high-level subtask in language, then decodes actions — yielding cleaning behavior in entirely unseen homes. <strong>π*0.6 (the week's paper):</strong> can a VLA <em>improve from its own experience</em> instead of plateauing at demonstration quality — Lecture 3's ceiling, at foundation scale? The RECAP recipe: train a value function on mixed-quality experience, condition the policy on advantage (good/bad framing of its own past — note the Decision-Transformer DNA), add corrections; result: roughly doubled throughput and halved failures on long-horizon real tasks (espresso making, box folding), with RL-from-experience as the engine. The arc of the whole course — IL's ceiling, RL's improvement, sequence-model conditioning — converging in one production system.</p>

    <div class="cmp-scroll"><table class="cmp">
      <tr><th>Model</th><th>Backbone</th><th>Action head</th><th>Data</th><th>What it proved</th></tr>
      <tr><td>RT-1 (2022)</td><td>Transformer from scratch</td><td>Discrete bins</td><td>130k demos, 1 robot</td><td>Scale works within one embodiment</td></tr>
      <tr><td>RT-2 (2023)</td><td>Pretrained VLM</td><td>Action-as-text tokens</td><td>Web + robot co-training</td><td>Internet semantics transfer to control</td></tr>
      <tr><td>Octo (2024)</td><td>Transformer</td><td>Diffusion head</td><td>OXE (~800k traj.)</td><td>Open generalist; continuous multimodal actions</td></tr>
      <tr><td>OpenVLA (2024)</td><td>Llama-2 + DINOv2/SigLIP</td><td>Discrete tokens</td><td>OXE (~970k traj.)</td><td>Open 7B &gt; closed 55B; LoRA adaptation</td></tr>
      <tr><td>π0 / π0.5 (2024–25)</td><td>PaliGemma VLM</td><td>Flow-matching expert</td><td>Cross-embodiment + web</td><td>Dexterous 50 Hz control; unseen-home generalization</td></tr>
      <tr><td>π*0.6 (2025)</td><td>π0.5 lineage</td><td>Flow + advantage conditioning</td><td>+ on-robot experience</td><td>RL-from-experience improves a deployed VLA</td></tr>
    </table></div>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Pretrain → fine-tune</b> (BERT/GPT era instincts)</div><div class="arrow">→</div><div class="to"><b>VLAs</b> — the same playbook with a twist: the fine-tuning <em>adds a modality</em> (actions), and co-training guards the pretrained knowledge</div></div>
      <div class="bridge-row"><div class="from"><b>Hindsight relabeling / self-supervision</b></div><div class="arrow">→</div><div class="to"><b>Learning from play</b> — every window of experience is a demo of reaching its own end; supervision manufactured from unlabeled interaction</div></div>
      <div class="bridge-row"><div class="from"><b>Pooled vs. stratified modeling</b> (credibility across heterogeneous portfolios)</div><div class="arrow">→</div><div class="to"><b>Cross-embodiment training</b> — OXE's bet that pooling heterogeneous robots beats per-robot models; the transfer result is the empirical surprise</div></div>
      <div class="bridge-row"><div class="from"><b>Scaling laws mindset</b> (loss vs. data/params)</div><div class="arrow">→</div><div class="to"><b>The generalist program itself</b> — with the caveat that robot "loss" is success rate under distribution shift, and evaluation (not parameters) is the bottleneck (L11)</div></div>
    </div>

    <h3><span class="knum">9.6</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2005.07648" target="_blank" rel="noopener">Language Conditioned Imitation Learning over Unstructured Data</a></div><div class="pmeta">Lynch &amp; Sermanet · 2021 (MCIL / LfP line)</div><p class="pwhy">The founding paper of §9.2: play data, hindsight goals, a shared latent goal space where images and sentences meet — language control of a real robot from mostly-unlabeled interaction. Read it to understand the data philosophy underneath CALVIN and, ultimately, π0.5's co-training.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2205.06175" target="_blank" rel="noopener">A Generalist Agent (Gato)</a></div><div class="pmeta">Reed et al. · 2022</div><p class="pwhy">Maximalist token-unification: one 1.2B transformer for games, text, images, and real robot stacking. Its enduring lessons are its limits — generality without strong transfer, capacity contention between domains — which define exactly the problems RT-2/π solved with pretrained VLM backbones. (Its lead author is week 8's guest.)</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2511.14759" target="_blank" rel="noopener">π*0.6: a VLA That Learns From Experience</a></div><div class="pmeta">Physical Intelligence · 2025</div><p class="pwhy">§9.5's capstone: RECAP — value-function training on autonomous experience, advantage-conditioned policy updates, expert corrections — pushing a deployed VLA past its demonstration ceiling on multi-hour real tasks. Read it as the synthesis exam for Lectures 3, 5, and 7: you now recognize every component.</p></div>
    </div>

    <Quiz lecture="l9" />

    <div class="resources">
      <div class="res-head">Lecture 9 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture9_generalist_policies.pdf" target="_blank" rel="noopener">lecture9_generalist_policies.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://video.ethz.ch/lectures/d-infk/2026/spring/263-5911-00L/v/KyyHLxpERXT" target="_blank" rel="noopener">ETH video portal — Lecture 9</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/pzolgvyWEFY" target="_blank" rel="noopener">Quan Vuong (Physical Intelligence co-founder) — guest spotlight</a></li>
        <li><span class="rtag">Context</span><a href="http://calvin.cs.uni-freiburg.de/" target="_blank" rel="noopener">CALVIN benchmark</a> · <a href="https://robotics-transformer-x.github.io/" target="_blank" rel="noopener">Open X-Embodiment</a> · <a href="https://openvla.github.io/" target="_blank" rel="noopener">OpenVLA</a></li>
      </ul>
    </div>

    <CompleteBar id="l9" prev="l8" next="l10" prevLabel="← L08" nextLabel="NEXT: L10 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import XembodWidget from '../widgets/XembodWidget.vue';
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
