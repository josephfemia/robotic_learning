<template>
  <Lab
    ref="lab"
    id="tokenize"
    title="Action tokenization: what 256 bins per dimension actually costs"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import {
  ridgeSamples,
  snapSamples,
  quantError,
  jointHist,
  productHist,
  phantomMass,
  distinctCells,
} from '../logic/tokenize.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Gray dots are the demonstrator’s actions (correlated: reach further ⇒ open wider); orange dots are what survives tokenization, each snapped to its grid-cell center. The violet map is the distribution the head can <em>represent</em>: a joint head puts mass only where demonstrations are, while an independent per-dimension softmax can only express the product of its marginals — the ridge smears into a cross, and the red-outlined cells gain probability no demonstration supports. <b>Takeaway:</b> binning buys you a language-model vocabulary at two prices — precision quantized by the grid, and per-dimension factorization that invents action combinations outside the data; continuous diffusion/flow heads exist to refund both.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // ---- geometry -----------------------------------------------------------
  var W = 700, H = 420;
  var x0 = 56, y1 = 44, PS = 300;          // plot: (x0, y1) top-left, PS×PS square
  var y0 = y1 + PS, x1 = x0 + PS;          // bottom / right of plot
  var rx = 392;                            // right readout panel left edge
  var MAX_DRAWN = 16;                      // heatmap never drawn finer than 16×16

  var svg = R.SVG(stage, W, H);

  // ---- state ---------------------------------------------------------------
  var samples = ridgeSamples();            // pinned seeded cloud (logic/tokenize.js)
  var k = 8;                               // bins per dimension (slider: 2 → 256, log)
  var m = 0;                               // head blend: 0 = joint, 1 = product of marginals
  var modeTarget = 0;
  var tweenId = 0;
  var errMax = quantError(samples, 2);     // error-bar normalizer (worst case, k = 2)

  // derived per-k quantities
  var dispK, snapped, err, joint, prod, phMass, distinct;
  function recompute() {
    dispK = k <= MAX_DRAWN ? k : MAX_DRAWN;
    snapped = snapSamples(samples, k);                 // exact k
    err = quantError(samples, k);                      // exact k
    distinct = distinctCells(samples, k);              // exact k
    joint = jointHist(samples, dispK);                 // heatmap at drawn resolution
    prod = productHist(joint, dispK);
    phMass = phantomMass(joint, prod);                 // matches what the heatmap shows
  }

  var sx = function (v) { return x0 + v * PS; };
  var sy = function (v) { return y0 - v * PS; };

  // ---- render (full redraw from state {k, m}) -------------------------------
  function render() {
    R.clr(svg);
    var i, ix, iy, cw = PS / dispK;

    // plot header — cross-fades with the head toggle (TX has no opacity option,
    // so it is set as an attribute after creation)
    var hdJ = R.TX(x0, 24, 'representable distribution: joint over the grid', { anchor: 'start', fill: '#EAF0F8', size: 12.5, weight: 600 });
    var hdP = R.TX(x0, 24, 'representable distribution: product of per-dim marginals', { anchor: 'start', fill: '#EAF0F8', size: 12.5, weight: 600 });
    hdJ.setAttribute('opacity', (1 - m).toFixed(3));
    hdP.setAttribute('opacity', m.toFixed(3));
    svg.appendChild(hdJ);
    svg.appendChild(hdP);

    // heatmap: blend of joint and product-of-marginals
    var field = new Array(dispK * dispK), vmax = 0;
    for (i = 0; i < field.length; i++) {
      field[i] = (1 - m) * joint[i] + m * prod[i];
      if (field[i] > vmax) vmax = field[i];
    }
    if (vmax <= 0) vmax = 1;
    for (iy = 0; iy < dispK; iy++) {
      for (ix = 0; ix < dispK; ix++) {
        var v = field[iy * dispK + ix];
        if (v <= 0) continue;
        svg.appendChild(R.E('rect', {
          x: x0 + ix * cw, y: y0 - (iy + 1) * cw, width: cw, height: cw,
          fill: R.C.violet, opacity: (0.08 + 0.72 * Math.pow(v / vmax, 0.6)).toFixed(3),
        }));
      }
    }

    // phantom cells: product mass where the joint has none — fade in with m
    var thresh = 0.25 / (dispK * dispK);
    if (m > 0.02) {
      for (iy = 0; iy < dispK; iy++) {
        for (ix = 0; ix < dispK; ix++) {
          i = iy * dispK + ix;
          if (joint[i] === 0 && prod[i] > thresh) {
            svg.appendChild(R.E('rect', {
              x: x0 + ix * cw + 0.75, y: y0 - (iy + 1) * cw + 0.75, width: cw - 1.5, height: cw - 1.5,
              fill: 'none', stroke: R.C.red, 'stroke-width': 1.3, opacity: (0.9 * m).toFixed(3),
            }));
          }
        }
      }
    }

    // quantization grid (drawn resolution)
    for (i = 0; i <= dispK; i++) {
      var g = x0 + i * cw;
      svg.appendChild(R.E('line', { x1: g, y1: y1, x2: g, y2: y0, stroke: R.C.grid, 'stroke-width': 1 }));
      var gy = y1 + i * cw;
      svg.appendChild(R.E('line', { x1: x0, y1: gy, x2: x1, y2: gy, stroke: R.C.grid, 'stroke-width': 1 }));
    }

    // samples: original (gray) → snap connector → snapped (orange)
    for (i = 0; i < samples.length; i++) {
      svg.appendChild(R.E('line', {
        x1: sx(samples[i].x), y1: sy(samples[i].y), x2: sx(snapped[i].x), y2: sy(snapped[i].y),
        stroke: R.C.orange, 'stroke-width': 1, opacity: 0.22,
      }));
    }
    for (i = 0; i < samples.length; i++) {
      svg.appendChild(R.E('circle', { cx: sx(samples[i].x), cy: sy(samples[i].y), r: 2, fill: R.C.dim, opacity: 0.45 }));
    }
    for (i = 0; i < samples.length; i++) {
      svg.appendChild(R.E('circle', { cx: sx(snapped[i].x), cy: sy(snapped[i].y), r: 2.4, fill: R.C.orange, opacity: 0.9 }));
    }

    // axes + labels
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y1, x2: x0, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.TX((x0 + x1) / 2, y0 + 26, 'action dim 1: reach distance →', { fill: R.C.dim, size: 11.5 }));
    var yl = R.TX(0, 0, 'action dim 2: gripper width →', { fill: R.C.dim, size: 11.5 });
    yl.setAttribute('transform', 'translate(' + (x0 - 30) + ',' + ((y0 + y1) / 2) + ') rotate(-90)');
    svg.appendChild(yl);

    // ---- right readout panel ------------------------------------------------
    var vocab = k * k;
    svg.appendChild(R.TX(rx, 64, 'bins per dim  k = ' + k, { anchor: 'start', fill: '#EAF0F8', size: 12.5, weight: 600 }));
    svg.appendChild(R.TX(rx, 84, 'grid: ' + k + ' × ' + k + ' = ' + vocab + ' cells', { anchor: 'start', fill: R.C.dim, size: 11 }));
    if (k > MAX_DRAWN) {
      svg.appendChild(R.TX(rx, 101, 'heatmap drawn coarsened at ' + dispK + ' × ' + dispK, { anchor: 'start', fill: R.C.dim, size: 10.5 }));
    }

    svg.appendChild(R.TX(rx, 136, 'mean quantization error', { anchor: 'start', fill: R.C.dim, size: 11 }));
    svg.appendChild(R.E('rect', { x: rx, y: 144, width: 200, height: 10, fill: R.C.grid, rx: 2 }));
    svg.appendChild(R.E('rect', { x: rx, y: 144, width: Math.max(1.5, 200 * err / errMax), height: 10, fill: R.C.orange, rx: 2 }));
    svg.appendChild(R.TX(rx + 208, 153, err.toFixed(4), { anchor: 'start', fill: R.C.orange, size: 11.5 }));

    svg.appendChild(R.TX(rx, 188, 'distinct actions after snapping:', { anchor: 'start', fill: R.C.dim, size: 11 }));
    svg.appendChild(R.TX(rx, 206, distinct + ' of ' + samples.length, { anchor: 'start', fill: '#EAF0F8', size: 12.5, weight: 600 }));

    // mode-specific block — cross-fades
    var tj1 = R.TX(rx, 244, 'joint head: mass only where', { anchor: 'start', fill: R.C.green, size: 11.5 });
    var tj2 = R.TX(rx, 260, 'demonstrations put it — but the', { anchor: 'start', fill: R.C.green, size: 11.5 });
    var tj3 = R.TX(rx, 276, 'vocabulary is k² = ' + vocab + ' tokens', { anchor: 'start', fill: R.C.green, size: 11.5 });
    var tp1 = R.TX(rx, 244, 'invented mass ≈ ' + Math.round(phMass * 100) + '%', { anchor: 'start', fill: R.C.red, size: 12.5, weight: 600 });
    var tp2 = R.TX(rx, 260, 'probability on combinations no', { anchor: 'start', fill: R.C.red, size: 11.5 });
    var tp3 = R.TX(rx, 276, 'demonstrator produced · vocab 2k = ' + 2 * k, { anchor: 'start', fill: R.C.red, size: 11.5 });
    var fadeJ = (1 - m).toFixed(3), fadeP = m.toFixed(3);
    tj1.setAttribute('opacity', fadeJ); tj2.setAttribute('opacity', fadeJ); tj3.setAttribute('opacity', fadeJ);
    tp1.setAttribute('opacity', fadeP); tp2.setAttribute('opacity', fadeP); tp3.setAttribute('opacity', fadeP);
    svg.appendChild(tj1); svg.appendChild(tj2); svg.appendChild(tj3);
    svg.appendChild(tp1); svg.appendChild(tp2); svg.appendChild(tp3);
  }

  // ---- controls -------------------------------------------------------------
  // Slider drags are instant (continuous manipulation); the head toggle eases
  // (discrete state change) — instant under prefers-reduced-motion via tween().
  R.slider(ctr, {
    label: 'bins per dimension (log)',
    min: 1, max: 8, step: 1, value: 3,
    fmt: function (v) { return '' + Math.pow(2, Math.round(v)); },
    on: function (v) { k = Math.pow(2, Math.round(v)); recompute(); render(); },
  });

  var bJ = R.btn(ctr, 'joint head', 'primary', function () { setMode(0); });
  var bM = R.btn(ctr, 'independent per-dim softmax', null, function () { setMode(1); });
  function setMode(target) {
    if (target === modeTarget) return;
    modeTarget = target;
    bJ.className = 'lab-btn' + (target === 0 ? ' primary' : '');
    bM.className = 'lab-btn' + (target === 1 ? ' primary' : '');
    var from = m, tid = ++tweenId;
    tween(420, {
      onStep: function (e) {
        if (tid !== tweenId) return;
        m = from + (target - from) * e;
        render();
      },
    });
  }

  R.legend(ctr, [
    [R.C.dim, 'demonstrator actions'],
    [R.C.orange, 'after tokenization (snapped)'],
    [R.C.violet, 'representable distribution'],
    [R.C.red, 'invented combinations (no demos)'],
  ]);

  recompute();
  render();
});
</script>
