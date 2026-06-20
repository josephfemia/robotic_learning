<template>
  <Lab
    ref="lab"
    id="dynamics"
    title="Beyond geometry: the torques that move a real arm"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { forwardKinematics } from '../logic/arm.js';
import { massMatrix, coriolis, gravity, DYNAMICS_CONSTANTS } from '../logic/dynamics.js';

// ---------------------------------------------------------------------------
// Note (KaTeX allowed here — rendered by lab-note via MathJax/KaTeX loader)
// ---------------------------------------------------------------------------
const note =
  'The manipulator equation \\(\\tau = M(q)\\ddot{q} + C(q,\\dot{q})\\dot{q} + g(q)\\) splits joint torque ' +
  'into three parts: <b>inertia</b> (blue) — the \\(M(q)\\) term scales with how much mass ' +
  'must be accelerated and changes with configuration; <b>Coriolis</b> (violet) — ' +
  'the \\(C\\dot{q}\\) term grows with joint speeds and couples the two joints; ' +
  '<b>gravity</b> (orange) — the \\(g(q)\\) term is largest when links are horizontal. ' +
  'A still arm only needs to fight gravity; a fast-moving arm must overcome all three — ' +
  'that is why controlling a real manipulator in motion is far harder than placing it at rest.';

// ---------------------------------------------------------------------------
// Constants (display-layer: pixel arm geometry reuses arm.js lengths scaled up)
// ---------------------------------------------------------------------------
const { L1: DL1, L2: DL2 } = DYNAMICS_CONSTANTS; // SI lengths (m)

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr   = lab.value.ctrl;
  if (!stage) return;

  // --- SVG layout ---
  // Width gives the arm its own left zone (max reach ≈ ox+202 ≈ 357px) clear of
  // the torque-bar panel (starts at BAR_X=400), so nothing overlaps the drawing.
  const W = 720, H = 420;
  const svg = R.SVG(stage, W, H);

  // Arm drawing geometry (pixel scale — independent of SI units)
  const PX_PER_M = 100; // 100 px per metre → L1=100px, L2=80px
  const pxL1 = DL1 * PX_PER_M;    // 100
  const pxL2 = DL2 * PX_PER_M;    //  80
  const ox = 155, oy = H * 0.52;  // shoulder origin

  // Bar chart layout for torque contributions
  const BAR_X = 400;    // left edge of bar panel (clear of arm's ≈357px reach)
  const BAR_W = 300;    // panel width (400–700)
  const BAR_MAX_H = 80; // max bar height (px) for normalised torques
  const TAU_SCALE = 15; // N·m per pixel (so 12 N·m → 12/15 = 0.8 * BAR_MAX_H)

  // State
  let q1 = 0.5, q2 = 0.4;       // joint angles (rad)
  let qd1 = 0.0, qd2 = 0.0;     // joint velocities (rad/s)
  const QDD_NOMINAL = [1.0, 0.5]; // fixed test acceleration for inertia display

  // Colors
  const COL_INERTIA  = R.C.cyan;
  const COL_CORIOLIS = R.C.violet;
  const COL_GRAVITY  = R.C.orange;

  // --- Draw ---
  function draw() {
    R.clr(svg);

    // ---- ARM ----
    const p = forwardKinematics(ox, oy, q1, q2);

    // Ground hatch (base indicator)
    for (let i = -3; i <= 3; i++) {
      svg.appendChild(R.E('line', {
        x1: ox + i * 10 - 5, y1: oy + 14,
        x2: ox + i * 10 + 5, y2: oy + 22,
        stroke: R.C.dim, 'stroke-width': 1.5,
      }));
    }
    svg.appendChild(R.E('line', {
      x1: ox - 35, y1: oy + 14, x2: ox + 35, y2: oy + 14,
      stroke: R.C.axis, 'stroke-width': 1.5,
    }));

    // Links
    svg.appendChild(R.E('line', {
      x1: ox, y1: oy, x2: p.x1, y2: p.y1,
      stroke: COL_GRAVITY, 'stroke-width': 7, 'stroke-linecap': 'round',
    }));
    svg.appendChild(R.E('line', {
      x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2,
      stroke: COL_INERTIA, 'stroke-width': 6, 'stroke-linecap': 'round',
    }));

    // Joints + end-effector
    svg.appendChild(R.E('circle', { cx: ox,    cy: oy,    r: 8,  fill: '#EAF0F8' }));
    svg.appendChild(R.E('circle', { cx: p.x1,  cy: p.y1,  r: 6,  fill: '#EAF0F8' }));
    svg.appendChild(R.E('circle', { cx: p.x2,  cy: p.y2,  r: 9,  fill: R.C.green, stroke: '#0F1422', 'stroke-width': 2 }));

    // Angle arcs hint for q1, q2
    drawArc(svg, ox, oy, 28, 0, q1, R.C.orange, 'q₁');
    drawArc(svg, p.x1, p.y1, 22, q1, q1 + q2, COL_INERTIA, 'q₂');

    // Labels ("end-effector" is identified by the legend swatch, so no inline
    // text label on the arm tip — avoids text overlapping the drawing/panel).
    svg.appendChild(R.TX(ox - 16, oy + 4, 'base', { anchor: 'end', fill: R.C.dim, size: 11 }));

    // Speed indicator arrows near joints (grow with velocity)
    if (Math.abs(qd1) > 0.05) drawVArrow(svg, ox, oy - 20, qd1, COL_CORIOLIS);
    if (Math.abs(qd2) > 0.05) drawVArrow(svg, p.x1, p.y1 - 16, qd2, COL_CORIOLIS);

    // ---- TORQUE BARS ----
    const M  = massMatrix([q1, q2]);
    const Cv = coriolis([q1, q2], [qd1, qd2]);
    const gv = gravity([q1, q2]);

    // Inertia contribution: M * qdd_nominal
    const iner = [
      M[0][0] * QDD_NOMINAL[0] + M[0][1] * QDD_NOMINAL[1],
      M[1][0] * QDD_NOMINAL[0] + M[1][1] * QDD_NOMINAL[1],
    ];

    // Panel header
    svg.appendChild(R.TX(BAR_X + BAR_W / 2, 28, 'Torque contributions (N·m)', {
      fill: '#EAF0F8', size: 13, weight: 600,
    }));
    svg.appendChild(R.TX(BAR_X + BAR_W / 2, 46, 'q̈ = [1, 0.5] rad/s² test acceleration', {
      fill: R.C.dim, size: 10.5,
    }));

    // Draw bars for joint 1 and joint 2
    drawJointBars(svg, BAR_X + 10,  80, 'Joint 1  τ₁', iner[0], Cv[0], gv[0]);
    drawJointBars(svg, BAR_X + 10, 230, 'Joint 2  τ₂', iner[1], Cv[1], gv[1]);

    // Total torque readout
    const tau1 = iner[0] + Cv[0] + gv[0];
    const tau2 = iner[1] + Cv[1] + gv[1];
    svg.appendChild(R.TX(BAR_X + BAR_W / 2, H - 52,
      'τ₁ = ' + tau1.toFixed(2) + ' N·m', {
        fill: '#EAF0F8', size: 12.5, weight: 600,
      }));
    svg.appendChild(R.TX(BAR_X + BAR_W / 2, H - 34,
      'τ₂ = ' + tau2.toFixed(2) + ' N·m', {
        fill: '#EAF0F8', size: 12.5, weight: 600,
      }));

    // Config readout (top-left)
    svg.appendChild(R.TX(14, 18,
      'q₁=' + (q1 * 180 / Math.PI).toFixed(0) + '°  q₂=' + (q2 * 180 / Math.PI).toFixed(0) + '°', {
        anchor: 'start', fill: '#EAF0F8', size: 12, base: 'hanging',
      }));
    svg.appendChild(R.TX(14, 34,
      'q̇₁=' + qd1.toFixed(1) + '  q̇₂=' + qd2.toFixed(1) + ' rad/s', {
        anchor: 'start', fill: R.C.dim, size: 11, base: 'hanging',
      }));
  }

  // Draw a small arc from angle a to b around cx,cy at radius r
  function drawArc(svg, cx, cy, r, a, b, col, label) {
    const steps = 20;
    const from = Math.min(a, b), to = Math.max(a, b);
    if (Math.abs(to - from) < 0.01) return;
    let d = 'M';
    for (let i = 0; i <= steps; i++) {
      const t = from + (to - from) * i / steps;
      const x = cx + r * Math.cos(t);
      const y = cy - r * Math.sin(t);
      d += (i === 0 ? '' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    }
    const path = R.E('path', { d, fill: 'none', stroke: col, 'stroke-width': 1.5, opacity: 0.6 });
    svg.appendChild(path);
    const mid = (from + to) / 2;
    const lx = cx + (r + 12) * Math.cos(mid);
    const ly = cy - (r + 12) * Math.sin(mid);
    svg.appendChild(R.TX(lx, ly, label, { fill: col, size: 10.5 }));
  }

  // Small velocity arrow (indicates joint speed direction + magnitude)
  function drawVArrow(svg, x, y, vel, col) {
    const len = Math.min(30, Math.abs(vel) * 14);
    const dir = vel > 0 ? 1 : -1;
    svg.appendChild(R.E('line', {
      x1: x, y1: y, x2: x + dir * len, y2: y,
      stroke: col, 'stroke-width': 2.5, 'stroke-linecap': 'round',
    }));
    // arrowhead
    svg.appendChild(R.E('polygon', {
      points: (x + dir * len) + ',' + y + ' ' +
              (x + dir * (len - 7)) + ',' + (y - 4) + ' ' +
              (x + dir * (len - 7)) + ',' + (y + 4),
      fill: col,
    }));
  }

  // Draw grouped horizontal bars for one joint's three torque contributions
  function drawJointBars(svg, bx, by, label, inerVal, corVal, gravVal) {
    const BH = 20;   // bar height
    const GAP = 8;   // gap between bars
    const MAX_W = 115; // maximum bar width (pixels)
    // Find max abs to normalise within this joint's panel
    const maxAbs = Math.max(Math.abs(inerVal), Math.abs(corVal), Math.abs(gravVal), 0.5);

    svg.appendChild(R.TX(bx + MAX_W, by - 10, label, {
      anchor: 'middle', fill: '#EAF0F8', size: 12, weight: 600,
    }));

    const rows = [
      { val: inerVal,  col: COL_INERTIA,  lbl: 'inertia  M·q̈' },
      { val: corVal,   col: COL_CORIOLIS, lbl: 'Coriolis C·q̇' },
      { val: gravVal,  col: COL_GRAVITY,  lbl: 'gravity  g(q)' },
    ];

    rows.forEach(function(row, i) {
      const y = by + i * (BH + GAP);
      const barW = Math.max(2, (Math.abs(row.val) / maxAbs) * MAX_W);
      const barX = bx; // bars always go right (positive direction)

      // Background track
      svg.appendChild(R.E('rect', {
        x: barX, y: y, width: MAX_W, height: BH,
        fill: 'rgba(120,140,200,0.10)', rx: 3,
      }));

      // Value bar (color-coded, anchored left)
      svg.appendChild(R.E('rect', {
        x: barX, y: y, width: barW, height: BH,
        fill: row.col, opacity: 0.82, rx: 3,
      }));

      // Label (right of track)
      svg.appendChild(R.TX(barX + MAX_W + 6, y + BH / 2 + 4, row.lbl, {
        anchor: 'start', fill: row.col, size: 10.5,
      }));

      // Value readout inside or right of bar
      svg.appendChild(R.TX(barX + Math.max(barW - 4, 30), y + BH / 2 + 4,
        row.val.toFixed(2), {
          anchor: barW > 36 ? 'end' : 'start',
          fill: barW > 36 ? '#0F1422' : row.col,
          size: 10, weight: 600,
        }));
    });
  }

  // --- Controls ---
  R.slider(ctr, {
    label: 'joint 1 angle  q₁',
    min: -160, max: 160, step: 1,
    value: q1 * 180 / Math.PI,
    fmt: function(v) { return v.toFixed(0) + '°'; },
    on: function(v) { q1 = v * Math.PI / 180; draw(); },
  });

  R.slider(ctr, {
    label: 'joint 2 angle  q₂',
    min: -140, max: 140, step: 1,
    value: q2 * 180 / Math.PI,
    fmt: function(v) { return v.toFixed(0) + '°'; },
    on: function(v) { q2 = v * Math.PI / 180; draw(); },
  });

  R.slider(ctr, {
    label: 'joint 1 speed  q̇₁  (rad/s)',
    min: -4, max: 4, step: 0.1,
    value: qd1,
    fmt: function(v) { return v.toFixed(1); },
    on: function(v) { qd1 = v; draw(); },
  });

  R.slider(ctr, {
    label: 'joint 2 speed  q̇₂  (rad/s)',
    min: -4, max: 4, step: 0.1,
    value: qd2,
    fmt: function(v) { return v.toFixed(1); },
    on: function(v) { qd2 = v; draw(); },
  });

  R.legend(stage, [
    [COL_INERTIA,  'inertia M·q̈'],
    [COL_CORIOLIS, 'Coriolis C·q̇'],
    [COL_GRAVITY,  'gravity g(q)'],
    [R.C.green,    'end-effector'],
  ]);

  draw();
});
</script>
