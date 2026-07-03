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

// ---------------------------------------------------------------------------
// Phase-3 additions (F8): the triangular stack of per-step damages that
// explains WHERE the T² comes from. Under BC, a mistake at step t is never
// corrected, so it can cost all T−t remaining steps; under DAgger the drifted
// state is relabelled, so a mistake costs only its own step (damage ε).
// ---------------------------------------------------------------------------

/**
 * Damage of a BC mistake made at step t on a horizon-T task: ε·(T − t).
 * Tallest at t=0 (whole episode ruined), zero at t=T — the bars of the
 * triangular stack drawn by the CurveWidget's damage panel.
 *
 * @param {number} eps - per-step error probability
 * @param {number} t   - step at which the mistake occurs (0 ≤ t ≤ T)
 * @param {number} T   - task horizon
 * @returns {number} expected damage of that mistake (clamped to ≥ 0)
 */
export function perStepDamage(eps, t, T) {
  return eps * Math.max(0, T - t);
}

/**
 * Area of the damage triangle: ∫₀ᵀ ε·(T−t) dt = ½·ε·T².
 * This IS the εT² (up to the constant ½): summing the per-step damages
 * gives half of bcRegret, so 2 × damageTriangleArea(eps, T) = bcRegret(eps, T).
 *
 * @param {number} eps - per-step error probability
 * @param {number} T   - task horizon
 * @returns {number} triangle area ½·ε·T²
 */
export function damageTriangleArea(eps, T) {
  return 0.5 * eps * T * T;
}

/**
 * Area of DAgger's constant-height damage strip: T steps × ε per step = ε·T.
 * Identical to daggerRegret — exported under the geometric name the widget's
 * panel readout uses so the strip/area correspondence is explicit.
 *
 * @param {number} eps - per-step error probability
 * @param {number} T   - task horizon
 * @returns {number} strip area ε·T
 */
export function daggerStripArea(eps, T) {
  return eps * T;
}
