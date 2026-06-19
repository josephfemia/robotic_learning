/**
 * bestOfN.js — pure functions for the best-of-N verifier widget.
 *
 * Ported VERBATIM from reference/robot-learning-companion.html lines 3078–3113.
 *
 * Model (from the original comment):
 *   Each candidate has a quality signal q~U(0,1) and an "exploit" feature e~U(0,1).
 *   True success depends on quality but is HURT by exploit-y candidates (fluent failures):
 *     P(success) = clamp(q - 0.7*e + 0.25, 0, 1)
 *   The verifier scores: vscore = vacc*q + (1-vacc)*e.
 *   A weak verifier (low vacc) ranks by e, so best-of-N increasingly surfaces
 *   high-e fluent failures: true success rises then FALLS with N.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Clamp x to [0, 1].
 * @param {number} x
 * @returns {number}
 */
export function clamp01(x) {
  return x < 0 ? 0 : (x > 1 ? 1 : x);
}

/**
 * Estimate the true success rate when best-of-N selection is used with
 * a verifier of given reliability.
 *
 * This is the verbatim Monte Carlo simulation from the original IIFE's evalN().
 * trials=1200 matches the original exactly.
 *
 * Each trial:
 *   - Generate N candidates, each with q~U(0,1), e~U(0,1)
 *   - Verifier scores: vscore = vacc*q + (1-vacc)*e
 *   - Pick the candidate with the highest vscore
 *   - True success: Bernoulli( clamp(chQ - 0.7*chE + 0.25, 0, 1) )
 *
 * @param {number} N     - number of candidates to sample per trial
 * @param {number} vacc  - verifier reliability in [0.5, 1]; 1 = perfect, 0.5 = random
 * @param {number} [trials=1200] - Monte Carlo trial count (matches original)
 * @param {Function} [rng=Math.random] - random source (injectable for tests)
 * @returns {number} estimated true success rate in [0, 1]
 */
export function evalN(N, vacc, trials, rng) {
  if (trials === undefined) trials = 1200;
  if (!rng) rng = Math.random;
  var succ = 0;
  for (var t = 0; t < trials; t++) {
    var bestV = -1e9, chQ = 0, chE = 0;
    for (var i = 0; i < N; i++) {
      var q = rng();
      var e = rng();
      var vs = vacc * q + (1 - vacc) * e;
      if (vs > bestV) { bestV = vs; chQ = q; chE = e; }
    }
    if (rng() < clamp01(chQ - 0.7 * chE + 0.25)) succ++;
  }
  return succ / trials;
}
