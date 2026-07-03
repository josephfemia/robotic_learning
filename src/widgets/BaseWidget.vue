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
import { RETURNS, MEAN_RETURN, OPTIMAL_BASELINE, MEAN_GRADIENT, gradientStats, varianceCurve } from '../logic/baseline.js';

const note =
  'The scores are centered (they sum to zero, as \\(\\mathbb{E}[\\nabla\\log\\pi]=0\\) guarantees), so the cyan <em>mean-gradient needle refuses to move</em> as you drag \\(b\\) — that\'s unbiasedness, on screen. Meanwhile the orange dot rides the variance curve down into its dip near the mean return. That dip is why we set \\(b\\approx V^\\pi\\): the value function is the best cheaply-available baseline.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Bars panel ported from the base IIFE (reference lines 2572–2593); the
  // variance-vs-b curve and mean-gradient gauge are the Phase-3 (F6) upgrade.
  // All numeric state comes from logic/baseline.js (vitest-pinned).
  var B_MIN = 0, B_MAX = 1.2;
  var W = 700, H = 444, b = 0.0;
  var svg = R.SVG(stage, W, H);

  // The variance-vs-b curve does not depend on the current b — compute once.
  var CURVE = varianceCurve(B_MIN, B_MAX, 121);
  var VMAX = CURVE.reduce(function (m, p) { return Math.max(m, p.variance); }, 0);

  // Panel A — per-sample gradient bars.
  var x0 = 40, x1 = W - 40, ymid = 104, scaleY = 50;
  // Panel B — variance-vs-b curve (x-axis is the same range as the slider).
  var cx0 = 64, cx1 = W - 40, cyT = 226, cyB = 354;
  function bX(bv) { return cx0 + (cx1 - cx0) * (bv - B_MIN) / (B_MAX - B_MIN); }
  function vY(v) { return cyB - (cyB - cyT) * (v / VMAX); }
  // Panel C — mean-gradient gauge (the needle that never moves).
  var gx0 = 150, gx1 = 550, gy = 416, G_MAX = 0.15;
  function gX(v) { return (gx0 + gx1) / 2 + ((gx1 - gx0) / 2) * (v / G_MAX); }

  function draw() {
    R.clr(svg);
    var st = gradientStats(b);
    var n = RETURNS.length, bw = (x1 - x0) / n;

    // --- Panel A: the ten gradient terms as bars ---------------------------
    svg.appendChild(R.E('line', { x1: x0, y1: ymid, x2: x1, y2: ymid, stroke: R.C.axis, 'stroke-width': 1.2 }));
    for (var j = 0; j < n; j++) {
      var gx = x0 + j * bw + bw / 2, gv = st.gs[j], h = gv * scaleY;
      svg.appendChild(R.E('rect', { x: gx - bw * 0.28, y: gv >= 0 ? ymid - h : ymid, width: bw * 0.56, height: Math.abs(h), fill: gv >= 0 ? R.C.green : R.C.red, opacity: 0.85, rx: 2 }));
    }
    svg.appendChild(R.TX(x0, 10, 'gradient term  gᵢ = (Rᵢ − b)·scoreᵢ', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(x1, 10, 'mean return = ' + MEAN_RETURN.toFixed(2) + '   ·   optimal b* = ' + OPTIMAL_BASELINE.toFixed(2), { anchor: 'end', fill: R.C.orange, size: 11.5, base: 'hanging' }));

    // --- Panel B: variance-vs-b curve with a dot riding it ------------------
    svg.appendChild(R.TX(x0, 196, 'variance of the gradient estimate as b slides', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.E('line', { x1: cx0, y1: cyB, x2: cx1, y2: cyB, stroke: R.C.axis, 'stroke-width': 1.2 }));
    var d = '';
    for (var i = 0; i < CURVE.length; i++) d += (i ? 'L' : 'M') + bX(CURVE[i].b).toFixed(1) + ' ' + vY(CURVE[i].variance).toFixed(1);
    svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: R.C.violet, 'stroke-width': 2, opacity: 0.8 }));
    var xs = bX(OPTIMAL_BASELINE);
    svg.appendChild(R.E('line', { x1: xs, y1: cyT, x2: xs, y2: cyB, stroke: R.C.orange, 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: 0.55 }));
    svg.appendChild(R.TX(xs + 6, cyT + 8, 'b* = ' + OPTIMAL_BASELINE.toFixed(2) + ' — the dip', { anchor: 'start', fill: R.C.orange, size: 10.5, base: 'middle' }));
    var dx = bX(b), dy = vY(st.variance);
    svg.appendChild(R.E('line', { x1: dx, y1: dy, x2: dx, y2: cyB, stroke: R.C.orange, 'stroke-width': 1, opacity: 0.35 }));
    svg.appendChild(R.E('circle', { cx: dx, cy: dy, r: 5, fill: R.C.orange }));
    var yt = R.TX(26, (cyT + cyB) / 2, 'variance', { fill: R.C.dim, size: 11 });
    yt.setAttribute('transform', 'rotate(-90 26 ' + (cyT + cyB) / 2 + ')');
    svg.appendChild(yt);
    svg.appendChild(R.TX(cx0, cyB + 14, '0', { fill: R.C.dim, size: 10.5, base: 'middle' }));
    svg.appendChild(R.TX(cx1, cyB + 14, '1.2', { fill: R.C.dim, size: 10.5, base: 'middle' }));
    svg.appendChild(R.TX((cx0 + cx1) / 2, cyB + 14, 'baseline  b', { fill: R.C.dim, size: 10.5, base: 'middle' }));

    // --- Panel C: mean-gradient needle — conspicuously constant in b -------
    svg.appendChild(R.TX(W / 2, 386, 'mean gradient (signal) = ' + st.mean.toFixed(3) + ' — does not move    ·    variance (noise) = ' + st.variance.toFixed(3), { fill: R.C.dim, size: 11.5, base: 'middle' }));
    svg.appendChild(R.E('line', { x1: gx0, y1: gy, x2: gx1, y2: gy, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: gX(0), y1: gy - 4, x2: gX(0), y2: gy + 4, stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.TX(gX(0), gy + 14, '0', { fill: R.C.dim, size: 10, base: 'middle' }));
    svg.appendChild(R.TX(gx0, gy + 14, '−0.15', { fill: R.C.dim, size: 10, base: 'middle' }));
    svg.appendChild(R.TX(gx1, gy + 14, '+0.15', { fill: R.C.dim, size: 10, base: 'middle' }));
    svg.appendChild(R.E('line', { x1: gX(MEAN_GRADIENT), y1: gy - 10, x2: gX(MEAN_GRADIENT), y2: gy + 10, stroke: R.C.cyan, 'stroke-width': 3 }));
  }

  var sld = R.slider(ctr, { label: 'baseline  b', min: B_MIN, max: B_MAX, step: 0.01, value: b, fmt: function (v) { return v.toFixed(2); }, on: function (v) { b = v; draw(); } });
  // Discrete jump → ease the baseline so the dot rides the curve into the dip.
  R.btn(ctr, 'Set b = mean return', 'primary', function () {
    var from = b, to = MEAN_RETURN;
    tween(450, {
      onStep(e) { b = from + (to - from) * e; sld.set(b); draw(); },
      onDone() { b = to; sld.set(b); draw(); },
    });
  });
  R.legend(stage, [[R.C.green, 'pushes this action ↑'], [R.C.red, 'pushes this action ↓'], [R.C.orange, 'variance dot — rides the curve'], [R.C.cyan, 'mean-gradient needle — never moves']]);
  draw();
});
</script>
