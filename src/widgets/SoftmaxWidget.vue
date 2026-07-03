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

// Lab note rendered by v-html; KaTeX is run by the section, so \(...\) works.
const note =
  'Temperature \\(T\\) scales every logit before the softmax: at \\(T \\to 0\\) ' +
  'the highest-scoring action gets all the probability (greedy / exploit); ' +
  'at large \\(T\\) the distribution flattens toward uniform (explore). ' +
  'The dashed ghost bars are the <em>fixed</em> logits \\(z_i\\): softmax preserves their ' +
  'order, and \\(T\\) only amplifies or erases the gaps between them. ' +
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

  let temperature = 1.0;

  // ── Draw helpers ────────────────────────────────────────────────────────

  function barX(i) { return x0 + i * barW; }

  // Ghost-bar heights for the FIXED logits (drawn behind the probability
  // bars): a static linear map of z into the bar area, floored at 10% so the
  // smallest logit stays visible. Order is preserved — exactly the property
  // softmax keeps while T amplifies/erases the gaps.
  const zLo = Math.min(...LOGITS), zHi = Math.max(...LOGITS);
  const ghostH = LOGITS.map(z => ((z - zLo) / (zHi - zLo) * 0.82 + 0.10) * maxBarH);

  /** (Re)render everything from the current temperature. */
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
      const bh  = probs[i] * maxBarH;
      const bx  = barX(i) + 3;
      const bw2 = barW - 6;

      // Ghost logit bar (fixed) — dashed outline behind the probability bar,
      // so the input mechanism stays visible while T reshapes the output.
      svg.appendChild(R.E('rect', {
        x: barX(i) + 1, y: y0 - ghostH[i], width: barW - 2, height: ghostH[i],
        fill: 'rgba(138,147,163,0.08)', stroke: R.C.dim, 'stroke-width': 1.1,
        'stroke-dasharray': '4 3', rx: 2,
      }));

      // Bar body
      svg.appendChild(R.E('rect', {
        x: bx, y: y0 - bh, width: bw2, height: Math.max(1, bh),
        fill: R.C.orange, opacity: 0.88, rx: 2,
      }));

      // Probability label above bar, on a dark backing pill so it stays
      // legible when it crosses the ghost bar's dashed outline.
      const prob = probs[i];
      svg.appendChild(R.E('rect', {
        x: bx + bw2 / 2 - 16, y: y0 - bh - 15, width: 32, height: 14,
        rx: 3, fill: 'rgba(15,20,34,0.82)',
      }));
      svg.appendChild(R.TX(bx + bw2 / 2, y0 - bh - 4, prob.toFixed(2), {
        fill: R.C.orange, size: 10.5, weight: 600, anchor: 'middle', base: 'auto',
      }));

      // Action label below x-axis, with its fixed logit underneath
      svg.appendChild(R.TX(bx + bw2 / 2, y0 + 14, ACTION_LABELS[i], {
        fill: R.C.ink, size: 11, anchor: 'middle', base: 'hanging',
      }));
      svg.appendChild(R.TX(bx + bw2 / 2, y0 + 28, 'z = ' + LOGITS[i].toFixed(1), {
        fill: R.C.dim, size: 9.5, anchor: 'middle', base: 'hanging',
      }));
    }

    // Entropy readout (top-right)
    const hNats = entropy(probs);
    const hMax  = Math.log(N);                // ln(5) ≈ 1.609
    const pct   = ((hNats / hMax) * 100).toFixed(0);
    svg.appendChild(R.TX(W - padR, y1, `H = ${hNats.toFixed(3)} nats  (${pct}% of max)`, {
      anchor: 'end', fill: R.C.cyan, size: 12, weight: 600, base: 'hanging',
    }));

    // "probability" y-axis title — rotated vertical in the left margin so it
    // never overlaps the 0 / 0.5 / 1 tick labels at x0-8.
    const yTitle = R.TX(16, (y0 + y1) / 2, 'probability', {
      fill: R.C.dim, size: 11, anchor: 'middle',
    });
    yTitle.setAttribute('transform', `rotate(-90 16 ${(y0 + y1) / 2})`);
    svg.appendChild(yTitle);
  }

  // ── Controls ────────────────────────────────────────────────────────────
  // Motion contract: slider drags update INSTANTLY (no tween-on-drag) — the
  // widget's only control is this continuous slider, so nothing eases here.
  R.slider(ctr, {
    label: 'temperature  T',
    min: 0.05, max: 5, step: 0.05, value: temperature,
    fmt: v => v.toFixed(2),
    on: v => { temperature = v; render(); },
  });

  R.legend(stage, [
    [R.C.orange, 'probability p(a) at T'],
    ['rgba(138,147,163,0.55)', 'fixed logit z (ghost)'],
  ]);

  // ── Initial draw ────────────────────────────────────────────────────────
  render();
});
</script>
