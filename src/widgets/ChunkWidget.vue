<template>
  <Lab
    ref="lab"
    id="chunk"
    title="Action chunking &amp; receding-horizon execution"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { truth, predict, buildCommitted, lastPlanStep } from '../logic/actionChunking.js';

const note =
  'Re-planning every step (short stride) is maximally reactive but can jitter; committing to a long chunk is smooth but slow to correct. Temporal ensembling averages overlapping chunk predictions to get most of the smoothness <em>and</em> the reactivity — the same MPC rhythm behind Diffusion Policy and π0.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the chunk IIFE (reference lines 2953–2992).
  // Numeric core (truth, predict, buildCommitted, lastPlanStep) in logic/actionChunking.js.
  var T = 40, chunk = 12, stride = 4, ensemble = true, t = 0;
  var W = 700, H = 320;
  var svg = R.SVG(stage, W, H);

  function X(i) { return 50 + (W - 72) * (i / (T - 1)); }
  function Y(v) { return (H - 46) - ((H - 46) - 26) * ((v - 0.0) / 1.0); }

  function draw() {
    R.clr(svg);
    var committed = buildCommitted(t, T, chunk, stride, ensemble);
    svg.appendChild(R.E('line', { x1: 50, y1: H - 46, x2: W - 22, y2: H - 46, stroke: R.C.axis, 'stroke-width': 1.2 }));
    // truth
    var d = '';
    for (var i = 0; i < T; i++) { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(truth(i)).toFixed(1); }
    svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: R.C.ink, 'stroke-width': 1.4, 'stroke-dasharray': '4 4', opacity: 0.5 }));
    // the current predicted chunk (faint) from latest planning point s<=t
    var s = lastPlanStep(t, stride, T);
    var dc = '';
    for (var k = 0; k < chunk; k++) { var idx = s + k; if (idx >= T) break; dc += (k ? 'L' : 'M') + X(idx).toFixed(1) + ' ' + Y(predict(s, k)).toFixed(1); }
    svg.appendChild(R.E('path', { d: dc, fill: 'none', stroke: R.C.violet, 'stroke-width': 2, opacity: 0.45 }));
    for (var k = 0; k < chunk; k++) { var idx = s + k; if (idx >= T) break; svg.appendChild(R.E('circle', { cx: X(idx), cy: Y(predict(s, k)), r: 2.5, fill: R.C.violet, opacity: 0.5 })); }
    // committed/executed path (solid)
    var dd = '', started = false;
    for (var i = 0; i < T; i++) { if (committed[i] == null) continue; dd += (started ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(committed[i]).toFixed(1); started = true; }
    if (started) svg.appendChild(R.E('path', { d: dd, fill: 'none', stroke: R.C.cyan, 'stroke-width': 2.6 }));
    // planning marker
    svg.appendChild(R.E('line', { x1: X(s), y1: 26, x2: X(s), y2: H - 46, stroke: R.C.orange, 'stroke-width': 1.3, 'stroke-dasharray': '3 3', opacity: 0.7 }));
    svg.appendChild(R.TX(50, 18, 'executed (cyan) vs latest predicted chunk (violet) vs demo target (dashed)', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(W - 22, H - 30, 'time →   step ' + t + '/' + (T - 1), { anchor: 'end', fill: R.C.dim, size: 11 }));
  }

  R.btn(ctr, 'Advance one re-plan', 'primary', function () { t = Math.min(T - 1, t + stride); draw(); });
  R.btn(ctr, 'Reset', null, function () { t = 0; draw(); });
  var eb = R.btn(ctr, 'Temporal ensembling: ON', 'primary', function () { ensemble = !ensemble; eb.textContent = 'Temporal ensembling: ' + (ensemble ? 'ON' : 'OFF'); eb.classList.toggle('primary', ensemble); draw(); });
  R.slider(ctr, { label: 'execution stride (steps before re-plan)', min: 1, max: 12, step: 1, value: stride, fmt: function (v) { return '' + v; }, on: function (v) { stride = v; draw(); } });
  R.slider(ctr, { label: 'chunk length', min: 4, max: 20, step: 1, value: chunk, fmt: function (v) { return '' + v; }, on: function (v) { chunk = v; draw(); } });
  draw();
});
</script>
