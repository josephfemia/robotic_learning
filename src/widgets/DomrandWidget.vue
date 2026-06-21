<template>
  <Lab
    ref="lab"
    id="domrand"
    title="Why a robust plateau beats a fragile peak"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { noDR, withDR } from '../logic/domainRandomization.js';

const note =
  'The reality gap is the horizontal distance between &quot;trained here&quot; and &quot;real friction.&quot; Widen the randomization band and the plateau covers more of reality — but notice the peak height drops slightly: robustness isn\'t free. This is the curve behind every domain-randomized locomotion policy.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the domrand IIFE (reference lines 2717–2745).
  // Numeric functions from logic/domainRandomization.js (vitest-pinned).
  var W = 700, H = 320, padL = 54, padR = 24, padT = 30, padB = 64, fr = 1.0, wdt = 0.25, f0 = 0.5, f1 = 1.5, nom = 1.0;
  var svg = R.SVG(stage, W, H);

  function X(f) { return padL + ((f - f0) / (f1 - f0)) * (W - padL - padR); }
  function Y(s) { return (H - padB) - s * ((H - padB) - padT); }

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('rect', { x: X(nom - wdt), y: y1, width: X(nom + wdt) - X(nom - wdt), height: y0 - y1, fill: 'rgba(54,197,208,0.08)' }));
    var pA = '', pB = '', i;
    for (i = 0; i <= 120; i++) {
      var f = f0 + (f1 - f0) * i / 120;
      pA += (i ? ' ' : '') + X(f).toFixed(1) + ',' + Y(noDR(f, nom)).toFixed(1);
      pB += (i ? ' ' : '') + X(f).toFixed(1) + ',' + Y(withDR(f, nom, wdt)).toFixed(1);
    }
    svg.appendChild(R.E('polyline', { points: pA, fill: 'none', stroke: R.C.red, 'stroke-width': 2.5 }));
    svg.appendChild(R.E('polyline', { points: pB, fill: 'none', stroke: R.C.green, 'stroke-width': 2.5 }));
    svg.appendChild(R.E('line', { x1: X(nom), y1: y1, x2: X(nom), y2: y0, stroke: R.C.dim, 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    var dx = X(fr);
    // When the deploy line sits near nominal, stack the two ground labels so they never collide.
    var near = Math.abs(dx - X(nom)) < 46;
    svg.appendChild(R.TX(X(nom), y0 + 15, 'trained here', { fill: R.C.dim, size: 10.5, base: 'hanging' }));
    svg.appendChild(R.E('line', { x1: dx, y1: y1, x2: dx, y2: y0, stroke: '#EAF0F8', 'stroke-width': 1.5 }));
    svg.appendChild(R.E('circle', { cx: dx, cy: Y(noDR(fr, nom)), r: 5, fill: R.C.red }));
    svg.appendChild(R.E('circle', { cx: dx, cy: Y(withDR(fr, nom, wdt)), r: 5, fill: R.C.green }));
    // Keep the moving "real friction" caption on-canvas: flip its anchor near the edges.
    var rfAnchor = dx > x1 - 60 ? 'end' : (dx < x0 + 60 ? 'start' : 'middle');
    var rfX = dx + (rfAnchor === 'end' ? 6 : rfAnchor === 'start' ? -6 : 0);
    svg.appendChild(R.TX(rfX, y0 + (near ? 30 : 15), 'real friction', { anchor: rfAnchor, fill: '#EAF0F8', size: 10.5, base: 'hanging' }));
    svg.appendChild(R.TX(x1, Y(noDR(f1, nom)) + 2, 'trained at nominal only', { anchor: 'end', fill: R.C.red, size: 11.5, weight: 600, base: 'hanging' }));
    svg.appendChild(R.TX(x1, Y(0.9) - 8, 'domain-randomized', { anchor: 'end', fill: R.C.green, size: 11.5, weight: 600 }));
    svg.appendChild(R.TX(x0, y1 - 4, 'deployment success vs real-world friction', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(W / 2, H - 8, 'simulation parameter at deployment (friction ×nominal)  →', { fill: R.C.dim, size: 11.5 }));
    // DR vs no-DR readout pinned to the empty bottom-left corner (curves sit near zero there).
    svg.appendChild(R.TX(x0 + 4, y0 - 8, 'DR ' + (withDR(fr, nom, wdt) * 100).toFixed(0) + '%  vs  no-DR ' + (noDR(fr, nom) * 100).toFixed(0) + '%', { anchor: 'start', fill: '#EAF0F8', size: 11.5 }));
  }

  R.slider(ctr, { label: 'real friction at deploy', min: 0.5, max: 1.5, step: 0.01, value: fr, fmt: function (v) { return v.toFixed(2); }, on: function (v) { fr = v; draw(); } });
  R.slider(ctr, { label: 'randomization width', min: 0.02, max: 0.45, step: 0.01, value: wdt, fmt: function (v) { return '±' + v.toFixed(2); }, on: function (v) { wdt = v; draw(); } });
  R.legend(stage, [[R.C.red, 'no randomization'], [R.C.green, 'domain-randomized']]);
  draw();
});
</script>
