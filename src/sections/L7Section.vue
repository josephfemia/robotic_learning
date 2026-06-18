<template>
  <section class="lecture" id="l7" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 07 · MAR 30</span>
      <h2>Sequence Modeling &amp; Transformers</h2>
      <p class="dek">Trajectories as sequences, control as next-token prediction. Decision Transformers, ACT/ALOHA, and humanoid locomotion as language modeling — the lecture where robotics formally merges with the LLM toolchain.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> transformers/attention · L3 · L6</span>
      <span class="chip"><b>Time</b> ~45 min</span>
      <span class="chip"><b>Watch first</b> the Decision-Transformer lab (§7.2)</span>
      <span class="chip"><b>Tools</b> PyTorch / HF Transformers</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>Conditioning on a return (Decision Transformer) is <em>not</em> the same as optimizing it — it can't "stitch" better-than-seen trajectories.</li>
        <li>Action chunking trades reactivity for consistency; it's a bias–variance choice, not a free lunch.</li>
        <li>Tokenizing actions into bins quantizes precision and factorizes the dimensions.</li>
      </ul>
    </div>

    <h3><span class="knum">7.1</span>The reframe</h3>
    <p>A trajectory \((s_0, a_0, r_0, s_1, a_1, \dots)\) is, squinting only slightly, a <em>sentence</em>. The previous five lectures processed it with bespoke machinery — Bellman backups, policy gradients. This lecture asks: what if we just feed it to the architecture that conquered every other sequence domain, and train by next-token prediction? Three things you already know about transformers transfer instantly: attention handles long-range dependencies (long-horizon credit and non-Markov observations — our POMDP medicine from the Primer), they scale gracefully with data and parameters, and they accept <em>any</em> tokenized modality in one stream — images, language, proprioception, actions. That last property is the technical foundation of Lectures 9–10.</p>

    <p>Since the rest of the lecture leans on it, here is the one operation a transformer repeats, made explicit. Each token is projected to a <em>query</em>, <em>key</em>, and <em>value</em>; every token's output is a weighted average of all values, weighted by how well its query matches each key:</p>
    <p>$$\text{Attention}(Q,K,V) = \mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d}}\right)V$$</p>
    <p class="recap">every token looks at every other token, decides how relevant each is (the softmax weights), and pulls in a blend of their information — which is how a frame at \(t{=}3\) can directly attend to one at \(t{=}300\) with no decay. Causal masking (zeroing future positions) makes it predict-the-next-token; that's the entire engine below.</p>

    <h4>See attention reach across time</h4>
    <p>The claim that "a late token can attend directly to an early one with no decay" is worth seeing as a grid. Below is the attention matrix over a short trajectory: row \(i\) is the token doing the looking, column \(j\) is what it looks at, and brightness is the weight. Turn on the causal mask to grey out the future (each token sees only the past — that's what makes it a next-token predictor), and drag the temperature to watch attention sharpen onto a few tokens or spread evenly. Note there's no diagonal falloff: position 12 can land most of its weight on position 1.</p>
    <Lab
      id="attn"
      title="Attention over a trajectory: no distance decay"
      :note="`Unlike an RNN's fading memory, attention weight depends on query–key <em>match</em>, not distance — the structural reason transformers handle long-horizon credit and non-Markov observations so well. The causal mask is the only thing that turns this into autoregression.`"
    />

    <h3><span class="knum">7.2</span>Decision Transformer: RL as conditional generation</h3>
    <p>The cleanest version of the reframe. Tokenize trajectories as triples — <strong>return-to-go</strong> \(\hat R_t = \sum_{t'\ge t} r_{t'}\), state, action — and train a causal transformer on offline data to predict actions:</p>
    <p>$$(\hat R_0, s_0, a_0, \hat R_1, s_1, a_1, \dots) \qquad \mathcal L = -\sum_t \log p_\theta\big(a_t \mid \hat R_{\le t}, s_{\le t}, a_{&lt; t}\big)$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;flatten the trajectory into a token stream where each action is preceded by the return you still want to earn, then train a plain next-token predictor. RL becomes supervised sequence modeling: at test time you <em>prompt</em> with a high desired return and let the transformer autocomplete the actions.</p>
    <p>The return-to-go conditioning is the whole trick: the model learns <em>what actions tend to follow when this much future return is achieved</em>. At test time, you prompt it with a <em>high</em> desired return and it generates actions consistent with being good. No value function, no Bellman backup, no policy gradient — supervised learning plus a clever prompt. It matches offline-RL baselines on standard benchmarks.</p>
    <p>The honest 2024+ update, worth stating as an empirical result and not just a conceptual worry: on tasks that <em>demand</em> stitching — sparse-reward navigation like AntMaze, where the optimal path is assembled from fragments of many suboptimal trajectories — return-conditioned sequence models underperform dynamic-programming offline methods (IQL, CQL) that bootstrap values. Conditioning interpolates; bootstrapping composes. Knowing which your task needs is the practical decision.</p>
    <p>Now the caveat your RL training should make you ask: conditioning on outcomes is not optimization. DT struggles with <strong>stitching</strong> — combining the good first half of one mediocre trajectory with the good second half of another to form a path better than anything in the data. Dynamic programming (Q-learning) stitches natively; pure sequence modeling imitates conditioned slices of what it saw. (It also asks a distribution to extrapolate when you prompt returns above the dataset's best.) The honest summary: <em>DT is goal/outcome-conditioned imitation wearing RL's clothes</em> — immensely practical, philosophically clarifying, not a free replacement for value-based reasoning.</p>

    <h4>Conditioning is not optimizing — watch where it breaks</h4>
    <p>Decision Transformer's trick is to prompt a desired return-to-go and let the model generate actions "consistent with being that good." So the natural question: prompt a bigger number, get a better policy? The lab makes the answer concrete. Within the range of returns the dataset actually contains, asking for more delivers more — the green curve tracks the prompt. Push past the best trajectory ever seen and you leave the data's support: the model has nothing to imitate, can't <em>stitch</em> together a better-than-seen path the way dynamic programming would, and degrades.</p>
    <Lab
      id="dt"
      title="Return-conditioned generation: it delivers, until the data runs out"
      :note="`This is the precise sense in which outcome-conditioned imitation differs from RL: it interpolates within demonstrated returns but cannot extrapolate or stitch beyond them. It's the visual form of the &quot;Watch out for&quot; note above — and why DT shines for stability and scaling, yet cedes ground to value-based methods when trajectory stitching matters.`"
    />

    <h3><span class="knum">7.3</span>ACT &amp; ALOHA: the transformer recipe for real manipulation</h3>
    <p>The most copied imitation recipe in modern robotics. <strong>ALOHA</strong> is the hardware/data side: a cheap (~$20k) bimanual teleoperation rig — two leader arms you puppeteer, two followers that mirror — yielding smooth 50 Hz demonstrations of genuinely fine tasks (slotting a battery, opening a translucent cup, zip ties). <strong>ACT</strong> (Action Chunking with Transformers) is the policy: a <strong>CVAE</strong> whose encoder compresses the demonstrated action sequence into a latent style variable \(z\) (Lecture 6's tool, absorbing demo multimodality/inconsistency), and whose decoder — a transformer conditioned on multi-camera images, proprioception, and \(z\) — emits a <strong>chunk of ~100 future actions</strong>. Two further design points:</p>
    <ul>
      <li><strong>Chunking at 50 Hz</strong> shortens the <em>effective</em> horizon by ~100×: a 1,500-step task becomes a 15-decision task. Recall \(O(\epsilon T^2)\) from Lecture 3 — shrinking \(T\) attacks compounding error at its root.</li>
      <li><strong>Temporal ensembling:</strong> chunks are re-generated every step with overlapping predictions averaged (exponentially weighted), so commitment doesn't cost smoothness or reactivity.</li>
    </ul>
    <p>With ~50 demonstrations per task — tens of minutes of human time — ACT reaches high success on precise bimanual manipulation. This recipe (teleop rig + transformer + chunking) is the direct ancestor of the data engines behind today's humanoid startups.</p>

    <h4>The rhythm: predict a chunk, execute a few, re-plan</h4>
    <p>Chunking, receding-horizon execution, and temporal ensembling share one rhythm with MPC (Lecture 2). The model predicts a whole chunk of future actions; you execute only the first few, then re-observe and predict again, and where chunks overlap you average them. Step through the loop below: watch the predicted chunk (faint) get committed a few steps at a time (solid), and toggle ensembling to see the overlapping predictions blend into a smoother path. Shorten the execution stride for more reactivity, lengthen it for more commitment — the bias–variance dial of §7.1.</p>
    <Lab
      id="chunk"
      title="Action chunking &amp; receding-horizon execution"
      :note="`Re-planning every step (short stride) is maximally reactive but can jitter; committing to a long chunk is smooth but slow to correct. Temporal ensembling averages overlapping chunk predictions to get most of the smoothness <em>and</em> the reactivity — the same MPC rhythm behind Diffusion Policy and π0.`"
    />

    <h3><span class="knum">7.4</span>Humanoid locomotion as next-token prediction</h3>
    <p>The third paper pushes the reframe to its logical end: model raw <em>sensorimotor streams</em> autoregressively — observations and actions interleaved as tokens — and walking emerges as fluent "speech." Two ideas matter beyond the headline. First, <strong>modality-aligned masking</strong> lets the model train on <em>incomplete</em> sequences: human videos and motion capture have observations but no robot actions; mask the action slots, learn from what's there. Suddenly YouTube-scale data becomes (partially) robot-relevant — a preview of L8's video-as-world-model thesis and the field's answer to its data famine. Second, the result transferred <strong>zero-shot to a real humanoid in San Francisco</strong> — trained on 27 hours of mixed-quality data, walking untethered. Autoregression over tokens is not just a benchmark trick; it survives contact with pavement.</p>

    <h3><span class="knum">7.5</span>Tokenization: the load-bearing design decision</h3>
    <p>Once everything is a token, the question "what is a token?" becomes the architecture. For <em>observations</em>: patch embeddings (ViT-style) vs. learned visual tokens vs. pretrained VLM features. For <em>actions</em>: per-dimension binning (256 bins — RT-1/RT-2's choice; simple, plays perfectly with language-model vocabularies, but quantizes precision and factorizes dimensions) vs. <em>continuous heads</em> bolted onto the transformer trunk — a diffusion or flow head generating chunks (Octo, π0; precise, multimodal, slower to sample). This binning-vs-generative-head tension is the central architectural fault line running through Lecture 9; you now have the tools to understand both sides.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Next-token LM training</b> (cross-entropy over a vocabulary)</div><div class="arrow">→</div><div class="to"><b>Everything in this lecture</b> — same loss; the vocabulary now includes motor commands</div></div>
      <div class="bridge-row"><div class="from"><b>Conditioning a generative model</b> (class-conditional generation, prompting)</div><div class="arrow">→</div><div class="to"><b>Return-to-go in DT</b> — "generate a good trajectory" as a prompt; also the cleanest critique: conditioning ≠ optimizing</div></div>
      <div class="bridge-row"><div class="from"><b>Masked-token pretraining</b> (BERT-style)</div><div class="arrow">→</div><div class="to"><b>Modality-aligned masking</b> — train on action-less video by masking action slots; the key that unlocks heterogeneous data</div></div>
      <div class="bridge-row"><div class="from"><b>Sequence-to-sequence with latent variables</b></div><div class="arrow">→</div><div class="to"><b>ACT</b> = CVAE (L6) + transformer decoder + chunking (L6) — every part already in your kit; the contribution is the combination and the data rig</div></div>
    </div>

    <h3><span class="knum">7.6</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2106.01345" target="_blank" rel="noopener">Decision Transformer: Reinforcement Learning via Sequence Modeling</a></div><div class="pmeta">Chen, Lu et al. · 2021</div><p class="pwhy">The paper that made "RL = sequence modeling" a research program. Read for the framing and the return-conditioning trick; read the <em>discussions it sparked</em> (when does conditioning match optimization?) for the education. Its true legacy is sociological: it licensed the field to bring the full LLM toolchain to control.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2304.13705" target="_blank" rel="noopener">Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware (ALOHA / ACT)</a></div><div class="pmeta">Zhao, Kumar, Levine &amp; Finn · 2023</div><p class="pwhy">Hardware + algorithm co-design at its best: the rig makes 50 Hz bimanual demos cheap; CVAE+chunking makes 50 demos enough. The most influential imitation paper of its era — its descendants (mobile ALOHA, the humanoid teleop farms) are collecting the datasets Lecture 9's models train on.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2402.19469" target="_blank" rel="noopener">Humanoid Locomotion as Next Token Prediction</a></div><div class="pmeta">Radosavovic et al. · 2024</div><p class="pwhy">Sensorimotor autoregression + masked missing modalities + 27h of heterogeneous data → zero-shot real-world humanoid walking. The existence proof that the LM recipe — tokenize everything, predict the next thing, scale data diversity — operates a physical body.</p></div>
    </div>

    <Quiz lecture="l7" />

    <div class="resources">
      <div class="res-head">Lecture 7 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture7_sequence_modeling.pdf" target="_blank" rel="noopener">lecture7_sequence_modeling.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://video.ethz.ch/lectures/d-infk/2026/spring/263-5911-00L/v/F8PRjuPO59n" target="_blank" rel="noopener">ETH video portal — Lecture 7</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/VS7Ulaugevg" target="_blank" rel="noopener">Ted Xiao (Prometheus, ex-Google DeepMind): Three Eras of Robot Learning</a> — watch this one; it's the course's historical thesis in 30 minutes</li>
      </ul>
    </div>

    <CompleteBar id="l7" prev="l6" next="l8" prevLabel="← L06" nextLabel="NEXT: L08 →" @navigate="$emit('navigate', $event)" />
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
