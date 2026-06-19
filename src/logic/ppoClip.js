/**
 * ppoClip.js — pure numeric core for the PPO clipping widget (W: clip, L5).
 *
 * Ported VERBATIM from the clip IIFE in reference/robot-learning-companion.html
 * lines 2597–2620. Implements the clipped surrogate objective as a function of
 * the probability ratio r.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * PPO clipped surrogate objective for a given probability ratio r and advantage A.
 *
 * Original (line 2608):
 *   var cl = Math.max(1-eps, Math.min(1+eps, r));
 *   var L  = Math.min(r*A, cl*A);
 *
 * @param {number} r   - probability ratio π_new / π_old
 * @param {number} A   - advantage estimate
 * @param {number} eps - clip coefficient ε (default 0.2)
 * @returns {number} L^CLIP(r, A, ε)
 */
export function clippedObjective(r, A, eps) {
  var cl = Math.max(1 - eps, Math.min(1 + eps, r));
  return Math.min(r * A, cl * A);
}

/**
 * Unclipped surrogate objective (the plain ratio times advantage).
 *
 * Original (line 2608): var pu = r*A
 *
 * @param {number} r - probability ratio
 * @param {number} A - advantage
 * @returns {number} r * A
 */
export function unclippedObjective(r, A) {
  return r * A;
}

/**
 * Check whether the clipped objective is flat (gradient = 0) at ratio r.
 *
 * For A > 0: flat when r > 1 + eps (pushing the good action further is blocked).
 * For A < 0: flat when r < 1 - eps (pushing the bad action further is blocked).
 *
 * @param {number} r   - probability ratio
 * @param {number} A   - advantage
 * @param {number} eps - clip coefficient
 * @returns {boolean} true if the objective is in the flat (saturated) region
 */
export function isFlat(r, A, eps) {
  if (A > 0) return r > 1 + eps;
  if (A < 0) return r < 1 - eps;
  return false;
}
