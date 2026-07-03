/**
 * xembod.js — pure functions for the cross-embodiment transfer widget.
 *
 * These implement the toy model from the xembod IIFE
 * (reference/robot-learning-companion.html lines 2996–3032).
 *
 * NOTE: This is explicitly a SCHEMATIC toy model — not a data-derived fit.
 * The original comment: "solo baseline; at high shared structure pooling
 * helps & saturates, at low (<~30%) it can HURT (negative transfer)."
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Returns the solo-training success rate (fixed baseline).
 * The original always returns 0.46 regardless of inputs.
 *
 * @returns {number} success rate in [0, 1]
 */
export function soloRate() {
  return 0.46;
}

/**
 * Returns the pooled-training success rate after adding n other embodiments
 * to the training set, given that bodies share `share` fraction of structure.
 *
 * Key behaviour (verbatim from original):
 *   - dir = (share - 0.30) / 0.70
 *   - When share < 0.30, dir is negative → pooled can go BELOW solo (negative transfer).
 *   - Gain saturates exponentially with n (diminishing returns).
 *   - Clamped to [0.05, 0.97].
 *
 * @param {number} n     - number of other embodiments pooled in (≥ 0)
 * @param {number} share - shared-structure fraction in (0, 1]; original default 0.55
 * @returns {number} success rate in [0.05, 0.97]
 */
export function pooledRate(n, share) {
  var base = soloRate();
  var dir = (share - 0.30) / 0.70;
  var gain = 0.55 * dir * (1 - Math.exp(-0.42 * n));
  var raw = base + gain;
  return Math.max(0.05, Math.min(0.97, raw));
}

// ---------------------------------------------------------------------------
// Phase-3 (F2) additions — disc-overlap geometry + flow mapping.
// Pure functions: the widget draws each embodiment's data pool as a disc whose
// pairwise overlap with the target disc tracks the shared-structure slider,
// and a flow band whose thickness tracks the (possibly negative) transfer gain.
// ---------------------------------------------------------------------------

/**
 * Area of intersection (the "lens") of two circles with radii r1, r2 whose
 * centres are distance d apart. Standard circle–circle intersection formula.
 *
 * @param {number} d  - centre distance (≥ 0; negative treated as |d|)
 * @param {number} r1 - first radius (> 0)
 * @param {number} r2 - second radius (> 0)
 * @returns {number} intersection area (0 when disjoint; π·rMin² when contained)
 */
export function lensOverlapArea(d, r1, r2) {
  d = Math.abs(d);
  var rMin = Math.min(r1, r2), rMax = Math.max(r1, r2);
  if (d >= r1 + r2) return 0;
  if (d <= rMax - rMin) return Math.PI * rMin * rMin;
  var a1 = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  var a2 = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  var tri = 0.5 * Math.sqrt(
    (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)
  );
  return a1 + a2 - tri;
}

/**
 * Fraction of the SMALLER circle's area covered by the lens.
 * 1 = smaller circle fully inside the larger; 0 = disjoint.
 *
 * @param {number} d  - centre distance
 * @param {number} r1 - first radius
 * @param {number} r2 - second radius
 * @returns {number} overlap fraction in [0, 1]
 */
export function overlapFraction(d, r1, r2) {
  var rMin = Math.min(r1, r2);
  return lensOverlapArea(d, r1, r2) / (Math.PI * rMin * rMin);
}

/**
 * Inverse of overlapFraction in d: the centre distance at which the two
 * circles' lens covers `frac` of the smaller circle. Solved by bisection
 * (overlapFraction is strictly decreasing in d on [rMax−rMin, r1+r2]).
 *
 * @param {number} frac - desired overlap fraction; clamped to [0, 1]
 * @param {number} r1   - first radius
 * @param {number} r2   - second radius
 * @returns {number} centre distance d ≥ 0
 */
export function distanceForOverlap(frac, r1, r2) {
  var rMin = Math.min(r1, r2), rMax = Math.max(r1, r2);
  if (frac >= 1) return rMax - rMin;
  if (frac <= 0) return r1 + r2;
  var lo = rMax - rMin, hi = r1 + r2;
  for (var i = 0; i < 60; i++) {
    var mid = (lo + hi) / 2;
    if (overlapFraction(mid, r1, r2) > frac) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Transfer gain over the solo baseline: pooledRate − soloRate.
 * Positive when shared structure > 30%, negative below (negative transfer).
 *
 * @param {number} n     - number of other embodiments pooled in (≥ 0)
 * @param {number} share - shared-structure fraction
 * @returns {number} gain in success-rate points (may be negative)
 */
export function transferGain(n, share) {
  return pooledRate(n, share) - soloRate();
}

/**
 * Normalised flow-band strength in [0, 1]: how thick the "shared structure →
 * target" flow should be drawn. 0 when the gain is zero or negative (the flow
 * thins to nothing — the negative-transfer regime), 1 at the model's maximum
 * possible gain (0.55, the asymptote at share = 1).
 *
 * @param {number} n     - number of other embodiments pooled in
 * @param {number} share - shared-structure fraction
 * @returns {number} strength in [0, 1]
 */
export function flowStrength(n, share) {
  var g = transferGain(n, share);
  return Math.max(0, Math.min(1, g / 0.55));
}
