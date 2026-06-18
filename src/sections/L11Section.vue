<template>
  <section class="lecture" id="l11" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 11 · MAY 11</span>
      <h2>Frontier &amp; Open Problems</h2>
      <p class="dek">Three worldviews fighting for the field's future, and the honest list of what nobody has solved. The week's readings span 1991–2022 on purpose: the deepest disagreements are old.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> the whole course</span>
      <span class="chip"><b>Time</b> ~30 min</span>
      <span class="chip"><b>Watch first</b> the three-worldviews framing (§11.1)</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>There is no consensus recipe — the worldviews genuinely disagree about what scales.</li>
        <li>Evaluation, not model size, is widely argued to be the current bottleneck in robot learning.</li>
      </ul>
    </div>

    <h3><span class="knum">11.1</span>Three worldviews</h3>
    <p>The discussion readings are chosen as a triangle; nearly every methodological argument you'll ever witness in this field is a position inside it.</p>
    <p><strong>Sutton — The Bitter Lesson (2019).</strong> Seventy years of AI history compressed into one claim: general methods that leverage computation (search and learning) ultimately beat approaches built on human domain knowledge — painfully, repeatedly, in chess, Go, speech, vision. The robotics reading: stop hand-crafting state representations, reward terms, and modular pipelines; bet on scale, data, and general architectures. The VLA program (L9) is the Bitter Lesson applied with conviction. Its honest tension here: robotics lacks the cheap data/compute-to-experience exchange rate that powered the lesson elsewhere — you can't just "run more robot."</p>
    <p><strong>LeCun — A Path Towards Autonomous Machine Intelligence (2022).</strong> Scale is not enough; <em>architecture</em> is missing. His blueprint: a modular agent with a configurable <strong>world model</strong> at its center, trained largely by self-supervised <em>prediction in representation space</em> — <strong>JEPA</strong>: predict embeddings of the future, not pixels, so the model isn't penalized for failing to predict inherently unpredictable detail (the exact wrinkles of a flag, the speckle of a texture) and can spend its capacity on what's actually predictable — plus hierarchical planning across timescales and energy-based (not autoregressive-token) inference. The robotics reading: L8's world models are the right road, but pixel reconstruction and token autoregression are dead ends; intelligence is prediction + planning, learned mostly by observation. Note the direct collision with L7–L9's token-everything program.</p>
    <p><strong>Brooks — Intelligence without Representation (1991).</strong> The oldest and most radical: intelligence doesn't require internal models or explicit representations at all. Build layered reactive behaviors, tightly coupled to sensing; "the world is its own best model"; intelligence <em>emerges from embodiment and interaction</em>. His insect robots out-navigated the era's deliberative planners. The modern echo is double-edged: end-to-end sensorimotor policies (no explicit pose estimation, no planner) are weirdly Brooksian — yet today's largest systems are stuffed with representations (language!). Brooks endures as the field's conscience: cheap, robust, reactive competence first; grand cognition later.</p>

    <div class="callout"><span class="co-label">Use the triangle</span>
    When you read any robotics paper, place it: <em>Sutton-corner</em> (scale general methods), <em>LeCun-corner</em> (build predictive world models, plan), <em>Brooks-corner</em> (embodied reactive competence, minimal representation). π0.5 is Sutton with LeCun garnish; Dreamer is LeCun-flavored; a 50 Hz reflexive locomotion policy is Brooks wearing a neural network. The triangle is also a forecast menu: which corner wins the next five years is the field's live bet.</div>

    <h4>Place the methods in the triangle</h4>
    <p>The three worldviews are corners of a space, and real systems are blends. Tap a method below to see where it sits — how much of its DNA is "scale general methods" (Sutton), "predict and plan with a world model" (LeCun), or "reactive embodied competence" (Brooks) — and read why. There's no right answer here; the point is that placing a paper is most of understanding it.</p>
    <Lab
      id="worldview"
      title="The three worldviews as a map"
      :note="`Each method is a weighted point inside the Sutton–LeCun–Brooks triangle. Notice almost nothing sits in a pure corner — the live disagreements are about <em>mixtures</em>. Where you'd place your own project is a genuinely useful thing to know.`"
    />

    <h3><span class="knum">11.2</span>The open-problem ledger</h3>
    <p><strong>Data.</strong> Still the binding constraint. The contenders: teleoperation farms (high quality, linear cost), simulation (infinite but gapped — L5), human video (infinite, embodiment-mismatched — L7/L8's masking and video-model bets), autonomous experience (the π*0.6 road — RL's return at scale), and synthetic data from world models. Nobody knows the winning portfolio; everyone agrees it's a portfolio.</p>
    <p><strong>Evaluation.</strong> Quietly the field's most serious illness. No ImageNet: real-robot evals are slow, expensive, lab-specific, and statistically underpowered (20 trials per task is common — your actuarial soul should wince at those confidence intervals); simulation benchmarks (CALVIN, SIMPLER) only partially predict reality; cherry-picked demo videos distort perceived progress. Reproducibility and honest uncertainty quantification are open <em>scientific</em> problems, not just logistics.</p>
    <p><strong>Reliability and safety.</strong> 80% success demos well; homes need 99.9%+ with graceful failure. The gap between those numbers is where deployment lives: uncertainty estimation, runtime monitors, safe recovery, formal constraints around learned components — thin literatures all, and (as L10 noted) verification in the physical world is intrinsically hard.</p>
    <p><strong>Long horizon, memory, and continual learning.</strong> Hours-long tasks, persistent spatial/semantic memory ("where did I leave the keys"), improving after deployment without forgetting — all early. <strong>Touch and whole-body dexterity.</strong> Vision dominates the data mix; contact-rich fine manipulation (the hardest 20% of tasks) likely needs tactile sensing at scale, which barely exists in datasets. <strong>The humanoid question.</strong> The form-factor bet of the decade: maximal generality and maximal difficulty — is it the right hill, or are wheeled platforms + arms the deployable 90%? The lecture won't answer; your portfolio-thinking applies.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Sample-size and credibility standards</b> (you'd never price on n=20)</div><div class="arrow">→</div><div class="to"><b>The evaluation crisis</b> — robot papers routinely conclude from trial counts your profession would reject; reading skeptically is a superpower here</div></div>
      <div class="bridge-row"><div class="from"><b>Tail risk vs. expected performance</b></div><div class="arrow">→</div><div class="to"><b>The 80% → 99.9% gap</b> — deployment is a tail-reliability problem; demos measure the mean</div></div>
      <div class="bridge-row"><div class="from"><b>Diversified portfolios under uncertainty</b></div><div class="arrow">→</div><div class="to"><b>The data-strategy question</b> — teleop/sim/video/experience as asset classes with different cost, quality, and correlation to deployment</div></div>
    </div>

    <h3><span class="knum">11.3</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="http://www.incompleteideas.net/IncIdeas/BitterLesson.html" target="_blank" rel="noopener">The Bitter Lesson</a></div><div class="pmeta">Sutton · 2019 (essay)</div><p class="pwhy">Two pages; read twice. Then stress-test it against robotics' actual constraint structure: when experience is expensive, is "leverage computation" still the dominant strategy, or does the lesson's premise fail? Your answer largely determines which research you'll find promising.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://openreview.net/pdf?id=BZ5a1r-kVsf" target="_blank" rel="noopener">A Path Towards Autonomous Machine Intelligence</a></div><div class="pmeta">LeCun · 2022 (position paper)</div><p class="pwhy">Read §§ on JEPA and the world-model architecture; skim the rest for shape. The productive question for this course: how much of Dreamer/UniPi/DreamZero (L8) already <em>is</em> this blueprint, and where do they diverge (pixels vs. representations; tokens vs. energies)?</p></div>
      <div class="paper"><div class="ptitle"><a href="https://people.csail.mit.edu/brooks/papers/representation.pdf" target="_blank" rel="noopener">Intelligence without Representation</a></div><div class="pmeta">Brooks · 1991</div><p class="pwhy">The classic that refuses to age. As you read, keep a tally: which of Brooks's complaints about 1980s deliberative robotics apply verbatim to 2026 LLM-planner stacks (L10)? The number is uncomfortably high — that's the point of assigning it last.</p></div>
    </div>

    <Quiz lecture="l11" />

    <div class="resources">
      <div class="res-head">Lecture 11 resources</div>
      <ul>
        <li><span class="rtag">Guest</span><a href="https://www.youtube.com/watch?v=0XB7fNS_ONg" target="_blank" rel="noopener">Lucas Beyer (Meta): Vision in the Age of LLMs — guest spotlight</a></li>
        <li><span class="rtag">Note</span>No slide deck listed for this week on the course page; the three readings <em>are</em> the lecture. Budget real time for them.</li>
      </ul>
    </div>

    <CompleteBar id="l11" prev="l10" next="l12" prevLabel="← L10" nextLabel="NEXT: L12 →" @navigate="$emit('navigate', $event)" />
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
