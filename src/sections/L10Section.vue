<template>
  <section class="lecture" id="l10" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 10 · MAY 04</span>
      <h2>Embodied Reasoning &amp; Test-time Scaling</h2>
      <p class="dek">Putting the "thinking" in robots: LLMs as planners, chain-of-thought with motors attached, in-context imitation, and the newest scaling axis — spending compute at decision time instead of training time.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> LLMs / agents · L9</span>
      <span class="chip"><b>Time</b> ~35 min</span>
      <span class="chip"><b>Watch first</b> SayCan (§10.2)</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>The LLM <em>proposes</em>; a value/affordance model decides what's physically feasible — reasoning ≠ acting (the SayCan split).</li>
        <li>Test-time compute (more thinking before acting) is a genuine new scaling axis, not a gimmick.</li>
      </ul>
    </div>

    <h3><span class="knum">10.1</span>The division of labor: semantic reasoning vs. physical skill</h3>
    <p>"Clean up this spill" requires two different competences: knowing <em>what to do</em> (find a towel, towels live in drawers, wipe then discard) and knowing <em>how to do it</em> (perception, grasping, contact control). Lectures 3–9 built the second. The first is exactly what LLMs absorbed from the internet. This lecture is about wiring them together — and about the failure mode that wiring must solve: an LLM's plan can be linguistically perfect and physically impossible. The model knows what "fetch a sponge" means; it doesn't know whether <em>this robot, in this kitchen, right now</em> can do it. Grounding language in physical feasibility is the lecture's central problem.</p>

    <h3><span class="knum">10.2</span>SayCan: feasibility as a value function</h3>
    <p>The elegant founding solution. Maintain a library of learned skills, each with a language description and — here's the move — a <strong>value function</strong> (Lectures 4–5!) estimating its success probability from the current observation. Score each candidate skill by the product:</p>
    <p>$$\text{score}(\text{skill}) \;=\; \underbrace{p_{\text{LLM}}(\text{skill description} \mid \text{instruction, history})}_{\text{“Say”: does this make semantic sense?}} \;\times\; \underbrace{V_{\text{skill}}(o_t)}_{\text{“Can”: is it physically feasible here?}}$$
    </p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;rank candidate skills by two multiplied votes: the LLM says how much each <em>makes sense</em> for the instruction, and a learned value function says how <em>likely it is to physically succeed right now</em>. A plan that's sensible but impossible (fetch a sponge in a sponge-less room) gets its feasibility vote driven to zero and falls out of the ranking. It's a prior × likelihood — exactly your Bayesian reflex, with the value function as the grounding term.</p>
    <p>The LLM proposes; affordances dispose. A request for a sponge in a sponge-less room gets its "fetch sponge" plan vetoed by the value term and rerouted to an alternative. Your takeaway pattern — <em>LLM prior × learned grounding</em> — recurs everywhere downstream.</p>

    <h4>Watch the affordance term veto a sensible plan</h4>
    <p>The product is easy to feel once you can move the two votes independently. Below, an instruction yields several candidate skills, each with an <em>LLM score</em> (does this make sense?) and an <em>affordance score</em> (can I do it here, now?). Toggle whether a sponge is in the room and watch the ranking re-sort: when the sponge vanishes, "pick up the sponge" keeps its high language score but its feasibility collapses, so the product drops it down the list and a feasible alternative wins.</p>
    <SaycanWidget />

    <h3><span class="knum">10.3</span>Reasoning in code, and agents that grow</h3>
    <p><strong>Code as Policies:</strong> have the LLM emit <em>programs</em>, not action strings — Python composing perception calls and motion primitives, with loops, conditionals, and arithmetic. Code is the natural representation for spatial-numeric reasoning ("place them 5 cm apart in a line"), it's inspectable, and it composes. <strong>Voyager</strong> (in Minecraft, but the architecture is the point) closes the loop into an open-ended agent: an automatic curriculum proposes next goals, the LLM writes code to attempt them, execution errors and environment feedback drive iterative refinement, and verified successes are stored in a <strong>skill library</strong> — retrievable, composable, permanent. No gradient updates anywhere: the "learning" is accumulated, reusable code. This is lifelong learning as software engineering, and a preview of how robot systems may acquire competence without touching model weights.</p>

    <h3><span class="knum">10.4</span>Thinking before acting: embodied chain-of-thought</h3>
    <p>Bring the reasoning <em>inside</em> the VLA: before emitting actions, generate intermediate text — task decomposition, object locations, gripper state, the immediate subgoal — then act conditioned on that scratchpad. Training data for the reasoning traces is synthesized by foundation models annotating existing robot datasets (the field's favorite bootstrap). The benefits mirror CoT in LLMs: better generalization, and <em>interpretability with stakes</em> — you can read why the robot is reaching before it reaches. The cost is the robotics-specific one: <strong>latency</strong>. Tokens take time, and a 50 Hz control loop doesn't wait. The week's paper (Chen et al.) studies exactly this tension — training strategies that keep the reasoning benefit while meeting real-time budgets (think: reason sparsely, act densely; cache and amortize thoughts across action chunks).</p>

    <h3><span class="knum">10.5</span>In-context imitation: prompting instead of fine-tuning</h3>
    <p>LLMs' most magical property — few-shot learning from the prompt, no weight updates — ported to robots. <strong>ICRT</strong>: train a causal transformer over robot sensorimotor sequences such that, at test time, you <em>prompt</em> it with a few raw teleoperated demonstrations of a brand-new task, and it continues the pattern on new scenes — next-token prediction where the "tokens" are observation-action pairs and the "few-shot examples" are demos. Teaching a robot collapses from a training run to a conversation. Connect it backward: this is Lecture 7's paradigm taken to its destination, and the mechanism (induction over in-context patterns) is the same one you exploit every time you few-shot an LLM.</p>

    <h3><span class="knum">10.6</span>Test-time scaling: the newest axis</h3>
    <p>The LLM world's 2024–25 lesson: after training, you can still buy capability with <em>inference</em> compute — longer reasoning chains, multiple samples with selection, search. The embodied version is taking shape along three lines: <strong>sample-and-verify</strong> (generate \(N\) candidate plans/action chunks, score them with a value function or verifier model — Lecture 4's machinery reborn as a test-time filter), <strong>deliberate planning</strong> (search over world-model rollouts, L8, with more search when stakes are high), and <strong>hierarchical System-1/System-2 designs</strong> — a large reasoning model thinking slowly at 1 Hz (subtasks, recovery, common sense) atop a fast reactive policy at 50–200 Hz (π0.5's subtask-then-act structure is exactly this shape). The open question the lecture leaves you with: in language, verification is often easy relative to generation; in the physical world, verifying "will this grasp succeed?" can be as hard as the task itself. Where verification is cheap, test-time scaling will pay; where it isn't, training-time competence still rules.</p>
    <p>This generalizes beyond robotics into a single principle: <strong>test-time compute pays off exactly in proportion to how much easier verifying is than generating</strong>. It is why formal math and code scaled first (a proof checks, a unit test runs), the same asymmetry that lets RLHF reward models be gamed (the verifier is a learned approximation, so optimizing hard against it finds its blind spots), and the reason physical tasks are the hard case — confirming a grasp will hold can be as expensive as attempting it. Read "is my verifier cheaper and more reliable than my generator?" as the question that decides whether to spend compute at inference at all.</p>

    <h4>Best-of-N is only as good as its judge</h4>
    <p>Sample-and-verify sounds like a free win: generate \(N\) candidate plans, keep the one the verifier likes best. The catch is the verifier. Below, raise \(N\) and watch success climb — when the verifier is accurate. Now degrade the verifier and push \(N\) up: the system confidently selects candidates that <em>score</em> well but <em>fail</em>, and more samples make it worse, not better. This is reward-model hacking and the robot grasp-verification problem in one picture.</p>
    <BonWidget />

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Prior × likelihood</b> (Bayesian reflex)</div><div class="arrow">→</div><div class="to"><b>SayCan's score</b> — LLM semantic prior × value-function feasibility likelihood; grounding as Bayesian updating</div></div>
      <div class="bridge-row"><div class="from"><b>Few-shot prompting LLMs</b> (you do this daily)</div><div class="arrow">→</div><div class="to"><b>ICRT</b> — identical mechanism; the prompt is teleoperated demos, the continuation is motor control</div></div>
      <div class="bridge-row"><div class="from"><b>Chain-of-thought</b></div><div class="arrow">→</div><div class="to"><b>Embodied CoT</b> — same trick, new constraint: every thought-token spends scarce control-loop milliseconds</div></div>
      <div class="bridge-row"><div class="from"><b>Simulate many scenarios, pick by a metric</b> (your Monte Carlo instincts)</div><div class="arrow">→</div><div class="to"><b>Sample-and-verify test-time scaling</b> — best-of-N with a learned verifier; compute spent where decisions are hard</div></div>
    </div>

    <h3><span class="knum">10.7</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2408.15980" target="_blank" rel="noopener">In-Context Imitation Learning via Next-Token Prediction (ICRT)</a></div><div class="pmeta">Fu et al. · 2024</div><p class="pwhy">§10.5's paper: prompt a sensorimotor transformer with raw demo trajectories of an unseen task; it performs the task — no fine-tuning. Watch for what enables the generalization: training across diverse tasks so the model learns to <em>infer the task from context</em> rather than memorize tasks.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2305.16291" target="_blank" rel="noopener">VOYAGER: An Open-Ended Embodied Agent with Large Language Models</a></div><div class="pmeta">Wang et al. · 2023</div><p class="pwhy">The agent-architecture blueprint: automatic curriculum + code generation + execution feedback + a growing skill library, achieving open-ended progression with zero gradient updates. Read it asking "which components transfer from Minecraft to a kitchen?" — that question is an active research frontier.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2505.08243" target="_blank" rel="noopener">Training Strategies for Efficient Embodied Reasoning</a></div><div class="pmeta">Chen et al. · 2025</div><p class="pwhy">The reasoning-vs-latency tension of §10.4 made rigorous: how to train VLAs that get CoT's generalization benefits while meeting control-rate budgets — and a careful study of <em>why</em> reasoning helps (representation shaping vs. better per-step decisions). The kind of paper that turns a demo trend into engineering knowledge.</p></div>
    </div>

    <Quiz lecture="l10" />

    <div class="resources">
      <div class="res-head">Lecture 10 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture10_reasoning.pdf" target="_blank" rel="noopener">lecture10_reasoning.pdf</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/oBEkY6NeE_o" target="_blank" rel="noopener">Archit Sharma (Google DeepMind; Gemini Deep Think) — guest spotlight</a></li>
      </ul>
    </div>

    <CompleteBar id="l10" prev="l9" next="l11" prevLabel="← L09" nextLabel="NEXT: L11 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import SaycanWidget from '../widgets/SaycanWidget.vue';
import BonWidget from '../widgets/BonWidget.vue';
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
