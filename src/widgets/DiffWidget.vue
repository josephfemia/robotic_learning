<template>
  <Lab
    ref="lab"
    id="diff"
    title="Diffusion sampling: noise → a multimodal action"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { scoreField, noiseSchedule } from '../logic/diffusion.js';

const note =
  'Every grey dot is a random starting point; <strong>Denoise</strong> follows the learned score toward regions of high probability. The punchline that defeats mean-collapse: <em>where a particle lands depends on where it started</em>, so the same model fluidly produces both maneuvers — never their disastrous average. This is exactly why diffusion policies handle multimodal demonstrations that MSE cannot. <span class=&quot;notice&quot;>Caveat: &quot;where it starts decides the mode&quot; is exactly true only for the deterministic probability-flow ODE; the stochastic sampler shown also injects noise each step, so the seed sets the <em>tendency</em>, not a fixed destination.</span>';

const lab = ref(null);

// Timer and animation frame ids for cleanup
let _timeout = null;
let _raf = null;

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the diff IIFE (reference lines 2645–2665).
  // Numeric core (scoreField, noiseSchedule) comes from logic/diffusion.js
  // (vitest-pinned), identical to the original's inline score() and sched formula.
  var Wc = 700, Hc = 340;
  var cv = document.createElement('canvas');
  cv.width = Wc; cv.height = Hc;
  cv.style.width = '100%'; cv.style.height = 'auto';
  cv.style.maxWidth = Wc + 'px'; cv.style.margin = '0 auto';
  stage.appendChild(cv);
  var g = cv.getContext('2d');

  var m1 = [-1.4, 0], m2 = [1.4, 0], pts = [], step = 0, running = false, N = 240, S = 120;

  function CX(x) { return Wc / 2 + x * S; }
  function CY(y) { return Hc / 2 + y * S; }

  function reset() {
    pts = [];
    for (var i = 0; i < N; i++) pts.push({ x: R.randn() * 1.3, y: R.randn() * 1.0 });
    step = 0;
    draw();
  }

  function draw() {
    g.clearRect(0, 0, Wc, Hc);
    g.fillStyle = '#0F1422'; g.fillRect(0, 0, Wc, Hc);
    g.strokeStyle = 'rgba(120,140,200,0.16)'; g.lineWidth = 1;
    var gx, gy;
    for (gx = -2; gx <= 2; gx++) { g.beginPath(); g.moveTo(CX(gx), 20); g.lineTo(CX(gx), Hc - 20); g.stroke(); }
    for (gy = -1; gy <= 1; gy++) { g.beginPath(); g.moveTo(40, CY(gy)); g.lineTo(Wc - 40, CY(gy)); g.stroke(); }
    [m1, m2].forEach(function (m, idx) {
      g.beginPath(); g.arc(CX(m[0]), CY(m[1]), S * 0.5, 0, 2 * Math.PI);
      g.strokeStyle = 'rgba(54,197,208,0.5)'; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.stroke(); g.setLineDash([]);
      g.fillStyle = R.C.cyan; g.font = '12px IBM Plex Mono, monospace'; g.textAlign = 'center';
      g.fillText(idx === 0 ? '"go left"' : '"go right"', CX(m[0]), CY(m[1]) - S * 0.5 - 10);
    });
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      g.beginPath(); g.arc(CX(p.x), CY(p.y), 2.6, 0, 2 * Math.PI);
      g.fillStyle = step === 0 ? 'rgba(138,147,163,0.9)' : 'rgba(54,197,208,0.9)'; g.fill();
    }
    g.fillStyle = '#EAF0F8'; g.textAlign = 'left'; g.font = '12px IBM Plex Mono, monospace';
    g.fillText(step === 0 ? 'pure noise  (step 0)' : 'denoising step ' + step, 40, 24);
    g.fillStyle = '#8A93A3'; g.textAlign = 'center';
    g.fillText('action dimension 1  →', Wc / 2, Hc - 8);
  }

  function dstep() {
    var sched = noiseSchedule(step);
    var lr = 0.18;
    for (var i = 0; i < pts.length; i++) {
      var sc = scoreField(pts[i], sched);
      pts[i].x += lr * sc.sx; pts[i].y += lr * sc.sy;
      var nz = Math.sqrt(2 * lr) * 0.18 * Math.exp(-step / 8);
      pts[i].x += nz * R.randn(); pts[i].y += nz * R.randn();
    }
    step++;
    draw();
  }

  var runBtn;
  function loop() {
    if (!running) return;
    dstep();
    if (step >= 24) { running = false; runBtn.textContent = 'Denoise ▶'; return; }
    _timeout = setTimeout(function () { _raf = requestAnimationFrame(loop); }, 120);
  }

  R.btn(ctr, 'Reset to noise', null, function () {
    running = false; if (runBtn) runBtn.textContent = 'Denoise ▶'; reset();
  });
  R.btn(ctr, 'Step ▸', null, function () {
    running = false; if (runBtn) runBtn.textContent = 'Denoise ▶';
    if (step >= 24) reset(); dstep();
  });
  runBtn = R.btn(ctr, 'Denoise ▶', 'primary', function () {
    if (running) { running = false; runBtn.textContent = 'Denoise ▶'; return; }
    if (step >= 24) reset();
    running = true; runBtn.textContent = 'Pause ⏸'; loop();
  });
  R.legend(stage, [['rgba(138,147,163,0.9)', 'noise samples'], [R.C.cyan, 'settled into a mode']]);
  reset();
});

onUnmounted(() => {
  if (_timeout !== null) clearTimeout(_timeout);
  if (_raf !== null) cancelAnimationFrame(_raf);
});
</script>
