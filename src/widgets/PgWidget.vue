<template>
  <Lab
    ref="lab"
    id="pg"
    title="REINFORCE: a policy climbing a reward it cannot see"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';

const note =
  'Press <strong>Sample &amp; step</strong> repeatedly, or <strong>Auto-run</strong>. Each dot is a sampled action; its size is the magnitude of its advantage. Notice the policy both <em>shifts</em> toward high reward (the mean update) and <em>narrows</em> as it grows confident (the variance update) — both fall out of the same gradient on \\(\\log\\pi\\).';

const lab = ref(null);

let timeoutId = null;
let running = false;

onUnmounted(() => {
  running = false;
  if (timeoutId !== null) clearTimeout(timeoutId);
});

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the pg IIFE (reference lines 2540–2568).
  // Canvas created and appended here; getElementById → stage ref; window.RLLAB → R.
  var Wc = 700, Hc = 360;
  var cv = document.createElement('canvas');
  cv.width = Wc; cv.height = Hc;
  cv.style.width = '100%'; cv.style.height = 'auto';
  cv.style.maxWidth = Wc + 'px'; cv.style.margin = '0 auto';
  stage.appendChild(cv);
  var g = cv.getContext('2d');

  var mu = -1.1, logsig = Math.log(0.85), lr = 0.12, iter = 0, samples = [], A0 = -3, A1 = 3;

  function X(a) { return 42 + ((a - A0) / (A1 - A0)) * (Wc - 72); }
  function Rwd(a) { return Math.exp(-Math.pow(a - 1.2, 2) / (2 * 0.45)); }

  function draw() {
    g.clearRect(0, 0, Wc, Hc);
    g.fillStyle = '#0F1422'; g.fillRect(0, 0, Wc, Hc);
    var baseY = Hc - 52;
    g.strokeStyle = 'rgba(120,140,200,0.16)'; g.lineWidth = 1;
    g.font = '11px IBM Plex Mono, monospace'; g.textAlign = 'center';
    for (var gx = -3; gx <= 3; gx++) {
      var x = X(gx);
      g.beginPath(); g.moveTo(x, 30); g.lineTo(x, baseY); g.stroke();
      g.fillStyle = '#8A93A3'; g.fillText('' + gx, x, baseY + 18);
    }
    g.strokeStyle = 'rgba(205,214,232,0.55)';
    g.beginPath(); g.moveTo(36, baseY); g.lineTo(Wc - 28, baseY); g.stroke();
    g.fillStyle = '#8A93A3'; g.fillText('action a  →', Wc / 2, Hc - 8);
    g.beginPath();
    for (var i = 0; i <= 160; i++) {
      var a = A0 + (A1 - A0) * i / 160, y = baseY - Rwd(a) * 150, x2 = X(a);
      if (i === 0) g.moveTo(x2, y); else g.lineTo(x2, y);
    }
    g.strokeStyle = 'rgba(232,89,12,0.95)'; g.lineWidth = 2; g.stroke();
    g.lineTo(X(A1), baseY); g.lineTo(X(A0), baseY); g.closePath();
    g.fillStyle = 'rgba(232,89,12,0.10)'; g.fill();
    g.fillStyle = R.C.orange; g.textAlign = 'left'; g.fillText('reward R(a)', X(1.2) + 10, baseY - 150 + 6);
    var sig = Math.exp(logsig);
    g.beginPath();
    for (var j = 0; j <= 160; j++) {
      var aa = A0 + (A1 - A0) * j / 160, p = Math.exp(-Math.pow(aa - mu, 2) / (2 * sig * sig)), yy = baseY - p * 150, xx = X(aa);
      if (j === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.strokeStyle = R.C.cyan; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = R.C.cyan; g.fillText('policy π(a)=N(μ,σ)', X(mu) + 8, Math.max(42, baseY - 150 - 8));
    for (var s = 0; s < samples.length; s++) {
      var sm = samples[s], rr = 3 + Math.min(9, Math.abs(sm.adv) * 9);
      g.beginPath(); g.arc(X(sm.a), baseY - 6, rr, 0, 2 * Math.PI);
      g.fillStyle = sm.adv >= 0 ? R.C.green : R.C.red; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
    }
    g.strokeStyle = '#EAF0F8'; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(X(mu), 30); g.lineTo(X(mu), baseY); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#EAF0F8'; g.textAlign = 'left'; g.font = '12px IBM Plex Mono, monospace';
    g.fillText('iteration ' + iter + '    μ=' + mu.toFixed(2) + '    σ=' + sig.toFixed(2) + '    (optimum a*≈1.2)', 42, 24);
  }

  function stepOnce() {
    var sig = Math.exp(logsig), K = 14;
    samples = []; var rs = [];
    for (var i = 0; i < K; i++) {
      var a = mu + sig * R.randn(), r = Rwd(a);
      samples.push({ a: a, adv: 0, r: r }); rs.push(r);
    }
    var mean = 0;
    for (var m = 0; m < K; m++) mean += rs[m];
    mean /= K;
    var gmu = 0, gls = 0;
    for (var k = 0; k < K; k++) {
      var adv = samples[k].r - mean;
      samples[k].adv = adv;
      var d = samples[k].a - mu;
      gmu += adv * d / (sig * sig);
      gls += adv * ((d * d) / (sig * sig) - 1);
    }
    gmu /= K; gls /= K;
    mu = R.clamp(mu + lr * gmu, -3, 3);
    logsig = R.clamp(logsig + 0.5 * lr * gls, Math.log(0.18), Math.log(1.2));
    iter++;
    draw();
  }

  var runBtn;
  function loop() {
    if (!running) return;
    stepOnce();
    if (iter >= 40) { running = false; runBtn.textContent = 'Auto-run ▶'; return; }
    timeoutId = setTimeout(function () { requestAnimationFrame(loop); }, 280);
  }

  R.btn(ctr, 'Sample & step ▸', 'primary', function () {
    running = false;
    if (runBtn) runBtn.textContent = 'Auto-run ▶';
    stepOnce();
  });
  runBtn = R.btn(ctr, 'Auto-run ▶', null, function () {
    if (running) { running = false; runBtn.textContent = 'Auto-run ▶'; return; }
    running = true; runBtn.textContent = 'Pause ⏸'; loop();
  });
  R.btn(ctr, 'Reset', null, function () {
    running = false;
    if (runBtn) runBtn.textContent = 'Auto-run ▶';
    mu = -1.1; logsig = Math.log(0.85); iter = 0; samples = []; draw();
  });
  R.legend(stage, [[R.C.green, 'better than average (push ↑)'], [R.C.red, 'worse than average (push ↓)'], [R.C.cyan, 'policy'], [R.C.orange, 'reward']]);
  draw();
});
</script>
