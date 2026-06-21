<template>
  <Lab
    ref="lab"
    id="pgtransform"
    title="From objective to estimator: deriving REINFORCE"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween, easings, prefersReducedMotion } from '../composables/useAnimate.js';

const note =
  'Each step is a mathematically exact rewrite — no approximation until we <em>sample</em>. ' +
  'The log-derivative trick (step 4) is the key algebraic insight: ' +
  '\\(\\nabla_\\theta \\pi_\\theta = \\pi_\\theta \\nabla_\\theta \\log \\pi_\\theta\\), ' +
  'which turns an intractable gradient-of-expectation into a tractable expectation-of-gradient. ' +
  'The final form \\(\\mathbb{E}_\\tau[\\sum_t \\nabla_\\theta \\log \\pi_\\theta(a_t|s_t) \\cdot R(\\tau)]\\) ' +
  'is exactly what REINFORCE computes from sampled trajectories.';

const lab = ref(null);

// ─── equation steps ─────────────────────────────────────────────────────────
// Each step: { lines: string[], highlight: index of changed term, caption }
// Unicode math glyphs only — no LaTeX/KaTeX inside the SVG.
const STEPS = [
  {
    lines: [
      '∇θ J(θ)  =  ∇θ 𝔼τ[R(τ)]',
    ],
    highlight: 0,
    caption: 'Start: the policy-gradient objective — maximise expected return.',
  },
  {
    lines: [
      '∇θ J(θ)  =  ∇θ 𝔼τ[R(τ)]',
      '         =  ∇θ ∫ πθ(τ) R(τ) dτ',
    ],
    highlight: 1,
    caption: 'Expand the expectation as an integral over trajectories τ.',
  },
  {
    lines: [
      '∇θ J(θ)  =  ∇θ 𝔼τ[R(τ)]',
      '         =  ∇θ ∫ πθ(τ) R(τ) dτ',
      '         =  ∫ ∇θ πθ(τ) R(τ) dτ',
    ],
    highlight: 2,
    caption: 'Swap ∇ and ∫ (Leibniz rule — valid when πθ is smooth).',
  },
  {
    lines: [
      '∇θ J(θ)  =  ∇θ 𝔼τ[R(τ)]',
      '         =  ∇θ ∫ πθ(τ) R(τ) dτ',
      '         =  ∫ ∇θ πθ(τ) R(τ) dτ',
      '         =  ∫ πθ(τ) ∇θ log πθ(τ) R(τ) dτ',
    ],
    highlight: 3,
    caption: 'Log-derivative trick: ∇θπθ = πθ · ∇θ logπθ. Multiply & divide by πθ.',
  },
  {
    lines: [
      '∇θ J(θ)  =  ∇θ 𝔼τ[R(τ)]',
      '         =  ∇θ ∫ πθ(τ) R(τ) dτ',
      '         =  ∫ ∇θ πθ(τ) R(τ) dτ',
      '         =  ∫ πθ(τ) ∇θ log πθ(τ) R(τ) dτ',
      '         =  𝔼τ[ ∇θ log πθ(τ) · R(τ) ]',
    ],
    highlight: 4,
    caption: 'Rewrite as an expectation — the integral weighted by πθ(τ) is exactly 𝔼τ[·].',
  },
  {
    lines: [
      '∇θ J(θ)  =  ∇θ 𝔼τ[R(τ)]',
      '         =  ∇θ ∫ πθ(τ) R(τ) dτ',
      '         =  ∫ ∇θ πθ(τ) R(τ) dτ',
      '         =  ∫ πθ(τ) ∇θ log πθ(τ) R(τ) dτ',
      '         =  𝔼τ[ ∇θ log πθ(τ) · R(τ) ]',
      '         =  𝔼τ[ Σt ∇θ log πθ(at|st) · R(τ) ]',
    ],
    highlight: 5,
    caption: 'Factor trajectory likelihood into per-step terms — the REINFORCE estimator.',
  },
];

// Caption labels for highlighted/changed element
const STEP_LABELS = [
  'objective',
  'expand expectation',
  'swap ∇ and ∫',
  'log-derivative trick',
  'expectation form',
  'REINFORCE estimator',
];

onMounted(() => {
  const stage = lab.value.stage;
  const ctr   = lab.value.ctrl;
  if (!stage) return;

  // ─── Layout constants ────────────────────────────────────────────────────
  const W = 700, H = 340;
  const LINE_H   = 44;          // vertical spacing per equation line
  const FONT_SZ  = 18;          // equation font size
  const CAP_SZ   = 12.5;        // caption font size
  const EQ_X     = 52;          // left margin for equation text
  const EQ_Y0    = 62;          // y for first line
  const CAP_Y    = H - 22;      // y for caption text

  const svg = R.SVG(stage, W, H);

  let currentStep = 0;
  // opacity values for each line (0..1), one slot per step index (max 6 lines)
  const lineOpacity  = new Array(STEPS[STEPS.length - 1].lines.length).fill(0);
  const lineScale    = new Array(STEPS[STEPS.length - 1].lines.length).fill(0.92);
  lineOpacity[0] = 1;
  lineScale[0]   = 1;

  // ─── Colour helpers ──────────────────────────────────────────────────────
  // Each step highlights the newest line (the "changed" term)
  function lineColor(lineIdx, stepIdx) {
    if (lineIdx === STEPS[stepIdx].highlight) {
      return stepIdx === STEPS.length - 1 ? R.C.green : R.C.cyan;
    }
    return R.C.ink;
  }

  // ─── Draw ────────────────────────────────────────────────────────────────
  function draw() {
    R.clr(svg);

    const step = STEPS[currentStep];

    // Step counter badge
    const badge = R.E('rect', {
      x: W - 72, y: 10, width: 60, height: 22, rx: 4,
      fill: 'rgba(59,130,246,0.18)',
    });
    svg.appendChild(badge);
    svg.appendChild(R.TX(W - 42, 25, 'step ' + (currentStep + 1) + ' / ' + STEPS.length, {
      fill: '#93C5FD', size: 11, anchor: 'middle',
    }));

    // Separator line
    const sep = R.E('line', {
      x1: EQ_X - 10, y1: EQ_Y0 - 18, x2: W - 30, y2: EQ_Y0 - 18,
      stroke: 'rgba(205,214,232,0.18)', 'stroke-width': 1,
    });
    svg.appendChild(sep);

    // Equation lines — only show lines up to current step (inclusive)
    const maxLines = step.lines.length;
    for (let li = 0; li < maxLines; li++) {
      const y = EQ_Y0 + li * LINE_H;
      const opacity = lineOpacity[li];
      const scale   = lineScale[li];
      const color   = lineColor(li, currentStep);
      const isFinal = li === STEPS.length - 1 && currentStep === STEPS.length - 1;

      const g = R.E('g', {
        opacity: opacity,
        transform: `translate(${EQ_X}, ${y}) scale(1, ${scale})`,
      });

      const txt = R.E('text', {
        x: 0, y: 0,
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
        'font-family': 'IBM Plex Mono, monospace',
        'font-size': FONT_SZ,
        'font-weight': li === step.highlight ? 600 : 400,
        fill: color,
      });
      txt.textContent = step.lines[li];
      g.appendChild(txt);

      // Highlight pill behind the newest line
      if (li === step.highlight) {
        const pill = R.E('rect', {
          x: -8, y: -FONT_SZ / 2 - 4,
          width: W - EQ_X - 30, height: FONT_SZ + 8,
          rx: 4,
          fill: currentStep === STEPS.length - 1
            ? 'rgba(47,203,126,0.08)'
            : 'rgba(54,197,208,0.08)',
        });
        g.insertBefore(pill, txt);
      }

      svg.appendChild(g);
    }

    // Caption
    const capBg = R.E('rect', {
      x: EQ_X - 10, y: CAP_Y - 14, width: W - EQ_X - 20, height: 20, rx: 3,
      fill: 'rgba(15,20,34,0)',
    });
    svg.appendChild(capBg);
    const capTxt = R.TX(EQ_X, CAP_Y, step.caption, {
      fill: R.C.dim, size: CAP_SZ, anchor: 'start',
    });
    svg.appendChild(capTxt);

    // Step label tag (what changed)
    const labelText = STEP_LABELS[currentStep];
    const labelX = W - 130;
    const labelY = EQ_Y0 + step.highlight * LINE_H;
    if (currentStep > 0) {
      const labelBg = R.E('rect', {
        x: labelX - 4, y: labelY - 10,
        width: 128, height: 20,
        rx: 3,
        fill: currentStep === STEPS.length - 1
          ? 'rgba(47,203,126,0.15)'
          : 'rgba(54,197,208,0.15)',
      });
      svg.appendChild(labelBg);
      svg.appendChild(R.TX(labelX, labelY + 1, labelText, {
        fill: currentStep === STEPS.length - 1 ? R.C.green : R.C.cyan,
        size: 10.5, anchor: 'start', weight: 600,
      }));
    }
  }

  // ─── Animate in a new line ───────────────────────────────────────────────
  function revealLine(li, onDone) {
    if (prefersReducedMotion()) {
      lineOpacity[li] = 1;
      lineScale[li]   = 1;
      draw();
      if (onDone) onDone();
      return;
    }
    tween(420, {
      ease: easings.cubicInOut,
      onStep(e) {
        lineOpacity[li] = e;
        lineScale[li]   = 0.92 + 0.08 * e;
        draw();
      },
      onDone() {
        lineOpacity[li] = 1;
        lineScale[li]   = 1;
        draw();
        if (onDone) onDone();
      },
    });
  }

  // ─── Advance one step ────────────────────────────────────────────────────
  let animating = false;

  function advance() {
    if (animating || currentStep >= STEPS.length - 1) return;
    animating = true;
    const nextStep = currentStep + 1;
    // The new line to reveal is always the last line in the next step
    const newLineIdx = STEPS[nextStep].lines.length - 1;
    lineOpacity[newLineIdx] = 0;
    lineScale[newLineIdx]   = 0.92;
    currentStep = nextStep;
    updateButtons();
    revealLine(newLineIdx, () => {
      animating = false;
      updateButtons();
    });
  }

  function retreat() {
    if (animating || currentStep <= 0) return;
    // Hide the last line then go back
    const oldLineIdx = STEPS[currentStep].lines.length - 1;
    if (prefersReducedMotion()) {
      lineOpacity[oldLineIdx] = 0;
      lineScale[oldLineIdx]   = 0.92;
      currentStep--;
      draw();
      updateButtons();
      return;
    }
    animating = true;
    tween(280, {
      ease: easings.quadInOut,
      onStep(e) {
        lineOpacity[oldLineIdx] = 1 - e;
        lineScale[oldLineIdx]   = 1 - 0.08 * e;
        draw();
      },
      onDone() {
        lineOpacity[oldLineIdx] = 0;
        lineScale[oldLineIdx]   = 0.92;
        currentStep--;
        draw();
        animating = false;
        updateButtons();
      },
    });
  }

  function reset() {
    animating = false;
    currentStep = 0;
    lineOpacity.fill(0);
    lineScale.fill(0.92);
    lineOpacity[0] = 1;
    lineScale[0]   = 1;
    draw();
    updateButtons();
  }

  // ─── Controls ────────────────────────────────────────────────────────────
  const nextBtn = R.btn(ctr, 'Next step ▸', 'primary', advance);
  const backBtn = R.btn(ctr, '◂ Back', null, retreat);
  R.btn(ctr, 'Reset', null, reset);

  function updateButtons() {
    nextBtn.disabled = currentStep >= STEPS.length - 1;
    backBtn.disabled = currentStep <= 0;
  }

  // ─── Legend ──────────────────────────────────────────────────────────────
  R.legend(stage, [
    [R.C.cyan,  'new line (step change)'],
    [R.C.green, 'REINFORCE estimator (final)'],
    [R.C.ink,   'prior steps'],
  ]);

  // ─── Reduced-motion: show all at once ───────────────────────────────────
  if (prefersReducedMotion()) {
    currentStep = STEPS.length - 1;
    for (let i = 0; i < lineOpacity.length; i++) { lineOpacity[i] = 1; lineScale[i] = 1; }
  }

  updateButtons();
  draw();
});
</script>
