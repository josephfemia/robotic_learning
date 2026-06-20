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
import { scoredSkills } from '../logic/saycan.js';

const note =
  'Bars are the final score (the product). A high language score can\'t rescue an infeasible skill, and a feasible-but-irrelevant skill stays low — only skills that score on <em>both</em> votes rise. That multiplicative gate is the entire idea: neither the LLM nor the value function alone is trusted to pick.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the saycan IIFE (reference lines 3036–3074).
  // Numeric core (skill table + scoring) lives in logic/saycan.js (vitest-pinned).
  // window.RLLAB → R; getElementById('saycan-stage') → stage; getElementById('saycan-ctrl') → ctr.
  var sponge = true;
  var W = 700, H = 330, svg = R.SVG(stage, W, H);
  var cur = null;

  function skills() { return scoredSkills(sponge); }

  function target() { return skills(); }

  function drawAt(S) {
    R.clr(svg);
    var disp = S.slice().sort(function (a, b) { return b.disp - a.disp; });
    var x0 = 190, x1 = W - 110, y0 = 40, rowh = (H - 70) / disp.length, mx = 1;
    svg.appendChild(R.TX(x0, 20, 'final score  =  LLM "Say"  ×  affordance "Can"', { anchor: 'start', fill: R.C.ink, size: 12.5, base: 'hanging' }));
    for (var i = 0; i < disp.length; i++) {
      var cy = y0 + i * rowh + rowh / 2;
      var top = (i === 0);
      svg.appendChild(R.TX(x0 - 12, cy, disp[i].n + (top ? '  ← chosen' : ''), { anchor: 'end', fill: (top ? R.C.green : R.C.ink), size: 12, weight: (top ? 600 : 400), base: 'middle' }));
      var bw = (x1 - x0) * disp[i].disp / mx;
      svg.appendChild(R.E('rect', { x: x0, y: cy - 9, width: Math.max(1, bw), height: 18, rx: 3, fill: (top ? R.C.green : R.C.cyan), opacity: 0.85 }));
      svg.appendChild(R.TX(x0 + bw + 6, cy, disp[i].disp.toFixed(2), { anchor: 'start', fill: R.C.dim, size: 11, base: 'middle' }));
      svg.appendChild(R.TX(x1 + 14, cy - 5, 'say ' + disp[i].llm.toFixed(2), { anchor: 'start', fill: R.C.dim, size: 9.5, base: 'middle' }));
      svg.appendChild(R.TX(x1 + 14, cy + 6, 'can ' + disp[i].aff.toFixed(2), { anchor: 'start', fill: (disp[i].aff < 0.2 ? R.C.red : R.C.dim), size: 9.5, base: 'middle' }));
    }
  }

  function setTo(newS, animateIt) {
    if (!cur) { cur = {}; for (var i = 0; i < newS.length; i++) cur[newS[i].n] = newS[i].score; }
    var from = {}; for (var k in cur) from[k] = cur[k];
    if (!animateIt) { for (var i = 0; i < newS.length; i++) { newS[i].disp = newS[i].score; cur[newS[i].n] = newS[i].score; } drawAt(newS); return; }
    R.animate(420, function (e) { for (var i = 0; i < newS.length; i++) { var nm = newS[i].n; newS[i].disp = R.lerp(from[nm], newS[i].score, e); } drawAt(newS); },
      function () { for (var i = 0; i < newS.length; i++) cur[newS[i].n] = newS[i].score; });
  }

  function draw(animateIt) { setTo(target(), animateIt); }

  var sb = R.btn(ctr, 'Sponge in room: YES', 'primary', function () { sponge = !sponge; sb.textContent = 'Sponge in room: ' + (sponge ? 'YES' : 'NO'); sb.classList.toggle('primary', sponge); draw(true); });
  R.legend(stage, [[R.C.green, 'top-ranked (chosen)'], [R.C.cyan, 'other candidates'], [R.C.red, 'infeasible here']]);
  draw(false);
});
</script>
