<template>
  <Lab
    ref="lab"
    id="bon"
    title="Best-of-N with an imperfect verifier"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { evalN } from '../logic/bestOfN.js';

const note =
  'Green = true success rate of the selected plan; the dashed line is a single sample (N=1) for reference. With a strong verifier, more samples help. With a weak verifier, best-of-N optimizes the <em>verifier\'s</em> mistakes — selecting fluent failures — so the curve bends <em>down</em>. The whole bet of test-time scaling lives in the gap between these two regimes.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the bon IIFE (reference lines 3078–3113).
  // evalN() lives in logic/bestOfN.js (vitest-pinned).
  // window.RLLAB → R; getElementById('bon-stage') → stage; getElementById('bon-ctrl') → ctr.
  var vacc = 0.9;
  var Nmax = 64;
  var W = 700, H = 320, svg = R.SVG(stage, W, H);
  var Ns = [1, 2, 4, 8, 16, 32, 64];

  function draw() {
    R.clr(svg);
    var x0 = 58, x1 = W - 30, y0 = H - 50, y1 = 28, h = y0 - y1;
    function X(k) { return x0 + (x1 - x0) * (k / (Ns.length - 1)); }
    function Y(v) { return y0 - h * v; }
    for (var g = 0; g <= 4; g++) {
      var yy = y0 - h * (g / 4);
      svg.appendChild(R.E('line', { x1: x0, y1: yy, x2: x1, y2: yy, stroke: R.C.grid, 'stroke-width': 1 }));
      svg.appendChild(R.TX(x0 - 8, yy, (g * 25) + '%', { anchor: 'end', fill: R.C.dim, size: 10.5, base: 'middle' }));
    }
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    var base = evalN(1, vacc);
    svg.appendChild(R.E('line', { x1: x0, y1: Y(base), x2: x1, y2: Y(base), stroke: R.C.dim, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }));
    svg.appendChild(R.TX(x1, Y(base) - 6, 'N=1 baseline', { anchor: 'end', fill: R.C.dim, size: 10.5 }));
    var d = '', pts = [];
    for (var k = 0; k < Ns.length; k++) {
      var v = evalN(Ns[k], vacc);
      pts.push(v);
      d += (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1);
    }
    var up = pts[pts.length - 1] >= base;
    svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: (up ? R.C.green : R.C.red), 'stroke-width': 2.6 }));
    for (var k = 0; k < Ns.length; k++) {
      svg.appendChild(R.E('circle', { cx: X(k), cy: Y(pts[k]), r: 3.5, fill: (up ? R.C.green : R.C.red) }));
      svg.appendChild(R.TX(X(k), y0 + 15, 'N=' + Ns[k], { fill: R.C.dim, size: 10, base: 'hanging' }));
    }
    svg.appendChild(R.TX(x0, 16, 'true success of the plan best-of-N selects', { anchor: 'start', fill: R.C.ink, size: 12.5, base: 'hanging' }));
    svg.appendChild(R.TX(x1, 16, (up ? 'verifier good → more N helps' : 'verifier weak → more N HURTS'), { anchor: 'end', fill: (up ? R.C.green : R.C.red), size: 11.5, weight: 600, base: 'hanging' }));
  }

  R.slider(ctr, { label: 'verifier reliability', min: 0.5, max: 1, step: 0.01, value: vacc, fmt: function (v) { return (v * 100).toFixed(0) + '%'; }, on: function (v) { vacc = v; draw(); } });
  R.btn(ctr, 'Resample', null, draw);
  draw();
});
</script>
