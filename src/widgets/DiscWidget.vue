<template>
  <Lab
    ref="lab"
    id="disc"
    title="How the discount factor shapes the horizon"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { discountWeights, effectiveHorizon, totalWeight } from '../logic/discount.js';

const note =
  'Each orange bar is the weight \\(\\gamma^k\\) on the reward \\(k\\) steps ahead. ' +
  'The dashed cyan line marks the effective horizon \\(1/(1-\\gamma)\\); ' +
  'the orange number is the total discounted weight of an infinite future.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the disc IIFE (reference lines ~2412–2429).
  // Numeric values come from logic/discount.js (vitest-pinned), which is
  // identical to the original's inline Math.pow / 1/(1-γ).
  const W = 700, H = 300, N = 26, padL = 48, padR = 22, padT = 26, padB = 46;
  let gamma = 0.9;
  const svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    const x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT, bw = (x1 - x0) / N;
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    const weights = discountWeights(gamma, N);
    for (let k = 0; k < N; k++) {
      const h = weights[k], bh = (y0 - y1) * h;
      svg.appendChild(R.E('rect', { x: x0 + k * bw + 1, y: y0 - bh, width: Math.max(1, bw - 2), height: bh, fill: R.C.orange, opacity: 0.85, rx: 1 }));
    }
    const total = totalWeight(gamma), heff = effectiveHorizon(gamma), kx = x0 + Math.min(N, heff) * bw;
    svg.appendChild(R.E('line', { x1: kx, y1: y1, x2: kx, y2: y0, stroke: R.C.cyan, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    svg.appendChild(R.TX(kx + (kx > W - 180 ? -6 : 6), y1 + 2, 'effective horizon ≈ ' + heff.toFixed(1) + ' steps', { fill: R.C.cyan, size: 11.5, anchor: (kx > W - 180 ? 'end' : 'start'), base: 'hanging' }));
    svg.appendChild(R.TX(x0 - 8, y0, '0', { anchor: 'end', fill: R.C.dim, size: 11 }));
    svg.appendChild(R.TX(x0 - 8, y1, '1', { anchor: 'end', fill: R.C.dim, size: 11, base: 'hanging' }));
    svg.appendChild(R.TX((x0 + x1) / 2, H - 12, 'steps into the future  k  →', { fill: R.C.dim, size: 11.5 }));
    svg.appendChild(R.TX(x1, y0 - 8, 'Σ γᵏ = 1/(1−γ) = ' + total.toFixed(1), { anchor: 'end', fill: R.C.orange, size: 12.5, weight: 600 }));
  }

  R.slider(ctr, { label: 'discount  γ', min: 0, max: 0.99, step: 0.01, value: gamma, fmt: (v) => v.toFixed(2), on: (v) => { gamma = v; draw(); } });
  draw();
});
</script>
