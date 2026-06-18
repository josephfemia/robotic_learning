<template>
  <Lab
    ref="lab"
    id="xembod"
    title="Cross-embodiment transfer: pooled beats solo"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { soloRate, pooledRate } from '../logic/xembod.js';

const note =
  `The orange bar is the target robot trained on its own data only; the cyan bar adds co-training on other embodiments. Diminishing but real returns — and the curve only bends up because the bodies share <em>something</em> (the world). <span class="notice">Honesty note: real OXE transfer is positive <em>on average</em>, not universally — some embodiment pairs show <em>negative</em> transfer (a very different robot can hurt), and low &quot;shared structure&quot; here mimics that by flattening the gain. Pooling is a bet that usually pays, not a law.</span>`;

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the xembod IIFE (reference lines 2996–3032).
  // soloRate() / pooledRate() come from logic/xembod.js (vitest-pinned), which
  // implement the same math as the original's inline solo()/pooled() functions.
  var extra = 3, share = 0.55;
  var MAXE = 8;
  var W = 700, H = 320, svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var x0 = 70, y0 = H - 50, y1 = 30, h = y0 - y1;
    function Y(v) { return y0 - h * v; }
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: W - 30, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    for (var g = 0; g <= 4; g++) {
      var yy = y0 - h * (g / 4);
      svg.appendChild(R.TX(x0 - 8, yy, (g * 25) + '%', { anchor: 'end', fill: R.C.dim, size: 10.5, base: 'middle' }));
      svg.appendChild(R.E('line', { x1: x0, y1: yy, x2: W - 30, y2: yy, stroke: R.C.grid, 'stroke-width': 1 }));
    }
    // solo bar
    var bw = 70;
    var sv = soloRate();
    svg.appendChild(R.E('rect', { x: x0 + 40, y: Y(sv), width: bw, height: y0 - Y(sv), fill: R.C.orange, opacity: 0.88, rx: 2 }));
    svg.appendChild(R.TX(x0 + 40 + bw / 2, Y(sv) - 8, (sv * 100).toFixed(0) + '%', { fill: R.C.orange, size: 12, weight: 600 }));
    svg.appendChild(R.TX(x0 + 40 + bw / 2, y0 + 16, 'target robot', { fill: R.C.dim, size: 11, base: 'hanging' }));
    svg.appendChild(R.TX(x0 + 40 + bw / 2, y0 + 30, 'solo', { fill: R.C.dim, size: 11, base: 'hanging' }));
    // pooled bar
    var pv = pooledRate(extra, share), px = x0 + 40 + bw + 90;
    svg.appendChild(R.E('rect', { x: px, y: Y(pv), width: bw, height: y0 - Y(pv), fill: R.C.cyan, opacity: 0.88, rx: 2 }));
    svg.appendChild(R.TX(px + bw / 2, Y(pv) - 8, (pv * 100).toFixed(0) + '%', { fill: R.C.cyan, size: 12, weight: 600 }));
    svg.appendChild(R.TX(px + bw / 2, y0 + 16, '+ co-trained on', { fill: R.C.dim, size: 11, base: 'hanging' }));
    svg.appendChild(R.TX(px + bw / 2, y0 + 30, extra + ' other embodiment' + (extra === 1 ? '' : 's'), { fill: R.C.dim, size: 11, base: 'hanging' }));
    // transfer curve to the right
    var cx0 = px + bw + 70, cx1 = W - 30, cy0 = y0, cy1 = y1;
    var d = '';
    for (var n = 0; n <= MAXE; n++) {
      var x = cx0 + (cx1 - cx0) * (n / MAXE);
      var y = Y(pooledRate(n, share));
      d += (n ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    svg.appendChild(R.E('path', { d: d, fill: 'none', stroke: R.C.green, 'stroke-width': 2 }));
    svg.appendChild(R.E('circle', { cx: cx0 + (cx1 - cx0) * (extra / MAXE), cy: Y(pooledRate(extra, share)), r: 4, fill: R.C.green }));
    svg.appendChild(R.TX(cx0, cy1 - 6, 'success vs # pooled embodiments', { anchor: 'start', fill: R.C.green, size: 11, base: 'hanging' }));
    svg.appendChild(R.TX(70, 16, 'target-robot success rate', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
  }

  R.slider(ctr, { label: 'other embodiments pooled in', min: 0, max: MAXE, step: 1, value: extra, fmt: function (v) { return '' + v; }, on: function (v) { extra = v; draw(); } });
  R.slider(ctr, { label: 'shared structure across bodies', min: 0.1, max: 1, step: 0.05, value: share, fmt: function (v) { return (v * 100).toFixed(0) + '%'; }, on: function (v) { share = v; draw(); } });
  R.legend(stage, [[R.C.orange, 'solo'], [R.C.cyan, 'pooled'], [R.C.green, 'transfer curve']]);
  draw();
});
</script>
