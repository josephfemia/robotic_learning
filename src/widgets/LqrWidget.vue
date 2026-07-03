<template>
  <Lab
    ref="lab"
    id="lqr"
    title="LQR: the optimizer chooses your gains"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { solve } from '../logic/lqr.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'You never chose \\(K\\): you stated one preference — the ratio \\(q/r\\) of how much you hate error versus effort — and the Riccati recursion handed you the gains. Notice its two components are exactly a position gain and a velocity gain: the \\(K_p\\) and \\(K_d\\) you tuned by feel in the PID lab, now derived. There is nothing else to tune and no way to make this ring unstably — that\'s the point. And the object Riccati computes along the way, the cost-to-go \\(V(x) = x^\\top P x\\), is the first value function of the course: L4\'s \\(V(s)\\) is this same idea with the closed form removed.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Same visual grammar as PidWidget: a mass rising from 0 to a dashed
  // target line, but here the gains come from logic/lqr.js's Riccati
  // recursion (vitest-pinned), not from sliders. One knob: log10(q/r).
  var logRatio = 0; // balanced preset
  var W = 700, H = 420, svg = R.SVG(stage, W, H);

  // `disp` holds the currently-shown solution so preset jumps can ease
  // between trajectories/readouts. Slider drags redraw instantly.
  var disp = solve(logRatio);

  // ---- layout ------------------------------------------------------------
  // Header band (y<44) is reserved for the K / J readouts; the position
  // panel's ceiling (hi=1.30) keeps even the largest overshoot (~1.04)
  // well below it, and the 'target' label sits at the right edge where
  // every trace has already settled — no collisions at either extreme.
  var x0 = 46, x1 = W - 24;
  var pTop = 44, pBot = 252;           // position panel
  var eHead = 282, eTop = 296, eBot = H - 34; // effort panel
  var lo = -0.06, hi = 1.3;
  function Yp(v) { return pBot - (pBot - pTop) * ((v - lo) / (hi - lo)); }
  function X(i, n) { return x0 + (x1 - x0) * (i / (n - 1)); }

  function fmtJ(J) { return J >= 100 ? J.toFixed(0) : J.toFixed(1); }
  function fmtRatio(v) {
    var ratio = Math.pow(10, v);
    return ratio >= 10 ? ratio.toFixed(0) : (ratio >= 1 ? ratio.toFixed(1) : ratio.toFixed(2));
  }

  function pathFrom(arr, Yfn) {
    var d = '';
    for (var i = 0; i < arr.length; i++) {
      d += (i ? 'L' : 'M') + X(i, arr.length).toFixed(1) + ' ' + Yfn(arr[i]).toFixed(1);
    }
    return d;
  }

  function draw(s) {
    R.clr(svg);

    // header readouts — the whole widget in two numbers (Unicode only)
    svg.appendChild(R.TX(x0, 14, 'Riccati gain K = [ ' + s.K[0].toFixed(2) + ', ' + s.K[1].toFixed(2) + ' ]   (u = −K·x)', { anchor: 'start', fill: R.C.ink, size: 12.5, base: 'hanging' }));
    svg.appendChild(R.TX(x1, 14, 'total cost J = x₀ᵀP x₀ = ' + fmtJ(s.J), { anchor: 'end', fill: R.C.violet, size: 12.5, base: 'hanging' }));

    // ---- position panel (PID grammar: dashed target, zero axis, trace) ----
    svg.appendChild(R.E('line', { x1: x0, y1: Yp(1), x2: x1, y2: Yp(1), stroke: R.C.green, 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }));
    svg.appendChild(R.TX(x1, Yp(1) - 6, 'target', { anchor: 'end', fill: R.C.green, size: 11 }));
    svg.appendChild(R.E('line', { x1: x0, y1: Yp(0), x2: x1, y2: Yp(0), stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.E('path', { d: pathFrom(s.pos, Yp), fill: 'none', stroke: R.C.cyan, 'stroke-width': 2.4 }));

    // ---- effort panel (own scale; peak stated in its header, so labels
    // never chase the trace at ratio extremes) ------------------------------
    var uMax = 0, uMin = 0;
    for (var i = 0; i < s.u.length; i++) { if (s.u[i] > uMax) uMax = s.u[i]; if (s.u[i] < uMin) uMin = s.u[i]; }
    var peak = Math.max(uMax, -uMin);
    var uHi = Math.max(uMax, 1e-6) * 1.12, uLo = Math.min(uMin, 0) * 1.12;
    function Yu(v) { return eBot - (eBot - eTop) * ((v - uLo) / (uHi - uLo)); }
    svg.appendChild(R.TX(x0, eHead, 'control effort u(t)  ·  peak = ' + (peak >= 10 ? peak.toFixed(1) : peak.toFixed(2)), { anchor: 'start', fill: R.C.orange, size: 12, base: 'hanging' }));
    svg.appendChild(R.E('line', { x1: x0, y1: Yu(0), x2: x1, y2: Yu(0), stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.E('path', { d: pathFrom(s.u, Yu), fill: 'none', stroke: R.C.orange, 'stroke-width': 2 }));

    svg.appendChild(R.TX(W / 2, H - 10, 'time →', { fill: R.C.dim, size: 11 }));
  }

  // Slider drag: solve + draw instantly (Riccati on a 2×2 is microseconds).
  function redraw() { disp = solve(logRatio); draw(disp); }

  // Preset jump: ease traces and readouts from the shown solution to the
  // new one. tween() collapses to a single onStep(1) under reduced motion.
  function animateTo(newLogRatio) {
    var from = disp;
    var to = solve(newLogRatio);
    logRatio = newLogRatio;
    tween(480, {
      onStep(e) {
        var n = to.pos.length;
        var pos = new Array(n), u = new Array(n);
        for (var i = 0; i < n; i++) {
          pos[i] = from.pos[i] + (to.pos[i] - from.pos[i]) * e;
          u[i] = from.u[i] + (to.u[i] - from.u[i]) * e;
        }
        disp = {
          pos: pos,
          u: u,
          K: [from.K[0] + (to.K[0] - from.K[0]) * e, from.K[1] + (to.K[1] - from.K[1]) * e],
          J: from.J + (to.J - from.J) * e,
        };
        draw(disp);
      },
      onDone() { disp = to; draw(to); },
    });
  }

  var sld = R.slider(ctr, {
    label: 'cost ratio log₁₀(q/r) — hate error ↔ hate effort',
    min: -2, max: 3, step: 0.1, value: logRatio,
    fmt: function (v) { return 'q/r = ' + fmtRatio(v); },
    on: function (v) { logRatio = v; redraw(); },
  });

  function preset(v) { sld.set(v); animateTo(v); }
  R.btn(ctr, 'cheap effort', null, function () { preset(2.5); });
  R.btn(ctr, 'balanced', 'primary', function () { preset(0); });
  R.btn(ctr, 'expensive effort', null, function () { preset(-2); });

  R.legend(ctr, [
    [R.C.cyan, 'position x(t)'],
    [R.C.orange, 'control effort u(t)'],
    [R.C.green, 'target'],
  ]);

  draw(disp);
});
</script>
