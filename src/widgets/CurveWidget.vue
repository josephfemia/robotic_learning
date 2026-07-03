<template>
  <Lab
    ref="lab"
    id="curve"
    title="Why the error compounds quadratically"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import {
  bcRegret,
  daggerRegret,
  perStepDamage,
  damageTriangleArea,
  daggerStripArea,
} from '../logic/compoundingError.js';

const note =
  'Same per-step error \\(\\epsilon\\), same constant — the only difference is recovery. Behavioral cloning\'s regret grows like \\(\\epsilon T^2\\) (red); DAgger\'s like \\(\\epsilon T\\) (green). The lower panel shows <em>where</em> the \\(T^2\\) comes from: a BC mistake at step \\(t\\) is never corrected, so it costs the \\(T-t\\) remaining steps — stacking those damages forms a triangle of area \\(\\tfrac{1}{2}\\epsilon T^2\\). DAgger relabels drifted states, so every mistake costs only \\(\\epsilon\\): a flat strip of area \\(\\epsilon T\\). At horizon \\(T\\), cloning is worse by a factor of \\(T\\) — which is why long-horizon tasks punish naïve BC so severely.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Main plot ported from the curve IIFE (reference lines 2487–2508); the
  // Phase-3 (F8) damage panel below it makes the T² mechanism visible.
  // bcRegret / daggerRegret / perStepDamage / the two areas all come from
  // logic/compoundingError.js (pinned in compoundingError.test.js).
  var W = 700, H = 420, padL = 56, padR = 22, padT = 26;
  var eps = 0.06, Tcur = 60, Tmax = 100;
  // Vertical bands: main plot 26–240, x-label ~258, damage panel 278–380,
  // area readouts at H−16. Nothing else may enter a band it doesn't own.
  var y1 = padT, y0 = 240;   // main plot top / baseline
  var pt = 278, pb = 380;    // damage panel top / baseline
  var panelH = pb - pt;
  var svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    var x0 = padL, x1 = W - padR;
    var maxY = bcRegret(eps, Tmax); if (maxY <= 0) maxY = 1;
    function X(t) { return x0 + (t / Tmax) * (x1 - x0); }
    function Y(v) { return y0 - (v / maxY) * (y0 - y1); }

    // ---- MAIN PLOT (behavior unchanged) ----
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.E('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: R.C.axis, 'stroke-width': 1.2 }));
    var pB = '', pD = '';
    for (var t = 0; t <= Tmax; t++) {
      pB += (t ? ' ' : '') + X(t).toFixed(1) + ',' + Y(bcRegret(eps, t)).toFixed(1);
      pD += (t ? ' ' : '') + X(t).toFixed(1) + ',' + Y(daggerRegret(eps, t)).toFixed(1);
    }
    svg.appendChild(R.E('polyline', { points: pB, fill: 'none', stroke: R.C.red, 'stroke-width': 2.5 }));
    svg.appendChild(R.E('polyline', { points: pD, fill: 'none', stroke: R.C.green, 'stroke-width': 2.5 }));
    var bx = X(Tcur);
    svg.appendChild(R.E('line', { x1: bx, y1: y1, x2: bx, y2: y0, stroke: R.C.dim, 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    svg.appendChild(R.E('circle', { cx: bx, cy: Y(bcRegret(eps, Tcur)), r: 4, fill: R.C.red }));
    svg.appendChild(R.E('circle', { cx: bx, cy: Y(daggerRegret(eps, Tcur)), r: 4, fill: R.C.green }));
    svg.appendChild(R.TX(X(Tmax) - 4, Y(bcRegret(eps, Tmax)) + 4, 'behavioral cloning ~ ε·T²', { anchor: 'end', fill: R.C.red, size: 12, weight: 600, base: 'hanging' }));
    svg.appendChild(R.TX(X(Tmax) - 4, Y(daggerRegret(eps, Tmax)) - 6, 'DAgger ~ ε·T', { anchor: 'end', fill: R.C.green, size: 12, weight: 600 }));
    svg.appendChild(R.TX((x0 + x1) / 2, y0 + 18, 'task horizon  T  →', { fill: R.C.dim, size: 11.5 }));
    var yl = R.TX(0, 0, 'expected regret →', { fill: R.C.ink, size: 11.5 });
    yl.setAttribute('transform', 'translate(16,' + ((y0 + y1) / 2) + ') rotate(-90)');
    svg.appendChild(yl);
    // Dynamic readout pinned to the clear top-left corner (curves rise toward the
    // top-RIGHT, so this band stays empty) — was colliding with the BC curve-end label.
    svg.appendChild(R.TX(x0 + 6, y1 + 2, 'at T=' + Tcur + ': cloning ≈ ' + Tcur + '× worse', { anchor: 'start', fill: '#EAF0F8', size: 11.5, base: 'hanging' }));

    // ---- DAMAGE PANEL (F8): the triangular stack of per-step damages ----
    // Bar at step t has height ∝ perStepDamage(eps, t, Tcur) = ε·(Tcur−t).
    // The vertical scale is normalized to ε·Tmax — exactly like the main
    // plot's maxY, ε cancels: geometry tracks T (the apex is Tcur/Tmax of the
    // panel), the readouts carry ε. So the triangle widens AND rises as T
    // grows, and its area readout scales with both sliders.
    function DH(t) { return (perStepDamage(eps, t, Tcur) / (eps * Tmax)) * panelH; }
    svg.appendChild(R.E('line', { x1: x0, y1: pb, x2: x1, y2: pb, stroke: R.C.axis, 'stroke-width': 1.2 }));
    // Sampled bars (≤ ~25): a discrete stack, tallest at t=0, zero at t=Tcur.
    var ds = Math.max(1, Math.round(Tcur / 24));
    for (var s = 0; s < Tcur; s += ds) {
      var xa = X(s), xb = X(Math.min(s + ds, Tcur));
      var h = DH(s);
      svg.appendChild(R.E('rect', {
        x: xa.toFixed(1), y: (pb - h).toFixed(1),
        width: Math.max(0.8, xb - xa - 1).toFixed(1), height: h.toFixed(1),
        fill: R.C.red, opacity: 0.5,
      }));
    }
    // Hypotenuse — the continuous triangle the bars approximate.
    svg.appendChild(R.E('line', {
      x1: x0, y1: pb - DH(0), x2: X(Tcur), y2: pb,
      stroke: R.C.red, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: 0.8,
    }));
    // DAgger's strip: every mistake costs ε (one step). Its true height is
    // panelH/Tmax ≈ 1px — clamped for visibility; the area readout is exact.
    var hD = Math.max(panelH / Tmax, 1.6);
    svg.appendChild(R.E('rect', { x: x0, y: pb - hD, width: X(Tcur) - x0, height: hD, fill: R.C.green }));
    // T-marker continues through the panel, tying the triangle to the curves.
    svg.appendChild(R.E('line', { x1: bx, y1: pt, x2: bx, y2: pb, stroke: R.C.dim, 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    // Panel title top-right: bars are tallest at the LEFT (t=0) and shorter
    // than the title band across the right half at every T, so no overlap.
    svg.appendChild(R.TX(x1, pt + 3, 'damage triangle: each bar = ε·(T−t)', { anchor: 'end', fill: R.C.dim, size: 11, base: 'hanging' }));
    var pl = R.TX(0, 0, 'damage →', { fill: R.C.ink, size: 11.5 });
    pl.setAttribute('transform', 'translate(16,' + ((pt + pb) / 2) + ') rotate(-90)');
    svg.appendChild(pl);
    // Area readouts: the triangle IS the εT² (÷2), the strip IS the εT.
    svg.appendChild(R.TX(x0, H - 16, 'triangle area ≈ ½·ε·T² = ' + damageTriangleArea(eps, Tcur).toFixed(1), { anchor: 'start', fill: R.C.red, size: 11.5, weight: 600 }));
    svg.appendChild(R.TX(x1, H - 16, 'DAgger strip = ε·T = ' + daggerStripArea(eps, Tcur).toFixed(1), { anchor: 'end', fill: R.C.green, size: 11.5, weight: 600 }));
  }

  // Slider drags redraw instantly (no tween on drag, per the motion rules).
  R.slider(ctr, { label: 'per-step error  ε', min: 0.01, max: 0.2, step: 0.01, value: eps, fmt: function (v) { return v.toFixed(2); }, on: function (v) { eps = v; draw(); } });
  R.slider(ctr, { label: 'horizon  T (marker)', min: 10, max: 100, step: 1, value: Tcur, fmt: function (v) { return '' + v; }, on: function (v) { Tcur = v; draw(); } });
  R.legend(stage, [
    [R.C.red, 'BC: a mistake at step t costs ε·(T−t) — never corrected'],
    [R.C.green, 'DAgger: every mistake costs ε — relabelled next step'],
  ]);
  draw();
});
</script>
