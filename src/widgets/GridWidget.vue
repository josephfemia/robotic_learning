<template>
  <Lab
    ref="lab"
    id="grid"
    title="Value iteration converging on a gridworld"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { ROWS, COLS, WALLS, TERMINALS, STEP_R, ACT, isTerminal, inBounds, nextCell, initV, bellmanSweep, bestAction } from '../logic/gridValueIteration.js';

const note =
  'Cell color = current value estimate (green positive, red negative); cyan arrow = the greedy action it implies. <strong>Step</strong> does one synchronous Bellman sweep; <strong>Run</strong> animates to convergence. Notice the policy is correct near the goal long before distant values settle — and that raising \\(\\gamma\\) lets the goal\'s influence reach farther. <span class=&quot;notice&quot;>Convention: deterministic moves, a per-step living cost, state-rewards with terminals pinned at \\(\\pm1\\) — chosen for a clean, readable backup; the classic Russell–Norvig version adds 80/10/10 slip noise.</span>';

const lab = ref(null);
let timer = null;

onUnmounted(() => {
  if (timer) { clearInterval(timer); timer = null; }
});

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the grid IIFE (reference lines 2432–2466).
  // Numeric core in logic/gridValueIteration.js (vitest-pinned).
  var CELL = 92, M = 18, W = COLS * CELL + 2 * M, H = ROWS * CELL + 2 * M + 10;
  var gamma = 0.9;
  var V, sweeps, maxd;

  function reset() {
    V = initV();
    sweeps = 0;
    maxd = 0;
  }

  function step() {
    var result = bellmanSweep(V, gamma);
    V = result.V;
    maxd = result.maxDelta;
    sweeps++;
    draw();
    return maxd;
  }

  var svg = R.SVG(stage, W, H);

  function fill(v) {
    if (v === null) return '#2A3344';
    if (v >= 0) return 'rgba(47,203,126,' + (R.clamp(v, 0, 1) * 0.85) + ')';
    return 'rgba(255,107,107,' + (R.clamp(-v, 0, 1) * 0.85) + ')';
  }

  function draw() {
    R.clr(svg);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var k = r + ',' + c, x = M + c * CELL, y = M + r * CELL, v = V[r][c];
      svg.appendChild(R.E('rect', { x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 8, fill: fill(v), stroke: 'rgba(200,210,230,0.22)', 'stroke-width': 1 }));
      if (WALLS[k]) { svg.appendChild(R.TX(x + CELL / 2, y + CELL / 2 + 4, 'wall', { fill: R.C.dim, size: 12 })); continue; }
      if (isTerminal(r, c)) { svg.appendChild(R.TX(x + CELL / 2, y + CELL / 2 - 3, TERMINALS[k] > 0 ? '+1' : '−1', { fill: '#fff', size: 24, weight: 700 })); svg.appendChild(R.TX(x + CELL / 2, y + CELL / 2 + 18, TERMINALS[k] > 0 ? 'goal' : 'pit', { fill: 'rgba(255,255,255,0.75)', size: 10 })); continue; }
      svg.appendChild(R.TX(x + CELL / 2, y + 16, (v >= 0 ? '+' : '') + v.toFixed(2), { fill: '#EAF0F8', size: 13, weight: 600, base: 'hanging' }));
      var ba = bestAction(V, r, c, gamma);
      if (ba) {
        var cx = x + CELL / 2, cy = y + CELL / 2 + 9, L = 19, ex = cx + ba[1] * L, ey = cy + ba[0] * L, ang = Math.atan2(ba[0], ba[1]), ah = 6;
        svg.appendChild(R.E('line', { x1: cx - ba[1] * L, y1: cy - ba[0] * L, x2: ex, y2: ey, stroke: R.C.cyan, 'stroke-width': 3, 'stroke-linecap': 'round' }));
        svg.appendChild(R.E('line', { x1: ex, y1: ey, x2: ex + ah * Math.cos(ang + 2.6), y2: ey + ah * Math.sin(ang + 2.6), stroke: R.C.cyan, 'stroke-width': 3, 'stroke-linecap': 'round' }));
        svg.appendChild(R.E('line', { x1: ex, y1: ey, x2: ex + ah * Math.cos(ang - 2.6), y2: ey + ah * Math.sin(ang - 2.6), stroke: R.C.cyan, 'stroke-width': 3, 'stroke-linecap': 'round' }));
      }
    }
    svg.appendChild(R.TX(M, H - 3, 'sweep ' + sweeps + '   ·   max Δ = ' + maxd.toFixed(4), { anchor: 'start', fill: R.C.dim, size: 11.5 }));
  }

  var runBtn;
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (runBtn) runBtn.textContent = 'Run ▶';
  }

  R.btn(ctr, 'Step ▸', 'primary', function () { stop(); step(); });
  runBtn = R.btn(ctr, 'Run ▶', null, function () {
    if (timer) { stop(); return; }
    runBtn.textContent = 'Pause ⏸';
    timer = setInterval(function () { if (step() < 1e-4) stop(); }, 430);
  });
  R.btn(ctr, 'Reset', null, function () { stop(); reset(); draw(); });
  R.slider(ctr, { label: 'discount  γ', min: 0.5, max: 0.99, step: 0.01, value: gamma, fmt: function (v) { return v.toFixed(2); }, on: function (v) { gamma = v; stop(); reset(); draw(); } });
  R.legend(stage, [[R.C.green, 'high value'], [R.C.red, 'low value'], [R.C.cyan, 'greedy action']]);
  reset();
  draw();
});
</script>
