<template>
  <Lab
    ref="lab"
    id="relabel"
    title="Hindsight relabeling — manufacturing supervision from play"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { N_PLAY, trajectory, windowCount, windowEnd, clampStart } from '../logic/relabel.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Every window of experience is already a perfect demonstration of reaching its own endpoint — relabeling in hindsight turns one cheap play stream into a dense goal-conditioned dataset, the data philosophy underneath CALVIN and π0.5.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Numeric core (pinned trajectory + window-slicing math) in logic/relabel.js.
  var N = N_PLAY;                    // 300 samples ≈ 10 min of play at 2 s/sample
  var PTS = trajectory(N);           // pinned meander in unit space
  var start = 0, len = 25;           // current window [start, start+len]
  var bank = new Set(['0|25']);      // harvested (start|len) pairs — the training set
  var busy = false;                  // true while the harvest sweep runs

  var W = 720, H = 400;
  var svg = R.SVG(stage, W, H);

  // --- layout ---------------------------------------------------------------
  // Kitchen map (left), training-set panel (right), timeline strip (bottom).
  var MAP = { x0: 24, y0: 34, x1: 456, y1: 316 };
  function PX(p) { return 32 + p.x * 416; }   // path spans px ≈ 123..427
  function PY(p) { return 42 + p.y * 266; }   // path spans py ≈  92..259
  var TL = { x0: 32, x1: 448, y0: 344, y1: 360 };
  function TX_(i) { return TL.x0 + (i / (N - 1)) * (TL.x1 - TL.x0); }
  var PANEL = 472;
  var BAR_SCALE = 190 / windowCount(N, 15, 1); // full harvest at shortest window fills the bar

  function mmss(sec) { var m = Math.floor(sec / 60); var s = Math.round(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  // --- drawing --------------------------------------------------------------
  // curStart: window position to draw (harvest passes a swept value);
  // shownCount: counter value to display (harvest tweens it).
  function draw(curStart, shownCount) {
    var s0 = (curStart == null) ? start : curStart;
    var count = (shownCount == null) ? bank.size : shownCount;
    var e0 = windowEnd(s0, len, N);
    R.clr(svg);

    // header (reserved band, nothing else above y=34)
    svg.appendChild(R.TX(24, 20, 'top-down kitchen · every window of play = a demo of reaching its own endpoint', { anchor: 'start', size: 11, fill: R.C.ink }));

    // kitchen map frame + landmark blobs (all outside the path's bounding box)
    svg.appendChild(R.E('rect', { x: MAP.x0, y: MAP.y0, width: MAP.x1 - MAP.x0, height: MAP.y1 - MAP.y0, fill: 'rgba(120,140,200,0.05)', stroke: R.C.grid, rx: 8 }));
    svg.appendChild(R.E('rect', { x: 150, y: 56, width: 130, height: 24, fill: 'rgba(120,140,200,0.13)', rx: 5 }));
    svg.appendChild(R.TX(215, 71, 'counter', { size: 10, fill: R.C.dim, base: 'middle' }));
    svg.appendChild(R.E('rect', { x: 44, y: 120, width: 60, height: 70, fill: 'rgba(120,140,200,0.13)', rx: 5 }));
    svg.appendChild(R.TX(74, 156, 'sink', { size: 10, fill: R.C.dim, base: 'middle' }));
    svg.appendChild(R.E('rect', { x: 330, y: 268, width: 94, height: 28, fill: 'rgba(120,140,200,0.13)', rx: 5 }));
    svg.appendChild(R.TX(377, 283, 'drawer', { size: 10, fill: R.C.dim, base: 'middle' }));

    // the one play stream (dim, unlabeled)
    var d = '';
    for (var i = 0; i < N; i++) { d += (i ? 'L' : 'M') + PX(PTS[i]).toFixed(1) + ' ' + PY(PTS[i]).toFixed(1); }
    svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: R.C.dim, 'stroke-width': 1.3, opacity: 0.5, 'stroke-linejoin': 'round' }));

    // the current window, lit up as a goal-conditioned demo
    var dw = '';
    for (var k = s0; k <= e0; k++) { dw += (k > s0 ? 'L' : 'M') + PX(PTS[k]).toFixed(1) + ' ' + PY(PTS[k]).toFixed(1); }
    svg.appendChild(R.E('path', { d: dw, fill: 'none', stroke: R.C.cyan, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    svg.appendChild(R.E('circle', { cx: PX(PTS[s0]), cy: PY(PTS[s0]), r: 3.5, fill: R.C.cyan }));

    // hindsight goal flag at the window's own endpoint
    var ex = PX(PTS[e0]), ey = PY(PTS[e0]);
    svg.appendChild(R.E('circle', { cx: ex, cy: ey, r: 3, fill: R.C.orange }));
    svg.appendChild(R.E('line', { x1: ex, y1: ey, x2: ex, y2: ey - 16, stroke: R.C.orange, 'stroke-width': 1.6 }));
    svg.appendChild(R.E('polygon', { points: ex + ',' + (ey - 16) + ' ' + (ex + 11) + ',' + (ey - 12) + ' ' + ex + ',' + (ey - 8), fill: R.C.orange }));

    // timeline strip: where the window sits in the stream
    svg.appendChild(R.TX(TL.x0, 336, 'play stream · 10 min →', { anchor: 'start', size: 10, fill: R.C.dim }));
    svg.appendChild(R.E('rect', { x: TL.x0, y: TL.y0, width: TL.x1 - TL.x0, height: TL.y1 - TL.y0, fill: 'rgba(120,140,200,0.10)', rx: 4 }));
    svg.appendChild(R.E('rect', { x: TX_(s0), y: TL.y0, width: Math.max(2, TX_(e0) - TX_(s0)), height: TL.y1 - TL.y0, fill: R.C.cyan, opacity: 0.45, rx: 3 }));
    svg.appendChild(R.E('line', { x1: TX_(e0), y1: TL.y0 - 2, x2: TX_(e0), y2: TL.y1 + 2, stroke: R.C.orange, 'stroke-width': 2 }));
    svg.appendChild(R.TX(TL.x0, 374, '0:00', { anchor: 'start', size: 10, fill: R.C.dim }));
    svg.appendChild(R.TX(TL.x1, 374, '10:00', { anchor: 'end', size: 10, fill: R.C.dim }));

    // training-set panel
    svg.appendChild(R.TX(PANEL, 48, 'training set', { anchor: 'start', size: 11, fill: R.C.dim }));
    svg.appendChild(R.TX(PANEL, 86, '' + count, { anchor: 'start', size: 30, weight: 700, fill: R.C.cyan }));
    svg.appendChild(R.TX(PANEL, 106, '(goal → demo) pairs from one stream', { anchor: 'start', size: 10, fill: R.C.dim }));

    var hw = Math.max(2, count * BAR_SCALE);
    svg.appendChild(R.TX(PANEL, 150, 'hindsight relabeling', { anchor: 'start', size: 10.5, fill: R.C.ink }));
    svg.appendChild(R.E('rect', { x: PANEL, y: 158, width: hw, height: 14, fill: R.C.cyan, rx: 3 }));
    svg.appendChild(R.TX(PANEL + hw + 6, 165, '' + count, { anchor: 'start', size: 10.5, fill: R.C.cyan, base: 'middle' }));

    svg.appendChild(R.TX(PANEL, 204, 'scripted collection · same 10 min', { anchor: 'start', size: 10.5, fill: R.C.ink }));
    var sw = Math.max(2, 3 * BAR_SCALE);
    svg.appendChild(R.E('rect', { x: PANEL, y: 212, width: sw, height: 14, fill: R.C.red, rx: 2 }));
    svg.appendChild(R.TX(PANEL + sw + 6, 219, '3 demos', { anchor: 'start', size: 10.5, fill: R.C.red, base: 'middle' }));

    svg.appendChild(R.TX(PANEL, 262, 'one unlabeled stream ⇒', { anchor: 'start', size: 10, fill: R.C.dim }));
    svg.appendChild(R.TX(PANEL, 276, 'hundreds of (goal, demo) pairs', { anchor: 'start', size: 10, fill: R.C.dim }));
  }

  // --- controls ---------------------------------------------------------------
  function key(s) { return s + '|' + len; }

  var startSl = R.slider(ctr, {
    label: 'window start (time into the stream)', min: 0, max: N - 1 - 15, step: 1, value: start,
    fmt: function (v) { return mmss(v * 2); },
    on: function (v) {
      if (busy) return;
      start = clampStart(Math.round(v), len, N);
      if (start !== Math.round(v)) startSl.set(start);
      bank.add(key(start));
      draw();
    },
  });

  R.slider(ctr, {
    label: 'window length', min: 15, max: 75, step: 5, value: len,
    fmt: function (v) { return (v * 2) + ' s'; },
    on: function (v) {
      if (busy) return;
      len = Math.round(v);
      start = clampStart(start, len, N);
      startSl.set(start);
      bank.add(key(start));
      draw();
    },
  });

  R.btn(ctr, 'Harvest all windows', 'primary', function () {
    if (busy) return;
    busy = true;
    var maxStart = N - 1 - len;
    var target = new Set(bank);
    for (var s = 0; s <= maxStart; s++) target.add(key(s));
    var from = bank.size, to = target.size;
    // tween handles prefers-reduced-motion: onStep(1) fires once → counter jumps to final.
    tween(2600, {
      onStep: function (e) { draw(Math.round(maxStart * e), Math.round(from + (to - from) * e)); },
      onDone: function () { bank = target; start = maxStart; startSl.set(start); busy = false; draw(); },
    });
  });

  R.btn(ctr, 'Reset', null, function () {
    if (busy) return;
    start = 0;
    bank = new Set([key(start)]);
    startSl.set(start);
    draw();
  });

  R.legend(ctr, [
    [R.C.dim, 'play stream (unlabeled)'],
    [R.C.cyan, 'relabeled window → demo'],
    [R.C.orange, 'hindsight goal = window endpoint'],
  ]);

  draw();
});
</script>
