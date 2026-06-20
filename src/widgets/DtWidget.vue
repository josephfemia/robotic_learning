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
import { achievedReturn, MAX_DATA } from '../logic/decisionTransformer.js';

const note =
  'This is the precise sense in which outcome-conditioned imitation differs from RL: it interpolates within demonstrated returns but cannot extrapolate or stitch beyond them. It\'s the visual form of the "Watch out for" note above — and why DT shines for stability and scaling, yet cedes ground to value-based methods when trajectory stitching matters.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the dt IIFE (reference lines 2772–2795).
  // Numeric core (achievedReturn) lives in logic/decisionTransformer.js.
  var W = 700, H = 320, padL = 56, padR = 24, padT = 28, padB = 52, prompt = 0.6, maxData = MAX_DATA;
  var svg = R.SVG(stage, W, H);

  function X(r) { return padL + (r / 1.2) * (W - padL - padR); }
  function Y(v) { return (H - padB) - (v / 1.2) * ((H - padB) - padT); }

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: X(0), y1: Y(0), x2: X(1.2), y2: Y(1.2), stroke: R.C.dim, 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    svg.appendChild(R.TX(X(1.12), Y(1.12) - 6, 'ideal (achieved = asked)', { anchor: 'end', fill: R.C.dim, size: 10.5 }));
    svg.appendChild(R.E('line', { x1: X(maxData), y1: y1, x2: X(maxData), y2: y0, stroke: R.C.orange, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }));
    // Label the "best return in dataset" line near the x-axis (anchored to its
    // left) so it never collides with the "ideal" diagonal caption up top.
    svg.appendChild(R.TX(X(maxData) - 6, y0 - 8, 'best return in dataset', { anchor: 'end', fill: R.C.orange, size: 10.5 }));
    var pin = '', pout = '', i;
    for (i = 0; i <= 120; i++) {
      var r = 1.2 * i / 120, pt = X(r).toFixed(1) + ',' + Y(achievedReturn(r, maxData)).toFixed(1);
      if (r <= maxData) pin += (pin ? ' ' : '') + pt; else pout += (pout ? ' ' : '') + pt;
    }
    svg.appendChild(R.E('polyline', { points: pin, fill: 'none', stroke: R.C.green, 'stroke-width': 2.6 }));
    if (pout) svg.appendChild(R.E('polyline', { points: pout, fill: 'none', stroke: R.C.red, 'stroke-width': 2.4, 'stroke-dasharray': '5 4' }));
    var mx = X(prompt), my = Y(achievedReturn(prompt, maxData));
    svg.appendChild(R.E('line', { x1: mx, y1: y1, x2: mx, y2: y0, stroke: '#EAF0F8', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    svg.appendChild(R.E('circle', { cx: mx, cy: my, r: 5, fill: prompt <= maxData ? R.C.green : R.C.red }));
    svg.appendChild(R.TX(x0, y1 - 4, 'achieved return vs prompted return-to-go', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(W / 2, H - 12, 'return-to-go you prompt at test time  →', { fill: R.C.dim, size: 11.5 }));
    svg.appendChild(R.TX(mx + (mx > W - 210 ? -8 : 8), my - 10, prompt <= maxData ? 'in-distribution: it delivers' : 'beyond the data: unreliable, no “stitching”', { anchor: (mx > W - 210 ? 'end' : 'start'), fill: '#EAF0F8', size: 11 }));
  }

  R.slider(ctr, { label: 'prompted return-to-go', min: 0, max: 1.2, step: 0.01, value: prompt, fmt: function (v) { return v.toFixed(2); }, on: function (v) { prompt = v; draw(); } });
  R.legend(stage, [[R.C.green, 'within data support'], [R.C.red, 'out of distribution']]);
  draw();
});
</script>
