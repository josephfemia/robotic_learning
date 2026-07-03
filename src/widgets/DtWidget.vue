<template>
  <Lab
    ref="lab"
    id="dt"
    title="Return-conditioned generation: it delivers, until the data runs out"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { achievedReturn, MAX_DATA, datasetReturns } from '../logic/decisionTransformer.js';

const note =
  'Each cyan dot near the axis is the return of one <em>training trajectory</em> — the support visibly thins and then runs out exactly at the orange line, so prompting past the last dot is asking the model to imitate data that does not exist. This is the precise sense in which outcome-conditioned imitation differs from RL: it interpolates within demonstrated returns but cannot extrapolate or stitch beyond them. It\'s the visual form of the "Watch out for" note above — and why DT shines for stability and scaling, yet cedes ground to value-based methods when trajectory stitching matters.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Curve + marker ported from the dt IIFE (reference lines 2772–2795).
  // F5 upgrade: the training dataset's per-trajectory returns (seeded, pinned
  // in logic/decisionTransformer.js) are scattered as a dot rug along the
  // return axis, so the support literally runs out where the curve turns red.
  var W = 700, H = 320, padL = 56, padR = 24, padT = 28, padB = 52, prompt = 0.6, maxData = MAX_DATA;
  var svg = R.SVG(stage, W, H);
  var dataR = datasetReturns(48, maxData, 7);

  function X(r) { return padL + (r / 1.2) * (W - padL - padR); }
  function Y(v) { return (H - padB) - (v / 1.2) * ((H - padB) - padT); }

  function draw(dotAlpha) {
    if (dotAlpha === undefined) dotAlpha = 1;
    R.clr(svg);
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: X(0), y1: Y(0), x2: X(1.2), y2: Y(1.2), stroke: R.C.dim, 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    svg.appendChild(R.TX(X(1.12), Y(1.12) - 6, 'ideal (achieved = asked)', { anchor: 'end', fill: R.C.dim, size: 10.5 }));
    svg.appendChild(R.E('line', { x1: X(maxData), y1: y1, x2: X(maxData), y2: y0, stroke: R.C.orange, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }));
    // Label the "best return in dataset" line just above the dot rug (anchored
    // to its left) so it collides with neither the rug nor the "ideal" caption.
    svg.appendChild(R.TX(X(maxData) - 6, y0 - 32, 'best return in dataset', { anchor: 'end', fill: R.C.orange, size: 10.5 }));
    // The dataset itself: one dot per training trajectory, rugged along the
    // return axis with deterministic vertical jitter. The rug thins out and
    // stops exactly at the orange line — that IS the support.
    var pin = '', pout = '', i;
    for (i = 0; i < dataR.length; i++) {
      var jy = (i * 0.6180339887) % 1;
      svg.appendChild(R.E('circle', { cx: X(dataR[i]).toFixed(1), cy: (y0 - 8 - jy * 16).toFixed(1), r: 2.4, fill: R.C.cyan, opacity: (0.75 * dotAlpha).toFixed(3) }));
    }
    for (i = 0; i <= 120; i++) {
      var r = 1.2 * i / 120, pt = X(r).toFixed(1) + ',' + Y(achievedReturn(r, maxData)).toFixed(1);
      if (r <= maxData) pin += (pin ? ' ' : '') + pt; else pout += (pout ? ' ' : '') + pt;
    }
    svg.appendChild(R.E('polyline', { points: pin, fill: 'none', stroke: R.C.green, 'stroke-width': 2.6 }));
    if (pout) svg.appendChild(R.E('polyline', { points: pout, fill: 'none', stroke: R.C.red, 'stroke-width': 2.4, 'stroke-dasharray': '5 4' }));
    var mx = X(prompt), my = Y(achievedReturn(prompt, maxData));
    svg.appendChild(R.E('line', { x1: mx, y1: y1, x2: mx, y2: y0, stroke: '#EAF0F8', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    if (prompt > maxData) {
      // Past the last dot: the trajectory you're asking to imitate isn't there.
      svg.appendChild(R.E('circle', { cx: mx, cy: y0 - 16, r: 4, fill: 'none', stroke: R.C.red, 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }));
    }
    svg.appendChild(R.E('circle', { cx: mx, cy: my, r: 5, fill: prompt <= maxData ? R.C.green : R.C.red }));
    svg.appendChild(R.TX(x0, y1 - 4, 'achieved return vs prompted return-to-go', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(W / 2, H - 12, 'return-to-go you prompt at test time  →', { fill: R.C.dim, size: 11.5 }));
    // Annotation placement: above the marker, clamped clear of the dot rug —
    // and at very low prompts (marker in the bottom-left, near the support
    // line and the rug) it moves to the clear band under the title instead.
    var ty = Math.min(my - 12, y0 - 44);
    if (prompt < 0.2) ty = y1 + 26;
    svg.appendChild(R.TX(mx + (mx > W - 210 ? -12 : 8), ty, prompt <= maxData ? 'in-distribution: it delivers' : 'past the last dot: no data to imitate, no “stitching”', { anchor: (mx > W - 210 ? 'end' : 'start'), fill: '#EAF0F8', size: 11 }));
  }

  // Slider drag: instant redraw.
  R.slider(ctr, { label: 'prompted return-to-go', min: 0, max: 1.2, step: 0.01, value: prompt, fmt: function (v) { return v.toFixed(2); }, on: function (v) { prompt = v; draw(1); } });
  R.legend(stage, [[R.C.cyan, 'dataset trajectory returns (dots)'], [R.C.green, 'within data support'], [R.C.red, 'out of distribution']]);
  // First paint: fade the dataset rug in (instant under reduced motion).
  tween(450, { onStep(e) { draw(e); }, onDone() { draw(1); } });
});
</script>
