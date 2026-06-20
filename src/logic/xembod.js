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
