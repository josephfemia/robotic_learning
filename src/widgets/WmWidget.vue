<template>
  <Lab
    ref="lab"
    id="wm"
    title="Model error compounds over an imagined rollout"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { latentDivergence, pixelDivergence, trustworthyHorizon } from '../logic/wm.js';

const note =
  'This curve is why Dreamer imagines in <em>short</em> bursts from real states and in a <em>compact latent</em> space rather than pixels (§8.2–8.3), and why §8.5\'s error-containment tricks exist at all. Plan or train inside the dream only as far as the model stays honest.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the wm IIFE (reference lines 2799–2824).
  // Numeric functions come from logic/wm.js (vitest-pinned), which are
  // identical to the original's inline latent(h) and pixel(h) functions.
  var W = 700, H = 320, padL = 54, padR = 24, padT = 46, padB = 52, eps = 0.05, Hmark = 15, Hmax = 50;
  var svg = R.SVG(stage, W, H);

  function X(h) { return padL + (h / Hmax) * (W - padL - padR); }
  function Y(d) { return (H - padB) - R.clamp(d, 0, 1) * ((H - padB) - padT); }

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    var hUse = trustworthyHorizon(eps, Hmax);
    svg.appendChild(R.E('rect', { x: x0, y: y1, width: X(hUse) - x0, height: y0 - y1, fill: 'rgba(47,203,126,0.07)' }));
    svg.appendChild(R.TX(x0 + 6, y0 - 6, 'trustworthy zone', { anchor: 'start', fill: R.C.green, size: 10.5 }));
    var pL = '', pP = '', i;
    for (i = 0; i <= Hmax; i++) {
      pL += (i ? ' ' : '') + X(i).toFixed(1) + ',' + Y(latentDivergence(i, eps)).toFixed(1);
      pP += (i ? ' ' : '') + X(i).toFixed(1) + ',' + Y(pixelDivergence(i, eps)).toFixed(1);
    }
    svg.appendChild(R.E('polyline', { points: pP, fill: 'none', stroke: R.C.red, 'stroke-width': 2.5 }));
    svg.appendChild(R.E('polyline', { points: pL, fill: 'none', stroke: R.C.green, 'stroke-width': 2.5 }));
    var dx = X(Hmark);
    svg.appendChild(R.E('line', { x1: dx, y1: y1, x2: dx, y2: y0, stroke: '#EAF0F8', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    svg.appendChild(R.E('circle', { cx: dx, cy: Y(latentDivergence(Hmark, eps)), r: 5, fill: R.C.green }));
    svg.appendChild(R.E('circle', { cx: dx, cy: Y(pixelDivergence(Hmark, eps)), r: 5, fill: R.C.red }));
    svg.appendChild(R.TX(x0, 16, 'dream-vs-reality divergence over an imagined rollout', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(W / 2, H - 12, 'steps imagined into the future (rollout horizon)  →', { fill: R.C.dim, size: 11.5 }));
  }

  R.slider(ctr, { label: 'per-step model error', min: 0.01, max: 0.18, step: 0.005, value: eps, fmt: function (v) { return v.toFixed(3); }, on: function (v) { eps = v; draw(); } });
  R.slider(ctr, { label: 'rollout horizon', min: 1, max: 50, step: 1, value: Hmark, fmt: function (v) { return '' + v; }, on: function (v) { Hmark = v; draw(); } });
  R.legend(stage, [[R.C.green, 'latent model'], [R.C.red, 'pixel model']]);
  draw();
});
</script>
