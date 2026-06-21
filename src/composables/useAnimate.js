/**
 * useAnimate.js — rAF animation helper + motion toolkit.
 *
 * Original `animate` ported VERBATIM from reference/robot-learning-companion.html line 2405.
 * Uses ease-in-out quadratic (the original has no prefers-reduced-motion branch;
 * reduced-motion is handled CSS-only by the stylesheet).
 *
 * Phase-2 additions (additive — do NOT modify `animate`):
 *   - easings          — named easing functions
 *   - prefersReducedMotion() — JS layer matching the CSS @media query
 *   - tween(dur, opts) — rAF loop with reduced-motion fast-path
 *   - growIn(el, opts) — DOM helper: fade + scale in
 *   - writeOn(pathEl, opts) — DOM helper: SVG stroke-dasharray write-on
 *   - focusPulse(el, opts) — DOM helper: attention ring pulse
 */

// ---------------------------------------------------------------------------
// Original export — VERBATIM, do not modify
// ---------------------------------------------------------------------------

/**
 * Animate a value over `dur` milliseconds using ease-in-out quadratic.
 *
 * @param {number}   dur  - duration in ms
 * @param {Function} step - called each frame with eased progress in [0, 1]
 * @param {Function} [done] - called once when animation completes
 */
export function animate(dur, step, done) {
  var t0 = null;
  function fr(ts) {
    if (t0 === null) t0 = ts;
    var p = Math.min(1, (ts - t0) / dur);
    var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    step(e);
    if (p < 1) requestAnimationFrame(fr);
    else if (done) done();
  }
  requestAnimationFrame(fr);
}

// ---------------------------------------------------------------------------
// easings — named easing functions, each mapping [0,1] → [0,1]
// ---------------------------------------------------------------------------

const linear    = t => t;
const quadInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const cubicInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Named easing functions. quadInOut is the exact curve used by `animate`. */
export const easings = { linear, quadInOut, cubicInOut };

// ---------------------------------------------------------------------------
// prefersReducedMotion — JS mirror of the CSS @media (prefers-reduced-motion)
// ---------------------------------------------------------------------------

/**
 * Returns true when the user has requested reduced motion.
 * Reads the same media query as `src/assets/styles.css` so JS and CSS stay in sync.
 * Guards against SSR / environments without window.matchMedia → returns false.
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// tween — rAF loop with ease + reduced-motion fast-path
// ---------------------------------------------------------------------------

/**
 * Animate a value with a named or custom easing function.
 *
 * Under `prefers-reduced-motion` the animation skips rAF entirely:
 * `onStep(1)` is called once synchronously, then `onDone()`.
 *
 * @param {number} dur              - duration in ms
 * @param {object} [opts]
 * @param {Function} [opts.ease]   - easing fn, defaults to easings.quadInOut
 * @param {Function} [opts.onStep] - called each frame with eased progress ∈ [0,1]
 * @param {Function} [opts.onDone] - called once when animation completes
 */
export function tween(dur, { ease = easings.quadInOut, onStep, onDone } = {}) {
  if (prefersReducedMotion()) {
    if (onStep) onStep(1);
    if (onDone) onDone();
    return;
  }

  var t0 = null;
  function fr(ts) {
    if (t0 === null) t0 = ts;
    var p = Math.min(1, (ts - t0) / dur);
    var e = ease(p);
    if (onStep) onStep(e);
    if (p < 1) requestAnimationFrame(fr);
    else if (onDone) onDone();
  }
  requestAnimationFrame(fr);
}

// ---------------------------------------------------------------------------
// DOM helpers — no-op-safe on null el; instant under reduced motion
// ---------------------------------------------------------------------------

/**
 * Fade + scale an element in.
 *
 * @param {Element|null} el
 * @param {object} [opts]
 * @param {number} [opts.dur=400]         - duration ms
 * @param {Function} [opts.ease]          - easing fn
 * @param {number} [opts.fromScale=0.92]  - starting scale
 * @param {Function} [opts.onDone]        - called when complete
 */
export function growIn(el, { dur = 400, ease = easings.quadInOut, fromScale = 0.92, onDone } = {}) {
  if (!el) return;
  tween(dur, {
    ease,
    onStep(e) {
      el.style.opacity = e;
      el.style.transform = `scale(${fromScale + (1 - fromScale) * e})`;
    },
    onDone() {
      el.style.opacity = '';
      el.style.transform = '';
      if (onDone) onDone();
    },
  });
}

/**
 * SVG path write-on using stroke-dasharray / stroke-dashoffset.
 *
 * @param {SVGPathElement|null} pathEl
 * @param {object} [opts]
 * @param {number} [opts.dur=600]   - duration ms
 * @param {Function} [opts.ease]    - easing fn
 * @param {Function} [opts.onDone] - called when complete
 */
export function writeOn(pathEl, { dur = 600, ease = easings.cubicInOut, onDone } = {}) {
  if (!pathEl) return;
  var len;
  try {
    len = pathEl.getTotalLength();
  } catch (_) {
    // jsdom / non-SVG element — skip silently
    if (onDone) onDone();
    return;
  }
  pathEl.style.strokeDasharray = len;
  pathEl.style.strokeDashoffset = len;

  tween(dur, {
    ease,
    onStep(e) {
      pathEl.style.strokeDashoffset = len * (1 - e);
    },
    onDone() {
      pathEl.style.strokeDashoffset = 0;
      if (onDone) onDone();
    },
  });
}

/**
 * Brief attention-ring pulse on an element (outline flash).
 *
 * @param {Element|null} el
 * @param {object} [opts]
 * @param {number} [opts.dur=500]         - duration ms
 * @param {string} [opts.color='#3b82f6'] - ring colour (Tailwind blue-500 default)
 * @param {Function} [opts.onDone]        - called when complete
 */
export function focusPulse(el, { dur = 500, color = '#3b82f6', onDone } = {}) {
  if (!el) return;
  tween(dur, {
    ease: easings.quadInOut,
    onStep(e) {
      var alpha = Math.sin(Math.PI * e); // 0 → peak → 0
      el.style.outline = `2px solid ${color}`;
      el.style.outlineOffset = `${2 * e}px`;
      el.style.opacity = 0.3 + 0.7 * (1 - alpha * 0.5);
    },
    onDone() {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.opacity = '';
      if (onDone) onDone();
    },
  });
}
