<template>
  <Lab
    ref="lab"
    id="bandit"
    title="Exploration strategies on a multi-armed bandit"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { K_ARMS, argmax, pickArm, pull, initBandit } from '../logic/bandit.js';

const note =
  'Each bar is an arm; height = your current estimate, the dot = its hidden true payoff. <strong>Greedy</strong> often locks onto a wrong arm; <strong>ε-greedy</strong> keeps sampling and usually finds the best; <strong>UCB</strong> explores by optimism (try what you\'re uncertain about). Watch cumulative regret — flatter is better. This is the §4.3 exploration problem in its purest form.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the bandit IIFE (reference lines 2875–2921).
  var K = K_ARMS, strat = 'eps', eps = 0.1;
  var truth, Q, n, t, regret, regretHist, best;

  function reset() {
    var state = initBandit(K, R.randn);
    truth = state.truth; best = state.best;
    Q = state.Q; n = state.n; t = 0; regret = 0; regretHist = [0];
    draw();
  }

  function step() {
    var a = pickArm(strat, Q, n, t, eps, Math.random);
    var res = pull(a, truth, Q, n, best, Math.random);
    t++; regret += res.regretStep; regretHist.push(regret);
    if (regretHist.length > 400) regretHist.shift();
    draw();
  }

  function run(m) {
    for (var i = 0; i < m; i++) {
      var a = pickArm(strat, Q, n, t, eps, Math.random);
      var res = pull(a, truth, Q, n, best, Math.random);
      t++; regret += res.regretStep; regretHist.push(regret);
    }
    while (regretHist.length > 400) regretHist.shift();
    draw();
  }

  var W = 700, H = 320, svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    // left: arms; right: regret curve
    var ax0 = 40, ax1 = W * 0.55, ay0 = H - 54, ay1 = 28, bw = (ax1 - ax0) / K;
    svg.appendChild(R.E('line', { x1: ax0, y1: ay0, x2: ax1, y2: ay0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    for (var i = 0; i < K; i++) {
      var cx = ax0 + (i + 0.5) * bw; var eh = (ay0 - ay1) * Q[i], th = (ay0 - ay1) * truth[i];
      svg.appendChild(R.E('rect', { x: cx - bw * 0.3, y: ay0 - eh, width: bw * 0.6, height: eh, fill: (i === argmax(Q) ? R.C.cyan : R.C.dim), opacity: 0.85, rx: 1 }));
      svg.appendChild(R.E('circle', { cx: cx, cy: ay0 - th, r: 4, fill: R.C.orange }));
      svg.appendChild(R.TX(cx, ay0 + 15, '#' + (i + 1), { fill: R.C.dim, size: 10.5, base: 'hanging' }));
      svg.appendChild(R.TX(cx, ay0 - eh - 7, n[i] > 0 ? n[i] + '' : '', { fill: R.C.ink, size: 10 }));
    }
    svg.appendChild(R.TX(ax0, ay1 - 8, 'arm value: estimate (bar) vs hidden truth (dot)', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    // regret curve
    var rx0 = W * 0.62, rx1 = W - 22, ry0 = H - 54, ry1 = 28;
    svg.appendChild(R.E('line', { x1: rx0, y1: ry0, x2: rx1, y2: ry0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: rx0, y1: ry0, x2: rx0, y2: ry1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    var mx = Math.max(1, regret), L = regretHist.length;
    var d = ''; for (var i = 0; i < L; i++) { var x = rx0 + (rx1 - rx0) * (i / Math.max(1, L - 1)); var y = ry0 - (ry0 - ry1) * (regretHist[i] / mx); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    if (L > 1) svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: R.C.violet, 'stroke-width': 2 }));
    svg.appendChild(R.TX(rx0, ry1 - 8, 'cumulative regret — flatter is better', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(rx1, ry0 - 6, 'pulls: ' + t + '   regret: ' + regret.toFixed(1), { anchor: 'end', fill: R.C.dim, size: 11.5 }));
  }

  var sb = R.ce('div'); sb.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px'; ctr.appendChild(sb);
  function mk(lab, key) { var b = R.btn(sb, lab, (strat === key ? 'primary' : null), function () { strat = key; refreshBtns(); }); b.dataset.k = key; return b; }
  var b1 = mk('Greedy', 'greedy'), b2 = mk('ε-greedy', 'eps'), b3 = mk('UCB', 'ucb');
  function refreshBtns() { [b1, b2, b3].forEach(function (b) { if (b.dataset.k === strat) b.classList.add('primary'); else b.classList.remove('primary'); }); }
  R.btn(ctr, 'Pull once', null, function () { step(); });
  R.btn(ctr, 'Run 100 pulls', 'primary', function () { run(100); });
  R.btn(ctr, 'New bandit', null, reset);
  R.slider(ctr, { label: 'exploration  ε  (ε-greedy)', min: 0, max: 0.5, step: 0.01, value: eps, fmt: function (v) { return v.toFixed(2); }, on: function (v) { eps = v; } });
  R.legend(stage, [[R.C.cyan, 'current best arm'], [R.C.orange, 'true payoff'], [R.C.violet, 'regret']]);
  reset();
});
</script>
