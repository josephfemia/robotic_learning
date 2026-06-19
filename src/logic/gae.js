/**
 * gae.js — pure numeric core for the GAE λ-dial widget (W: gae, L5).
 *
 * Ported VERBATIM from the gae IIFE in reference/robot-learning-companion.html
 * lines 2624–2642. Computes the per-step GAE weights as a function of λ.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * GAE weight placed on the n-step return.
 *
 * Original (line 2628):
 *   var w = lam>=0.999 ? Math.pow(0.999, n) : (1-lam)*Math.pow(lam, n);
 *
 * When λ ≈ 1 (≥ 0.999) the (1-λ) factor would underflow to essentially zero
 * so the original saturates at the λ=0.999 case instead (unnormalized weighting
 * that still spreads mass across the whole episode).
 *
 * @param {number} lam - λ ∈ [0, 1]
 * @param {number} n   - step index (0-based)
 * @returns {number} weight for the n-step return
 */
export function gaeWeight(lam, n) {
  return lam >= 0.999
    ? Math.pow(0.999, n)
    : (1 - lam) * Math.pow(lam, n);
}

/**
 * Compute all N GAE weights for a given λ (normalized so max=1 for display).
 *
 * Original (lines 2628–2629):
 *   for(n=0;n<N;n++){
 *     var w=lam>=0.999?Math.pow(0.999,n):(1-lam)*Math.pow(lam,n);
 *     ws.push(w); if(w>maxw) maxw=w;
 *   }
 *   ... height = (y0-y1)*(ws[n]/maxw) ...
 *
 * @param {number} lam - λ ∈ [0, 1]
 * @param {number} N   - number of steps (default 18 from original)
 * @returns {{ weights: number[], maxWeight: number }}
 */
export function gaeWeights(lam, N) {
  var ws = [], maxw = 0, n;
  for (n = 0; n < N; n++) {
    var w = gaeWeight(lam, n);
    ws.push(w);
    if (w > maxw) maxw = w;
  }
  if (maxw <= 0) maxw = 1;
  return { weights: ws, maxWeight: maxw };
}

/**
 * Effective horizon of the GAE estimate: ≈ 1/(1−λ) when λ < 0.99; null when λ ≥ 0.99.
 *
 * Original (line 2632):
 *   var heff = lam>=0.99 ? null : 1/(1-lam);
 *
 * @param {number} lam - λ ∈ [0, 1]
 * @returns {number|null} effective horizon, or null for near-MC λ
 */
export function effectiveHorizon(lam) {
  return lam >= 0.99 ? null : 1 / (1 - lam);
}
