<template>
  <Lab
    ref="lab"
    id="triad"
    title="The deadly triad: lethal only in combination"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { runTriad } from '../logic/deadlyTriad.js';

const note =
  'Each line is a state\'s value estimate over training steps. Any one or two legs: stable. All three: divergence. This is why DQN\'s tricks (replay buffer, frozen target network) target the <em>bootstrapping</em> leg — it\'s the one you can\'t simply remove, so you tame it instead. <span class="notice">Schematic: this is the textbook two-state Sutton &amp; Barto / Baird construction that isolates the three ingredients — not a literal DQN run.</span>';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the triad IIFE (reference lines 3268–3308).
  var fa = false, boot = false, off = false, W = 700, H = 320, svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var hist = runTriad(fa, boot, off);
    var x0 = 50, x1 = W - 30, y0 = H - 46, y1 = 26;
    var maxv = 0;
    for (var t = 0; t < hist.length; t++) for (var i = 0; i < hist[t].length; i++) { var a = Math.abs(hist[t][i]); if (isFinite(a)) maxv = Math.max(maxv, a); }
    maxv = Math.max(4, Math.min(maxv, 1e6));
    function X(t) { return x0 + (x1 - x0) * (t / Math.max(1, hist.length - 1)); }
    function Y(v) { var c = R.clamp(v, -maxv, maxv); return (y0 + y1) / 2 - ((y0 - y1) / 2) * (c / maxv); }
    svg.appendChild(R.E('line', { x1: x0, y1: (y0 + y1) / 2, x2: x1, y2: (y0 + y1) / 2, stroke: R.C.axis, 'stroke-width': 1 }));
    var cols = [R.C.cyan, R.C.orange]; var names = ['v(s) = w', 'v(s′) = 2w'];
    for (var i = 0; i < 2; i++) {
      var d = '';
      for (var t = 0; t < hist.length; t++) { d += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(hist[t][i]).toFixed(1); }
      svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: cols[i], 'stroke-width': 2.2 }));
      var lastY = Y(hist[hist.length - 1][i]); svg.appendChild(R.TX(x1 - 2, lastY - 6, names[i], { anchor: 'end', fill: cols[i], size: 11, weight: 600 }));
    }
    var diverged = maxv > 1000; var legs = (fa ? 1 : 0) + (boot ? 1 : 0) + (off ? 1 : 0);
    svg.appendChild(R.TX(x0, 16, 'value estimates over training  —  legs on: ' + legs + '/3', { anchor: 'start', fill: R.C.ink, size: 12.5, base: 'hanging' }));
    svg.appendChild(R.TX(x1, 16, diverged ? 'DIVERGING → ∞' : 'stable', { anchor: 'end', fill: diverged ? R.C.red : R.C.green, size: 13, weight: 700, base: 'hanging' }));
    svg.appendChild(R.TX(W / 2, H - 12, 'training steps →', { fill: R.C.dim, size: 11 }));
  }

  var b1 = R.btn(ctr, 'Function approximation: OFF', null, function () { fa = !fa; b1.textContent = 'Function approximation: ' + (fa ? 'ON' : 'OFF'); b1.classList.toggle('primary', fa); draw(); });
  var b2 = R.btn(ctr, 'Bootstrapping: OFF', null, function () { boot = !boot; b2.textContent = 'Bootstrapping: ' + (boot ? 'ON' : 'OFF'); b2.classList.toggle('primary', boot); draw(); });
  var b3 = R.btn(ctr, 'Off-policy data: OFF', null, function () { off = !off; b3.textContent = 'Off-policy data: ' + (off ? 'ON' : 'OFF'); b3.classList.toggle('primary', off); draw(); });
  R.btn(ctr, 'Turn on all three', 'primary', function () {
    fa = boot = off = true;
    b1.textContent = 'Function approximation: ON'; b2.textContent = 'Bootstrapping: ON'; b3.textContent = 'Off-policy data: ON';
    b1.classList.add('primary'); b2.classList.add('primary'); b3.classList.add('primary');
    draw();
  });
  draw();
});
</script>
