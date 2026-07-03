<template>
  <Lab
    ref="lab"
    id="dagger"
    title="DAgger mechanically: the funnel tightens round by round"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import {
  simulateRound, dampingForRound, coverageAfterRound, collectLabels,
} from '../logic/dagger.js';

const note =
  'BC fails off the demo manifold because no data lives there; DAgger\'s rounds put labels exactly where the learner actually goes, so the off-distribution region — and the O(εT²) penalty paid inside it — shrinks to O(εT).';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Layout mirrors DriftWidget; extra headroom (±38px) reserves clear top/bottom
  // bands for the round/readout headers and the time axis, so no drift line,
  // coverage band, or label dot can ever collide with them (rollouts are clamped
  // to ±maxA in the logic core).
  const W = 700, H = 320, padL = 18, padR = 18, NRoll = 26, STEPS = 64, ROUNDS = 5;
  const svg = R.SVG(stage, W, H);
  const x0 = padL, x1 = W - padR, ymid = H / 2, maxA = H / 2 - 38, dx = (x1 - x0) / STEPS;
  const bandFill = 'rgba(157,141,241,0.13)';

  // --- state -----------------------------------------------------------------
  let eps = 0.06;
  let round = 0;          // 0 = pure BC, up to ROUNDS
  let cov = 0;            // coverage-band half-width the current bundle ran under
  let rolls = [];         // current bundle (Float64Arrays from the logic core)
  let pts = [];           // cached point-strings for the current bundle
  let prevPts = [];       // outgoing bundle, faded during a round transition
  let labels = [];        // expert labels harvested at the latest round
  let oldLabels = [];     // aggregated labels from earlier rounds (drawn dim)
  let maxHist = [];       // per-round max |drift| readout history
  let animating = false;
  let runBtn, resetBtn;

  function toPts(arr) {
    let s = '';
    for (let t = 0; t <= STEPS; t++) {
      s += (t ? ' ' : '') + (x0 + t * dx).toFixed(1) + ',' + (ymid + arr[t]).toFixed(1);
    }
    return s;
  }

  // Sample the round's bundle ONCE and cache point-strings, so opacity tweens
  // fade fixed lines rather than re-jittering them each frame (DriftWidget idiom).
  function simBundle() {
    const res = simulateRound({
      eps, steps: STEPS, maxA, nRoll: NRoll, cov, damp: dampingForRound(round),
    });
    rolls = res.rolls;
    pts = rolls.map(toPts);
    maxHist[round] = res.maxDrift;
    maxHist.length = round + 1;
  }

  // --- drawing ---------------------------------------------------------------
  // o: { bandPx, prevAlpha, curAlpha, labelAlpha } — all optional (settled frame).
  function draw(o) {
    o = o || {};
    const bandPx = o.bandPx !== undefined ? o.bandPx : cov;
    const prevAlpha = o.prevAlpha !== undefined ? o.prevAlpha : 0;
    const curAlpha = o.curAlpha !== undefined ? o.curAlpha : 0.5;
    const labelAlpha = o.labelAlpha !== undefined ? o.labelAlpha : 0.85;
    R.clr(svg);

    // Coverage band ("covered by training data") — widens as labels aggregate.
    if (bandPx > 0.5) {
      svg.appendChild(R.E('rect', {
        x: x0, y: ymid - bandPx, width: x1 - x0, height: 2 * bandPx, fill: bandFill,
      }));
      svg.appendChild(R.E('line', {
        x1: x0, y1: ymid - bandPx, x2: x1, y2: ymid - bandPx,
        stroke: R.C.violet, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0.7,
      }));
      svg.appendChild(R.E('line', {
        x1: x0, y1: ymid + bandPx, x2: x1, y2: ymid + bandPx,
        stroke: R.C.violet, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0.7,
      }));
      if (bandPx > 26) {
        // Top-left inside the band: rollouts start ON the line at x0, so the
        // band's upper-left corner is always clear of drift lines and dots.
        svg.appendChild(R.TX(x0 + 6, ymid - bandPx + 5, 'covered by training data', {
          anchor: 'start', fill: R.C.violet, size: 11, base: 'hanging',
        }));
      }
    }

    // Expert demo line.
    svg.appendChild(R.E('line', {
      x1: x0, y1: ymid, x2: x1, y2: ymid,
      stroke: R.C.cyan, 'stroke-width': 2, 'stroke-dasharray': '6 5',
    }));

    // Rollout bundles: outgoing (fading) then current (arriving).
    for (let n = 0; n < prevPts.length; n++) {
      if (prevAlpha <= 0) break;
      svg.appendChild(R.E('polyline', {
        points: prevPts[n], fill: 'none', stroke: R.C.orange,
        'stroke-width': 1.2, opacity: prevAlpha,
      }));
    }
    for (let n = 0; n < pts.length; n++) {
      svg.appendChild(R.E('polyline', {
        points: pts[n], fill: 'none', stroke: R.C.orange,
        'stroke-width': 1.2, opacity: curAlpha,
      }));
    }

    // Expert labels: dots exactly on the drifted states the learner visited.
    for (let i = 0; i < oldLabels.length; i++) {
      svg.appendChild(R.E('circle', {
        cx: x0 + oldLabels[i].t * dx, cy: ymid + oldLabels[i].d, r: 1.8,
        fill: R.C.cyan, opacity: 0.22,
      }));
    }
    for (let i = 0; i < labels.length; i++) {
      svg.appendChild(R.E('circle', {
        cx: x0 + labels[i].t * dx, cy: ymid + labels[i].d, r: 2.2,
        fill: R.C.cyan, opacity: labelAlpha,
      }));
    }

    // Headers (top band, y ≤ 28, always clear of the drawing: |d| ≤ maxA = H/2−38).
    const roundTxt = 'round ' + round + ' of ' + ROUNDS +
      (round === 0 ? '  ·  pure BC, no labels yet' : '') + '  ·  ε = ' + eps.toFixed(2);
    svg.appendChild(R.TX(x0 + 2, 12, roundTxt, {
      anchor: 'start', fill: R.C.ink, size: 11.5, base: 'hanging',
    }));
    const hist = maxHist.map((m) => m.toFixed(0)).join(' → ');
    svg.appendChild(R.TX(x1 - 2, 12, 'max drift  ' + hist + ' px', {
      anchor: 'end', fill: R.C.orange, size: 11.5, base: 'hanging',
    }));

    // Footer (bottom band).
    svg.appendChild(R.TX((x0 + x1) / 2, H - 8,
      'time / steps  →    (each orange line is one rollout of the current policy)',
      { fill: R.C.dim, size: 11.5 }));
  }

  // --- controls ----------------------------------------------------------------
  // Slider drag: instant — resimulate the CURRENT round's bundle at the new ε
  // (coverage, round, and harvested labels are history; they stay).
  R.slider(ctr, {
    label: 'per-step error  ε', min: 0.01, max: 0.2, step: 0.01, value: eps,
    fmt: (v) => v.toFixed(2),
    on(v) { eps = v; simBundle(); draw(); },
  });

  runBtn = R.btn(ctr, 'Run one DAgger round', 'primary', () => {
    if (round >= ROUNDS || animating) return;
    // 1. The expert labels the drifted states this bundle visited (aggregate)…
    oldLabels = oldLabels.concat(labels);
    labels = collectLabels(rolls, 2, 4);
    // 2. …the coverage band widens to include them…
    const covOld = cov;
    cov = coverageAfterRound(cov, maxHist[round], maxA);
    // 3. …and the refit policy rolls out a new, tighter bundle.
    prevPts = pts;
    round++;
    simBundle();
    if (round >= ROUNDS) { runBtn.disabled = true; runBtn.textContent = 'Round ' + ROUNDS + ' — funnel tight'; }
    // Ease the transition: labels land, band grows, old funnel dissolves into the
    // new one. tween() collapses to a single settled frame under reduced motion.
    animating = true;
    tween(700, {
      onStep(e) {
        draw({
          bandPx: covOld + (cov - covOld) * Math.min(1, e * 1.4),
          prevAlpha: 0.45 * (1 - e),
          curAlpha: 0.5 * e,
          labelAlpha: 0.85 * Math.min(1, e * 1.6),
        });
      },
      onDone() { animating = false; prevPts = []; draw(); },
    });
  });

  resetBtn = R.btn(ctr, 'Reset to round 0', null, () => {
    if (animating) return;
    round = 0; cov = 0; labels = []; oldLabels = []; maxHist = []; prevPts = [];
    runBtn.disabled = false; runBtn.textContent = 'Run one DAgger round';
    simBundle();
    tween(300, {
      onStep(e) { draw({ curAlpha: 0.5 * e, labelAlpha: 0 }); },
      onDone() { draw(); },
    });
  });
  void resetBtn;

  R.legend(ctr, [
    [R.C.cyan, 'dashed line = expert demo'],
    [R.C.orange, 'learner rollouts'],
    [R.C.cyan, 'dots = expert labels (queried where the learner drifted)'],
    ['rgba(157,141,241,0.55)', 'band = covered by training data'],
  ]);

  simBundle();
  draw();
});
</script>
