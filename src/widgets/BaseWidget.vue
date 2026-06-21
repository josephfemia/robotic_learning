<template>
  <Lab
    ref="lab"
    id="base"
    title="A baseline: unbiased, but much lower variance"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { RETURNS, SCORES, MEAN_RETURN, OPTIMAL_BASELINE, gradientStats } from '../logic/baseline.js';

const note =
  'The scores are centered (they sum to zero, as \\(\\mathbb{E}[\\nabla\\log\\pi]=0\\) guarantees), so the <em>mean gradient stays exactly constant</em> as you drag \\(b\\) — that\'s unbiasedness, on screen. Meanwhile the <em>variance</em> reading drops to a minimum near the mean return. That minimum is why we set \\(b\\approx V^\\pi\\): the value function is the best cheaply-available baseline.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the base IIFE (reference lines 2572–2593).
  // Numeric state from logic/baseline.js (vitest-pinned).
  var W = 700, H = 340, padL = 40, padR = 40, padT = 40, padB = 72, b = 0.0;
  var svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, ymid = (padT + (H - padB)) / 2, n = RETURNS.length, bw = (x1 - x0) / n, st = gradientStats(b), scaleY = 58;
    svg.appendChild(R.E('line', { x1: x0, y1: ymid, x2: x1, y2: ymid, stroke: R.C.axis, 'stroke-width': 1.2 }));
    for (var j = 0; j < n; j++) {
      var gx = x0 + j * bw + bw / 2, gv = st.gs[j], h = gv * scaleY;
      svg.appendChild(R.E('rect', { x: gx - bw * 0.28, y: gv >= 0 ? ymid - h : ymid, width: bw * 0.56, height: Math.abs(h), fill: gv >= 0 ? R.C.green : R.C.red, opacity: 0.85, rx: 2 }));
    }
    svg.appendChild(R.TX(x0, padT - 10, 'gradient term  gᵢ = (Rᵢ − b)·scoreᵢ', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(x1, padT - 10, 'mean return = ' + MEAN_RETURN.toFixed(2) + '   ·   optimal b* = ' + OPTIMAL_BASELINE.toFixed(2), { anchor: 'end', fill: R.C.orange, size: 11.5, base: 'hanging' }));
    svg.appendChild(R.TX((x0 + x1) / 2, H - 46, 'baseline  b = ' + b.toFixed(2), { fill: '#EAF0F8', size: 13, weight: 600 }));
    svg.appendChild(R.TX((x0 + x1) / 2, H - 26, 'mean gradient (signal) = ' + st.mean.toFixed(3) + '    ·    variance (noise) = ' + st.variance.toFixed(3), { fill: R.C.dim, size: 12 }));
  }

  var sld = R.slider(ctr, { label: 'baseline  b', min: 0, max: 1.2, step: 0.01, value: b, fmt: function (v) { return v.toFixed(2); }, on: function (v) { b = v; draw(); } });
  // Discrete jump → ease the baseline so the bars settle smoothly to the optimum.
  R.btn(ctr, 'Set b = mean return', 'primary', function () {
    var from = b, to = MEAN_RETURN;
    tween(450, {
      onStep(e) { b = from + (to - from) * e; sld.set(b); draw(); },
      onDone() { b = to; sld.set(b); draw(); },
    });
  });
  R.legend(stage, [[R.C.green, 'pushes this action ↑'], [R.C.red, 'pushes this action ↓']]);
  draw();
});
</script>
