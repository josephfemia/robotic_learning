/**
 * decisionTransformer.js — pure numeric core for the Decision Transformer
 * return-conditioning widget (W: dt, L7).
 *
 * Ported VERBATIM from the dt IIFE in robot-learning-companion.html
 * lines 2772–2795.
 *
 * Core invariant (the widget's educational point):
 *   - For prompted return-to-go r <= maxData: achieved ≈ r (the model delivers
 *     what it saw in training — interpolation within the data support).
 *   - For r > maxData: achieved degrades — the model cannot "stitch" together
 *     a better-than-seen trajectory the way dynamic programming would.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * The best return present in the dataset (original: maxData = 0.82).
 * This is the threshold above which the model is out of distribution.
 */
export var MAX_DATA = 0.82;

/**
 * Compute the achieved return given a prompted return-to-go value.
 *
 * Original:
 *   function achieved(r){
 *     if(r<=maxData) return r*0.97;
 *     var over=r-maxData; return Math.max(0.15, maxData*0.97-over*1.4);
 *   }
 *
 * Two regimes:
 *   1. In-distribution (r <= maxData): achieved = r * 0.97
 *      — near-perfect delivery, slightly below the ideal diagonal.
 *   2. Out-of-distribution (r > maxData): achieved = max(0.15, maxData*0.97 - over*1.4)
 *      — degrades linearly as r exceeds the data's best, floored at 0.15.
 *
 * @param {number} r       - prompted return-to-go (the value you ask for at test time)
 * @param {number} maxData - best return in dataset (default MAX_DATA = 0.82)
 * @returns {number} achieved return
 */
export function achievedReturn(r, maxData) {
  if (maxData === undefined) maxData = MAX_DATA;
  if (r <= maxData) return r * 0.97;
  var over = r - maxData;
  return Math.max(0.15, maxData * 0.97 - over * 1.4);
}

/**
 * Check whether a prompted return-to-go is within the dataset's support.
 *
 * @param {number} r       - prompted return-to-go
 * @param {number} maxData - best return in dataset (default MAX_DATA)
 * @returns {boolean} true if in-distribution
 */
export function isInDistribution(r, maxData) {
  if (maxData === undefined) maxData = MAX_DATA;
  return r <= maxData;
}
