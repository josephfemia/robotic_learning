<template>
  <Lab
    ref="lab"
    id="arc"
    title="The course as a single argument"
    :note="`The orange thread is the &quot;optimize-against-an-approximation → it finds the flaws → contain it&quot; motif that recurs in L3, L4, L5, and L8. The cyan spine is the supervision arc. Tap a node to read its one-line role and jump to the lecture. This is the mental model to keep after everything else fades.`"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the arc IIFE (reference lines 3312–3347).
  // window.RLLAB → R; getElementById('arc-stage'/'arc-ctrl') → stage/ctr refs.
  // No numeric computation — purely static layout data + click interaction.
  var W = 700, H = 380, svg = R.SVG(stage, W, H);
  var nodes = [
    { id: 'l3', x: 70,  y: 120, t: 'L3 Imitation',    role: 'Copy the expert. Cheap & stable — but drifts off-distribution (the first appearance of the motif).', motif: true },
    { id: 'l4', x: 200, y: 200, t: 'L4 RL I',          role: 'Learn from reward via values. The deadly triad: optimizing a bootstrapped approximation diverges.', motif: true },
    { id: 'l5', x: 330, y: 130, t: 'L5 RL II',         role: 'Policy gradients, PPO, SAC. Actor exploits the critic; offline RL extrapolates — same disease, contained by trust regions & pessimism.', motif: true },
    { id: 'l6', x: 330, y: 255, t: 'L6 Generative',    role: 'Model p(a|o) to fix multimodality — import diffusion/flow as the policy class.' },
    { id: 'l7', x: 450, y: 255, t: 'L7 Sequence',      role: 'Tokenize trajectories; transformers + chunking. RL as sequence modeling.' },
    { id: 'l8', x: 450, y: 120, t: 'L8 World models',  role: 'Learn dynamics, plan in imagination. The policy exploits model error — the motif again, contained by short rollouts.', motif: true },
    { id: 'l9', x: 570, y: 175, t: 'L9 VLAs',          role: 'Foundation-model pretraining: one model, many robots & tasks.' },
    { id: 'l10', x: 640, y: 255, t: 'L10 Reasoning',   role: 'LLM planning + test-time compute, gated by verification difficulty.' },
  ];
  var edges = [['l3', 'l4'], ['l4', 'l5'], ['l5', 'l6'], ['l6', 'l7'], ['l5', 'l8'], ['l8', 'l9'], ['l7', 'l9'], ['l9', 'l10']];
  var motifPath = ['l3', 'l4', 'l5', 'l8'];
  var sel = 0, selGrow = 1; // selGrow ∈ [0,1] eases the chosen node into focus
  function nodeById(id) { for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i]; }
  function draw() {
    R.clr(svg);
    // spine edges
    for (var e = 0; e < edges.length; e++) { var a = nodeById(edges[e][0]), b = nodeById(edges[e][1]); svg.appendChild(R.E('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: R.C.grid, 'stroke-width': 1.5 })); }
    // motif thread (orange) connecting the recurring-disease lectures
    var dm = ''; for (var i = 0; i < motifPath.length; i++) { var n = nodeById(motifPath[i]); dm += (i ? 'L' : 'M') + n.x + ' ' + n.y; }
    svg.appendChild(R.E('path', { d: dm, fill: 'none', stroke: R.C.orange, 'stroke-width': 2.5, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round', opacity: 0.8 }));
    for (var i = 0; i < nodes.length; i++) { var n = nodes[i], on = (i === sel);
      var g = R.E('g', {}); g.style.cursor = 'pointer';
      var rr = on ? 9 + 4 * selGrow : 9;
      var off = on ? 16 + 4 * selGrow : 16;
      var sz = on ? 10.5 + 1.5 * selGrow : 10.5;
      g.appendChild(R.E('circle', { cx: n.x, cy: n.y, r: rr, fill: on ? R.C.cyan : (n.motif ? 'rgba(232,89,12,0.85)' : R.C.ink), stroke: '#0F1422', 'stroke-width': 2 }));
      g.appendChild(R.TX(n.x, n.y - off, n.t, { fill: on ? R.C.cyan : R.C.dim, size: sz, weight: on ? 700 : 500 }));
      (function (idx) { g.addEventListener('click', function () { select(idx); }); })(i);
      svg.appendChild(g);
    }
    svg.appendChild(R.TX(70, 30, 'cyan spine = supervision arc   ·   orange thread = the "optimize-an-approximation" motif', { anchor: 'start', fill: R.C.dim, size: 11, base: 'hanging' }));
  }
  var info = R.ce('div'); info.style.cssText = 'font-size:13px;color:var(--code-ink);margin:8px 0 6px;min-height:48px;line-height:1.5'; ctr.appendChild(info);
  var jump = R.btn(ctr, 'Open this lecture →', 'primary', function () { var b = document.querySelector('[data-go="' + nodes[sel].id + '"]'); if (b) b.click(); });
  function syncPanel() { info.innerHTML = '<b style="color:#36C5D0">' + nodes[sel].t + '</b> — ' + nodes[sel].role; jump.textContent = 'Open ' + nodes[sel].t.split(' ')[0] + ' →'; }
  function refresh() { syncPanel(); draw(); }
  function select(idx) {
    if (idx === sel) return;
    sel = idx; syncPanel(); selGrow = 0;
    tween(360, { onStep: function (e) { selGrow = e; draw(); } });
  }
  refresh();
});
</script>
