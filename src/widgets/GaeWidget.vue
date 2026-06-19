<template>
  <Lab
    ref="lab"
    id="gae"
    title="GAE-λ: interpolating the whole bias–variance spectrum"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { gaeWeights, effectiveHorizon } from '../logic/gae.js';

const note =
  'Each bar is the weight GAE places on the \\(n\\)-step return. The cyan bar (\\(n=0\\)) is the pure-TD term. As \\(\\lambda\\to1\\) the weight fans out over longer horizons (toward Monte Carlo); the effective horizon of the estimate is \\(\\approx 1/(1-\\lambda)\\). One dial, the entire spectrum. <span class=&quot;notice&quot;>Simplification: the bars show \\((1-\\lambda)\\lambda^{n}\\); the true GAE weights ride on \\((\\gamma\\lambda)^{l}\\), and the per-return weight is conventionally \\((1-\\lambda)\\lambda^{n-1}\\). With \\(\\gamma\\approx0.99\\) the shape is essentially this.</span>';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the gae IIFE (reference lines 2624–2642).
  // Numeric weights come from logic/gae.js (vitest-pinned).
  var W = 700, H = 320, padL = 50, padR = 20, padT = 28, padB = 54, N = 18, lam = 0.95;
  var svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT, bw = (x1 - x0) / N;
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    var result = gaeWeights(lam, N), ws = result.weights, maxw = result.maxWeight, n;
    for (n = 0; n < N; n++) {
      var h = (y0 - y1) * (ws[n] / maxw);
      svg.appendChild(R.E('rect', { x: x0 + n * bw + 2, y: y0 - h, width: bw - 4, height: h, fill: n === 0 ? R.C.cyan : R.C.violet, opacity: 0.85, rx: 2 }));
    }
    svg.appendChild(R.TX(x0 + bw / 2, y0 - (y0 - y1) * (ws[0] / maxw) - 7, '1-step (TD)', { fill: R.C.cyan, size: 10.5 }));
    svg.appendChild(R.TX((x0 + x1) / 2, H - 30, 'weight on the n-step return  ( n = 0, 1, 2, … )', { fill: R.C.dim, size: 11.5 }));
    var heff = effectiveHorizon(lam);
    svg.appendChild(R.TX(x0, y1 - 6, 'GAE λ = ' + lam.toFixed(2) + '   ·   effective horizon ≈ ' + (heff === null ? 'full episode' : heff.toFixed(1) + ' steps'), { anchor: 'start', fill: '#EAF0F8', size: 12.5, weight: 600, base: 'hanging' }));
    svg.appendChild(R.TX(x0 + bw, y1 + 28, 'λ→0 : trust the critic  (low variance, biased)', { anchor: 'start', fill: R.C.dim, size: 11 }));
    svg.appendChild(R.TX(x1, y1 + 46, 'λ→1 : trust real rewards  (Monte Carlo: unbiased, high variance)', { anchor: 'end', fill: R.C.dim, size: 11 }));
  }

  var sld = R.slider(ctr, { label: 'GAE  λ', min: 0, max: 1, step: 0.01, value: lam, fmt: function (v) { return v.toFixed(2); }, on: function (v) { lam = v; draw(); } });
  R.btn(ctr, 'λ = 0  (TD)', null, function () { lam = 0; sld.set(0); draw(); });
  R.btn(ctr, 'λ = 0.95  (typical)', 'primary', function () { lam = 0.95; sld.set(0.95); draw(); });
  R.btn(ctr, 'λ = 1  (Monte Carlo)', null, function () { lam = 1; sld.set(1); draw(); });
  draw();
});
</script>
