<template>
  <Lab
    ref="lab"
    id="xembod"
    title="Cross-embodiment transfer: pooled beats solo"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween, easings, prefersReducedMotion } from '../composables/useAnimate.js';
import {
  soloRate, pooledRate, transferGain, flowStrength, distanceForOverlap,
} from '../logic/xembod.js';

const note =
  `Each disc is one embodiment's data pool; the lens where a cyan pool overlaps the orange target disc is their <em>shared structure</em> (objects, physics, task semantics) — and only that overlap flows into the target robot's success bar. Slide sharing down and the flow thins to nothing; below ~30% it reverses and pooling <em>costs</em> success. <span class="notice">Honesty note: real OXE transfer is positive <em>on average</em>, not universally — some embodiment pairs show <em>negative</em> transfer (a very different robot can hurt), which is exactly the red regime here. Pooling is a bet that usually pays, not a law.</span>`;

const lab = ref(null);
let stopped = false;

onUnmounted(() => { stopped = true; });

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Toy model (soloRate/pooledRate) is unchanged from the original xembod IIFE;
  // the F2 uplift adds the mechanism picture: data-pool discs whose pairwise
  // overlap = the shared-structure slider, and a flow band (overlap → success
  // bar) whose thickness = transferGain. All numerics live in logic/xembod.js.
  var extra = 3, share = 0.55;
  var MAXE = 8;
  var W = 700, H = 346, svg = R.SVG(stage, W, H);

  // Bars (right panel)
  var y0 = 300, yT = 48, hh = y0 - yT;
  function Y(v) { return y0 - hh * v; }
  var soloX = 480, poolX = 592, bw = 56;
  // Disc cluster (left panel)
  var T = { x: 168, y: 182 }, rT = 54, rO = 38;

  // Ambient flow animation state
  var dotEls = [], bzP = null, phase = 0;

  function bez(t, p0, p1, p2, p3) {
    var u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  }

  function placeDots() {
    if (!bzP || !dotEls.length) return;
    for (var i = 0; i < dotEls.length; i++) {
      var t = (phase + i / dotEls.length) % 1;
      var p = bez(t, bzP[0], bzP[1], bzP[2], bzP[3]);
      dotEls[i].setAttribute('cx', p.x.toFixed(1));
      dotEls[i].setAttribute('cy', p.y.toFixed(1));
      dotEls[i].setAttribute('opacity', (0.25 + 0.75 * Math.sin(Math.PI * t)).toFixed(2));
    }
  }

  function draw() {
    R.clr(svg);
    dotEls = []; bzP = null;
    var sv = soloRate(), pv = pooledRate(extra, share);
    var gain = transferGain(extra, share), str = flowStrength(extra, share);

    // Header (top-left) + transfer readout (top-right) — reserved band y < 30
    svg.appendChild(R.TX(24, 14, 'shared structure is what transfers', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    var pts = Math.round((pv - sv) * 100);
    var rTxt = gain > 0.004 ? ('transfer: +' + pts + ' pts')
      : gain < -0.004 ? ('transfer: ' + pts + ' pts — negative') : 'transfer: ±0 pts';
    var rCol = gain > 0.004 ? R.C.green : (gain < -0.004 ? R.C.red : R.C.dim);
    svg.appendChild(R.TX(W - 24, 14, rTxt, { anchor: 'end', fill: rCol, size: 11.5, weight: 600, base: 'hanging' }));

    // Bar-panel grid + solo reference line
    for (var g = 0; g <= 4; g++) {
      var yy = Y(g / 4);
      svg.appendChild(R.E('line', { x1: 462, y1: yy, x2: W - 24, y2: yy, stroke: R.C.grid, 'stroke-width': 1 }));
      svg.appendChild(R.TX(454, yy, (g * 25) + '%', { anchor: 'end', fill: R.C.dim, size: 10, base: 'middle' }));
    }
    svg.appendChild(R.E('line', { x1: 462, y1: Y(sv), x2: W - 24, y2: Y(sv), stroke: R.C.dim, 'stroke-dasharray': '4 4', 'stroke-width': 1, opacity: 0.7 }));

    // Other-embodiment discs; each lens (disc ∩ target) is the shared structure
    var d = distanceForOverlap(share, rT, rO);
    var defs = R.E('defs');
    var cp = R.E('clipPath', { id: 'xembod-tclip' });
    cp.appendChild(R.E('circle', { cx: T.x, cy: T.y, r: rT }));
    defs.appendChild(cp);
    svg.appendChild(defs);
    for (var i = 0; i < extra; i++) {
      var a = (extra === 1 ? 180 : 115 + (130 * i) / (extra - 1)) * Math.PI / 180;
      var cx = T.x + d * Math.cos(a), cy = T.y - d * Math.sin(a);
      svg.appendChild(R.E('circle', { cx: cx, cy: cy, r: rO, fill: R.C.cyan, opacity: 0.14 }));
      svg.appendChild(R.E('circle', { cx: cx, cy: cy, r: rO, fill: 'none', stroke: R.C.cyan, opacity: 0.7, 'stroke-width': 1.3 }));
      svg.appendChild(R.E('circle', { cx: cx, cy: cy, r: rO, fill: R.C.green, opacity: 0.32, 'clip-path': 'url(#xembod-tclip)' }));
    }
    // Target robot's pool on top
    svg.appendChild(R.E('circle', { cx: T.x, cy: T.y, r: rT, fill: R.C.orange, opacity: 0.12 }));
    svg.appendChild(R.E('circle', { cx: T.x, cy: T.y, r: rT, fill: 'none', stroke: R.C.orange, 'stroke-width': 1.8 }));
    svg.appendChild(R.TX(T.x, 322,
      extra === 0 ? 'target robot data — solo' : 'target pool + ' + extra + ' other embodiment' + (extra === 1 ? '' : 's'),
      { fill: R.C.dim, size: 11, base: 'hanging' }));

    // Bars — the existing transfer numbers stay as readouts
    svg.appendChild(R.E('rect', { x: soloX, y: Y(sv), width: bw, height: y0 - Y(sv), fill: R.C.orange, opacity: 0.88, rx: 2 }));
    svg.appendChild(R.TX(soloX + bw / 2, Y(sv) - 7, Math.round(sv * 100) + '%', { fill: R.C.orange, size: 12, weight: 600 }));
    svg.appendChild(R.E('rect', { x: poolX, y: Y(pv), width: bw, height: y0 - Y(pv), fill: R.C.cyan, opacity: 0.88, rx: 2 }));
    if (gain > 0.004) {
      // The transferred segment: the part of the pooled bar above the solo level
      svg.appendChild(R.E('rect', { x: poolX, y: Y(pv), width: bw, height: Y(sv) - Y(pv), fill: R.C.green, opacity: 0.45, rx: 2 }));
    } else if (gain < -0.004 && (Y(pv) - Y(sv)) > 22) {
      // Negative transfer: dashed red ghost of the solo level the pooled bar lost
      svg.appendChild(R.E('line', { x1: poolX - 6, y1: Y(sv), x2: poolX + bw + 6, y2: Y(sv), stroke: R.C.red, 'stroke-dasharray': '4 3', 'stroke-width': 1.4 }));
    }
    svg.appendChild(R.TX(poolX + bw / 2, Y(pv) - 7, Math.round(pv * 100) + '%', { fill: R.C.cyan, size: 12, weight: 600 }));
    svg.appendChild(R.TX(soloX + bw / 2, y0 + 12, 'solo', { fill: R.C.dim, size: 11, base: 'hanging' }));
    svg.appendChild(R.TX(poolX + bw / 2, y0 + 12, 'pooled', { fill: R.C.dim, size: 11, base: 'hanging' }));

    // Flow band: overlap region → pooled bar. Thickness = flowStrength; at low
    // sharing it thins to nothing, and below breakeven a red caption replaces it.
    if (str > 0.02) {
      var th = 30 * str, th2 = th * 0.75;
      var p0 = { x: T.x + rT + 2, y: T.y };
      var p3 = { x: poolX - 3, y: Y((sv + pv) / 2) };
      var p1 = { x: 340, y: 140 };
      var p2 = { x: 460, y: p3.y - 18 };
      bzP = [p0, p1, p2, p3];
      var ha = th / 2, hb = th2 / 2;
      var dp = 'M' + p0.x + ' ' + (p0.y - ha) +
        ' C' + p1.x + ' ' + (p1.y - ha) + ' ' + p2.x + ' ' + (p2.y - hb) + ' ' + p3.x + ' ' + (p3.y - hb) +
        ' L' + p3.x + ' ' + (p3.y + hb) +
        ' C' + p2.x + ' ' + (p2.y + hb) + ' ' + p1.x + ' ' + (p1.y + ha) + ' ' + p0.x + ' ' + (p0.y + ha) + ' Z';
      svg.appendChild(R.E('path', { d: dp, fill: R.C.green, opacity: 0.22 }));
      if (!prefersReducedMotion()) {
        for (var k = 0; k < 3; k++) {
          var el = R.E('circle', { r: 3, fill: R.C.green });
          svg.appendChild(el);
          dotEls.push(el);
        }
        placeDots();
      }
    } else if (gain < -0.004) {
      svg.appendChild(R.TX(350, 145, 'too little shared → transfer reverses', { fill: R.C.red, size: 10.5 }));
    }
  }

  // Ambient flow loop — tween-driven, linear; skipped entirely under
  // prefers-reduced-motion (the band is then a static picture).
  function loop() {
    if (stopped || prefersReducedMotion()) return;
    tween(1500, {
      ease: easings.linear,
      onStep: function (e) { phase = e; placeDots(); },
      onDone: function () { if (!stopped) loop(); },
    });
  }

  R.slider(ctr, { label: 'other embodiments pooled in', min: 0, max: MAXE, step: 1, value: extra, fmt: function (v) { return '' + v; }, on: function (v) { extra = v; draw(); } });
  R.slider(ctr, { label: 'shared structure across bodies', min: 0.1, max: 1, step: 0.05, value: share, fmt: function (v) { return (v * 100).toFixed(0) + '%'; }, on: function (v) { share = v; draw(); } });
  R.legend(stage, [[R.C.orange, 'target robot data'], [R.C.cyan, 'other embodiments'], [R.C.green, 'shared structure → transfer']]);
  draw();
  loop();
});
</script>
