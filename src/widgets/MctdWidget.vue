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

  function reset() {
    var s = initState(N);
    Vmc = s.Vmc; Vtd = s.Vtd; nEp = 0; draw();
  }

  function episode() {
    runEpisode(Vmc, Vtd, alpha, gamma, N);
    nEp++;
  }

  var W = 700, H = 300, padL = 52, padR = 20, padT = 30, padB = 46; var svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    var maxV = 1.05, bw = (x1 - x0) / N;
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
      svg.appendChild(R.E('rect', { x: cx - mbw - 3, y: Y(Vmc[i]), width: mbw, height: y0 - Y(Vmc[i]), fill: R.C.orange, opacity: 0.85, rx: 1 }));
      svg.appendChild(R.E('rect', { x: cx + 3, y: Y(Vtd[i]), width: mbw, height: y0 - Y(Vtd[i]), fill: R.C.cyan, opacity: 0.85, rx: 1 }));
      svg.appendChild(R.TX(cx, y0 + 16, 's' + i, { fill: R.C.dim, size: 11, base: 'hanging' }));
    }
    svg.appendChild(R.TX(x0, y1 - 6, 'value estimate per state — episodes: ' + nEp, { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    // error readout
    var err = totalError(Vmc, Vtd, trueV);
    svg.appendChild(R.TX(x1, y1 - 6, '|err|  MC ' + err.emc.toFixed(2) + '   TD ' + err.etd.toFixed(2), { anchor: 'end', fill: R.C.dim, size: 11.5, base: 'hanging' }));
  }

  R.btn(ctr, 'Run 1 episode', null, function () { episode(); draw(); });
  R.btn(ctr, 'Run 25 episodes', 'primary', function () { for (var i = 0; i < 25; i++) episode(); draw(); });
  R.btn(ctr, 'Reset', null, reset);
  R.slider(ctr, { label: 'learning rate  α', min: 0.02, max: 0.6, step: 0.01, value: alpha, fmt: function (v) { return v.toFixed(2); }, on: function (v) { alpha = v; } });
  R.legend(stage, [[R.C.orange, 'Monte Carlo'], [R.C.cyan, 'TD(0)'], [R.C.ink, 'true value']]);
  reset();
});
</script>
