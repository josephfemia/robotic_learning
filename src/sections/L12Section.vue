<template>
  <section class="lecture" id="l12" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 12 · MAY 18</span>
      <h2>Guest Lectures: Two Arcs Through the Field</h2>
      <p class="dek">Dieter Fox and Pieter Abbeel — two careers that, between them, contain the entire intellectual history this course compressed into eleven weeks. How to listen, and what to listen for.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> the whole course</span>
      <span class="chip"><b>Time</b> ~25 min</span>
      <span class="chip"><b>Watch first</b> both arcs read as one synthesis</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>These are perspectives from practitioners, not settled answers — weigh them against the evidence in earlier lectures.</li>
        <li>The field's history rhymes: several "new" ideas (apprenticeship learning, model-based control) have long lineages worth knowing.</li>
      </ul>
    </div>

    <h3><span class="knum">12.1</span>Why end a course this way</h3>
    <p>After eleven weeks of methods, the finale is perspective: two researchers whose work <em>is</em> the syllabus's backbone, asked what they think now. Guest content varies year to year, so this page is a listener's guide rather than a transcript: who they are, which course threads they personally authored, and the questions worth carrying into the room.</p>

    <h3><span class="knum">12.2</span>Dieter Fox: from probabilistic robotics to learned perception-action</h3>
    <p>Fox (University of Washington; long-time NVIDIA robotics lead; now also AI2) co-wrote the book — literally, <em>Probabilistic Robotics</em> — that defined the pre-learning era's rigor: Bayesian filtering, particle filters, SLAM; the robot as an uncertainty-tracking machine. His arc since: showing how that probabilistic worldview survives inside the learning era — simulation at scale for data generation and sim-to-real (the Isaac line traces to his orbit), learned perception grounded in geometry, and benchmark discipline. <strong>Listen for:</strong> where he thinks explicit state estimation and geometry still beat end-to-end learning; what simulation can and cannot deliver as the field's data engine; and the L8/L11 question of whether world models are filtering reborn — his hands built the original.</p>

    <h3><span class="knum">12.3</span>Pieter Abbeel: from apprenticeship learning to robot foundation models</h3>
    <p>Abbeel's career is nearly a private rehearsal of this course: apprenticeship/inverse RL with Ng (autonomous helicopter aerobatics from demonstration — L3's intellectual grandparent), the deep-RL breakout years at Berkeley (GPS — your L5 reading — TRPO and the policy-gradient lineage behind PPO; the lab that trained Levine, Finn, Duan, and half the field), and the industrial turn: Covariant, building foundation models for warehouse manipulation; now Amazon. <strong>Listen for:</strong> what a decade of deploying learned manipulation commercially taught him that benchmarks didn't; his current weighting of the IL-vs-RL-vs-foundation-model portfolio; and where he places the next bottleneck — data, reliability, or something the course didn't name.</p>

    <div class="callout"><span class="co-label">Questions worth bringing (to the talk, or to your own notes)</span>
    Where exactly does each speaker put the boundary between "solved by scale" and "needs new ideas" — and do their boundaries agree? What evaluation evidence would change their mind about humanoids? Which of L11's three worldviews does each actually inhabit when forced to choose? And the synthesis question: after twelve weeks, which single open problem would <em>you</em> now spend five years on — and can you defend it with the course's vocabulary?</div>

    <h3><span class="knum">12.4</span>Closing the loop on the course</h3>
    <p>One paragraph of synthesis to leave with. The course's hidden through-line is a single recurring pattern: <em>optimize against a learned approximation, and the optimizer will find its flaws</em> — BC's drift (L3), the deadly triad (L4), actor-vs-critic and offline extrapolation (L5), model exploitation (L8) — answered everywhere by the same medicine: pessimism, short horizons, fresh data, and structure (chunking, hierarchy, grounding). Around that core, the field's trajectory has been the systematic import of every scalable idea from modern ML — generative models (L6), sequence models (L7), foundation-model pretraining (L9), reasoning and test-time compute (L10) — each reshaped by robotics' two non-negotiables: <strong>physics is unforgiving, and experience is expensive.</strong> Hold those two constraints and the entire literature organizes itself. That's the knowledge these twelve lectures were built to install — the rest is reading papers with confidence, which you can now do.</p>

    <h4>The whole course as one map</h4>
    <p>Here is everything, on one canvas. The spine is the supervision arc — copy the expert, learn from reward, model the world, scale to foundations — and threaded through it is the recurring disease and its cure. Tap any lecture to see what it contributes and which earlier idea it answers. The point of the map is the realization that the twelve weeks aren't twelve topics; they're one argument with a few motifs that keep returning in new costumes.</p>
    <Lab
      id="arc"
      title="The course as a single argument"
      :note="`The orange thread is the &quot;optimize-against-an-approximation → it finds the flaws → contain it&quot; motif that recurs in L3, L4, L5, and L8. The cyan spine is the supervision arc. Tap a node to read its one-line role and jump to the lecture. This is the mental model to keep after everything else fades.`"
    />

    <Quiz lecture="l12" />

    <div class="resources">
      <div class="res-head">Lecture 12 resources</div>
      <ul>
        <li><span class="rtag">Speakers</span><a href="https://homes.cs.washington.edu/~fox/" target="_blank" rel="noopener">Dieter Fox</a> · <a href="https://people.eecs.berkeley.edu/~pabbeel/" target="_blank" rel="noopener">Pieter Abbeel</a></li>
        <li><span class="rtag">Recording</span>Check the <a href="https://cvg.ethz.ch/lectures/Robot-Learning/" target="_blank" rel="noopener">course page</a> and <a href="https://www.youtube.com/playlist?list=PLPU18BnWYUZJx3_d901-GD6BGpeWwE2vx" target="_blank" rel="noopener">YouTube playlist</a> for the posted session</li>
        <li><span class="rtag">Backgrnd</span><a href="https://arxiv.org/abs/1504.00702" target="_blank" rel="noopener">GPS (Levine, Finn, Darrell, Abbeel)</a> — you read it in week 5; it's the bridge between both arcs</li>
      </ul>
    </div>

    <CompleteBar id="l12" prev="l11" next="start" prevLabel="← L11" nextLabel="BACK TO START" @navigate="$emit('navigate', $event)" />
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
