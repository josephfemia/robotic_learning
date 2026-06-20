<template>
  <Lab
    ref="lab"
    id="pid"
    title="PID control: the three gains, felt"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { sim, metrics } from '../logic/pid.js';

const note =
  '\\(K_p\\) = how hard to push on the current error (fast but oscillatory), \\(K_d\\) = push against the rate of change (damping), \\(K_i\\) = accumulate past error (kills the final offset). The dashed line is the target; the curve is the response over time. There\'s no single right answer — only tradeoffs, which is exactly why the next step is to make it an optimization (LQR).';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the pid IIFE (reference lines 3237–3264).
  // Numeric core in logic/pid.js (vitest-pinned).
  var Kp = 6, Ki = 0, Kd = 2, W = 700, H = 320, svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var xs = sim(Kp, Ki, Kd);
    var x0 = 46, x1 = W - 24, y0 = H - 44, y1 = 28, h = y0 - y1;
    var lo = -0.4, hi = 2.0;
    function Y(v) { return y0 - h * ((v - lo) / (hi - lo)); }
    // target line
    svg.appendChild(R.E('line', { x1: x0, y1: Y(1), x2: x1, y2: Y(1), stroke: R.C.green, 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }));
    svg.appendChild(R.TX(x1, Y(1) - 6, 'target', { anchor: 'end', fill: R.C.green, size: 11 }));
    svg.appendChild(R.E('line', { x1: x0, y1: Y(0), x2: x1, y2: Y(0), stroke: R.C.axis, 'stroke-width': 1 }));
    // response
    var d = '';
    for (var i = 0; i < xs.length; i++) {
      var x = x0 + (x1 - x0) * (i / (xs.length - 1));
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + Y(xs[i]).toFixed(1);
    }
    // color by stability: if last value far from target or huge, warn
    var m = metrics(xs);
    svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: m.unstable ? R.C.red : R.C.cyan, 'stroke-width': 2.4 }));
    svg.appendChild(R.TX(x0, 18, 'response x(t) toward the target  —  overshoot ' + m.overshoot.toFixed(0) + '%, final ' + m.last.toFixed(2), { anchor: 'start', fill: m.unstable ? R.C.red : R.C.ink, size: 12.5, base: 'hanging' }));
    svg.appendChild(R.TX(W / 2, H - 10, 'time →', { fill: R.C.dim, size: 11 }));
  }

  R.slider(ctr, { label: 'Kp  (proportional)', min: 0, max: 30, step: 0.5, value: Kp, fmt: function (v) { return v.toFixed(1); }, on: function (v) { Kp = v; draw(); } });
  R.slider(ctr, { label: 'Ki  (integral)', min: 0, max: 12, step: 0.25, value: Ki, fmt: function (v) { return v.toFixed(2); }, on: function (v) { Ki = v; draw(); } });
  R.slider(ctr, { label: 'Kd  (derivative)', min: 0, max: 10, step: 0.25, value: Kd, fmt: function (v) { return v.toFixed(2); }, on: function (v) { Kd = v; draw(); } });
  R.btn(ctr, 'Reset gains', null, function () {
    Kp = 6; Ki = 0; Kd = 2;
    ctr.querySelectorAll('input').forEach(function (inp, i) { inp.value = [6, 0, 2][i]; inp.dispatchEvent(new Event('input')); });
  });
  draw();
});
</script>
