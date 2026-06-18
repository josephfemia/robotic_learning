<template>
  <Lab
    ref="lab"
    id="paradigm"
    title="Which paradigm? Follow the supervision signal"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';

const note =
  `Tap the answers. The highlighted leaf is the paradigm the field would reach for — and the lecture that teaches it. Notice how often the answer is “it depends on the data you can afford,” which is the course’s central economic fact in miniature.`;

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage, ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the paradigm IIFE (reference lines 3151–3202).
  var W = 700, H = 360, svg = R.SVG(stage, W, H);
  // state of three questions
  var q = { model: null, signal: null, online: null };
  function leaf() {
    if (q.model === 'yes') return { id: 'l2', name: 'Model-based control (LQR/MPC)', why: 'You have accurate dynamics — exploit them. Precise, verifiable, sample-free.' };
    if (q.signal === 'demos') return { id: 'l3', name: 'Imitation learning (BC / DAgger)', why: 'You can demonstrate. Simplest, stablest, safe — but capped at expert quality.' };
    if (q.signal === 'reward') {
      if (q.online === 'yes') return { id: 'l5', name: 'Online RL (PPO / SAC)', why: 'A reward and the ability to interact. Can exceed any expert; sample-hungry.' };
      if (q.online === 'no') return { id: 'l5', name: 'Offline RL (CQL / IQL)', why: 'A reward but only a fixed dataset. RL optimization without online risk; beware extrapolation.' };
    }
    if (q.signal === 'internet') return { id: 'l9', name: 'Foundation models / VLAs', why: 'Lean on internet-scale pretraining + multi-robot data. Generalization & language interface.' };
    return null;
  }
  function draw() {
    R.clr(svg);
    var qs = [
      { key: 'model',  y: 54,  text: 'Do you have an accurate dynamics model?',    opts: [['yes', 'yes'], ['no', 'no']] },
      { key: 'signal', y: 130, text: 'What supervision can you get?',               opts: [['demos', 'demos'], ['reward', 'a reward'], ['internet', 'web + multi-robot']], show: function () { return q.model === 'no'; } },
      { key: 'online', y: 206, text: 'Can the agent interact during training?',    opts: [['yes', 'yes, online'], ['no', 'no, fixed data']], show: function () { return q.model === 'no' && q.signal === 'reward'; } }
    ];
    for (var i = 0; i < qs.length; i++) {
      var Q = qs[i];
      if (Q.show && !Q.show()) { continue; }
      svg.appendChild(R.TX(40, Q.y, Q.text, { anchor: 'start', fill: R.C.ink, size: 13, weight: 600, base: 'middle' }));
      var bx = 40;
      for (var j = 0; j < Q.opts.length; j++) {
        var o = Q.opts[j], on = (q[Q.key] === o[0]);
        var tw = o[1].length * 7.4 + 26, bxr = bx;
        var g = R.E('g', {}); g.style.cursor = 'pointer';
        g.appendChild(R.E('rect', { x: bxr, y: Q.y + 12, width: tw, height: 26, rx: 6, fill: on ? R.C.cyan : 'rgba(120,140,200,0.10)', stroke: on ? R.C.cyan : R.C.axis, 'stroke-width': 1.3 }));
        g.appendChild(R.TX(bxr + tw / 2, Q.y + 25, o[1], { fill: on ? '#0F1422' : R.C.ink, size: 12, weight: on ? 600 : 400, base: 'middle' }));
        (function (key, val) {
          g.addEventListener('click', function () {
            q[key] = val;
            // reset downstream answers when an upstream changes
            if (key === 'model') { q.signal = null; q.online = null; }
            if (key === 'signal') { q.online = null; }
            draw();
          });
        })(Q.key, o[0]);
        svg.appendChild(g); bx += tw + 12;
      }
    }
    // result
    var L = leaf(); var ry = 290;
    svg.appendChild(R.E('line', { x1: 40, y1: ry - 16, x2: W - 30, y2: ry - 16, stroke: R.C.grid, 'stroke-width': 1 }));
    if (L) {
      svg.appendChild(R.E('rect', { x: 40, y: ry - 6, width: W - 70, height: 54, rx: 8, fill: 'rgba(47,203,126,0.10)', stroke: R.C.green, 'stroke-width': 1.5 }));
      svg.appendChild(R.TX(54, ry + 12, '→ ' + L.name, { anchor: 'start', fill: R.C.green, size: 14, weight: 700, base: 'middle' }));
      svg.appendChild(R.TX(54, ry + 32, L.why, { anchor: 'start', fill: R.C.ink, size: 11.5, base: 'middle' }));
      var gg = R.E('g', {}); gg.style.cursor = 'pointer';
      gg.appendChild(R.E('rect', { x: W - 150, y: ry + 4, width: 104, height: 24, rx: 6, fill: R.C.cobalt || '#2742CC', opacity: 0.0 }));
      gg.appendChild(R.TX(W - 44, ry + 16, 'open ' + L.id.toUpperCase() + ' →', { anchor: 'end', fill: '#2742CC', size: 12, weight: 600, base: 'middle' }));
      gg.addEventListener('click', function () { var b = document.querySelector('[data-go="' + L.id + '"]'); if (b) b.click(); });
      svg.appendChild(gg);
    } else {
      svg.appendChild(R.TX(54, ry + 18, 'Answer the questions above to route to a paradigm…', { anchor: 'start', fill: R.C.dim, size: 12.5, base: 'middle' }));
    }
  }
  draw();
});
</script>
