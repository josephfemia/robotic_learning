<template>
  <Lab
    ref="lab"
    id="saycan"
    title="SayCan: language prior × feasibility = grounded plan"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { scoredSkills } from '../logic/saycan.js';

const note =
  'Each row shows the two votes as thin bars — violet "say" (LLM prior) and orange "can" (affordance) — multiplying into the thick product bar beneath them. Toggle the sponge out of the room and watch the <em>can</em> bar of every sponge skill get crushed, dragging the product down with it: a high language score can\'t rescue an infeasible skill, and a feasible-but-irrelevant skill stays low. That multiplicative gate is the entire idea — neither the LLM nor the value function alone is trusted to pick.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Numeric core (skill table + scoring) lives in logic/saycan.js (vitest-pinned).
  // Phase-3 (F7) upgrade: say × can factor bars per row; R.animate → tween
  // (reduced motion → instant via tween's fast-path).
  var sponge = true;
  var W = 700, H = 330, svg = R.SVG(stage, W, H);
  var cur = null; // name → { score, aff } — the currently displayed values

  function target() { return scoredSkills(sponge); }

  function drawAt(S) {
    R.clr(svg);
    var disp = S.slice().sort(function (a, b) { return b.dispScore - a.dispScore; });
    var x0 = 190, x1 = W - 85, y0 = 40, rowh = (H - 70) / disp.length, scale = x1 - x0;
    svg.appendChild(R.TX(x0, 20, 'final score  =  LLM "Say"  ×  affordance "Can"', { anchor: 'start', fill: R.C.ink, size: 12.5, base: 'hanging' }));
    for (var i = 0; i < disp.length; i++) {
      var cy = y0 + i * rowh + rowh / 2;
      var top = (i === 0);
      var crushed = disp[i].dispAff < 0.2;
      svg.appendChild(R.TX(x0 - 12, cy - 4, disp[i].n, { anchor: 'end', fill: (top ? R.C.green : R.C.ink), size: 12, weight: (top ? 600 : 400), base: 'middle' }));
      if (top) svg.appendChild(R.TX(x0 - 12, cy + 9, '← chosen', { anchor: 'end', fill: R.C.green, size: 10, weight: 600, base: 'middle' }));
      // say factor bar (constant — the LLM never re-reads the room)
      var sw = disp[i].llm * scale;
      svg.appendChild(R.E('rect', { x: x0, y: cy - 20, width: Math.max(1, sw), height: 5, rx: 2, fill: R.C.violet, opacity: 0.8 }));
      svg.appendChild(R.TX(x0 + sw + 5, cy - 17.5, 'say ' + disp[i].llm.toFixed(2), { anchor: 'start', fill: R.C.dim, size: 9.5, base: 'middle' }));
      // can factor bar (this is what the world toggles)
      var aw = disp[i].dispAff * scale;
      svg.appendChild(R.E('rect', { x: x0, y: cy - 9, width: Math.max(1, aw), height: 5, rx: 2, fill: (crushed ? R.C.red : R.C.orange), opacity: 0.8 }));
      svg.appendChild(R.TX(x0 + aw + 5, cy - 6.5, 'can ' + disp[i].dispAff.toFixed(2), { anchor: 'start', fill: (crushed ? R.C.red : R.C.dim), size: 9.5, base: 'middle' }));
      // product bar — always no longer than either factor
      var pw = disp[i].dispScore * scale;
      svg.appendChild(R.E('rect', { x: x0, y: cy, width: Math.max(1, pw), height: 11, rx: 3, fill: (top ? R.C.green : R.C.cyan), opacity: 0.85 }));
      svg.appendChild(R.TX(x0 + pw + 5, cy + 5.5, '= ' + disp[i].dispScore.toFixed(2), { anchor: 'start', fill: R.C.dim, size: 10.5, base: 'middle' }));
    }
  }

  function setTo(newS, animateIt) {
    if (!cur) { cur = {}; for (var i = 0; i < newS.length; i++) cur[newS[i].n] = { score: newS[i].score, aff: newS[i].aff }; }
    if (!animateIt) {
      for (var j = 0; j < newS.length; j++) { newS[j].dispScore = newS[j].score; newS[j].dispAff = newS[j].aff; cur[newS[j].n] = { score: newS[j].score, aff: newS[j].aff }; }
      drawAt(newS); return;
    }
    var from = {}; for (var k in cur) from[k] = { score: cur[k].score, aff: cur[k].aff };
    // Discrete state change → tween (instant under prefers-reduced-motion).
    tween(420, {
      onStep(e) {
        for (var i = 0; i < newS.length; i++) {
          var f = from[newS[i].n];
          newS[i].dispScore = R.lerp(f.score, newS[i].score, e);
          newS[i].dispAff = R.lerp(f.aff, newS[i].aff, e);
        }
        drawAt(newS);
      },
      onDone() { for (var i = 0; i < newS.length; i++) cur[newS[i].n] = { score: newS[i].score, aff: newS[i].aff }; },
    });
  }

  function draw(animateIt) { setTo(target(), animateIt); }

  var sb = R.btn(ctr, 'Sponge in room: YES', 'primary', function () { sponge = !sponge; sb.textContent = 'Sponge in room: ' + (sponge ? 'YES' : 'NO'); sb.classList.toggle('primary', sponge); draw(true); });
  R.legend(stage, [[R.C.violet, '"say" — LLM prior'], [R.C.orange, '"can" — affordance'], [R.C.green, 'product (chosen)'], [R.C.cyan, 'product (others)'], [R.C.red, 'can ≈ 0 — infeasible here']]);
  draw(false);
});
</script>
