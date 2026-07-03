<template>
  <Lab
    ref="lab"
    id="bellman-derive"
    title="Build the Bellman equation: value from successors"
    :note="note"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { bellmanBackup, bellmanSweep } from '../logic/bellman.js';
import { tween, easings, focusPulse, prefersReducedMotion } from '../composables/useAnimate.js';

// ---------------------------------------------------------------------------
// Widget note (shown below the interactive, KaTeX rendered by section)
// ---------------------------------------------------------------------------
const note =
  'Where does a state\'s value come from? <strong>Click any state</strong> to apply one backup: ' +
  'it reaches into its successors\' current values, weighs them by \\(\\gamma\\), and pulls that ' +
  'estimate back. After enough backups the recursion \\(V(s) = r(s) + \\gamma \\sum_{s\'} P(s\'|s)\\, V(s\')\\) ' +
  'is satisfied everywhere — that\'s the Bellman equation. ' +
  '<strong>Step</strong> backs up all states simultaneously; ' +
  '<strong>Run</strong> animates until convergence. ' +
  '<span class="notice">MDP: 4-state chain — S0→S1→S2→S3 (absorbing), ' +
  'reward only at S3 (\\(r=1\\)), all else 0. ' +
  'Analytic fixed point: \\(V^\\star = (I-\\gamma P)^{-1}r\\). ' +
  'Takeaway: value is defined recursively by successors, not by direct forecasting — ' +
  'the Bellman equation IS that recursion.</span>';

// ---------------------------------------------------------------------------
// MDP definition — 4-state linear chain
//   S0 → S1 → S2 → S3(absorbing)
//   r = [0, 0, 0, 1], gamma tunable
//   P[s][s'] = transition probability (deterministic chain, S3 self-loops)
// ---------------------------------------------------------------------------
const NUM_STATES = 4;
const STATE_LABELS = ['S0', 'S1', 'S2', 'S3'];
const STATE_REWARDS = [0, 0, 0, 1];

// Transition matrix: deterministic 0→1→2→3→3
const P = [
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [0, 0, 0, 1], // S3 self-loops (absorbing)
];

// ---------------------------------------------------------------------------
// Refs
// ---------------------------------------------------------------------------
const lab = ref(null);
let timer = null;

onUnmounted(() => {
  if (timer) { clearInterval(timer); timer = null; }
});

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // ---- Layout constants -----------------------------------------------
  const W = 700, H = 380;
  const EQ_Y = 52;          // equation bar centre
  const NODE_Y = 190;       // state circle centre row
  const NODE_R = 40;        // circle radius
  const NODE_SPACING = 148; // horizontal spacing between centres
  const NODE_X0 = 80;       // leftmost circle centre x
  const ARROW_Y_OFF = 8;    // arrows slightly below centre
  const BAR_Y0 = 280;       // value bar top (full bar area)
  const BAR_H = 60;         // max bar height
  const BAR_W = 54;

  let gamma = 0.9;

  // Value vector (mutable display state)
  let V = new Array(NUM_STATES).fill(0);
  V[3] = STATE_REWARDS[3]; // absorbing terminal pinned to reward

  // Which state is currently highlighted for a backup animation
  let activeState = -1;
  let sweepCount = 0;
  let lastMaxDelta = 0;

  const svg = R.SVG(stage, W, H);

  // ---- DOM overlay elements for equation highlighting ------------------
  // We'll draw the equation as SVG text segments so we can highlight terms.

  // ---- Node x-positions ------------------------------------------------
  function nodeX(s) { return NODE_X0 + s * NODE_SPACING; }

  // ---- Color helpers ---------------------------------------------------
  function nodeColor(v) {
    if (v > 0.01) return 'rgba(47,203,126,' + Math.min(1, v * 0.9) * 0.9 + ')';
    if (v < -0.01) return 'rgba(255,107,107,' + Math.min(1, -v * 0.9) * 0.9 + ')';
    return 'rgba(120,140,200,0.18)';
  }
  function nodeStroke(s) {
    return s === activeState ? R.C.cyan : 'rgba(200,210,230,0.35)';
  }
  function nodeStrokeW(s) { return s === activeState ? 2.5 : 1.2; }

  // ---- Draw equation bar -----------------------------------------------
  // Shows V(s*) = r(s*) + γ Σ P·V(s') with active terms highlighted.
  // When activeState < 0 shows the generic equation.
  function drawEquation(animT) {
    // animT ∈ [0,1]: 0 = generic, 1 = fully highlighted active state
    const s = activeState;
    const dim = R.C.dim;
    const ink = R.C.ink;
    const hi = R.C.cyan;
    const orange = R.C.orange;
    const green = R.C.green;

    if (s < 0) {
      // Generic equation
      svg.appendChild(R.TX(W / 2, EQ_Y,
        'V(s) = r(s) + γ × Σₛ’ P(s’|s) · V(s’)',
        { fill: dim, size: 15, weight: 500 }));
      return;
    }

    // Concrete backup for state s
    const lhsLabel = 'V(' + STATE_LABELS[s] + ')';
    const rLabel = (STATE_REWARDS[s] === 0 ? '0' : STATE_REWARDS[s].toFixed(1));
    const successorTerms = P[s]
      .map((p, sp) => p > 0 ? p.toFixed(0) + '×V(' + STATE_LABELS[sp] + ')' : null)
      .filter(Boolean);
    const sumStr = successorTerms.join(' + ');

    // Layout: left-to-right segments, centred on W/2
    const parts = [
      { text: lhsLabel + ' = ', fill: animT > 0.5 ? orange : ink, weight: 600 },
      { text: rLabel + ' + ', fill: ink, weight: 400 },
      { text: 'γ × (', fill: dim, weight: 400 },
      { text: sumStr, fill: animT > 0.5 ? green : ink, weight: 600 },
      { text: ')', fill: dim, weight: 400 },
    ];

    // Measure approximate char widths and centre
    const totalChars = parts.reduce((acc, p) => acc + p.text.length, 0);
    const charW = 9; // approx px per char at size 13
    let curX = W / 2 - (totalChars * charW) / 2;
    for (const part of parts) {
      const segW = part.text.length * charW;
      svg.appendChild(R.TX(curX + segW / 2, EQ_Y, part.text,
        { fill: part.fill, size: 13.5, weight: part.weight }));
      curX += segW;
    }
  }

  // ---- Draw arrows between states (transition graph) -------------------
  function drawArrows() {
    // Only draw transitions with P[s][s'] > 0 (skip self-loop at S3 for clarity)
    for (let s = 0; s < NUM_STATES; s++) {
      for (let sp = 0; sp < NUM_STATES; sp++) {
        if (P[s][sp] <= 0) continue;
        if (s === sp) continue; // skip self-loops in display
        const x1 = nodeX(s) + NODE_R, y1 = NODE_Y + ARROW_Y_OFF;
        const x2 = nodeX(sp) - NODE_R, y2 = NODE_Y + ARROW_Y_OFF;
        const isActive = activeState === s;
        const col = isActive ? R.C.cyan : 'rgba(140,160,200,0.5)';
        const sw = isActive ? 2.5 : 1.5;
        // Arrow shaft
        svg.appendChild(R.E('line', {
          x1, y1, x2, y2,
          stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round',
        }));
        // Arrowhead
        const ah = 7, ang = Math.atan2(y2 - y1, x2 - x1);
        svg.appendChild(R.E('line', {
          x1: x2, y1: y2,
          x2: x2 + ah * Math.cos(ang + 2.5), y2: y2 + ah * Math.sin(ang + 2.5),
          stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round',
        }));
        svg.appendChild(R.E('line', {
          x1: x2, y1: y2,
          x2: x2 + ah * Math.cos(ang - 2.5), y2: y2 + ah * Math.sin(ang - 2.5),
          stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round',
        }));
      }
    }
  }

  // ---- Draw self-loop indicator at S3 ----------------------------------
  function drawSelfLoop() {
    const cx = nodeX(3), cy = NODE_Y;
    // Small arc above node
    const rx = 22, ry = 18;
    const path = `M ${cx - 10} ${cy - NODE_R + 4} A ${rx} ${ry} 0 1 1 ${cx + 10} ${cy - NODE_R + 4}`;
    const arc = R.E('path', {
      d: path,
      fill: 'none',
      stroke: 'rgba(140,160,200,0.45)',
      'stroke-width': 1.5,
      'stroke-dasharray': '4 3',
    });
    svg.appendChild(arc);
    svg.appendChild(R.TX(cx, cy - NODE_R - 24, 'absorbing', { fill: R.C.dim, size: 10 }));
  }

  // ---- Draw value bar under each state ----------------------------------
  function drawBars(displayV) {
    for (let s = 0; s < NUM_STATES; s++) {
      const cx = nodeX(s);
      const bx = cx - BAR_W / 2;
      const maxV = Math.max(1, ...displayV.map(Math.abs));
      const frac = Math.max(0, displayV[s] / maxV);
      const bh = frac * BAR_H;

      // Background track
      svg.appendChild(R.E('rect', {
        x: bx, y: BAR_Y0, width: BAR_W, height: BAR_H,
        rx: 4, fill: 'rgba(80,100,140,0.18)',
      }));
      // Value fill
      if (bh > 1) {
        const col = displayV[s] > 0.01 ? R.C.green : R.C.red;
        svg.appendChild(R.E('rect', {
          x: bx, y: BAR_Y0 + BAR_H - bh, width: BAR_W, height: bh,
          rx: 4, fill: col, opacity: 0.75,
        }));
      }
      // Value label
      svg.appendChild(R.TX(cx, BAR_Y0 + BAR_H + 14,
        (displayV[s] >= 0 ? '+' : '') + displayV[s].toFixed(3),
        { fill: R.C.ink, size: 11, weight: 600 }));
    }
  }

  // ---- Draw state circles ----------------------------------------------
  function drawNodes(displayV) {
    for (let s = 0; s < NUM_STATES; s++) {
      const cx = nodeX(s), cy = NODE_Y;

      // Circle fill
      svg.appendChild(R.E('circle', {
        cx, cy, r: NODE_R,
        fill: nodeColor(displayV[s]),
        stroke: nodeStroke(s),
        'stroke-width': nodeStrokeW(s),
      }));

      // State label
      svg.appendChild(R.TX(cx, cy - 7, STATE_LABELS[s],
        { fill: '#EAF0F8', size: 14, weight: 700 }));

      // Reward label
      svg.appendChild(R.TX(cx, cy + 13,
        'r=' + (STATE_REWARDS[s] === 0 ? '0' : '+' + STATE_REWARDS[s].toFixed(0)),
        { fill: R.C.dim, size: 10.5 }));

      // Click target — invisible wide rect aligned to node
      const hit = R.E('rect', {
        x: cx - NODE_R - 6, y: cy - NODE_R - 6,
        width: (NODE_R + 6) * 2, height: (NODE_R + 6) * 2,
        fill: 'transparent', cursor: 'pointer',
      });
      hit.dataset.state = s;
      hit.addEventListener('click', () => onStateClick(s));
      svg.appendChild(hit);
    }
  }

  // ---- Status text -----------------------------------------------------
  function drawStatus() {
    svg.appendChild(R.TX(12, H - 6,
      'sweeps ' + sweepCount + '   ·   max Δ = ' + lastMaxDelta.toFixed(5),
      { anchor: 'start', fill: R.C.dim, size: 11 }));
    svg.appendChild(R.TX(W - 12, H - 6,
      'γ = ' + gamma.toFixed(2),
      { anchor: 'end', fill: R.C.dim, size: 11 }));
  }

  // ---- Main draw -------------------------------------------------------
  function draw(displayV, animT) {
    displayV = displayV || V;
    animT = animT == null ? (activeState >= 0 ? 1 : 0) : animT;
    R.clr(svg);
    drawEquation(animT);
    drawArrows();
    drawSelfLoop();
    drawBars(displayV);
    drawNodes(displayV);
    drawStatus();
  }

  // ---- State click: animate a single backup ----------------------------
  function onStateClick(s) {
    if (animRunning) return;
    const oldV = V[s];
    const newVal = bellmanBackup(V, P, STATE_REWARDS, gamma, s);
    activeState = s;

    if (prefersReducedMotion()) {
      V[s] = newVal;
      lastMaxDelta = Math.abs(newVal - oldV);
      sweepCount++;
      draw();
      return;
    }

    animRunning = true;
    tween(600, {
      ease: easings.cubicInOut,
      onStep(e) {
        const displayV = V.slice();
        displayV[s] = oldV + (newVal - oldV) * e;
        draw(displayV, e);
      },
      onDone() {
        V[s] = newVal;
        lastMaxDelta = Math.abs(newVal - oldV);
        sweepCount++;
        animRunning = false;
        draw();
        // Pulse the circle — we find it by re-querying after draw
        // (SVG is redrawn; pulse the stage element as proxy)
        focusPulse(stage, { dur: 400, color: R.C.cyan });
      },
    });
  }

  // ---- Step: one full synchronous sweep --------------------------------
  let animRunning = false;

  function doStep() {
    if (animRunning) return;
    const oldV = V.slice();
    const { V: nV, maxDelta } = bellmanSweep(V, P, STATE_REWARDS, gamma);
    activeState = -1;
    sweepCount++;
    lastMaxDelta = maxDelta;

    if (prefersReducedMotion()) {
      V = nV;
      draw();
      return;
    }

    animRunning = true;
    tween(500, {
      ease: easings.quadInOut,
      onStep(e) {
        const displayV = oldV.map((v, s) => v + (nV[s] - v) * e);
        draw(displayV, e);
      },
      onDone() {
        V = nV;
        animRunning = false;
        draw();
      },
    });

    return maxDelta;
  }

  // ---- Run to convergence ---------------------------------------------
  let runBtn;
  function stopRun() {
    if (timer) { clearInterval(timer); timer = null; }
    if (runBtn) runBtn.textContent = 'Run ▶';
  }

  // ---- Reset -----------------------------------------------------------
  function reset() {
    stopRun();
    V = new Array(NUM_STATES).fill(0);
    V[3] = STATE_REWARDS[3]; // S3 absorbing — keep pinned
    activeState = -1;
    sweepCount = 0;
    lastMaxDelta = 0;
    animRunning = false;
  }

  // ---- Build controls --------------------------------------------------
  R.btn(ctr, 'Step ▸', 'primary', function () {
    stopRun();
    activeState = -1;
    doStep();
  });

  runBtn = R.btn(ctr, 'Run ▶', null, function () {
    if (timer) { stopRun(); return; }
    runBtn.textContent = 'Pause ⏸';
    activeState = -1;
    timer = setInterval(function () {
      if (animRunning) return;
      const oldV = V.slice();
      const { V: nV, maxDelta } = bellmanSweep(V, P, STATE_REWARDS, gamma);
      V = nV;
      sweepCount++;
      lastMaxDelta = maxDelta;
      draw();
      if (maxDelta < 1e-5) stopRun();
    }, 280);
  });

  R.btn(ctr, 'Reset', null, function () {
    reset();
    draw();
  });

  R.slider(ctr, {
    label: 'discount  γ',
    min: 0.1,
    max: 0.99,
    step: 0.01,
    value: gamma,
    fmt: function (v) { return v.toFixed(2); },
    on: function (v) {
      gamma = v;
      stopRun();
      reset();
      draw();
    },
  });

  R.legend(stage, [
    [R.C.green, 'positive value'],
    [R.C.cyan, 'active state (click to back up)'],
    [R.C.dim, 'zero / unknown'],
  ]);

  // Instruction overlay (appears once at top of stage)
  const hint = R.ce('div');
  hint.style.cssText = 'text-align:center;font-size:12px;color:' + R.C.dim + ';margin-bottom:4px;padding:2px 0;';
  hint.textContent = 'Click a state circle to apply one Bellman backup and watch its value update from its successors.';
  stage.insertBefore(hint, stage.firstChild);

  reset();
  draw();
});
</script>
