/**
 * diffusion.js — pure numeric core for the diffusion denoising widget (W: diff, L6).
 *
 * Ported VERBATIM from the diff IIFE in reference/robot-learning-companion.html
 * lines 2644–2665. Extracts the score field and per-step denoising update into
 * pure functions so they can be unit-tested independent of the DOM.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Compute the score (gradient of log p) at point p under a two-mode Gaussian
 * mixture, where each mode has variance s2 in both dimensions.
 *
 * Original (inline in the IIFE):
 *   function score(p,s2){
 *     function gk(m){var dx=p.x-m[0],dy=p.y-m[1];return Math.exp(-(dx*dx+dy*dy)/(2*s2));}
 *     var g1=gk(m1),g2=gk(m2),Z=g1+g2+1e-12,r1=g1/Z,r2=g2/Z;
 *     return {sx:(r1*(m1[0]-p.x)+r2*(m2[0]-p.x))/s2,sy:(r1*(m1[1]-p.y)+r2*(m2[1]-p.y))/s2};
 *   }
 *
 * The two modes are fixed at m1=[-1.4, 0] and m2=[1.4, 0] as in the original.
 *
 * @param {{ x: number, y: number }} p  - current particle position
 * @param {number} s2 - variance (noise schedule value)
 * @returns {{ sx: number, sy: number }} score vector
 */
export function scoreField(p, s2) {
  var m1 = [-1.4, 0], m2 = [1.4, 0];
  function gk(m) { var dx = p.x - m[0], dy = p.y - m[1]; return Math.exp(-(dx * dx + dy * dy) / (2 * s2)); }
  var g1 = gk(m1), g2 = gk(m2), Z = g1 + g2 + 1e-12, r1 = g1 / Z, r2 = g2 / Z;
  return { sx: (r1 * (m1[0] - p.x) + r2 * (m2[0] - p.x)) / s2, sy: (r1 * (m1[1] - p.y) + r2 * (m2[1] - p.y)) / s2 };
}

/**
 * Compute the noise schedule variance at denoising step t.
 *
 * Original (inline in dstep()):
 *   var sched = Math.max(0.05, 1.2 * Math.exp(-step / 6));
 *
 * @param {number} t - current denoising step index (0-based)
 * @returns {number} variance s2 (>= 0.05)
 */
export function noiseSchedule(t) {
  return Math.max(0.05, 1.2 * Math.exp(-t / 6));
}

/**
 * Perform one denoising step for a single particle using the score field.
 *
 * Deterministic part: p += lr * score(p, sched)
 * Stochastic part:    p += N(0, 2*lr) * 0.18 * exp(-step/8)  [caller supplies noise]
 *
 * This function computes ONLY the deterministic drift (score step). The stochastic
 * injection uses R.randn() in the widget; we expose the drift so it can be tested.
 *
 * Original (inside dstep() loop):
 *   var sc=score(pts[i],sched);pts[i].x+=lr*sc.sx;pts[i].y+=lr*sc.sy;
 *
 * @param {{ x: number, y: number }} p   - particle position (not mutated)
 * @param {number} s2  - noise schedule variance for this step
 * @param {number} lr  - learning rate (0.18 in original)
 * @returns {{ x: number, y: number }} new particle position after drift
 */
export function denoisingStep(p, s2, lr) {
  var sc = scoreField(p, s2);
  return { x: p.x + lr * sc.sx, y: p.y + lr * sc.sy };
}

/**
 * Sampler step size used by dstep() in the original: lr = 0.18.
 */
export var STEP_LR = 0.18;

/**
 * Stochastic-injection scale at denoising step t (Langevin-style, decaying).
 * Multiplies a randn() draw per coordinate in the widget's sampler.
 *
 * Original (inline in dstep() loop):
 *   var nz = Math.sqrt(2*lr) * 0.18 * Math.exp(-step/8);
 *
 * @param {number} t  - denoising step index (0-based)
 * @param {number} lr - sampler step size (STEP_LR = 0.18 in original)
 * @returns {number} noise standard-deviation scale for this step
 */
export function noiseScale(t, lr) {
  return Math.sqrt(2 * lr) * 0.18 * Math.exp(-t / 8);
}
