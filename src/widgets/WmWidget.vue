<template>
  <Lab
    ref="lab"
    id="wm"
    title="Model error compounds over an imagined rollout"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { latentDivergence, pixelDivergence, trustworthyHorizon, rolloutFan } from '../logic/wm.js';

const note =
  'Each thin thread is one <em>imagined</em> rollout from the same real start; the cyan dashed line is what reality would do. Small per-step errors compound, so the fans widen with horizon — and the pixel-space fan (red) blows open far sooner than the compact latent fan (green). That is why Dreamer imagines in <em>short</em> bursts from real states and in a <em>compact latent</em> space rather than pixels (§8.2–8.3), and why §8.5\'s error-containment tricks exist: plan or train inside the dream only as far as the fans still hug reality.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // F4 upgrade: the two closed-form divergence curves are now the ENVELOPE of
  // an enacted process — a fan of imagined rollouts (logic/wm.js rolloutFan,
  // vitest-pinned) diverging from one real trajectory, latent narrow / pixel
  // wide. The horizon slider cuts the fans off; the trustworthy zone is where
  // the fans still hug the real line.
  var W = 700, H = 320, padL = 18, padR = 18, padT = 44, padB = 46;
  var Hmax = 50, eps = 0.05, Hmark = 15, NFan = 12, seed = 1;
  var svg = R.SVG(stage, W, H);
  var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
  var ymid = (y0 + y1) / 2;
  // Reserve a clear band above the axis (for the zone label) and below the
  // header; offsets are clamped to ±1 so no fan thread can enter either band.
  var maxA = Math.min(y0 - 22 - ymid, ymid - y1);

  function X(h) { return x0 + (h / Hmax) * (x1 - x0); }
  function Yoff(d) { return ymid - R.clamp(d, -1, 1) * maxA; }

  var latFan = [], pixFan = [];
  function sampleFans() {
    // Same seed while ε drags → the threads morph smoothly instead of re-rolling.
    latFan = rolloutFan(NFan, Hmax, eps, 'latent', seed);
    pixFan = rolloutFan(NFan, Hmax, eps, 'pixel', seed + 1000);
  }

  function fanPts(traj) {
    var pts = '';
    for (var h = 0; h <= Hmark; h++) pts += (h ? ' ' : '') + X(h).toFixed(1) + ',' + Yoff(traj[h]).toFixed(1);
    return pts;
  }
  function envPts(fn, sgn) {
    var pts = '';
    for (var h = 0; h <= Hmark; h++) pts += (h ? ' ' : '') + X(h).toFixed(1) + ',' + Yoff(sgn * fn(h, eps)).toFixed(1);
    return pts;
  }

  function draw(alpha) {
    if (alpha === undefined) alpha = 1;
    R.clr(svg);
    var i, s;
    // Trustworthy zone: where the latent fan still hugs the real line.
    var hUse = trustworthyHorizon(eps, Hmax);
    svg.appendChild(R.E('rect', { x: x0, y: y1, width: Math.max(0, X(hUse) - x0), height: y0 - y1, fill: 'rgba(47,203,126,0.07)' }));
    svg.appendChild(R.TX(x0 + 6, y0 - 6, 'trustworthy zone', { anchor: 'start', fill: R.C.green, size: 10.5 }));
    // The one real trajectory — continues regardless of how far you imagine.
    svg.appendChild(R.E('line', { x1: x0, y1: ymid, x2: x1, y2: ymid, stroke: R.C.cyan, 'stroke-width': 2, 'stroke-dasharray': '6 5' }));
    // Fans, cut off at the imagination horizon: pixel (wide) under latent (narrow).
    for (i = 0; i < pixFan.length; i++) {
      svg.appendChild(R.E('polyline', { points: fanPts(pixFan[i]), fill: 'none', stroke: R.C.red, 'stroke-width': 1.1, opacity: (0.40 * alpha).toFixed(3) }));
    }
    for (i = 0; i < latFan.length; i++) {
      svg.appendChild(R.E('polyline', { points: fanPts(latFan[i]), fill: 'none', stroke: R.C.green, 'stroke-width': 1.2, opacity: (0.55 * alpha).toFixed(3) }));
    }
    // Statistical envelopes (±divergence): the original closed-form curves.
    for (s = -1; s <= 1; s += 2) {
      svg.appendChild(R.E('polyline', { points: envPts(pixelDivergence, s), fill: 'none', stroke: R.C.red, 'stroke-width': 1.4, 'stroke-dasharray': '4 3', opacity: 0.8 }));
      svg.appendChild(R.E('polyline', { points: envPts(latentDivergence, s), fill: 'none', stroke: R.C.green, 'stroke-width': 1.6, opacity: 0.9 }));
    }
    // Imagination cutoff.
    svg.appendChild(R.E('line', { x1: X(Hmark), y1: y1, x2: X(Hmark), y2: y0, stroke: '#EAF0F8', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    // Header band: title + error-vs-horizon readout (typical spread = RMS envelope).
    svg.appendChild(R.TX(x0, 16, 'imagined rollouts fanning off the real trajectory', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(x0, 32, 'spread at h=' + Hmark + ' — latent ' + latentDivergence(Hmark, eps).toFixed(2) + ' · pixel ' + pixelDivergence(Hmark, eps).toFixed(2), { anchor: 'start', fill: R.C.dim, size: 10.5, base: 'hanging' }));
    svg.appendChild(R.TX(W / 2, H - 12, 'steps imagined into the future (rollout horizon)  →', { fill: R.C.dim, size: 11.5 }));
  }

  // Slider drags: instant redraw (per-step error re-derives the same-seed fan).
  R.slider(ctr, { label: 'per-step model error', min: 0.01, max: 0.18, step: 0.005, value: eps, fmt: function (v) { return v.toFixed(3); }, on: function (v) { eps = v; sampleFans(); draw(1); } });
  R.slider(ctr, { label: 'rollout horizon', min: 1, max: 50, step: 1, value: Hmark, fmt: function (v) { return '' + v; }, on: function (v) { Hmark = v; draw(1); } });
  // Discrete change: fresh dreams fade in (instant under reduced motion).
  R.btn(ctr, 'Resample dreams', 'primary', function () {
    seed += 1;
    sampleFans();
    tween(360, { onStep(e) { draw(e); }, onDone() { draw(1); } });
  });
  R.legend(stage, [[R.C.cyan, 'real trajectory'], [R.C.green, 'latent dreams (narrow fan)'], [R.C.red, 'pixel dreams (wide fan)']]);

  sampleFans();
  tween(500, { onStep(e) { draw(e); }, onDone() { draw(1); } });
});
</script>
