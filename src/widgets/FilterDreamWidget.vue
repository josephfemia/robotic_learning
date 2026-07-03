<template>
  <Lab
    ref="lab"
    id="filterdream"
    title="Filter, then dream: the posterior → prior hand-off"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { DEFAULTS, makeTrueTrajectory, makeObservations, runBelief } from '../logic/filterDream.js';

const note =
  'The posterior corrects with each observation; the prior must predict without one — the KL term trains the prior to imitate the posterior, and that hand-off is what lets Dreamer train a policy inside a dream.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // ---- geometry -----------------------------------------------------------
  var W = 700, H = 330;
  var padL = 46, padR = 14, padT = 44, padB = 46;
  var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  var ymid = (y0 + y1) / 2;
  var N = DEFAULTS.steps;
  var YR = 90; // state units shown: ±YR (pinned walk peaks ~31; bands clamp)
  var sy = (y1 - y0) / 2 / YR;
  function px(t) { return x0 + (t * (x1 - x0)) / N; }
  function py(v) { return R.clamp(ymid - v * sy, y0, y1); }

  var svg = R.SVG(stage, W, H);

  // ---- state --------------------------------------------------------------
  var boundary = 30;
  var trained = true;
  var dreamSeed = DEFAULTS.dreamSeed;
  var traj = makeTrueTrajectory(); // pinned — never resampled
  var obs = makeObservations(traj); // pinned — never resampled
  var cur = compute();
  var animToken = 0; // stale-frame guard: slider drags cancel in-flight tweens

  function compute() {
    return runBelief({ traj: traj, obs: obs, boundary: boundary, trained: trained, dreamSeed: dreamSeed });
  }

  // ---- band polygon with "snap teeth" -------------------------------------
  // At each observed step the ribbon shows σ_pred (wide) then σ_post (tight)
  // at the same x — the visible per-tick snap. In the dream, pred == post.
  function bandPoints(bel, t0, t1) {
    var top = [], bot = [];
    for (var t = t0; t <= t1; t++) {
      var xp = px(t).toFixed(1);
      var teeth = Math.abs(bel.sigmaPred[t] - bel.sigma[t]) > 1e-9;
      if (teeth) {
        top.push(xp + ',' + py(bel.muPred[t] + 2 * bel.sigmaPred[t]).toFixed(1));
        bot.push(xp + ',' + py(bel.muPred[t] - 2 * bel.sigmaPred[t]).toFixed(1));
      }
      top.push(xp + ',' + py(bel.mu[t] + 2 * bel.sigma[t]).toFixed(1));
      bot.push(xp + ',' + py(bel.mu[t] - 2 * bel.sigma[t]).toFixed(1));
    }
    bot.reverse();
    return top.concat(bot).join(' ');
  }

  function meanPoints(bel, t0, t1) {
    var pts = '';
    for (var t = t0; t <= t1; t++) {
      pts += (t > t0 ? ' ' : '') + px(t).toFixed(1) + ',' + py(bel.mu[t]).toFixed(1);
    }
    return pts;
  }

  // ---- draw ---------------------------------------------------------------
  function draw(bel) {
    R.clr(svg);
    var bx = px(boundary);

    // dream region wash
    svg.appendChild(R.E('rect', { x: bx, y: y0, width: x1 - bx, height: y1 - y0, fill: 'rgba(232,89,12,0.06)' }));

    // grid + zero line
    [-60, -30, 30, 60].forEach(function (v) {
      svg.appendChild(R.E('line', { x1: x0, y1: py(v), x2: x1, y2: py(v), stroke: R.C.grid, 'stroke-width': 1 }));
    });
    svg.appendChild(R.E('line', { x1: x0, y1: ymid, x2: x1, y2: ymid, stroke: R.C.axis, 'stroke-width': 1 }));

    // uncertainty bands: posterior (cyan) then prior (orange), continuous at b
    svg.appendChild(R.E('polygon', { points: bandPoints(bel, 0, boundary), fill: R.C.cyan, opacity: 0.16 }));
    if (boundary < N) {
      svg.appendChild(R.E('polygon', { points: bandPoints(bel, boundary, N), fill: R.C.orange, opacity: 0.16 }));
    }

    // true trajectory — dim, the hidden state neither half gets to see fully
    var tp = '';
    for (var t = 0; t <= N; t++) tp += (t ? ' ' : '') + px(t).toFixed(1) + ',' + py(traj[t]).toFixed(1);
    svg.appendChild(R.E('polyline', { points: tp, fill: 'none', stroke: R.C.dim, 'stroke-width': 1.5, opacity: 0.6 }));

    // observation ticks — only where the posterior gets to peek
    for (var s = 0; s <= boundary; s++) {
      var ox = px(s), oy = py(obs[s]);
      svg.appendChild(R.E('line', { x1: ox, y1: oy - 4, x2: ox, y2: oy + 4, stroke: R.C.green, 'stroke-width': 1.5, opacity: 0.9 }));
    }

    // belief means
    svg.appendChild(R.E('polyline', { points: meanPoints(bel, 0, boundary), fill: 'none', stroke: R.C.cyan, 'stroke-width': 2 }));
    if (boundary < N) {
      svg.appendChild(R.E('polyline', { points: meanPoints(bel, boundary, N), fill: 'none', stroke: R.C.orange, 'stroke-width': 2 }));
    }
    // the hand-off dot
    svg.appendChild(R.E('circle', { cx: bx, cy: py(bel.mu[boundary]), r: 4, fill: R.C.violet, stroke: '#0e1420', 'stroke-width': 1.5 }));

    // boundary line
    svg.appendChild(R.E('line', { x1: bx, y1: y0 - 8, x2: bx, y2: y1, stroke: R.C.violet, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));

    // labels — header band y=18 (fixed), phase labels y=34 (clamped at extremes)
    svg.appendChild(R.TX(x0, 18, 'belief = μ ± 2σ', { anchor: 'start', fill: R.C.dim, size: 11.5 }));
    var endBand = 2 * bel.sigma[N];
    var endTxt = '±2σ at horizon: ' + (endBand >= 1000 ? '>999 (off the chart)' : endBand.toFixed(1));
    svg.appendChild(R.TX(x1, 18, endTxt, { anchor: 'end', fill: trained ? R.C.ink : R.C.red, size: 11.5 }));
    // phase labels flank the boundary; each is drawn only when it has room,
    // so nothing clips or collides at boundary = 1 or boundary = 59.
    if (bx - x0 > 108) svg.appendChild(R.TX(bx - 8, 34, '◀ observe (posterior)', { anchor: 'end', fill: R.C.cyan, size: 11.5 }));
    if (x1 - bx > 88) svg.appendChild(R.TX(bx + 8, 34, 'dream (prior) ▶', { anchor: 'start', fill: R.C.orange, size: 11.5 }));

    // axes titles
    svg.appendChild(R.TX((x0 + x1) / 2, H - 8, 'time / steps →   (ticks stop at the boundary — so do corrections)', { fill: R.C.dim, size: 11.5 }));
    var yt = R.TX(0, 0, 'state x', { fill: R.C.dim, size: 11.5 });
    yt.setAttribute('transform', 'translate(14,' + ymid + ') rotate(-90)');
    svg.appendChild(yt);
  }

  // ---- eased transition for discrete changes (toggle / resample) ----------
  function blend(a, b, e) {
    var n = a.mu.length;
    var out = { mu: new Float64Array(n), sigma: new Float64Array(n), muPred: new Float64Array(n), sigmaPred: new Float64Array(n) };
    for (var i = 0; i < n; i++) {
      out.mu[i] = R.lerp(a.mu[i], b.mu[i], e);
      out.sigma[i] = R.lerp(a.sigma[i], b.sigma[i], e);
      out.muPred[i] = R.lerp(a.muPred[i], b.muPred[i], e);
      out.sigmaPred[i] = R.lerp(a.sigmaPred[i], b.sigmaPred[i], e);
    }
    return out;
  }

  function easeTo(next) {
    var from = cur, id = ++animToken;
    cur = next;
    // tween is instant (onStep(1) once) under prefers-reduced-motion
    tween(420, {
      onStep(e) { if (id === animToken) draw(blend(from, next, e)); },
      onDone() { if (id === animToken) draw(next); },
    });
  }

  // ---- controls ------------------------------------------------------------
  // Slider drag = instant (no easing), per the motion convention.
  R.slider(ctr, {
    label: 'observe → dream boundary (step)',
    min: 1, max: N - 1, step: 1, value: boundary,
    fmt: function (v) { return v.toFixed(0); },
    on: function (v) { boundary = v; animToken++; cur = compute(); draw(cur); },
  });

  var togBtn = R.btn(ctr, 'Prior: KL-trained ✓', null, function () {
    trained = !trained;
    togBtn.textContent = trained ? 'Prior: KL-trained ✓' : 'Prior: untrained ✗';
    easeTo(compute());
  });

  R.btn(ctr, 'Resample dream', 'primary', function () {
    dreamSeed += 1;
    easeTo(compute());
  });

  R.legend(ctr, [
    [R.C.dim, 'true state (hidden)'],
    [R.C.green, 'observation ticks oₜ'],
    [R.C.cyan, 'posterior belief — corrects on every tick'],
    [R.C.orange, 'prior belief — prediction only'],
  ]);

  draw(cur);
});
</script>
