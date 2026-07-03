<template>
  <Lab
    ref="lab"
    id="causal"
    title="The brake-light trap: the policy learns the wrong arrow"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import {
  CUES,
  learnedCue,
  deployTimeline,
  trainingAccuracy,
  deploymentSuccess,
} from '../logic/causalConfusion.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'The network <em>mistook an effect of the expert’s action for a cause</em>: the brake-light only ever glows because the expert is already braking, so in logged data it is the strongest correlate — and cloning fits correlations in \\(p(a\\mid o)\\) with no notion of intervention. Deployed, nobody lights the lamp, so the policy waits forever. The fix isn’t more data — it’s removing the leaked channel (or breaking the correlation with targeted interventions).';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  const W = 700, H = 364;
  const svg = R.SVG(stage, W, H);

  // --- geometry -------------------------------------------------------------
  // Causal-graph nodes (centers). Node boxes are NODE_W wide, y ∈ [NODE_TOP, NODE_BOT].
  const NX = { pedestrian: 115, expert: 350, brakeLight: 585 };
  const NODE_W = 140, NODE_TOP = 56, NODE_H = 44, NODE_BOT = NODE_TOP + NODE_H;
  const NODE_MID = NODE_TOP + NODE_H / 2;
  // Policy box below the graph.
  const POL = { cx: 350, top: 144, w: 180, h: 40 };
  // Deploy strip rows.
  const ROW = { title: 214, light: 244, ped: 274, act: 306, step: 326, cap: 350 };
  const CELL_X0 = 165, CELL_W = 63; // 8 cells span x ∈ [165, 669]

  // --- display state (eased between logic-core states) -----------------------
  let incl = true; // observation includes the brake-light
  const disp = {
    arrowP: 1,   // learned-arrow endpoint: 1 → brake-light node, 0 → pedestrian node
    light: 1,    // brake-light node visibility: 1 shown, 0 hidden (opacity eased)
    reveal: 1,   // fraction of deploy-strip columns replayed
    train: trainingAccuracy(true),
    deploy: deploymentSuccess(true),
  };
  let seq = 0; // cancels in-flight animations when the user re-toggles

  // --- drawing helpers --------------------------------------------------------
  function arrow(x1, y1, x2, y2, color, width) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const bx = x2 - ux * 9, by = y2 - uy * 9; // base of the head
    svg.appendChild(R.E('line', { x1, y1, x2: bx, y2: by, stroke: color, 'stroke-width': width }));
    const px = -uy, py = ux;
    svg.appendChild(R.E('polygon', {
      points: x2 + ',' + y2 + ' ' + (bx + px * 4.5) + ',' + (by + py * 4.5) + ' ' + (bx - px * 4.5) + ',' + (by - py * 4.5),
      fill: color,
    }));
  }

  function nodeBox(cx, line1, line2, opts) {
    const g = R.E('g', opts.opacity != null ? { opacity: opts.opacity } : null);
    g.appendChild(R.E('rect', {
      x: cx - NODE_W / 2, y: NODE_TOP, width: NODE_W, height: NODE_H, rx: 7,
      fill: 'rgba(120,140,200,0.10)',
      stroke: opts.hot ? R.C.orange : R.C.axis,
      'stroke-width': opts.hot ? 2 : 1.2,
    }));
    g.appendChild(R.TX(cx, NODE_TOP + 18, line1, { fill: R.C.ink, size: 11.5, weight: 600 }));
    if (line2) g.appendChild(R.TX(cx, NODE_TOP + 34, line2, { fill: opts.hot ? R.C.orange : R.C.dim, size: 9 }));
    svg.appendChild(g);
  }

  // --- scene ------------------------------------------------------------------
  function draw() {
    R.clr(svg);
    const cue = learnedCue(incl);
    const steps = deployTimeline(incl);
    const shown = Math.round(disp.reveal * steps.length);

    // Header band
    svg.appendChild(R.TX(W / 2, 24,
      incl ? 'Observation INCLUDES the car’s own brake-light' : 'Observation EXCLUDES the brake-light',
      { fill: incl ? R.C.red : R.C.green, size: 13, weight: 700 }));

    // True causal chain: pedestrian → expert brakes → brake-light
    arrow(NX.pedestrian + NODE_W / 2, NODE_MID, NX.expert - NODE_W / 2, NODE_MID, R.C.axis, 1.6);
    arrow(NX.expert + NODE_W / 2, NODE_MID, NX.brakeLight - NODE_W / 2, NODE_MID, R.C.axis, 1.6);
    svg.appendChild(R.TX((NX.pedestrian + NX.expert) / 2, NODE_MID - 10, 'cause', { fill: R.C.dim, size: 9.5 }));
    svg.appendChild(R.TX((NX.expert + NX.brakeLight) / 2, NODE_MID - 10, 'effect', { fill: R.C.dim, size: 9.5 }));

    nodeBox(NX.pedestrian, 'pedestrian ahead',
      'corr with action: ' + CUES.pedestrian.corr.toFixed(2),
      { hot: cue === 'pedestrian' });
    nodeBox(NX.expert, 'expert brakes', 'the action a*', { hot: false });
    nodeBox(NX.brakeLight, 'brake-light on',
      incl ? 'corr with action: ' + CUES.brakeLight.corr.toFixed(2) : 'hidden from π',
      { hot: cue === 'brakeLight', opacity: 0.35 + 0.65 * disp.light });

    // Cloned policy + its learned arrow (attaches to the argmax correlate)
    svg.appendChild(R.E('rect', {
      x: POL.cx - POL.w / 2, y: POL.top, width: POL.w, height: POL.h, rx: 7,
      fill: 'rgba(232,89,12,0.10)', stroke: R.C.orange, 'stroke-width': 1.5,
    }));
    svg.appendChild(R.TX(POL.cx, POL.top + 16, 'cloned policy π', { fill: R.C.ink, size: 11.5, weight: 600 }));
    svg.appendChild(R.TX(POL.cx, POL.top + 31,
      'reads: ' + (disp.arrowP > 0.5 ? 'the brake-light' : 'the pedestrian'),
      { fill: R.C.orange, size: 9.5 }));
    const ex = R.lerp(NX.pedestrian, NX.brakeLight, disp.arrowP);
    arrow(POL.cx, POL.top - 2, ex, NODE_BOT + 4, R.C.orange, 2.2);

    // Deploy strip: closed loop, no expert in the loop
    svg.appendChild(R.TX(40, ROW.title, 'Deploy: the expert is gone', { anchor: 'start', fill: R.C.ink, size: 11.5, weight: 600 }));
    svg.appendChild(R.TX(530, ROW.title, 'train accuracy ' + (disp.train * 100).toFixed(0) + '%', { anchor: 'end', fill: R.C.dim, size: 10.5 }));
    svg.appendChild(R.TX(665, ROW.title, 'deploy ' + (disp.deploy * 100).toFixed(0) + '%', { anchor: 'end', fill: disp.deploy > 0.5 ? R.C.green : R.C.red, size: 10.5, weight: 700 }));

    svg.appendChild(R.TX(40, ROW.light + 4, 'brake-light', { anchor: 'start', fill: R.C.dim, size: 10.5 }));
    svg.appendChild(R.TX(40, ROW.ped + 4, 'pedestrian', { anchor: 'start', fill: R.C.dim, size: 10.5 }));
    svg.appendChild(R.TX(40, ROW.act, 'policy π', { anchor: 'start', fill: R.C.dim, size: 10.5 }));

    for (let j = 0; j < steps.length; j++) {
      const cx = CELL_X0 + j * CELL_W + CELL_W / 2;
      svg.appendChild(R.TX(cx, ROW.step, 't' + (j + 1), { fill: R.C.dim, size: 9 }));
      if (j >= shown) {
        svg.appendChild(R.TX(cx, ROW.act, '·', { fill: 'rgba(138,147,163,0.35)', size: 10 }));
        continue;
      }
      const st = steps[j];
      // Lamp: never on in deploy — the mechanism, watched
      svg.appendChild(R.E('circle', {
        cx, cy: ROW.light, r: 6, fill: st.lightOn ? R.C.red : 'none',
        stroke: st.lightOn ? R.C.red : R.C.dim, 'stroke-width': 1.4,
        opacity: st.lightOn ? 1 : 0.55,
      }));
      // Pedestrian appearances
      if (st.pedestrian) {
        svg.appendChild(R.E('circle', { cx, cy: ROW.ped, r: 5, fill: R.C.cyan, opacity: 0.95 }));
      } else {
        svg.appendChild(R.E('circle', { cx, cy: ROW.ped, r: 1.5, fill: 'rgba(138,147,163,0.4)' }));
      }
      // Policy's move / outcome
      if (st.outcome === 'crash') {
        svg.appendChild(R.TX(cx, ROW.act, 'CRASH ✗', { fill: R.C.red, size: 10, weight: 700 }));
      } else if (st.brakes) {
        svg.appendChild(R.TX(cx, ROW.act, 'brakes ✓', { fill: R.C.green, size: 10, weight: 700 }));
      } else {
        svg.appendChild(R.TX(cx, ROW.act, '—', { fill: R.C.dim, size: 10 }));
      }
    }

    svg.appendChild(R.TX(W / 2, ROW.cap,
      incl
        ? 'Nobody is braking, so nothing lights the lamp — π waits for a signal that never comes'
        : 'Forced to read the real cause, π brakes the moment the pedestrian appears',
      { fill: incl ? R.C.red : R.C.green, size: 11 }));
  }

  // --- toggle: arrow re-attaches, then the deploy strip replays ----------------
  function show(v) {
    if (v === incl) return;
    incl = v;
    seq++;
    const my = seq;
    const fromP = disp.arrowP, toP = v ? 1 : 0;
    const fromL = disp.light, toL = v ? 1 : 0;
    const fromTr = disp.train, toTr = trainingAccuracy(v);
    const fromDe = disp.deploy, toDe = deploymentSuccess(v);
    disp.reveal = 0;
    // 1) the learned arrow sweeps to its new cue (training re-fits)
    tween(480, {
      onStep(e) {
        if (seq !== my) return;
        disp.arrowP = fromP + (toP - fromP) * e;
        disp.light = fromL + (toL - fromL) * e;
        draw();
      },
      onDone() {
        if (seq !== my) return;
        // 2) the deploy strip replays left-to-right; readouts lerp alongside
        tween(750, {
          onStep(e) {
            if (seq !== my) return;
            disp.reveal = e;
            disp.train = fromTr + (toTr - fromTr) * e;
            disp.deploy = fromDe + (toDe - fromDe) * e;
            draw();
          },
          onDone() {
            if (seq !== my) return;
            disp.reveal = 1; disp.train = toTr; disp.deploy = toDe;
            draw();
          },
        });
      },
    });
  }

  R.btn(ctr, 'Hide the brake-light from the observation', null, function () { show(false); });
  R.btn(ctr, 'Show the brake-light (raw dashcam)', 'primary', function () { show(true); });
  R.legend(stage, [
    [R.C.orange, 'learned cue — what π reads'],
    [R.C.cyan, 'pedestrian appears'],
    [R.C.green, 'brakes in time'],
    [R.C.red, 'crash'],
  ]);
  draw();
});
</script>
