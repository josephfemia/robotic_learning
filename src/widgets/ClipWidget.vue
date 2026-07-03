<template>
  <Lab
    ref="lab"
    id="clip"
    title="The PPO clip is a one-sided trust region"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { clippedObjective, unclippedObjective } from '../logic/ppoClip.js';

const note =
  'On the &quot;tempting&quot; side — raising the probability of a good action (\\(A&gt;0\\)), or lowering it for a bad one (\\(A&lt;0\\)) — the objective goes <em>flat</em> past the clip band \\([1-\\epsilon,\\,1+\\epsilon]\\). Flat means zero gradient means no incentive to move further: the policy may improve, but it cannot run away from the data that justified the update. Crucially it stays sloped on the other side, so a too-large step can still be pulled <em>back</em>.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the clip IIFE (reference lines 2597–2620).
  // Numeric core (clipped/unclipped surrogate objectives) comes from
  // logic/ppoClip.js (vitest-pinned), identical to the original's inline math.
  var W = 700, H = 340, padL = 54, padR = 26, padT = 26, padB = 50, eps = 0.2, As = 1, Adisp = 1, r0 = 0, r1 = 2.2;
  var svg = R.SVG(stage, W, H);

  function draw() {
    R.clr(svg);
    // Curves follow the (possibly mid-tween) Adisp; axis range + labels follow the
    // target sign As so the frame stays stable while the line eases across.
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT, A = Adisp, AT = As;
    var ymin = AT > 0 ? -0.6 : (r1 * AT - 0.3), ymax = AT > 0 ? (r1 * AT + 0.3) : 0.6;
    function X(r) { return x0 + ((r - r0) / (r1 - r0)) * (x1 - x0); }
    function Y(v) { return y0 - ((v - ymin) / (ymax - ymin)) * (y0 - y1); }
    svg.appendChild(R.E('rect', { x: X(1 - eps), y: y1, width: X(1 + eps) - X(1 - eps), height: y0 - y1, fill: 'rgba(54,197,208,0.10)' }));
    svg.appendChild(R.E('line', { x1: x0, y1: Y(0), x2: x1, y2: Y(0), stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.E('line', { x1: X(1), y1: y1, x2: X(1), y2: y0, stroke: R.C.dim, 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    svg.appendChild(R.TX(X(1), y0 + 16, 'r=1', { fill: R.C.dim, size: 11 }));
    // Band-edge labels: centred on the clip edges when there is room, but at
    // small ε the centres sit only ~282·ε px from 'r=1' (a 4-char 10.5px label
    // half-width ≈ 13px + half of 'r=1' ≈ 10px needs ≈ 26px), so below that
    // threshold anchor them *outward* from the edges to keep all three legible.
    var sep = X(1 + eps) - X(1);
    if (sep >= 26) {
      svg.appendChild(R.TX(X(1 - eps), y0 + 16, (1 - eps).toFixed(2), { fill: R.C.cyan, size: 10.5 }));
      svg.appendChild(R.TX(X(1 + eps), y0 + 16, (1 + eps).toFixed(2), { fill: R.C.cyan, size: 10.5 }));
    } else {
      svg.appendChild(R.TX(X(1 - eps) - 3, y0 + 16, (1 - eps).toFixed(2), { anchor: 'end', fill: R.C.cyan, size: 10.5 }));
      svg.appendChild(R.TX(X(1 + eps) + 3, y0 + 16, (1 + eps).toFixed(2), { anchor: 'start', fill: R.C.cyan, size: 10.5 }));
    }
    var pu = '', pc = '';
    for (var i = 0; i <= 120; i++) {
      var r = r0 + (r1 - r0) * i / 120, L = clippedObjective(r, A, eps);
      pu += (i ? ' ' : '') + X(r).toFixed(1) + ',' + Y(unclippedObjective(r, A)).toFixed(1);
      pc += (i ? ' ' : '') + X(r).toFixed(1) + ',' + Y(L).toFixed(1);
    }
    svg.appendChild(R.E('polyline', { points: pu, fill: 'none', stroke: R.C.orange, 'stroke-width': 1.6, 'stroke-dasharray': '5 4', opacity: 0.8 }));
    svg.appendChild(R.E('polyline', { points: pc, fill: 'none', stroke: R.C.cyan, 'stroke-width': 3 }));
    svg.appendChild(R.TX(x0, y1 - 2, 'objective Lᶜˡⁱᵖ   (advantage A ' + (AT > 0 ? '> 0, a good action' : '< 0, a bad action') + ')', { anchor: 'start', fill: R.C.ink, size: 12 }));
    svg.appendChild(R.TX((x0 + x1) / 2, H - 10, 'probability ratio  r = π_new / π_old  →', { fill: R.C.dim, size: 11.5 }));
  }

  R.slider(ctr, { label: 'clip  ε', min: 0.05, max: 0.4, step: 0.01, value: eps, fmt: function (v) { return v.toFixed(2); }, on: function (v) { eps = v; draw(); } });
  // Discrete sign flip → ease the curve across zero (axis range snaps to the target sign).
  function setA(target) {
    if (As === target) return;
    var from = Adisp; As = target;
    bPos.className = 'lab-btn' + (target === 1 ? ' primary' : '');
    bNeg.className = 'lab-btn' + (target === -1 ? ' primary' : '');
    tween(450, {
      onStep(e) { Adisp = from + (target - from) * e; draw(); },
      onDone() { Adisp = target; draw(); },
    });
  }
  var bPos = R.btn(ctr, 'Advantage A > 0', 'primary', function () { setA(1); });
  var bNeg = R.btn(ctr, 'Advantage A < 0', null, function () { setA(-1); });
  R.legend(stage, [[R.C.orange, 'unclipped r·A'], [R.C.cyan, 'PPO clipped objective']]);
  draw();
});
</script>
