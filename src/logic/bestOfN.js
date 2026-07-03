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

// ---------------------------------------------------------------------------
// Phase-3 (F3) additions — one visible batch of candidates + argmax selection.
// The widget scatters a single seeded batch on the (verifier score × true
// success) plane and circles the verifier's argmax, so the selection mechanism
// (and its reward-hacking failure) is watched, not just aggregated by evalN().
// ---------------------------------------------------------------------------

/**
 * Deterministic PRNG (mulberry32). Same seed → same sequence, values in [0, 1).
 *
 * @param {number} seed - any integer
 * @returns {Function} rng() → number in [0, 1)
 */
export function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * True success probability of a candidate — the exact expression inside
 * evalN(): quality helps, the exploit feature hurts (fluent failures).
 *
 * @param {number} q - quality signal in [0, 1]
 * @param {number} e - exploit feature in [0, 1]
 * @returns {number} P(success) in [0, 1]
 */
export function trueSuccess(q, e) {
  return clamp01(q - 0.7 * e + 0.25);
}

/**
 * Sample one batch of N candidates, deterministically from `seed`.
 * The q/e draws depend only on (N, seed) — NOT on vacc — so dragging the
 * verifier-reliability slider re-scores the SAME candidates (the verifier's
 * pick visibly jumps between fixed dots).
 *
 * @param {number} N    - number of candidates (≥ 1)
 * @param {number} vacc - verifier reliability in [0.5, 1]
 * @param {number} seed - integer seed; "Resample" advances it
 * @returns {Array<{q:number, e:number, vscore:number, ptrue:number}>}
 */
export function sampleCandidates(N, vacc, seed) {
  var rng = makeRng(seed);
  var out = [];
  for (var i = 0; i < N; i++) {
    var q = rng();
    var e = rng();
    out.push({ q: q, e: e, vscore: vacc * q + (1 - vacc) * e, ptrue: trueSuccess(q, e) });
  }
  return out;
}

/**
 * Index of the candidate best-of-N actually selects: argmax of verifier score
 * (same tie-breaking as evalN — strict >, first wins).
 *
 * @param {Array<{vscore:number}>} cands
 * @returns {number} index of the verifier's pick
 */
export function selectBest(cands) {
  var bi = 0, bv = -1e9;
  for (var i = 0; i < cands.length; i++) {
    if (cands[i].vscore > bv) { bv = cands[i].vscore; bi = i; }
  }
  return bi;
}

/**
 * Index of the candidate that would truly work best: argmax of true success.
 * The gap between this and selectBest() is the reward-hacking picture.
 *
 * @param {Array<{ptrue:number}>} cands
 * @returns {number} index of the genuinely best candidate
 */
export function bestTrue(cands) {
  var bi = 0, bv = -1e9;
  for (var i = 0; i < cands.length; i++) {
    if (cands[i].ptrue > bv) { bv = cands[i].ptrue; bi = i; }
  }
  return bi;
}
