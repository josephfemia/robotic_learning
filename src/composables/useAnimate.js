/**
 * useAnimate.js — rAF animation helper.
 *
 * Ported VERBATIM from reference/robot-learning-companion.html line 2405.
 * Uses ease-in-out quadratic (the original has no prefers-reduced-motion branch;
 * reduced-motion is handled CSS-only by the stylesheet).
 *
 * Export: animate(dur, step, done)
 */

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
