<template>
  <Lab
    ref="lab"
    id="bon"
    title="Best-of-N with an imperfect verifier"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { evalN, makeRng, sampleCandidates, selectBest, bestTrue } from '../logic/bestOfN.js';

const note =
  'Each dot is one candidate plan, placed by what the verifier <em>thinks</em> of it (x) versus whether it would actually work (y). The orange ring is best-of-N\'s pick — the verifier\'s argmax; the dashed cyan ring marks the plan that would truly work best. Weaken the verifier and Resample: the pick drifts right-and-down onto high-score, low-truth dots — reward hacking, watched live. The right panel accumulates the damage: with an imperfect judge the pick\'s true success peaks and then <em>falls</em> as N grows, because more samples just find the verifier\'s blind spots faster. <span class="notice">Schematic toy model: a Monte-Carlo illustration of the selection effect, not measured benchmark numbers.</span>';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // The scoring model (q, e, vscore, true success) is the original bon IIFE's,
  // unchanged; the F3 uplift makes the SELECTION visible: one seeded batch of
  // N candidates scattered on the truth × verifier-score plane, with the
  // argmax-by-verifier circled. All numerics live in logic/bestOfN.js.
  var vacc = 0.9, nIdx = 3, seed = 1;
  var Ns = [1, 2, 4, 8, 16, 32, 64];
  var W = 700, H = 352, svg = R.SVG(stage, W, H);

  // Scatter panel (left)
  var x0s = 64, x1s = 414, y1s = 56, y0s = 296;
  function Xs(v) { return x0s + (x1s - x0s) * v; }
  function Ys(p) { return y0s - (y0s - y1s) * p; }
  // Curve panel (right)
  var xc0 = 486, xc1 = 676;
  function Xc(k) { return xc0 + (xc1 - xc0) * (k / (Ns.length - 1)); }

  var cands = [], selIdx = 0, bestIdx = 0, curveT = [], disp = null;
  var selPos = null, bestPos = null; // displayed (possibly mid-tween) ring centres

  function recompute() {
    cands = sampleCandidates(Ns[nIdx], vacc, seed);
    selIdx = selectBest(cands);
    bestIdx = bestTrue(cands);
    curveT = Ns.map(function (N, k) { return evalN(N, vacc, 900, makeRng((seed * 1013 + k * 101 + 7) >>> 0)); });
  }
  function posOf(i) { return { x: Xs(cands[i].vscore), y: Ys(cands[i].ptrue) }; }

  function render() {
    R.clr(svg);

    // --- Scatter panel: the selection mechanism -------------------------
    svg.appendChild(R.TX(x0s, 12, 'candidates: true success vs verifier score', { anchor: 'start', fill: R.C.ink, size: 11.5, base: 'hanging' }));
    var sel = cands[selIdx];
    var ok = sel.ptrue >= 0.5;
    svg.appendChild(R.TX(x1s, 28, 'picked plan: ' + Math.round(sel.ptrue * 100) + '% true success', { anchor: 'end', fill: ok ? R.C.green : R.C.red, size: 10.5, weight: 600, base: 'hanging' }));

    svg.appendChild(R.E('line', { x1: x0s, y1: y0s, x2: x1s, y2: y0s, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0s, y1: y0s, x2: x0s, y2: y1s, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0s, y1: Ys(0.5), x2: x1s, y2: Ys(0.5), stroke: R.C.grid, 'stroke-width': 1 }));
    svg.appendChild(R.TX((x0s + x1s) / 2, y0s + 18, 'verifier score →', { fill: R.C.dim, size: 10.5, base: 'hanging' }));
    var yl = R.TX(0, 0, 'true success chance →', { fill: R.C.dim, size: 10.5 });
    yl.setAttribute('transform', 'translate(30 ' + ((y0s + y1s) / 2) + ') rotate(-90)');
    svg.appendChild(yl);

    for (var i = 0; i < cands.length; i++) {
      var p = posOf(i);
      svg.appendChild(R.E('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 3.8, fill: cands[i].ptrue >= 0.5 ? R.C.green : R.C.red, opacity: 0.8 }));
    }
    if (bestPos) svg.appendChild(R.E('circle', { cx: bestPos.x.toFixed(1), cy: bestPos.y.toFixed(1), r: 11.5, fill: 'none', stroke: R.C.cyan, 'stroke-width': 1.8, 'stroke-dasharray': '4 3' }));
    if (selPos) svg.appendChild(R.E('circle', { cx: selPos.x.toFixed(1), cy: selPos.y.toFixed(1), r: 7.5, fill: 'none', stroke: R.C.orange, 'stroke-width': 2.4 }));

    svg.appendChild(R.E('line', { x1: 446, y1: 40, x2: 446, y2: y0s, stroke: R.C.grid, 'stroke-width': 1 }));

    // --- Curve panel: the outcome, accumulated over many batches --------
    svg.appendChild(R.TX(xc0, 12, 'true success of the pick vs N', { anchor: 'start', fill: R.C.ink, size: 10.5, base: 'hanging' }));
    var peak = Math.max.apply(null, disp);
    var last = disp[disp.length - 1];
    // Three regimes: still climbing, flat (verifier too weak for N to matter), past the peak.
    var up = last >= peak - 0.02 && last > disp[0] + 0.02;
    var flat = !up && last >= peak - 0.02;
    var vCol = up ? R.C.green : (flat ? R.C.dim : R.C.red);
    svg.appendChild(R.TX(xc1, 28, up ? 'more N keeps helping' : (flat ? 'flat: verifier too weak for N to matter' : 'past the peak: more N HURTS'), { anchor: 'end', fill: vCol, size: 10.5, weight: 600, base: 'hanging' }));

    for (var g = 0; g <= 2; g++) {
      var yy = Ys(g / 2);
      svg.appendChild(R.E('line', { x1: xc0, y1: yy, x2: xc1, y2: yy, stroke: R.C.grid, 'stroke-width': 1 }));
      svg.appendChild(R.TX(xc0 - 8, yy, (g * 50) + '%', { anchor: 'end', fill: R.C.dim, size: 8.5, base: 'middle' }));
    }
    var dPath = '';
    for (var k = 0; k < Ns.length; k++) dPath += (k ? 'L' : 'M') + Xc(k).toFixed(1) + ' ' + Ys(disp[k]).toFixed(1);
    svg.appendChild(R.E('path', { d: dPath, fill: 'none', stroke: vCol, 'stroke-width': 2.2 }));
    for (k = 0; k < Ns.length; k++) {
      svg.appendChild(R.E('circle', { cx: Xc(k), cy: Ys(disp[k]).toFixed(1), r: 2.8, fill: vCol }));
      svg.appendChild(R.TX(Xc(k), y0s + 6, '' + Ns[k], { fill: R.C.dim, size: 8.5, base: 'hanging' }));
    }
    svg.appendChild(R.E('circle', { cx: Xc(nIdx), cy: Ys(disp[nIdx]).toFixed(1), r: 6.5, fill: 'none', stroke: R.C.orange, 'stroke-width': 2 }));
    svg.appendChild(R.TX((xc0 + xc1) / 2, y0s + 18, 'N candidates sampled', { fill: R.C.dim, size: 10.5, base: 'hanging' }));
  }

  // Slider drags snap (animateIt=false); Resample eases the rings + curve into
  // place via tween (instant under prefers-reduced-motion).
  function commit(animateIt) {
    var oldSel = selPos, oldBest = bestPos, oldDisp = disp;
    recompute();
    var tSel = posOf(selIdx), tBest = posOf(bestIdx), tD = curveT;
    if (!animateIt || !oldDisp || !oldSel) {
      selPos = tSel; bestPos = tBest; disp = tD.slice();
      render();
      return;
    }
    var fD = oldDisp.slice();
    disp = oldDisp.slice();
    tween(450, {
      onStep: function (e) {
        selPos = { x: oldSel.x + (tSel.x - oldSel.x) * e, y: oldSel.y + (tSel.y - oldSel.y) * e };
        bestPos = { x: oldBest.x + (tBest.x - oldBest.x) * e, y: oldBest.y + (tBest.y - oldBest.y) * e };
        for (var k = 0; k < Ns.length; k++) disp[k] = fD[k] + (tD[k] - fD[k]) * e;
        render();
      },
    });
  }

  R.slider(ctr, { label: 'verifier reliability', min: 0.5, max: 1, step: 0.01, value: vacc, fmt: function (v) { return (v * 100).toFixed(0) + '%'; }, on: function (v) { vacc = v; commit(false); } });
  R.slider(ctr, { label: 'candidate plans N', min: 0, max: 6, step: 1, value: nIdx, fmt: function (v) { return '' + Ns[v]; }, on: function (v) { nIdx = v; commit(false); } });
  R.btn(ctr, 'Resample', null, function () { seed += 1; commit(true); });
  R.legend(stage, [[R.C.green, 'plan that would succeed'], [R.C.red, 'fluent failure'], [R.C.orange, "verifier's pick"], [R.C.cyan, 'truly best plan']]);
  commit(false);
});
</script>
