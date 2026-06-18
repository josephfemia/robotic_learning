<template>
  <Lab
    ref="lab"
    id="worldview"
    title="The three worldviews as a map"
    :note="`Each method is a weighted point inside the Sutton–LeCun–Brooks triangle. Notice almost nothing sits in a pure corner — the live disagreements are about <em>mixtures</em>. Where you'd place your own project is a genuinely useful thing to know.`"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { barycentricToXY } from '../logic/worldview.js';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the worldview IIFE
  // (reference/robot-learning-companion.html lines 3117–3147).
  // window.RLLAB → R; getElementById → stage/ctr refs; pt() → barycentricToXY().
  var methods = [
    { n: 'π0.5 (VLA)', w: [0.7, 0.2, 0.1], why: 'Scale general methods on pooled data (Sutton), with a light language-subtask planner (LeCun garnish); little explicit world model.' },
    { n: 'DreamerV3', w: [0.25, 0.65, 0.1], why: 'A learned predictive world model you plan/train inside — the LeCun program made concrete; scale matters but architecture is the bet.' },
    { n: '50 Hz locomotion policy', w: [0.2, 0.05, 0.75], why: 'Reactive sensorimotor competence, minimal explicit representation — Brooks wearing a neural network.' },
    { n: 'RT-2', w: [0.78, 0.12, 0.1], why: 'Pure Bitter-Lesson: fine-tune a web-scale VLM to emit actions; semantics from scale, not hand-built structure.' },
    { n: 'SayCan', w: [0.35, 0.4, 0.25], why: 'LLM prior (scale) × value-function grounding (a bit of world knowledge) selecting reactive skills — a genuine blend.' },
    { n: 'Decision Transformer', w: [0.6, 0.3, 0.1], why: 'Sequence-model scaling (Sutton) with outcome conditioning standing in for explicit planning (weak LeCun).' },
    { n: 'JEPA agent (proposed)', w: [0.15, 0.8, 0.05], why: 'Architecture-first: predict in representation space and plan — LeCun in its purest stated form.' },
  ];
  var sel = 0;
  var W = 560, H = 430, svg = R.SVG(stage, W, H);
  var cx = W / 2, A = { x: cx, y: 46 }, B = { x: 70, y: H - 70 }, C = { x: W - 70, y: H - 70 }; // Sutton top, LeCun left, Brooks right

  function draw() {
    R.clr(svg);
    svg.appendChild(R.E('path', { d: 'M' + A.x + ' ' + A.y + 'L' + B.x + ' ' + B.y + 'L' + C.x + ' ' + C.y + 'Z', fill: 'rgba(120,140,200,0.06)', stroke: R.C.axis, 'stroke-width': 1.3 }));
    svg.appendChild(R.TX(A.x, A.y - 12, 'SUTTON', { fill: R.C.orange, size: 12.5, weight: 700 }));
    svg.appendChild(R.TX(A.x, A.y - 0, 'scale general methods', { fill: R.C.dim, size: 10, base: 'hanging' }));
    svg.appendChild(R.TX(B.x - 2, B.y + 16, 'LeCUN', { fill: R.C.violet, size: 12.5, weight: 700, anchor: 'start' }));
    svg.appendChild(R.TX(B.x - 2, B.y + 29, 'world models + planning', { fill: R.C.dim, size: 10, anchor: 'start', base: 'hanging' }));
    svg.appendChild(R.TX(C.x + 2, C.y + 16, 'BROOKS', { fill: R.C.green, size: 12.5, weight: 700, anchor: 'end' }));
    svg.appendChild(R.TX(C.x + 2, C.y + 29, 'reactive embodiment', { fill: R.C.dim, size: 10, anchor: 'end', base: 'hanging' }));
    for (var i = 0; i < methods.length; i++) {
      var p = barycentricToXY(methods[i].w, { A: A, B: B, C: C });
      var on = (i === sel);
      svg.appendChild(R.E('circle', { cx: p.x, cy: p.y, r: on ? 8 : 5, fill: on ? R.C.cyan : R.C.ink, opacity: on ? 1 : 0.5, stroke: '#0F1422', 'stroke-width': 1.5 }));
      if (on) svg.appendChild(R.TX(p.x, p.y - 14, methods[i].n, { fill: R.C.cyan, size: 11.5, weight: 600 }));
    }
  }

  var info = R.ce('div');
  info.style.cssText = 'font-size:13px;color:var(--code-ink);margin:8px 0 4px;min-height:54px;line-height:1.5';
  ctr.appendChild(info);
  var wrap = R.ce('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
  ctr.appendChild(wrap);

  function refresh() {
    info.innerHTML = '<b style="color:#36C5D0">' + methods[sel].n + '</b> — ' + methods[sel].why;
    draw();
  }

  methods.forEach(function (m, i) {
    R.btn(wrap, m.n, (i === sel ? 'primary' : null), function () {
      sel = i;
      [].forEach.call(wrap.children, function (b, j) { b.classList.toggle('primary', j === i); });
      refresh();
    });
  });

  refresh();
});
</script>
