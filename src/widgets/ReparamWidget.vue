<template>
  <Lab
    ref="lab"
    id="reparam"
    title="Score-function vs reparameterization: same gradient, different noise"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { scoreFunctionEstimate, reparamEstimate, vstat, trueGradient } from '../logic/reparam.js';

const note =
  'This is the whole REINFORCE ↔ SAC story in one figure. Reparameterization wins on variance but needs \\(f\\) differentiable in the action (so SAC backprops through the critic); the score function asks only to <em>evaluate</em> \\(f\\) (so REINFORCE tolerates sparse, discontinuous, black-box rewards). Much of deep RL is choosing between these two.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the reparam IIFE (reference lines 2691–2713).
  // Numeric functions from logic/reparam.js (vitest-pinned).
  var W = 700, H = 340, padL = 50, padR = 24, mu = -0.6, sigma = 0.9, K = 24;
  var svg = R.SVG(stage, W, H);

  var sf = [], rp = [];

  function sample() {
    sf = []; rp = [];
    for (var i = 0; i < K; i++) {
      var e = R.randn(), a = mu + sigma * e;
      sf.push(scoreFunctionEstimate(a, mu, sigma));
      rp.push(reparamEstimate(a));
    }
  }

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, trueG = trueGradient(mu), lo = -8, hi = 8;
    function X(g) { return x0 + ((R.clamp(g, lo, hi) - lo) / (hi - lo)) * (x1 - x0); }
    var yA = 120, yB = 232;
    svg.appendChild(R.E('line', { x1: x0, y1: H - 40, x2: x1, y2: H - 40, stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.E('line', { x1: X(trueG), y1: 58, x2: X(trueG), y2: H - 40, stroke: '#EAF0F8', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    svg.appendChild(R.TX(X(trueG), 50, 'true gradient = ' + trueG.toFixed(2), { fill: '#EAF0F8', size: 11.5 }));
    var s = vstat(sf), r = vstat(rp), i;
    for (i = 0; i < sf.length; i++) svg.appendChild(R.E('circle', { cx: X(sf[i]), cy: yA + (Math.random() - 0.5) * 32, r: 4, fill: R.C.orange, opacity: 0.8 }));
    for (i = 0; i < rp.length; i++) svg.appendChild(R.E('circle', { cx: X(rp[i]), cy: yB + (Math.random() - 0.5) * 32, r: 4, fill: R.C.cyan, opacity: 0.85 }));
    svg.appendChild(R.TX(x0, yA - 28, 'score-function (REINFORCE):  variance = ' + s.variance.toFixed(2), { anchor: 'start', fill: R.C.orange, size: 12, weight: 600 }));
    svg.appendChild(R.TX(x0, yB - 28, 'reparameterization (SAC / VAE):  variance = ' + r.variance.toFixed(2), { anchor: 'start', fill: R.C.cyan, size: 12, weight: 600 }));
    svg.appendChild(R.TX(W / 2, H - 14, 'each dot = one sample\'s gradient estimate  →  tighter cloud = lower variance', { fill: R.C.dim, size: 11.5 }));
  }

  R.slider(ctr, { label: 'policy spread  σ', min: 0.3, max: 2.0, step: 0.05, value: sigma, fmt: function (v) { return v.toFixed(2); }, on: function (v) { sigma = v; sample(); draw(); } });
  R.btn(ctr, 'Resample', 'primary', function () { sample(); draw(); });
  R.legend(stage, [[R.C.orange, 'score-function'], [R.C.cyan, 'reparameterized']]);
  sample(); draw();
});
</script>
