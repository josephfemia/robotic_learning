<template>
  <Lab
    ref="lab"
    id="flowode"
    title="Integrating the flow: steps vs accuracy"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { velocityField, eulerStep } from '../logic/flowMatching.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Number of integration steps = number of function evaluations = your latency budget. This is exactly why π0\'s flow-matching action head can emit high-frequency action chunks on real hardware where a many-step diffusion sampler would be too slow. Same multimodal target as the diffusion lab above — different, faster road to it.';

const lab = ref(null);

// No persistent animation loop — the slider triggers synchronous rebuild +
// redraw; "Re-sample noise" runs one finite tween() (self-terminating rAF).

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the flowode IIFE (reference lines 2749–2769).
  // Numeric core (velocityField, eulerStep) comes from logic/flowMatching.js
  // (vitest-pinned), identical to the original's inline vel() function.
  var Wc = 700, Hc = 340;
  var cv = document.createElement('canvas');
  cv.width = Wc; cv.height = Hc;
  cv.style.width = '100%'; cv.style.height = 'auto';
  cv.style.maxWidth = Wc + 'px'; cv.style.margin = '0 auto';
  stage.appendChild(cv);
  var g = cv.getContext('2d');

  var steps = 8, N = 60, m1 = -1.3, m2 = 1.3;

  function ax(x) { return Wc / 2 + x * 150; }
  function ay(t) { return 40 + t * (Hc - 82); }

  // Dark backing pill behind a label so it stays legible over paths/dots.
  function label(text, x, y, color, align, size) {
    g.font = (size || 12) + 'px IBM Plex Mono, monospace';
    var w = g.measureText(text).width, pad = 4, h = (size || 12) + 4;
    var bx = align === 'center' ? x - w / 2 - pad : x - pad;
    g.fillStyle = 'rgba(15,20,34,0.78)';
    g.fillRect(bx, y - h + 3, w + pad * 2, h);
    g.fillStyle = color; g.textAlign = align;
    g.fillText(text, x, y);
  }

  var paths = [];

  function build() {
    paths = [];
    for (var i = 0; i < N; i++) {
      var x = R.randn() * 1.0, pts = [{ x: x, t: 0 }], dt = 1 / steps;
      for (var s = 0; s < steps; s++) {
        var t = s * dt;
        x = eulerStep(x, t, dt);
        pts.push({ x: x, t: (s + 1) * dt });
      }
      paths.push(pts);
    }
  }

  function draw() {
    g.clearRect(0, 0, Wc, Hc);
    g.fillStyle = '#0F1422'; g.fillRect(0, 0, Wc, Hc);
    g.strokeStyle = 'rgba(120,140,200,0.16)'; g.lineWidth = 1;
    for (var gx = -2; gx <= 2; gx++) { g.beginPath(); g.moveTo(ax(gx), 34); g.lineTo(ax(gx), Hc - 36); g.stroke(); }
    label('noise  (t = 0)', ax(0), 26, '#8A93A3', 'center', 12);
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      g.beginPath();
      for (var k = 0; k < p.length; k++) {
        var X = ax(p[k].x), Y = ay(p[k].t);
        if (k === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      }
      g.strokeStyle = 'rgba(157,141,241,0.45)'; g.lineWidth = 1.2; g.stroke();
      var last = p[p.length - 1];
      g.beginPath(); g.arc(ax(last.x), ay(last.t), 3, 0, 2 * Math.PI); g.fillStyle = R.C.cyan; g.fill();
      g.beginPath(); g.arc(ax(p[0].x), ay(0), 2.2, 0, 2 * Math.PI); g.fillStyle = '#8A93A3'; g.fill();
    }
    // Mode + readout labels last, with backing, so converging paths never break them.
    label('"go left"', ax(m1), Hc - 24, R.C.cyan, 'center', 12);
    label('"go right"', ax(m2), Hc - 24, R.C.cyan, 'center', 12);
    label('integration steps (NFE) = ' + steps + '    ·    diffusion typically needs ~50–100', 40, Hc - 4, '#EAF0F8', 'left', 12);
    g.save(); g.translate(15, Hc / 2); g.rotate(-Math.PI / 2);
    g.fillStyle = '#8A93A3'; g.textAlign = 'center'; g.font = '12px IBM Plex Mono, monospace'; g.fillText('integration time t  →', 0, 0); g.restore();
  }

  // Slider drags stay instant (motion contract); the discrete "Re-sample
  // noise" click eases the old paths into the new ones. tween() collapses to
  // a single onStep(1) under prefers-reduced-motion.
  R.slider(ctr, { label: 'ODE steps (NFE)', min: 1, max: 40, step: 1, value: steps, fmt: function (v) { return '' + v; }, on: function (v) { steps = v; build(); draw(); } });
  R.btn(ctr, 'Re-sample noise', 'primary', function () {
    var oldPaths = paths;
    build();
    var newPaths = paths;
    tween(400, {
      onStep: function (e) {
        paths = newPaths.map(function (p, i) {
          var op = oldPaths[i];
          // Same steps count on both sides (slider rebuilds instantly), but
          // guard anyway: if lengths differ, snap to the new path.
          if (!op || op.length !== p.length) return p;
          return p.map(function (pt, k) { return { x: op[k].x + (pt.x - op[k].x) * e, t: pt.t }; });
        });
        draw();
      },
      onDone: function () { paths = newPaths; draw(); },
    });
  });
  R.legend(stage, [['#8A93A3', 'start (noise)'], [R.C.violet, 'ODE path'], [R.C.cyan, 'arrived']]);
  build(); draw();
});

onUnmounted(() => {
  // No persistent timers or rAF loops in flowode — build/draw are synchronous
});
</script>
