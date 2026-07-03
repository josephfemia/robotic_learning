<template>
  <Lab
    ref="lab"
    id="latency"
    title="Thinking at 50 Hz: the reasoning-latency budget"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { MS_PER_TOKEN, simulate, successCurve, optimumBudget } from '../logic/latency.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Thought-tokens buy decision quality and spend control-loop milliseconds; the optimum is a <em>budget</em>, not a maximum — which is why deployed systems split into a slow deliberate planner over a fast reactive policy.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  var W = 700, H = 340, svg = R.SVG(stage, W, H);
  var SEED = 7, BAND = 0.28;

  // State. Budget slider is in tokens; the sim wants ms (2 ms/token → 0..400 ms).
  var budgetTok = 50, speed = 1;

  // Left panel: tracking strip.  Right panel: success-vs-budget curve.
  var Lx0 = 46, Lx1 = 424, Rx0 = 486, Rx1 = 682;
  var y0 = 268, y1 = 46, h = y0 - y1;

  // position → y, clamped into the plot band so an oscillating tracker never
  // invades the header band or the axis labels below.
  var pLo = -1.75, pHi = 1.75;
  function PY(v) { return R.clamp(y0 - h * ((v - pLo) / (pHi - pLo)), y1, y0); }
  function BX(ms) { return Rx0 + (Rx1 - Rx0) * (ms / 400); }
  function SY(s) { return y0 - h * s; }

  var sim = null, curve = null, curveSpeed = null;
  function recompute() {
    sim = simulate({ budgetMs: budgetTok * MS_PER_TOKEN, speed: speed, seed: SEED });
    if (curveSpeed !== speed) { curve = successCurve({ speed: speed, seed: SEED }); curveSpeed = speed; }
  }

  // Linear interpolation of the curve at an off-grid budget (used mid-tween).
  function curveAt(ms) {
    for (var i = 1; i < curve.length; i++) {
      if (ms <= curve[i].budgetMs) {
        var a = curve[i - 1], b = curve[i];
        return R.lerp(a.success, b.success, (ms - a.budgetMs) / (b.budgetMs - a.budgetMs));
      }
    }
    return curve[curve.length - 1].success;
  }

  function pathFrom(arr, upTo, X) {
    var d = '';
    for (var i = 0; i < upTo; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + PY(arr[i]).toFixed(1);
    return d;
  }

  /** Redraw everything; progress ∈ (0,1] reveals the left-panel run (replay). */
  function render(progress) {
    R.clr(svg);
    var T = sim.tracker.length;
    var upTo = Math.max(2, Math.round(T * progress));
    var LX = function (i) { return Lx0 + (Lx1 - Lx0) * (i / (T - 1)); };
    var ms = budgetTok * MS_PER_TOKEN;

    // ---- header band (kept above y=y1; plots never reach it: PY clamps) ----
    var pct = Math.round(sim.success * 100);
    svg.appendChild(R.TX(Lx0, 16, 'decisions arrive ' + ms + ' ms (' + sim.delaySteps + ' ticks @ 50 Hz) late · on-target ' + pct + '%',
      { anchor: 'start', size: 12.5, base: 'hanging' }));
    svg.appendChild(R.TX(Rx1, 16, 'success vs budget', { anchor: 'end', size: 12.5, fill: R.C.dim, base: 'hanging' }));

    // ---- left panel: drifting target vs delayed tracker ----
    // frame + zero line
    svg.appendChild(R.E('line', { x1: Lx0, y1: y0, x2: Lx1, y2: y0, stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.E('line', { x1: Lx0, y1: PY(0), x2: Lx1, y2: PY(0), stroke: R.C.grid, 'stroke-width': 1 }));
    // "on target" tolerance band around the target path
    var band = '';
    for (var i = 0; i < upTo; i++) band += (i ? 'L' : 'M') + LX(i).toFixed(1) + ' ' + PY(sim.target[i] + BAND).toFixed(1);
    for (var j = upTo - 1; j >= 0; j--) band += 'L' + LX(j).toFixed(1) + ' ' + PY(sim.target[j] - BAND).toFixed(1);
    svg.appendChild(R.E('path', { d: band + 'Z', fill: 'rgba(47,203,126,0.10)', stroke: 'none' }));
    // target + tracker
    svg.appendChild(R.E('path', { d: pathFrom(sim.target, upTo, LX), fill: 'none', stroke: R.C.green, 'stroke-width': 2 }));
    svg.appendChild(R.E('path', { d: pathFrom(sim.tracker, upTo, LX), fill: 'none', stroke: R.C.cyan, 'stroke-width': 2.2 }));
    // axes labels
    var yl = R.TX(16, (y0 + y1) / 2, 'position', { size: 11, fill: R.C.dim });
    yl.setAttribute('transform', 'rotate(-90 16 ' + (y0 + y1) / 2 + ')');
    svg.appendChild(yl);
    svg.appendChild(R.TX((Lx0 + Lx1) / 2, H - 12, 'time →', { size: 11, fill: R.C.dim }));

    // ---- right panel: success-vs-budget curve + markers ----
    svg.appendChild(R.E('line', { x1: Rx0, y1: y0, x2: Rx1, y2: y0, stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.E('line', { x1: Rx0, y1: y1, x2: Rx0, y2: y0, stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.TX(Rx0 - 6, SY(1), '1', { anchor: 'end', size: 10, fill: R.C.dim, base: 'middle' }));
    svg.appendChild(R.TX(Rx0 - 6, SY(0), '0', { anchor: 'end', size: 10, fill: R.C.dim, base: 'middle' }));
    svg.appendChild(R.TX(Rx0, y0 + 16, '0', { anchor: 'middle', size: 10, fill: R.C.dim }));
    svg.appendChild(R.TX(Rx1, y0 + 16, '400', { anchor: 'end', size: 10, fill: R.C.dim }));
    svg.appendChild(R.TX((Rx0 + Rx1) / 2, H - 12, 'budget (ms) →', { size: 11, fill: R.C.dim }));
    var cd = '';
    for (var k = 0; k < curve.length; k++) cd += (k ? 'L' : 'M') + BX(curve[k].budgetMs).toFixed(1) + ' ' + SY(curve[k].success).toFixed(1);
    svg.appendChild(R.E('path', { d: cd, fill: 'none', stroke: R.C.violet, 'stroke-width': 2.2 }));
    // interior optimum marker (dashed drop line + label placed clear of the curve)
    var opt = optimumBudget(curve), ox = BX(opt);
    svg.appendChild(R.E('line', { x1: ox, y1: SY(curveAt(opt)) - 4, x2: ox, y2: y0, stroke: R.C.green, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
    var onLeft = opt <= 200;
    svg.appendChild(R.TX(ox + (onLeft ? 5 : -5), y1 + 10, 'best ≈ ' + opt + ' ms',
      { anchor: onLeft ? 'start' : 'end', size: 10.5, fill: R.C.green, base: 'hanging' }));
    // current operating point
    var oy = SY(curveAt(ms));
    svg.appendChild(R.E('circle', { cx: BX(ms), cy: oy, r: 4.5, fill: R.C.orange, stroke: '#1a1f29', 'stroke-width': 1.5 }));
  }

  function draw() { recompute(); render(1); }

  // Replay: reveal the current run over time. tween() falls back to a single
  // onStep(1) under prefers-reduced-motion → the full trajectory draws instantly.
  var replaying = false;
  function replay() {
    if (replaying) return;
    replaying = true;
    recompute();
    tween(1100, {
      onStep: function (e) { render(Math.max(e, 0.02)); },
      onDone: function () { replaying = false; render(1); },
    });
  }

  var budgetSlider = R.slider(ctr, {
    label: 'thinking budget per decision', min: 0, max: 200, step: 10, value: budgetTok,
    fmt: function (v) { return v + ' tok ≈ ' + (v * MS_PER_TOKEN) + ' ms'; },
    on: function (v) { budgetTok = v; draw(); },
  });
  R.slider(ctr, {
    label: 'world speed', min: 0.6, max: 3, step: 0.2, value: speed,
    fmt: function (v) { return v.toFixed(1) + '×'; },
    on: function (v) { speed = v; draw(); },
  });
  R.btn(ctr, 'Replay run', 'primary', replay);
  // Preset jump: ease the budget to the curve's optimum (instant under reduced motion).
  R.btn(ctr, 'Jump to optimum', null, function () {
    recompute();
    var from = budgetTok, to = optimumBudget(curve) / MS_PER_TOKEN;
    if (from === to) return;
    tween(500, {
      onStep: function (e) {
        budgetTok = Math.round(R.lerp(from, to, e));
        budgetSlider.set(budgetTok);
        recompute(); render(1);
      },
      onDone: function () { budgetTok = to; budgetSlider.set(to); draw(); },
    });
  });

  R.legend(stage, [
    [R.C.green, 'drifting target (band = “on target”)'],
    [R.C.cyan, 'tracker acting on stale decisions'],
    [R.C.violet, 'success vs thinking budget'],
    [R.C.orange, 'current operating point'],
  ]);

  draw();
});
</script>
