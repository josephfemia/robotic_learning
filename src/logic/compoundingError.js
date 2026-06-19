/**
 * compoundingError.js — pure numeric core for the quadratic-regret curve widget (W: curve, L3).
 *
 * Ported VERBATIM from the curve IIFE in reference/robot-learning-companion.html
 * lines 2487–2508.
 *
 * The two regret curves for behavioral cloning vs. DAgger as a function of
 * task horizon T and per-step error eps:
 *   - BC (behavioral cloning):  regret ≈ ε·T²  (quadratic)
 *   - DAgger:                   regret ≈ ε·T   (linear)
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Behavioral cloning worst-case expected regret at horizon T.
 *
 * Original (inline in draw()):
 *   eps * t * t
 *
 * A single mistake at step t can cost up to (T − t) future steps; summing
 * that triangular cost over T steps yields O(ε·T²).
 *
 * @param {number} eps - per-step error probability on the expert's distribution
 * @param {number} T   - task horizon (number of steps)
 * @returns {number} expected regret upper bound
 */
export function bcRegret(eps, T) {
  return eps * T * T;
}

/**
 * DAgger worst-case expected regret at horizon T.
 *
 * Original (inline in draw()):
 *   eps * t
 *
 * DAgger's online-learning analysis caps regret at O(ε·T): each mistake costs
 * at most one step because drifted states are relabelled with expert actions.
 *
 * @param {number} eps - per-step error probability
 * @param {number} T   - task horizon (number of steps)
 * @returns {number} expected regret upper bound
 */
export function daggerRegret(eps, T) {
  return eps * T;
}

/**
 * The ratio by which BC is worse than DAgger at horizon T.
 *
 * Original (inline in draw()):
 *   'at T='+Tcur+': cloning ≈ '+Tcur+'× worse'
 * i.e. the ratio is exactly T (independent of eps).
 *
 * @param {number} T - task horizon
 * @returns {number} multiplicative factor (equals T)
 */
export function regretRatio(T) {
  return T;
}
