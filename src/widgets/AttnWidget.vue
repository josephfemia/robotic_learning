<template>
  <Lab
    ref="lab"
    id="attn"
    title="Attention over a trajectory: no distance decay"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { buildAffinities, computeAttentionWeights } from '../logic/attention.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Unlike an RNN\'s fading memory, attention weight depends on query–key <em>match</em>, not distance — the structural reason transformers handle long-horizon credit and non-Markov observations so well. The causal mask is the only thing that turns this into autoregression. <strong>Hover (or tap) a row</strong> to see the raw q·k match scores behind that query\'s softmax row — the answer to "why does this query attend there?".';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported verbatim from the attn IIFE (reference lines 2924–2950).
  // Numeric core (affinities, softmax) lives in logic/attention.js.
  var N = 12, temp = 1.0, causal = true;
  // fixed pseudo-random query-key affinities, deterministic
  var aff = buildAffinities(N);
  // Layout: three stacked text rows at the top, then the grid, then bottom
  // index labels, then the match-score panel — viewBox is tall enough that
  // nothing clips or overlaps.
  var pad = 70, W = 540, grid = W - pad - 24, cs = grid / N, y0 = 84;
  var panelTop = Math.ceil(y0 + grid + 26);
  var H = panelTop + 110;
  var svg = R.SVG(stage, W, H);

  // `disp` holds the currently-shown weight matrix; it eases toward the target
  // when the causal mask toggles (discrete change). Slider drags are instant.
  var disp = computeAttentionWeights(aff, temp, causal);

  // Row selection for the match-score panel: `pin` is a sticky click/tap
  // selection (touch-friendly), `hov` is the transient hover. Hover wins.
  // Default to the last query so the panel answers "why does query 11 attend
  // where it does?" before any interaction.
  var pin = N - 1, hov = null;
  function selRow() { return hov != null ? hov : pin; }

  function render() {
    R.clr(svg);
    // weight cells
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        var w = disp[i][j];
        var x = pad + j * cs, y = y0 + i * cs;
        var c = Math.round(255 - w * 255 * 1.6); var b = Math.round(40 + w * 215);
        svg.appendChild(R.E('rect', { x: x, y: y, width: cs - 1.5, height: cs - 1.5, rx: 2, fill: 'rgb(' + Math.max(15, c * 0.2 | 0) + ',' + Math.round(80 + w * 120) + ',' + b + ')', opacity: (causal && j > i) ? 0.06 : (0.25 + w * 0.75) }));
      }
    }
    // header (two lines) — kept clear of the grid and of the axis caption
    svg.appendChild(R.TX(pad, 20, 'attention weights — brighter = more weight' + (causal ? '   (causal mask on)' : '   (full attention)'), { anchor: 'start', fill: R.C.ink, size: 12.5, base: 'hanging' }));
    svg.appendChild(R.TX(pad, 38, 'no diagonal falloff: a late query can put most weight on an early key', { anchor: 'start', fill: R.C.dim, size: 11, base: 'hanging' }));
    // column-axis caption on its own row just above the grid
    svg.appendChild(R.TX(pad + grid / 2, y0 - 12, 'attends to  (key position j)  →', { fill: R.C.dim, size: 11.5 }));
    // query-axis title, rotated vertical so it never crowds the row labels
    var qt = R.TX(0, 0, 'query i', { fill: R.C.dim, size: 11.5, anchor: 'middle' });
    qt.setAttribute('transform', 'translate(20,' + (y0 + grid / 2) + ') rotate(-90)');
    svg.appendChild(qt);
    for (var k = 0; k < N; k += 2) {
      svg.appendChild(R.TX(pad + (k + 0.5) * cs, y0 + grid + 8, '' + k, { fill: R.C.dim, size: 10, base: 'hanging' }));
      svg.appendChild(R.TX(pad - 6, y0 + (k + 0.5) * cs, '' + k, { fill: R.C.dim, size: 10, anchor: 'end', base: 'middle' }));
    }
    // selected-row outline + match-score panel
    var sel = selRow();
    if (sel != null) {
      svg.appendChild(R.E('rect', { x: pad - 1.5, y: y0 + sel * cs - 1.5, width: grid + 1.5, height: cs + 1.5, rx: 3, fill: 'none', stroke: R.C.cyan, 'stroke-width': 1.6 }));
    }
    drawPanel(sel);
    // invisible per-row hit targets (drawn last so they sit on top)
    for (var r = 0; r < N; r++) {
      (function (ri) {
        var hit = R.E('rect', { x: pad, y: y0 + ri * cs, width: grid, height: cs, fill: 'transparent' });
        hit.style.cursor = 'pointer';
        hit.addEventListener('mouseenter', function () { if (hov !== ri) { hov = ri; render(); } });
        hit.addEventListener('mouseleave', function () { if (hov === ri) { hov = null; render(); } });
        hit.addEventListener('click', function () { pin = (pin === ri && hov == null) ? null : ri; render(); });
        svg.appendChild(hit);
      })(r);
    }
  }

  // Panel below the grid: raw q·k match scores for the selected query row,
  // column-aligned with the grid so score → weight reads straight down.
  // Scores come from the pinned logic core (buildAffinities); the winning key
  // is picked from the pinned softmax (computeAttentionWeights).
  function drawPanel(i) {
    var zy = panelTop + 68, scale = 15; // |score| ≤ 2 → bars stay within ±30px
    if (i == null) {
      svg.appendChild(R.TX(pad, panelTop + 2, 'hover or tap a row above to see why that query attends where it does', { anchor: 'start', fill: R.C.dim, size: 11.5, base: 'hanging' }));
      return;
    }
    var w = computeAttentionWeights(aff, temp, causal)[i];
    var best = 0;
    for (var j = 1; j < N; j++) { if (w[j] > w[best]) best = j; }
    svg.appendChild(R.TX(pad, panelTop + 2, 'query ' + i + ' — raw match scores q·k per key (before softmax ÷ T)', { anchor: 'start', fill: R.C.ink, size: 11.5, base: 'hanging' }));
    var line2 = 'strongest match: key ' + best + ' (score ' + (aff[i][best] >= 0 ? '+' : '') + aff[i][best].toFixed(2) + ') → brightest cell in row ' + i;
    if (causal && i < N - 1) line2 += '   ·   keys > ' + i + ' masked';
    svg.appendChild(R.TX(pad, panelTop + 18, line2, { anchor: 'start', fill: R.C.dim, size: 10.5, base: 'hanging' }));
    // zero line + bars (positive up, negative down)
    svg.appendChild(R.E('line', { x1: pad, y1: zy, x2: pad + grid, y2: zy, stroke: R.C.axis, 'stroke-width': 1 }));
    svg.appendChild(R.TX(pad - 6, zy, '0', { fill: R.C.dim, size: 10, anchor: 'end', base: 'middle' }));
    for (var b = 0; b < N; b++) {
      var s = aff[i][b], masked = causal && b > i;
      var bh = Math.max(0.75, Math.abs(s) * scale);
      svg.appendChild(R.E('rect', {
        x: pad + b * cs + 2, y: s >= 0 ? zy - bh : zy, width: cs - 5.5, height: bh, rx: 1.5,
        fill: s >= 0 ? R.C.cyan : R.C.red,
        opacity: masked ? 0.12 : (b === best ? 0.95 : 0.5),
      }));
    }
  }

  // Instant set from current temp/causal (slider drag).
  function setNow() { disp = computeAttentionWeights(aff, temp, causal); render(); }

  // Eased crossfade of the weight matrix for the discrete mask toggle.
  function animateTo() {
    var from = disp.map(function (r) { return r.slice(); });
    var to = computeAttentionWeights(aff, temp, causal);
    tween(380, { onStep: function (e) {
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) disp[i][j] = from[i][j] + (to[i][j] - from[i][j]) * e;
      render();
    } });
  }

  var cb = R.btn(ctr, 'Causal mask: ON', 'primary', function () { causal = !causal; cb.textContent = 'Causal mask: ' + (causal ? 'ON' : 'OFF'); cb.classList.toggle('primary', causal); animateTo(); });
  R.slider(ctr, { label: 'softmax temperature', min: 0.25, max: 3, step: 0.05, value: temp, fmt: function (v) { return v.toFixed(2); }, on: function (v) { temp = v; setNow(); } });
  render();
});
</script>
