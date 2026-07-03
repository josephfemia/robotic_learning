<template>
  <Lab
    ref="lab"
    id="fwd"
    title="The forward process: what the denoiser is actually shown"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import {
  K_MAX, alphaBar, noisedDensity, noisedScore, blend, samplePairs,
} from '../logic/forwardDiffusion.js';

const note =
  'Training never denoises — it\'s regression to name the noise at every blend level <em>k</em>; and the score the network learns belongs to the <em>noised</em> distribution, which is why early sampling steps see one blurred basin and late steps see two.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Numeric core (schedule, density, score, seeded sampling) lives in
  // logic/forwardDiffusion.js and is vitest-pinned. This file only draws.
  var W = 700, H = 350;
  var svg = R.SVG(stage, W, H);

  // ---- geometry -----------------------------------------------------------
  // Header readout band: y 0–30 (reserved — nothing else draws there).
  // Density curves:       y 44–228.
  // Sampled-point strip:  y 254 / 268 (two alternating rows so arrows don't stack).
  // Axis + tick labels:   y 284 down.
  var XMIN = -3.2, XMAX = 3.2, PL = 50, PR = 660;
  var TOP = 44, BASE = 228, PMAX = 0.62;
  var N = 26;

  function X(a) { return PL + (a - XMIN) / (XMAX - XMIN) * (PR - PL); }
  function Y(p) { return BASE - Math.min(p, PMAX) / PMAX * (BASE - TOP); }

  // ---- defs: orange arrowhead for the ε-target/score arrows ---------------
  var defs = R.E('defs');
  var mk = R.E('marker', {
    id: 'fwd-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4,
    markerWidth: 5.5, markerHeight: 5.5, orient: 'auto',
  });
  mk.appendChild(R.E('path', { d: 'M0,0 L8,4 L0,8 Z', fill: R.C.orange }));
  defs.appendChild(mk);
  svg.appendChild(defs);

  // ---- static furniture: axis, ticks, mode names, clean-data curve --------
  svg.appendChild(R.E('line', { x1: PL, y1: 284, x2: PR, y2: 284, stroke: R.C.axis, 'stroke-width': 1 }));
  [-1.4, 0, 1.4].forEach(function (a) {
    svg.appendChild(R.E('line', { x1: X(a), y1: 284, x2: X(a), y2: 289, stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.TX(X(a), 302, a === 0 ? '0' : (a > 0 ? '+1.4' : '−1.4'), { fill: R.C.dim, size: 11 }));
  });
  svg.appendChild(R.TX(X(-1.4), 316, '"go left"', { fill: R.C.cyan, size: 11 }));
  svg.appendChild(R.TX(X(1.4), 316, '"go right"', { fill: R.C.cyan, size: 11 }));
  svg.appendChild(R.TX(X(0), 338, 'action dimension a →', { fill: R.C.dim, size: 12 }));

  function curvePath(abar) {
    var d = '', n = 128;
    for (var i = 0; i <= n; i++) {
      var a = XMIN + (XMAX - XMIN) * i / n;
      d += (i === 0 ? 'M' : 'L') + X(a).toFixed(1) + ',' + Y(noisedDensity(a, abar)).toFixed(1);
    }
    return d;
  }

  // Clean data density p₀ — never changes; dashed reference so "the data never
  // was unimodal" stays visible at every k.
  svg.appendChild(R.E('path', {
    d: curvePath(1), fill: 'none', stroke: R.C.dim,
    'stroke-width': 1.5, 'stroke-dasharray': '5,4', opacity: 0.75,
  }));

  // ---- dynamic nodes -------------------------------------------------------
  var noisedPath = R.E('path', { d: '', fill: 'none', stroke: R.C.cyan, 'stroke-width': 2.2 });
  svg.appendChild(noisedPath);
  var gPts = R.E('g');
  svg.appendChild(gPts);
  var hdrL = R.TX(PL, 20, '', { anchor: 'start', fill: '#EAF0F8', size: 12 });
  var hdrR = R.TX(PR, 20, '', { anchor: 'end', fill: R.C.orange, size: 12 });
  svg.appendChild(hdrL); svg.appendChild(hdrR);

  // ---- state ---------------------------------------------------------------
  var k = 10;
  var seed = 12345;
  var pairs = samplePairs(N, seed);
  var animId = 0; // bumped to cancel an in-flight resample tween

  function drawPoints(xs, abar) {
    R.clr(gPts);
    for (var i = 0; i < xs.length; i++) {
      var px = X(Math.max(XMIN, Math.min(XMAX, xs[i])));
      var py = 254 + 14 * (i % 2);
      // ε-prediction target ∝ −score; drawn in the score direction (into the
      // basins of the NOISED density) — crisply bimodal at low k, one basin at high k.
      var len = Math.max(-26, Math.min(26, noisedScore(xs[i], abar) * 10));
      if (Math.abs(len) >= 3) {
        gPts.appendChild(R.E('line', {
          x1: px, y1: py, x2: px + len, y2: py,
          stroke: R.C.orange, 'stroke-width': 2, 'marker-end': 'url(#fwd-arrow)',
        }));
      }
      gPts.appendChild(R.E('circle', { cx: px, cy: py, r: 3, fill: 'rgba(138,147,163,0.95)' }));
    }
  }

  function render() {
    animId++; // slider wins: cancel any resample tween, redraw instantly
    var abar = alphaBar(k);
    var sa = Math.sqrt(abar), sn = Math.sqrt(1 - abar);
    noisedPath.setAttribute('d', curvePath(abar));
    drawPoints(pairs.map(function (p) { return blend(p.x0, p.eps, abar); }), abar);
    hdrL.textContent = 'noise step k = ' + k + ' / ' + K_MAX;
    hdrR.textContent = 'xₖ = ' + sa.toFixed(2) + '·x₀ + ' + sn.toFixed(2) + '·ε   (√ᾱ·data + √(1−ᾱ)·noise)';
  }

  // ---- controls -------------------------------------------------------------
  // Slider drags are instant (invariant 4); only Resample eases.
  R.slider(ctr, {
    label: 'noise step k', min: 0, max: K_MAX, step: 1, value: k,
    fmt: function (v) { return v + ' / ' + K_MAX; },
    on: function (v) { k = v; render(); },
  });

  R.btn(ctr, 'Resample points', 'primary', function () {
    var abar = alphaBar(k);
    var from = pairs.map(function (p) { return blend(p.x0, p.eps, abar); });
    seed = (seed + 7919) | 0;
    pairs = samplePairs(N, seed);
    var to = pairs.map(function (p) { return blend(p.x0, p.eps, abar); });
    var id = ++animId;
    // tween() is instant under prefers-reduced-motion (onStep(1) once).
    tween(450, {
      onStep: function (e) {
        if (id !== animId) return; // a slider drag superseded this animation
        var xs = from.map(function (x0, i) { return R.lerp(x0, to[i], e); });
        drawPoints(xs, abar);
      },
    });
  });

  R.legend(stage, [
    [R.C.cyan, 'noised density pₖ(x) — what training sees'],
    [R.C.dim, 'clean data p₀(x) (dashed)'],
    ['rgba(138,147,163,0.95)', 'sampled noised actions xₖ'],
    [R.C.orange, 'score arrows of pₖ (−ε target direction)'],
  ]);

  render();
});
</script>
