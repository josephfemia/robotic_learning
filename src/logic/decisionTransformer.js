/**
 * decisionTransformer.js — pure numeric core for the Decision Transformer
 * return-conditioning widget (W: dt, L7).
 *
 * achievedReturn / isInDistribution / MAX_DATA were ported VERBATIM from the
 * dt IIFE in robot-learning-companion.html lines 2772–2795.
 *
 * Phase-3 (F5) addition: datasetReturns — a seeded, pinned sample of the
 * training dataset's per-trajectory returns, so "the data's support" is shown
 * as actual dots that thin out and stop exactly at MAX_DATA (the best return
 * in the dataset), instead of only a color change on the curve.
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

/** Tiny deterministic PRNG (mulberry32) — private; keeps the dataset pinned. */
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * datasetReturns — the seeded sample of per-trajectory returns present in the
 * training dataset.
 *
 * Shape of the sample: r = maxData · u^1.35 with u ~ U[0,1). The exponent > 1
 * skews mass toward low/mid returns so the dots visibly THIN OUT as they
 * approach the best return — good trajectories are rare — and one entry is
 * pinned to exactly maxData (the best trajectory defines the support's edge,
 * where the widget's orange dashed line stands).
 *
 * Deterministic: same (n, maxData, seed) → same sorted array.
 *
 * @param {number} n       - number of trajectories (default 48)
 * @param {number} maxData - best return in dataset (default MAX_DATA)
 * @param {number} seed    - PRNG seed (default 7)
 * @returns {number[]} n returns, sorted ascending, all in [0, maxData], max === maxData
 */
export function datasetReturns(n, maxData, seed) {
  if (n === undefined) n = 48;
  if (maxData === undefined) maxData = MAX_DATA;
  if (seed === undefined) seed = 7;
  var rng = mulberry32(seed);
  var out = [maxData];
  for (var i = 1; i < n; i++) out.push(maxData * Math.pow(rng(), 1.35));
  out.sort(function (a, b) { return a - b; });
  return out;
}
