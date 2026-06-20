<template>
  <Lab
    ref="lab"
    id="attn"
    title="Attention over a trajectory: no distance decay"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { buildAffinities, computeAttentionWeights } from '../logic/attention.js';

const note =
  'Unlike an RNN\'s fading memory, attention weight depends on query–key <em>match</em>, not distance — the structural reason transformers handle long-horizon credit and non-Markov observations so well. The causal mask is the only thing that turns this into autoregression.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the attn IIFE (reference lines 2924–2950).
  // Numeric core (affinities, softmax) lives in logic/attention.js.
  var N = 12, temp = 1.0, causal = true;
  // fixed pseudo-random query-key affinities, deterministic
  var aff = buildAffinities(N);
  var W = 540, H = 440;
  var svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var pad = 70, grid = W - pad - 24, cs = grid / N, y0 = 58;
    var weights = computeAttentionWeights(aff, temp, causal);
    // weights per row with softmax(temp) and optional causal mask
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        var w = weights[i][j];
        var x = pad + j * cs, y = y0 + i * cs;
        var c = Math.round(255 - w * 255 * 1.6); var b = Math.round(40 + w * 215);
        svg.appendChild(R.E('rect', { x: x, y: y, width: cs - 1.5, height: cs - 1.5, rx: 2, fill: 'rgb(' + Math.max(15, c * 0.2 | 0) + ',' + Math.round(80 + w * 120) + ',' + b + ')', opacity: (causal && j > i) ? 0.06 : (0.25 + w * 0.75) }));
      }
    }
    // axis labels
    svg.appendChild(R.TX(pad + grid / 2, y0 - 14, 'attends to  (key position j)  →', { fill: R.C.dim, size: 11.5 }));
    svg.appendChild(R.TX(20, y0 + grid / 2, 'query i', { fill: R.C.dim, size: 11.5, anchor: 'middle' }));
    for (var k = 0; k < N; k += 2) {
      svg.appendChild(R.TX(pad + (k + 0.5) * cs, y0 + grid + 15, '' + k, { fill: R.C.dim, size: 10, base: 'hanging' }));
      svg.appendChild(R.TX(pad - 6, y0 + (k + 0.5) * cs, '' + k, { fill: R.C.dim, size: 10, anchor: 'end', base: 'middle' }));
    }
    svg.appendChild(R.TX(pad, 28, 'attention weights — brighter = more weight' + (causal ? '   (causal mask on)' : '   (full attention)'), { anchor: 'start', fill: R.C.ink, size: 12.5, base: 'hanging' }));
    svg.appendChild(R.TX(pad, 44, 'no diagonal falloff: a late query can put most weight on an early key', { anchor: 'start', fill: R.C.dim, size: 11, base: 'hanging' }));
  }

  var cb = R.btn(ctr, 'Causal mask: ON', 'primary', function () { causal = !causal; cb.textContent = 'Causal mask: ' + (causal ? 'ON' : 'OFF'); cb.classList.toggle('primary', causal); draw(); });
  R.slider(ctr, { label: 'softmax temperature', min: 0.25, max: 3, step: 0.05, value: temp, fmt: function (v) { return v.toFixed(2); }, on: function (v) { temp = v; draw(); } });
  draw();
});
</script>
