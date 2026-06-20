<template>
  <Lab
    ref="lab"
    id="mctd"
    title="Monte Carlo vs. TD: the same target, two error profiles"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { trueValues, runEpisode, initState, totalError } from '../logic/mcTd.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Dashed line = true value of each state. Run episodes and watch the bars converge: MC (orange) is jumpy and unbiased; TD (cyan) is smooth but biased while learning. Raise the learning rate \\(\\alpha\\) to trade stability for speed. This is the dial GAE will later make continuous.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the mctd IIFE (reference lines 2828–2871).
  var N = 5, gamma = 0.9, alpha = 0.15;
  var trueV = []; for (var i = 0; i < N; i++) { trueV[i] = Math.pow(gamma, (N - 1 - i)); }
  var Vmc, Vtd, nEp;

  // `disp` holds the currently-shown bar values; it eases toward the true
  // estimates on each discrete "Run …" click so bars grow/shrink smoothly.
  var dispMc, dispTd;

  function reset() {
    var s = initState(N);
    Vmc = s.Vmc; Vtd = s.Vtd; nEp = 0;
    dispMc = Vmc.slice(); dispTd = Vtd.slice();
    render();
  }

  function episode() {
    runEpisode(Vmc, Vtd, alpha, gamma, N);
    nEp++;
  }

  // padT leaves a clear band at the top for the header + error readout so the
  // tallest bars (value → 1) and the s4 true-value dash never reach into them.
  var W = 700, H = 300, padL = 52, padR = 20, padT = 46, padB = 46; var svg = R.SVG(stage, W, H);
  var maxV = 1.05;

  function render() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    var bw = (x1 - x0) / N;
    function Y(v) { return y0 - (y0 - y1) * (v / maxV); }
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.TX(x0 - 8, Y(1), '1', { anchor: 'end', fill: R.C.dim, size: 11, base: 'middle' }));
    svg.appendChild(R.TX(x0 - 8, y0, '0', { anchor: 'end', fill: R.C.dim, size: 11, base: 'middle' }));
    for (var i = 0; i < N; i++) {
      var cx = x0 + (i + 0.5) * bw;
      // true value dashed marker
      svg.appendChild(R.E('line', { x1: x0 + i * bw + 6, y1: Y(trueV[i]), x2: x0 + (i + 1) * bw - 6, y2: Y(trueV[i]), stroke: R.C.ink, 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }));
      // MC bar (left half) and TD bar (right half)
      var mbw = bw * 0.32;
      svg.appendChild(R.E('rect', { x: cx - mbw - 3, y: Y(dispMc[i]), width: mbw, height: y0 - Y(dispMc[i]), fill: R.C.orange, opacity: 0.85, rx: 1 }));
      svg.appendChild(R.E('rect', { x: cx + 3, y: Y(dispTd[i]), width: mbw, height: y0 - Y(dispTd[i]), fill: R.C.cyan, opacity: 0.85, rx: 1 }));
      svg.appendChild(R.TX(cx, y0 + 16, 's' + i, { fill: R.C.dim, size: 11, base: 'hanging' }));
    }
    // Top band: header on the left, error readout on the right.
    svg.appendChild(R.TX(x0, 14, 'value estimate per state — episodes: ' + nEp, { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    var err = totalError(Vmc, Vtd, trueV);
    svg.appendChild(R.TX(x1, 14, '|err|  MC ' + err.emc.toFixed(2) + '   TD ' + err.etd.toFixed(2), { anchor: 'end', fill: R.C.dim, size: 11.5, base: 'hanging' }));
  }

  // Run `m` episodes, then ease the bars from their previous heights to the
  // new estimates (3b1b-style growth instead of an instant snap).
  function runEased(m) {
    var fromMc = dispMc.slice(), fromTd = dispTd.slice();
    for (var k = 0; k < m; k++) episode();
    var toMc = Vmc.slice(), toTd = Vtd.slice();
    tween(420, { onStep: function (e) {
      for (var i = 0; i < N; i++) { dispMc[i] = fromMc[i] + (toMc[i] - fromMc[i]) * e; dispTd[i] = fromTd[i] + (toTd[i] - fromTd[i]) * e; }
      render();
    } });
  }

  R.btn(ctr, 'Run 1 episode', null, function () { runEased(1); });
  R.btn(ctr, 'Run 25 episodes', 'primary', function () { runEased(25); });
  R.btn(ctr, 'Reset', null, function () { var fromMc = dispMc ? dispMc.slice() : null, fromTd = dispTd ? dispTd.slice() : null; var s = initState(N); Vmc = s.Vmc; Vtd = s.Vtd; nEp = 0; if (!fromMc) { dispMc = Vmc.slice(); dispTd = Vtd.slice(); render(); return; } tween(420, { onStep: function (e) { for (var i = 0; i < N; i++) { dispMc[i] = fromMc[i] * (1 - e); dispTd[i] = fromTd[i] * (1 - e); } render(); } }); });
  R.slider(ctr, { label: 'learning rate  α', min: 0.02, max: 0.6, step: 0.01, value: alpha, fmt: function (v) { return v.toFixed(2); }, on: function (v) { alpha = v; } });
  R.legend(stage, [[R.C.orange, 'Monte Carlo'], [R.C.cyan, 'TD(0)'], [R.C.ink, 'true value']]);
  reset();
});
</script>
