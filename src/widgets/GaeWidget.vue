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
import { tween } from '../composables/useAnimate.js';

const note =
  'Each bar is the weight GAE places on the \\(n\\)-step return. The cyan bar (\\(n=0\\)) is the pure-TD term. As \\(\\lambda\\to1\\) the weight fans out over longer horizons (toward Monte Carlo); the effective horizon of the estimate is \\(\\approx 1/(1-\\lambda)\\). One dial, the entire spectrum. <span class=&quot;notice&quot;>Simplification: the bars show \\((1-\\lambda)\\lambda^{n}\\); the true GAE weights ride on \\((\\gamma\\lambda)^{l}\\), and the per-return weight is conventionally \\((1-\\lambda)\\lambda^{n-1}\\). With \\(\\gamma\\approx0.99\\) the shape is essentially this.</span>';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the gae IIFE (reference lines 2624–2642).
  // Numeric weights come from logic/gae.js (vitest-pinned).
  var W = 700, H = 320, padL = 50, padR = 20, padT = 30, padB = 54, N = 18, lam = 0.95;
  var svg = R.SVG(stage, W, H);

  // Displayed (possibly mid-tween) normalised bar fractions; bar0 is always 1.
  var _init = gaeWeights(lam, N);
  var disp = _init.weights.map(function (w) { return w / _init.maxWeight; });

  // Render from the `disp` fractions + the current `lam` (header text).
  function render() {
    R.clr(svg);
    // Plot ceiling sits 18px below the header band so bars can never run into
    // the header text — at λ=1 every bar reaches the ceiling (preset button!).
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT + 18, bw = (x1 - x0) / N, n;
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    for (n = 0; n < N; n++) {
      var h = (y0 - y1) * disp[n];
      svg.appendChild(R.E('rect', { x: x0 + n * bw + 2, y: y0 - h, width: bw - 4, height: h, fill: n === 0 ? R.C.cyan : R.C.violet, opacity: 0.85, rx: 2 }));
    }
    // "1-step (TD)" sits above bar0 (top-left). Header moved to the top-RIGHT so
    // the two never collide (bar0 always reaches the ceiling). The λ→0/λ→1 regime
    // annotations were removed — the note explains both regimes in full.
    svg.appendChild(R.TX(x0 + bw / 2, y0 - (y0 - y1) * disp[0] - 7, '1-step (TD)', { anchor: 'start', fill: R.C.cyan, size: 10.5 }));
    svg.appendChild(R.TX((x0 + x1) / 2, H - 30, 'weight on the n-step return  ( n = 0, 1, 2, … )', { fill: R.C.dim, size: 11.5 }));
    var heff = effectiveHorizon(lam);
    svg.appendChild(R.TX(x1, padT - 8, 'GAE λ = ' + lam.toFixed(2) + '   ·   effective horizon ≈ ' + (heff === null ? 'full episode' : heff.toFixed(1) + ' steps'), { anchor: 'end', fill: '#EAF0F8', size: 12.5, weight: 600, base: 'hanging' }));
  }

  // Instant set (slider drag — already continuous) from the current lam.
  function setNow() {
    var r = gaeWeights(lam, N);
    disp = r.weights.map(function (w) { return w / r.maxWeight; });
    render();
  }

  // Eased fan-out/in for discrete preset jumps (buttons) — 3b1b-style motion.
  function animateTo(targetLam) {
    var from = disp.slice();
    var r = gaeWeights(targetLam, N);
    var to = r.weights.map(function (w) { return w / r.maxWeight; });
    lam = targetLam;
    tween(420, { onStep: function (e) { for (var i = 0; i < N; i++) disp[i] = from[i] + (to[i] - from[i]) * e; render(); } });
  }

  var sld = R.slider(ctr, { label: 'GAE  λ', min: 0, max: 1, step: 0.01, value: lam, fmt: function (v) { return v.toFixed(2); }, on: function (v) { lam = v; setNow(); } });
  R.btn(ctr, 'λ = 0  (TD)', null, function () { sld.set(0); animateTo(0); });
  R.btn(ctr, 'λ = 0.95  (typical)', 'primary', function () { sld.set(0.95); animateTo(0.95); });
  R.btn(ctr, 'λ = 1  (Monte Carlo)', null, function () { sld.set(1); animateTo(1); });
  render();
});
</script>
