<template>
  <Lab
    ref="lab"
    id="qlearn"
    title="Q-learning crawling the maze value iteration swept"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { ROWS, COLS, WALLS, TERMINALS, ACT, isTerminal } from '../logic/gridValueIteration.js';
import { START, MAX_STEPS, FREE_CELLS, makeRng, initQ, greedyA, chooseAction, qStep, valueOf } from '../logic/qlearn.js';
import { prefersReducedMotion } from '../composables/useAnimate.js';

const note =
  'Dynamic programming updates every state because it owns the model; Q-learning only knows where it has been — exploration isn\'t a hyperparameter, it\'s the price of admission for the convergence guarantee. Try it: press <strong>Reset</strong>, drag \\(\\epsilon\\) to 0, then <strong>Run 100</strong> — the agent locks onto the first corridor that pays and the far side\'s values freeze, wrong, forever. Same grid, same rewards, same \\(\\gamma=0.9\\) as the Lecture 2 lab.';

const lab = ref(null);
let timer = null;

onUnmounted(() => {
  if (timer) { clearInterval(timer); timer = null; }
});

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Same visual language and dimensions as GridWidget (L2), with an extra
  // footer band for the episode / coverage counter. Numeric core in
  // logic/qlearn.js (vitest-pinned), grid constants from logic/gridValueIteration.js.
  var CELL = 92, M = 18, W = COLS * CELL + 2 * M, H = ROWS * CELL + 2 * M + 14;
  var SEED = 20260703;
  var gamma = 0.9, eps = 0.2, alpha = 0.5;
  var Q, rng, visited, episodes, curPath;
  var st = null; // in-flight animated batch: { mode, left, er, ec, esteps }

  var svg = R.SVG(stage, W, H);

  function reset() {
    stop();
    Q = initQ();
    rng = makeRng(SEED);
    visited = new Set();
    episodes = 0;
    curPath = null;
    st = null;
    draw();
  }

  // Same value→color mapping as GridWidget.
  function fill(v) {
    if (v >= 0) return 'rgba(47,203,126,' + (R.clamp(v, 0, 1) * 0.85) + ')';
    return 'rgba(255,107,107,' + (R.clamp(-v, 0, 1) * 0.85) + ')';
  }

  function beginEpisode() {
    st.er = START[0]; st.ec = START[1]; st.esteps = 0;
    curPath = [[st.er, st.ec]];
    visited.add(st.er + ',' + st.ec);
  }

  // One full episode, no animation — used by Run 100 ticks and reduced motion.
  function episodeSync() {
    var r = START[0], c = START[1], done = false, s = 0;
    var path = [[r, c]];
    visited.add(r + ',' + c);
    while (!done && s < MAX_STEPS) {
      var a = chooseAction(Q, r, c, eps, rng);
      var res = qStep(Q, r, c, a, alpha, gamma);
      r = res.nr; c = res.nc; done = res.done; s++;
      path.push([r, c]);
      if (!done) visited.add(r + ',' + c);
    }
    episodes++;
    curPath = path;
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    st = null;
  }

  function run(n) {
    stop();
    if (prefersReducedMotion()) {
      for (var i = 0; i < n; i++) episodeSync();
      draw();
      return;
    }
    if (n <= 10) {
      // step-by-step: watch the crawl inside each episode
      st = { mode: 'step', left: n };
      beginEpisode();
      draw();
      timer = setInterval(function () {
        var a = chooseAction(Q, st.er, st.ec, eps, rng);
        var res = qStep(Q, st.er, st.ec, a, alpha, gamma);
        st.er = res.nr; st.ec = res.nc; st.esteps++;
        curPath.push([st.er, st.ec]);
        if (!res.done) visited.add(st.er + ',' + st.ec);
        if (res.done || st.esteps >= MAX_STEPS) {
          episodes++; st.left--;
          if (st.left <= 0) { draw(); stop(); return; }
          beginEpisode();
        }
        draw();
      }, 60);
    } else {
      // episode-by-episode: each tick flashes one completed trajectory
      st = { mode: 'ep', left: n };
      timer = setInterval(function () {
        episodeSync();
        st.left--;
        draw();
        if (st.left <= 0) stop();
      }, 30);
    }
  }

  function draw() {
    R.clr(svg);
    // paint layers: cell fills → path trace + agent → arrows/labels on top
    var gCells = R.E('g'), gPath = R.E('g'), gTop = R.E('g');
    svg.appendChild(gCells); svg.appendChild(gPath); svg.appendChild(gTop);

    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var k = r + ',' + c, x = M + c * CELL, y = M + r * CELL;
      if (WALLS[k]) {
        gCells.appendChild(R.E('rect', { x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 8, fill: '#2A3344', stroke: 'rgba(200,210,230,0.22)', 'stroke-width': 1 }));
        gTop.appendChild(R.TX(x + CELL / 2, y + CELL / 2 + 4, 'wall', { fill: R.C.dim, size: 12 }));
        continue;
      }
      if (isTerminal(r, c)) {
        gCells.appendChild(R.E('rect', { x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 8, fill: fill(TERMINALS[k]), stroke: 'rgba(200,210,230,0.22)', 'stroke-width': 1 }));
        gTop.appendChild(R.TX(x + CELL / 2, y + CELL / 2 - 3, TERMINALS[k] > 0 ? '+1' : '−1', { fill: '#fff', size: 24, weight: 700 }));
        gTop.appendChild(R.TX(x + CELL / 2, y + CELL / 2 + 18, TERMINALS[k] > 0 ? 'goal' : 'pit', { fill: 'rgba(255,255,255,0.75)', size: 10 }));
        continue;
      }
      var seen = visited.has(k);
      if (!seen) {
        // never visited: grey, no value claimed
        gCells.appendChild(R.E('rect', { x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 8, fill: 'rgba(138,147,163,0.10)', stroke: 'rgba(200,210,230,0.12)', 'stroke-width': 1 }));
        gTop.appendChild(R.TX(x + CELL / 2, y + CELL / 2 + 4, '·', { fill: 'rgba(138,147,163,0.55)', size: 16 }));
      } else {
        var v = valueOf(Q, r, c);
        gCells.appendChild(R.E('rect', { x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 8, fill: fill(v), stroke: 'rgba(200,210,230,0.22)', 'stroke-width': 1 }));
        // halo keeps the value legible where the orange path trace passes under it
        var vt = R.TX(x + CELL / 2, y + 16, (v >= 0 ? '+' : '') + v.toFixed(2), { fill: '#EAF0F8', size: 13, weight: 600, base: 'hanging' });
        vt.setAttribute('paint-order', 'stroke');
        vt.setAttribute('stroke', '#1a2130');
        vt.setAttribute('stroke-width', 3);
        gTop.appendChild(vt);
        // greedy arrow only once something has actually been learned here
        var q = Q[r][c];
        if (Math.max(Math.abs(q[0]), Math.abs(q[1]), Math.abs(q[2]), Math.abs(q[3])) > 1e-9) {
          var ai = greedyA(Q, r, c), ba = ACT[ai];
          var cx = x + CELL / 2, cy = y + CELL / 2 + 9, L = 19, ex = cx + ba[1] * L, ey = cy + ba[0] * L, ang = Math.atan2(ba[0], ba[1]), ah = 6;
          gTop.appendChild(R.E('line', { x1: cx - ba[1] * L, y1: cy - ba[0] * L, x2: ex, y2: ey, stroke: R.C.cyan, 'stroke-width': 3, 'stroke-linecap': 'round' }));
          gTop.appendChild(R.E('line', { x1: ex, y1: ey, x2: ex + ah * Math.cos(ang + 2.6), y2: ey + ah * Math.sin(ang + 2.6), stroke: R.C.cyan, 'stroke-width': 3, 'stroke-linecap': 'round' }));
          gTop.appendChild(R.E('line', { x1: ex, y1: ey, x2: ex + ah * Math.cos(ang - 2.6), y2: ey + ah * Math.sin(ang - 2.6), stroke: R.C.cyan, 'stroke-width': 3, 'stroke-linecap': 'round' }));
        }
      }
      if (r === START[0] && c === START[1]) {
        gTop.appendChild(R.TX(x + CELL / 2, y + CELL - 8, 'start', { fill: R.C.dim, size: 9 }));
      }
    }
    // this-episode path trace (orange): over cell fills, under labels/arrows
    if (curPath && curPath.length > 1) {
      var d = '', pr = -1, pc = -1;
      for (var i = 0; i < curPath.length; i++) {
        var p = curPath[i];
        if (p[0] === pr && p[1] === pc) continue; // skip wall-bump duplicates
        pr = p[0]; pc = p[1];
        var px = M + pc * CELL + CELL / 2, py = M + pr * CELL + CELL / 2;
        d += (d ? 'L' : 'M') + px + ' ' + py;
      }
      gPath.appendChild(R.E('path', { d: d, fill: 'none', stroke: R.C.orange, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85 }));
      var lastCell = curPath[curPath.length - 1];
      gPath.appendChild(R.E('circle', { cx: M + lastCell[1] * CELL + CELL / 2, cy: M + lastCell[0] * CELL + CELL / 2, r: 7, fill: R.C.orange, stroke: '#1a2130', 'stroke-width': 2 }));
    }
    gTop.appendChild(R.TX(M, H - 6, 'episodes: ' + episodes + '   ·   visited ' + visited.size + '/' + FREE_CELLS + ' states', { anchor: 'start', fill: R.C.dim, size: 11.5 }));
  }

  R.btn(ctr, 'Run 10 ▶', 'primary', function () { run(10); });
  R.btn(ctr, 'Run 100 ▶', null, function () { run(100); });
  R.btn(ctr, 'Reset', null, reset);
  R.slider(ctr, { label: 'exploration  ε', min: 0, max: 1, step: 0.05, value: eps, fmt: function (v) { return v.toFixed(2); }, on: function (v) { eps = v; } });
  R.slider(ctr, { label: 'learning rate  α', min: 0.05, max: 1, step: 0.05, value: alpha, fmt: function (v) { return v.toFixed(2); }, on: function (v) { alpha = v; } });
  R.legend(stage, [[R.C.green, 'high value'], [R.C.red, 'low value'], [R.C.cyan, 'greedy action'], [R.C.orange, 'episode path'], ['rgba(138,147,163,0.45)', 'never visited']]);
  reset();
});
</script>
