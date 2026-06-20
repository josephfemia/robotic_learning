<template>
  <Lab
    ref="lab"
    id="softmax"
    title="Temperature: the dial between greedy and uniform"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { softmax, entropy } from '../logic/softmax.js';
import { tween } from '../composables/useAnimate.js';

// Lab note rendered by v-html; KaTeX is run by the section, so \(...\) works.
const note =
  'Temperature \\(T\\) scales every logit before the softmax: at \\(T \\to 0\\) ' +
  'the highest-scoring action gets all the probability (greedy / exploit); ' +
  'at large \\(T\\) the distribution flattens toward uniform (explore). ' +
  'Entropy \\(H = -\\sum_i p_i \\ln p_i\\) measures how spread out the distribution is — ' +
  'watch it rise as you drag \\(T\\) up.';

// Fixed action labels and logits (robot manipulation scenario)
const ACTION_LABELS = ['grasp', 'push', 'lift', 'rotate', 'place'];
const LOGITS        = [2.1, 0.5, 3.4, -0.8, 1.2];   // fixed "Q-values"

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr   = lab.value.ctrl;
  if (!stage) return;

  // ── Layout constants ────────────────────────────────────────────────────
  const W = 680, H = 260;
  const padL = 54, padR = 20, padT = 28, padB = 52;
  const N     = ACTION_LABELS.length;
  const barW  = (W - padL - padR) / N;   // width of each bar column
  const x0    = padL, y0 = H - padB, y1 = padT;
  const maxBarH = y0 - y1;               // maximum drawable bar height

  const svg = R.SVG(stage, W, H);

  // Keep track of animated bar heights (in SVG units) so we can tween them.
  let currentHeights = new Array(N).fill(0);
  let currentEntropy = 0;
  let temperature    = 1.0;

  // ── Draw helpers ────────────────────────────────────────────────────────

  function barX(i) { return x0 + i * barW; }

  /** (Re)render everything from currentHeights and currentEntropy. */
  function render() {
    R.clr(svg);

    // Axes
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: W - padR, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0,       y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));

    // Y-axis labels
    svg.appendChild(R.TX(x0 - 8, y0, '0',   { anchor: 'end', fill: R.C.dim, size: 11 }));
    svg.appendChild(R.TX(x0 - 8, y1, '1',   { anchor: 'end', fill: R.C.dim, size: 11, base: 'hanging' }));
    svg.appendChild(R.TX(x0 - 8, (y0 + y1) / 2, '0.5', { anchor: 'end', fill: R.C.dim, size: 10 }));

    // 0.5 horizontal guide
    svg.appendChild(R.E('line', {
      x1: x0, y1: (y0 + y1) / 2, x2: W - padR, y2: (y0 + y1) / 2,
      stroke: R.C.grid, 'stroke-width': 1, 'stroke-dasharray': '4 4',
    }));

    // Bars
    const probs = softmax(LOGITS, temperature);
    for (let i = 0; i < N; i++) {
      const bh  = currentHeights[i];          // animated height
      const bx  = barX(i) + 3;
      const bw2 = barW - 6;

      // Bar body
      svg.appendChild(R.E('rect', {
        x: bx, y: y0 - bh, width: bw2, height: Math.max(1, bh),
        fill: R.C.orange, opacity: 0.88, rx: 2,
      }));

      // Probability label above bar (static, from current real probs)
      const prob = probs[i];
      svg.appendChild(R.TX(bx + bw2 / 2, y0 - bh - 4, prob.toFixed(2), {
        fill: R.C.orange, size: 10.5, weight: 600, anchor: 'middle', base: 'auto',
      }));

      // Action label below x-axis
      svg.appendChild(R.TX(bx + bw2 / 2, y0 + 14, ACTION_LABELS[i], {
        fill: R.C.ink, size: 11, anchor: 'middle', base: 'hanging',
      }));
    }

    // Entropy readout (top-right)
    const hNats = currentEntropy;
    const hMax  = Math.log(N);                // ln(5) ≈ 1.609
    const pct   = ((hNats / hMax) * 100).toFixed(0);
    svg.appendChild(R.TX(W - padR, y1, `H = ${hNats.toFixed(3)} nats  (${pct}% of max)`, {
      anchor: 'end', fill: R.C.cyan, size: 12, weight: 600, base: 'hanging',
    }));

    // "probability" y-axis title
    svg.appendChild(R.TX(12, (y0 + y1) / 2, 'probability', {
      fill: R.C.dim, size: 11, anchor: 'middle',
    }));
  }

  // ── Animation ───────────────────────────────────────────────────────────

  /** Tween from currentHeights to targetHeights over 350 ms. */
  function animateTo(targetHeights, targetEntropy) {
    const fromHeights  = [...currentHeights];
    const fromEntropy  = currentEntropy;

    tween(350, {
      onStep(e) {
        for (let i = 0; i < N; i++) {
          currentHeights[i] = fromHeights[i] + (targetHeights[i] - fromHeights[i]) * e;
        }
        currentEntropy = fromEntropy + (targetEntropy - fromEntropy) * e;
        render();
      },
    });
  }

  /** Recompute target heights from the current temperature and kick off tween. */
  function update() {
    const probs = softmax(LOGITS, temperature);
    const targetHeights  = probs.map(p => p * maxBarH);
    const targetEntropy  = -probs.reduce((s, p) => (p > 0 ? s + p * Math.log(p) : s), 0);
    animateTo(targetHeights, targetEntropy);
  }

  // ── Controls ────────────────────────────────────────────────────────────

  R.slider(ctr, {
    label: 'temperature  T',
    min: 0.05, max: 5, step: 0.05, value: temperature,
    fmt: v => v.toFixed(2),
    on: v => { temperature = v; update(); },
  });

  // ── Initial draw ────────────────────────────────────────────────────────
  // Render once synchronously at final state, then let tween settle visually.
  const initProbs  = softmax(LOGITS, temperature);
  currentHeights   = initProbs.map(p => p * maxBarH);
  currentEntropy   = -initProbs.reduce((s, p) => (p > 0 ? s + p * Math.log(p) : s), 0);
  render();
});
</script>
