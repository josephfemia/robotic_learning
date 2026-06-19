<template>
  <Lab
    ref="lab"
    id="arm"
    title="Forward kinematics: joint angles → hand position"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { forwardKinematics } from '../logic/arm.js';

const note =
  'You control \\(q=(\\theta_1,\\theta_2)\\); the hand position \\(p_{\\text{ee}}=f(q)\\) follows. &quot;Trace workspace&quot; sweeps the joints to draw every reachable point — the arm\'s configuration space made visible. The action space of a real policy is exactly these angles, not the Cartesian hand position you might expect.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the arm IIFE (reference lines 3206–3236).
  // FK math delegated to logic/arm.js (forwardKinematics), which is
  // character-identical to the inline fk() in the original.
  var W = 560, H = 380, svg = R.SVG(stage, W, H);
  var th1 = 0.7, th2 = 0.8, ox = W / 2, oy = H * 0.62, workspace = [];

  function draw() {
    R.clr(svg);
    // workspace points
    for (var i = 0; i < workspace.length; i++) {
      svg.appendChild(R.E('circle', { cx: workspace[i][0], cy: workspace[i][1], r: 1.5, fill: R.C.violet, opacity: 0.32 }));
    }
    var p = forwardKinematics(ox, oy, th1, th2);
    // reach circle hint (max reach)
    svg.appendChild(R.E('circle', { cx: ox, cy: oy, r: 110 + 92, fill: 'none', stroke: R.C.grid, 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
    // links
    svg.appendChild(R.E('line', { x1: ox, y1: oy, x2: p.x1, y2: p.y1, stroke: R.C.cyan, 'stroke-width': 6, 'stroke-linecap': 'round' }));
    svg.appendChild(R.E('line', { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, stroke: R.C.orange, 'stroke-width': 6, 'stroke-linecap': 'round' }));
    // joints
    svg.appendChild(R.E('circle', { cx: ox, cy: oy, r: 7, fill: '#EAF0F8' }));
    svg.appendChild(R.E('circle', { cx: p.x1, cy: p.y1, r: 6, fill: '#EAF0F8' }));
    svg.appendChild(R.E('circle', { cx: p.x2, cy: p.y2, r: 8, fill: R.C.green, stroke: '#0F1422', 'stroke-width': 2 }));
    svg.appendChild(R.TX(p.x2 + 12, p.y2 - 10, 'hand  pₑₑ = f(q)', { anchor: 'start', fill: R.C.green, size: 12, weight: 600 }));
    svg.appendChild(R.TX(ox - 14, oy + 4, 'base', { anchor: 'end', fill: R.C.dim, size: 11 }));
    svg.appendChild(R.TX(40, 28, 'θ₁=' + (th1 * 180 / Math.PI).toFixed(0) + '°   θ₂=' + (th2 * 180 / Math.PI).toFixed(0) + '°    hand=(' + ((p.x2 - ox) / 1).toFixed(0) + ', ' + ((oy - p.y2)).toFixed(0) + ')', { anchor: 'start', fill: '#EAF0F8', size: 12.5, base: 'hanging' }));
  }

  R.slider(ctr, { label: 'joint 1 angle  θ₁', min: -180, max: 180, step: 1, value: th1 * 180 / Math.PI, fmt: function(v) { return v.toFixed(0) + '°'; }, on: function(v) { th1 = v * Math.PI / 180; draw(); } });
  R.slider(ctr, { label: 'joint 2 angle  θ₂', min: -180, max: 180, step: 1, value: th2 * 180 / Math.PI, fmt: function(v) { return v.toFixed(0) + '°'; }, on: function(v) { th2 = v * Math.PI / 180; draw(); } });
  R.btn(ctr, 'Trace workspace', 'primary', function() {
    workspace = [];
    for (var a = -Math.PI; a < Math.PI; a += 0.18) {
      for (var b = -Math.PI; b < Math.PI; b += 0.18) {
        var p = forwardKinematics(ox, oy, a, b);
        workspace.push([p.x2, p.y2]);
      }
    }
    draw();
  });
  R.btn(ctr, 'Clear', null, function() { workspace = []; draw(); });
  R.legend(stage, [[R.C.cyan, 'link 1'], [R.C.orange, 'link 2'], [R.C.green, 'end-effector'], [R.C.violet, 'reachable workspace']]);
  draw();
});
</script>
