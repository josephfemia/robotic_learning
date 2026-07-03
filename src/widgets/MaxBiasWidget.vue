<template>
  <Lab
    ref="lab"
    id="maxbias"
    title="Why max over noisy guesses lies upward"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { makeRng, makeRandn, resampleOnce } from '../logic/maxBias.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Every action here has the same true value — the dashed line. The \\(\\max\\) doesn\'t find the best action; it finds the luckiest estimate, and the vanilla target then <em>trusts that same lucky number</em>, so the violet bias bar climbs as you resample — faster with more actions \\(N\\) and more noise \\(\\sigma\\). Decouple selection from evaluation (Double DQN) and the bias collapses toward zero, but watch the dots: the scatter is exactly as wild as before. <strong>Independent evaluation removes the bias without removing the noise.</strong>';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Numeric core in logic/maxBias.js (vitest-pinned).
  var W = 700, H = 346;
  var x0 = 48, x1 = 436;              // left panel: the N estimates
  var bx0 = 508, bx1 = 568, bax = 488; // right panel: running bias bar + its axis
  var xR = W - 20;
  var yTop = 40, yBot = H - 70;
  var yz = (yTop + yBot) / 2;          // shared zero line = the true Q of every action
  var ppuBar = (yz - yTop) / 3.5;      // bar panel: fixed absolute scale, 0…3.5

  var SEED = 20260703;
  var N = 5, sigma = 1, decoupled = false;
  var randn, sample, sumV, nV, dispMean, dotFade, tweenId = 0;

  var svg = R.SVG(stage, W, H);

  function resetStats() { sumV = 0; nV = 0; dispMean = 0; }

  function reset() {
    randn = makeRandn(makeRng(SEED));
    resetStats();
    sample = null;
    dotFade = 1;
    tweenId++;
    draw();
  }

  function resample(k) {
    for (var i = 0; i < k; i++) {
      sample = resampleOnce(N, sigma, randn, decoupled);
      sumV += sample.value;
      nV++;
    }
    var from = dispMean, to = sumV / nV, id = ++tweenId;
    // new dots fade in while the bias bar eases to the new running mean;
    // under prefers-reduced-motion tween() applies the end state instantly
    tween(300, {
      onStep: function (e) {
        if (id !== tweenId) return;
        dotFade = e;
        dispMean = from + (to - from) * e;
        draw();
      },
    });
  }

  function onParamChange() {
    resetStats();
    resample(1);
  }

  function fmtV(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2); }

  function draw() {
    R.clr(svg);
    var ppu = (yz - yTop) / (3.5 * sigma); // left panel: adapts to σ so dots stay readable

    // headers (reserved top band, nothing else may enter y < yTop)
    svg.appendChild(R.TX(x0, 16, N + ' noisy estimates of one true value', { anchor: 'start', fill: R.C.ink, size: 12, base: 'hanging' }));
    svg.appendChild(R.TX(xR, 16, 'running mean bias', { anchor: 'end', fill: R.C.ink, size: 12, base: 'hanging' }));

    // shared dashed true-Q line across both panels; label lives in the panel gap
    svg.appendChild(R.E('line', { x1: x0, y1: yz, x2: xR, y2: yz, stroke: R.C.axis, 'stroke-width': 1.2, 'stroke-dasharray': '6 5' }));
    svg.appendChild(R.TX((x1 + bax) / 2, yz - 8, 'true Q', { fill: R.C.dim, size: 10.5 }));

    // left panel: bottom axis + action labels
    svg.appendChild(R.E('line', { x1: x0, y1: yBot, x2: x1, y2: yBot, stroke: R.C.axis, 'stroke-width': 1.2 }));
    var step = (x1 - x0) / N;
    function yOf(v) { return R.clamp(yz - v * ppu, yTop + 6, yBot - 3); }
    if (sample) {
      for (var i = 0; i < N; i++) {
        var cx = x0 + (i + 0.5) * step;
        svg.appendChild(R.TX(cx, yBot + 14, 'a' + (i + 1), { fill: R.C.dim, size: 10, base: 'hanging' }));
        if (i === sample.pick) continue; // drawn last, on top
        svg.appendChild(R.E('circle', { cx: cx, cy: yOf(sample.est[i]), r: 5, fill: R.C.cyan, opacity: 0.75 * dotFade }));
      }
      // the selected (luckiest) action
      var px = x0 + (sample.pick + 0.5) * step;
      var selY = yOf(sample.est[sample.pick]);
      if (decoupled) {
        // selection dot = orange ring; independent evaluation dot = green, and
        // that green value is what the target trusts
        var evY = yOf(sample.evalEst[sample.pick]);
        svg.appendChild(R.E('line', { x1: px, y1: yz, x2: px, y2: evY, stroke: R.C.green, 'stroke-width': 2.5, opacity: dotFade }));
        svg.appendChild(R.E('circle', { cx: px, cy: selY, r: 6, fill: 'none', stroke: R.C.orange, 'stroke-width': 2.5, opacity: dotFade }));
        svg.appendChild(R.E('circle', { cx: px, cy: evY, r: 6, fill: R.C.green, opacity: dotFade }));
        var ty = evY - 14 < yTop + 12 ? evY + 20 : evY - 14;
        var lbl1 = R.TX(px, ty, fmtV(sample.value), { fill: R.C.green, size: 11, weight: 600 });
        lbl1.setAttribute('opacity', dotFade);
        svg.appendChild(lbl1);
      } else {
        svg.appendChild(R.E('line', { x1: px, y1: yz, x2: px, y2: selY, stroke: R.C.orange, 'stroke-width': 2.5, opacity: dotFade }));
        svg.appendChild(R.E('circle', { cx: px, cy: selY, r: 6, fill: R.C.orange, opacity: dotFade }));
        var ty2 = selY - 14 < yTop + 12 ? selY + 20 : selY - 14;
        var lbl2 = R.TX(px, ty2, fmtV(sample.value), { fill: R.C.orange, size: 11, weight: 600 });
        lbl2.setAttribute('opacity', dotFade);
        svg.appendChild(lbl2);
      }
    } else {
      for (var j = 0; j < N; j++) {
        svg.appendChild(R.TX(x0 + (j + 0.5) * step, yBot + 14, 'a' + (j + 1), { fill: R.C.dim, size: 10, base: 'hanging' }));
      }
      svg.appendChild(R.TX((x0 + x1) / 2, yz - 14, 'press Resample', { fill: R.C.dim, size: 11.5 }));
    }

    // right panel: bias-bar axis with absolute ticks 0…3
    svg.appendChild(R.E('line', { x1: bax, y1: yTop + 2, x2: bax, y2: yBot, stroke: R.C.axis, 'stroke-width': 1.2 }));
    for (var t = 0; t <= 3; t++) {
      var tyk = yz - t * ppuBar;
      svg.appendChild(R.E('line', { x1: bax - 5, y1: tyk, x2: bax, y2: tyk, stroke: R.C.axis, 'stroke-width': 1 }));
      svg.appendChild(R.TX(bax - 9, tyk + 3.5, '' + t, { anchor: 'end', fill: R.C.dim, size: 10 }));
    }
    if (nV > 0) {
      var h = dispMean * ppuBar;
      var barH = Math.min(Math.abs(h), yz - yTop - 2);
      if (barH > 0.5) {
        svg.appendChild(R.E('rect', { x: bx0, y: h >= 0 ? yz - barH : yz, width: bx1 - bx0, height: barH, fill: R.C.violet, opacity: 0.85, rx: 2 }));
      }
      var vy = h >= 0 ? Math.max(yTop + 11, yz - barH - 8) : Math.min(yBot - 4, yz + barH + 14);
      svg.appendChild(R.TX((bx0 + bx1) / 2, vy, fmtV(dispMean), { fill: R.C.violet, size: 12, weight: 700 }));
    }

    // footer band (below yBot, clear of the plot)
    if (sample) {
      svg.appendChild(R.TX(x0, H - 12, 'picked a' + (sample.pick + 1) + '  ·  target trusts ' + fmtV(sample.value) + '  (truth is 0)', { anchor: 'start', fill: R.C.dim, size: 11.5 }));
    }
    svg.appendChild(R.TX(xR, H - 12, 'n = ' + nV + ' resamples', { anchor: 'end', fill: R.C.dim, size: 11.5 }));
  }

  R.btn(ctr, 'Resample', 'primary', function () { resample(1); });
  R.btn(ctr, 'Resample ×25', null, function () { resample(25); });
  var tglBtn = R.btn(ctr, 'Double DQN: off', null, function () {
    decoupled = !decoupled;
    tglBtn.textContent = decoupled ? 'Double DQN: decoupled ✓' : 'Double DQN: off';
    if (decoupled) tglBtn.classList.add('primary'); else tglBtn.classList.remove('primary');
    onParamChange();
  });
  R.btn(ctr, 'Reset', null, reset);
  R.slider(ctr, { label: 'actions  N', min: 2, max: 12, step: 1, value: N, fmt: function (v) { return '' + Math.round(v); }, on: function (v) { N = Math.round(v); onParamChange(); } });
  R.slider(ctr, { label: 'estimate noise  σ', min: 0.2, max: 2, step: 0.05, value: sigma, fmt: function (v) { return v.toFixed(2); }, on: function (v) { sigma = v; onParamChange(); } });
  R.legend(stage, [[R.C.cyan, 'noisy estimate'], [R.C.orange, 'argmax pick'], [R.C.green, 'independent evaluation'], [R.C.violet, 'running mean bias']]);
  reset();
});
</script>
