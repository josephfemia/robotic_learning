<template>
  <Lab
    ref="lab"
    id="eval"
    title="The n=20 eval — an underpowered coin flip"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import {
  sampleBinomial,
  wilson,
  ciSeparated,
  minSeparatingN,
  paperVerdict,
  trueWinner,
} from '../logic/evalStats.js';
import { tween, focusPulse } from '../composables/useAnimate.js';

const note =
  'At the field\'s typical 20 trials, the difference between a demo and a breakthrough is inside the error bars — <strong>evaluation, not modeling, is the binding scientific constraint</strong>.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // ── state ─────────────────────────────────────────────────────────────────
  var pA = 0.80, pB = 0.90;   // true success rates (hidden from the "paper")
  var n = 20;                 // trials per policy
  var kA = 0, kB = 0;         // successes in the current eval
  var ciA, ciB;               // Wilson intervals of the current eval (targets)
  var runs = 0, wrongs = 0;   // tally at the current settings
  var lastPaper = 'tie';

  // Displayed (eased) copies — reruns tween these toward the targets;
  // slider drags snap them (instant per the motion invariant).
  var disp = { pa: 0, la: 0, ha: 0, pb: 0, lb: 0, hb: 0 };

  function targets() { return { pa: kA / n, la: ciA.lo, ha: ciA.hi, pb: kB / n, lb: ciB.lo, hb: ciB.hi }; }

  // One eval: sample both policies, score the point-estimate verdict.
  function runEval() {
    kA = sampleBinomial(n, pA, Math.random);
    kB = sampleBinomial(n, pB, Math.random);
    ciA = wilson(kA, n);
    ciB = wilson(kB, n);
    lastPaper = paperVerdict(kA, kB);
    runs++;
    if (lastPaper !== trueWinner(pA, pB)) wrongs++;
  }

  function resetTally() { runs = 0; wrongs = 0; }

  // Instant path: settings changed via a slider drag.
  function resample() {
    resetTally();
    runEval();
    disp = targets();
    draw();
  }

  // Eased path: the "Rerun the eval" button (3b1b motion; tween is
  // instant under prefers-reduced-motion).
  function rerun() {
    var from = { pa: disp.pa, la: disp.la, ha: disp.ha, pb: disp.pb, lb: disp.lb, hb: disp.hb };
    runEval();
    var to = targets();
    tween(420, {
      onStep: function (e) {
        for (var key in to) disp[key] = from[key] + (to[key] - from[key]) * e;
        draw();
      },
      onDone: function () { focusPulse(panel, { color: R.C.orange }); },
    });
  }

  // ── stage: SVG chart ──────────────────────────────────────────────────────
  var W = 700, H = 240, svg = R.SVG(stage, W, H);
  var x0 = 150, x1 = 676;      // success-rate axis 0 → 1
  var yTop = 40, yAxis = 198;  // header band above yTop; axis at bottom
  var yA = 92, yB = 152;       // the two policy rows
  function X(p) { return x0 + (x1 - x0) * p; }

  function drawRow(y, color, name, truth, pHat, lo, hi, k) {
    // true rate: orange tick crossing the row
    var tx = X(truth);
    svg.appendChild(R.E('line', { x1: tx, y1: y - 9, x2: tx, y2: y + 9, stroke: R.C.orange, 'stroke-width': 2 }));
    // CI bar with end caps
    var xl = X(lo), xh = X(hi);
    svg.appendChild(R.E('line', { x1: xl, y1: y, x2: xh, y2: y, stroke: color, 'stroke-width': 2.5, opacity: 0.9 }));
    svg.appendChild(R.E('line', { x1: xl, y1: y - 6, x2: xl, y2: y + 6, stroke: color, 'stroke-width': 2 }));
    svg.appendChild(R.E('line', { x1: xh, y1: y - 6, x2: xh, y2: y + 6, stroke: color, 'stroke-width': 2 }));
    // point estimate dot + label (label x clamped so it never leaves the plot)
    var px = X(pHat);
    svg.appendChild(R.E('circle', { cx: px, cy: y, r: 4.5, fill: color }));
    var lbl = Math.round(pHat * 100) + '%  (' + k + '/' + n + ')';
    svg.appendChild(R.TX(R.clamp(px, x0 + 60, x1 - 60), y - 14, lbl, { fill: R.C.ink, size: 11 }));
    // row name in the left margin
    svg.appendChild(R.TX(x0 - 12, y, name, { anchor: 'end', fill: R.C.ink, size: 11.5, base: 'middle' }));
    svg.appendChild(R.TX(x0 - 12, y + 14, 'true ' + Math.round(truth * 100) + '%', { anchor: 'end', fill: R.C.dim, size: 10, base: 'middle' }));
  }

  function draw() {
    R.clr(svg);
    // header band (reserved: nothing else may enter y < yTop)
    svg.appendChild(R.TX(x0, 16, 'one eval = one draw · point estimate ± 95% Wilson interval', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    // grid + axis
    var ticks = [0, 0.25, 0.5, 0.75, 1];
    for (var i = 0; i < ticks.length; i++) {
      var gx = X(ticks[i]);
      svg.appendChild(R.E('line', { x1: gx, y1: yTop, x2: gx, y2: yAxis, stroke: R.C.grid, 'stroke-width': 1 }));
      svg.appendChild(R.TX(gx, yAxis + 8, Math.round(ticks[i] * 100) + '%', { fill: R.C.dim, size: 10.5, base: 'hanging' }));
    }
    svg.appendChild(R.E('line', { x1: x0, y1: yAxis, x2: x1, y2: yAxis, stroke: R.C.axis, 'stroke-width': 1.2 }));
    svg.appendChild(R.TX(x1, yAxis + 22, 'success rate →', { anchor: 'end', fill: R.C.dim, size: 10.5, base: 'hanging' }));
    // shaded overlap of the two displayed CIs (the "inside the error bars" zone)
    var ol = Math.max(disp.la, disp.lb), oh = Math.min(disp.ha, disp.hb);
    if (oh > ol) {
      svg.appendChild(R.E('rect', { x: X(ol), y: yA - 22, width: X(oh) - X(ol), height: (yB - yA) + 44, fill: 'rgba(255,107,107,0.10)' }));
    }
    drawRow(yA, R.C.cyan, 'policy A', pA, disp.pa, disp.la, disp.ha, kA);
    drawRow(yB, R.C.violet, 'policy B', pB, disp.pb, disp.lb, disp.hb, kB);
    updatePanel();
  }

  // ── verdict panel (HTML, below the chart — never collides with the bars) ──
  var panel = R.ce('div');
  panel.style.cssText = 'max-width:700px;margin:10px auto 0;font-family:"IBM Plex Mono",monospace;font-size:12.5px;line-height:1.75;color:' + R.C.ink;
  var lnVerdict = R.ce('div'), lnHonest = R.ce('div'), lnTally = R.ce('div'), lnNeed = R.ce('div');
  lnHonest.style.color = R.C.dim;
  panel.appendChild(lnVerdict); panel.appendChild(lnHonest); panel.appendChild(lnTally); panel.appendChild(lnNeed);
  stage.appendChild(panel);

  function pct(v) { return Math.round(v * 100) + '%'; }

  function updatePanel() {
    var name = { A: 'A beats B', B: 'B beats A', tie: 'dead heat' };
    lnVerdict.textContent = 'Paper verdict: ' + name[lastPaper] +
      '  —  A: ' + kA + '/' + n + ' (' + pct(kA / n) + ')  vs  B: ' + kB + '/' + n + ' (' + pct(kB / n) + ')';
    var truly = trueWinner(pA, pB);
    lnVerdict.style.color = (lastPaper === truly) ? R.C.green : R.C.red;
    lnHonest.textContent = ciSeparated(ciA, ciB)
      ? 'Honest verdict: the 95% intervals separate — this eval can support the claim.'
      : 'Honest verdict: no significant difference — the 95% intervals overlap (shaded).';
    var rate = runs > 0 ? Math.round((wrongs / runs) * 100) : 0;
    lnTally.textContent = 'Tally at these settings: paper verdict wrong in ' + wrongs + ' of ' + runs +
      (runs === 1 ? ' eval' : ' evals') + ' (' + rate + '%).';
    lnTally.style.color = wrongs > 0 ? R.C.red : R.C.dim;
    var need = minSeparatingN(pA, pB);
    lnNeed.textContent = need === null
      ? 'Trials needed for the CIs at the true rates to separate: none — the true rates are equal.'
      : 'Trials needed for the CIs at the true rates (' + pct(pA) + ' vs ' + pct(pB) + ') to separate: n ≥ ' + need +
        ' per policy — this eval runs ' + n + '.';
    lnNeed.style.color = R.C.dim;
  }

  // ── controls ──────────────────────────────────────────────────────────────
  R.btn(ctr, 'Rerun the eval', 'primary', rerun);
  R.slider(ctr, {
    label: 'trials per policy  n',
    min: 1, max: Math.log10(500), step: 0.005, value: Math.log10(20),
    fmt: function (v) { return Math.round(Math.pow(10, v)) + ''; },
    on: function (v) { n = Math.round(Math.pow(10, v)); resample(); },
  });
  R.slider(ctr, {
    label: 'true success rate — policy A',
    min: 0.5, max: 0.99, step: 0.01, value: pA,
    fmt: function (v) { return Math.round(v * 100) + '%'; },
    on: function (v) { pA = v; resample(); },
  });
  R.slider(ctr, {
    label: 'true success rate — policy B',
    min: 0.5, max: 0.99, step: 0.01, value: pB,
    fmt: function (v) { return Math.round(v * 100) + '%'; },
    on: function (v) { pB = v; resample(); },
  });
  R.legend(stage, [
    [R.C.cyan, 'policy A: estimate ± 95% CI'],
    [R.C.violet, 'policy B: estimate ± 95% CI'],
    [R.C.orange, 'true rate'],
    ['rgba(255,107,107,0.45)', 'CI overlap'],
  ]);

  resample();
});
</script>
