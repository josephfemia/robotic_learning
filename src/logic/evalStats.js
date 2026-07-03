/**
 * evalStats.js — pure numeric core for the underpowered-eval widget (W: eval, L11 §11.2).
 *
 * The question the widget asks: can n trials per policy tell an 80%-success
 * policy from a 90% one? Ingredients:
 *
 *   - makeRng(seed)            — mulberry32 PRNG, deterministic for tests
 *   - sampleBinomial(n, p, r)  — one simulated eval: k successes out of n trials
 *   - wilson(k, n, z)          — 95% Wilson score interval for a binomial proportion
 *   - wilsonFromRate(p̂, n, z) — same interval parameterised by the rate directly
 *   - ciSeparated(a, b)        — do two intervals fail to overlap?
 *   - minSeparatingN(pA, pB)   — smallest n where the CIs at the *true* rates separate
 *   - paperVerdict(kA, kB)     — what a paper would publish from the point estimates
 *   - trueWinner(pA, pB)       — ground truth to score the verdict against
 *
 * Wilson score interval (the standard choice for small-n binomial proportions;
 * unlike the Wald interval it never escapes [0,1] and behaves at p̂ ∈ {0, 1}):
 *
 *   center = (p̂ + z²/2n) / (1 + z²/n)
 *   half   = (z / (1 + z²/n)) · √( p̂(1−p̂)/n + z²/4n² )
 *
 * No DOM dependencies — pure ES module. All randomness is injected.
 */

/** Default z for a 95% two-sided interval. */
export var Z95 = 1.96;

/**
 * mulberry32 — small, fast, seedable PRNG. Returns a Math.random()-compatible
 * function producing floats in [0, 1). Deterministic for a given integer seed.
 *
 * @param {number} seed
 * @returns {function(): number}
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
 * Simulate one evaluation: n Bernoulli(p) trials, count successes.
 *
 * @param {number} n   - number of trials
 * @param {number} p   - true success rate
 * @param {function} rnd - Math.random()-compatible function
 * @returns {number} k successes, integer in [0, n]
 */
export function sampleBinomial(n, p, rnd) {
  var k = 0;
  for (var i = 0; i < n; i++) { if (rnd() < p) k++; }
  return k;
}

/**
 * Wilson score interval from an observed rate p̂ (need not be k/n for integer k —
 * used by minSeparatingN, which evaluates the interval at the *true* rates).
 *
 * @param {number} pHat - observed/assumed success rate in [0, 1]
 * @param {number} n    - number of trials
 * @param {number} [z]  - normal quantile (default 1.96 → 95%)
 * @returns {{ p: number, lo: number, hi: number }}
 */
export function wilsonFromRate(pHat, n, z) {
  z = z || Z95;
  var z2 = z * z;
  var denom = 1 + z2 / n;
  var center = (pHat + z2 / (2 * n)) / denom;
  var half = (z / denom) * Math.sqrt(pHat * (1 - pHat) / n + z2 / (4 * n * n));
  var lo = center - half, hi = center + half;
  return { p: pHat, lo: lo < 0 ? 0 : lo, hi: hi > 1 ? 1 : hi };
}

/**
 * Wilson score interval for k successes in n trials.
 *
 * @param {number} k - successes
 * @param {number} n - trials
 * @param {number} [z] - normal quantile (default 1.96 → 95%)
 * @returns {{ p: number, lo: number, hi: number }} p = k/n point estimate
 */
export function wilson(k, n, z) {
  return wilsonFromRate(k / n, n, z);
}

/**
 * Do two intervals fail to overlap (strictly disjoint)?
 * Touching endpoints count as overlapping — "not significant".
 *
 * @param {{lo: number, hi: number}} a
 * @param {{lo: number, hi: number}} b
 * @returns {boolean}
 */
export function ciSeparated(a, b) {
  return a.hi < b.lo || b.hi < a.lo;
}

/**
 * Smallest n (trials per policy) at which the Wilson intervals evaluated at the
 * TRUE rates pA and pB no longer overlap — i.e. the n where an eval would be
 * expected to resolve the difference. Binary search is valid because the
 * separation gap is monotone in n (both intervals shrink toward their rates).
 *
 * @param {number} pA - true success rate of policy A
 * @param {number} pB - true success rate of policy B
 * @param {number} [z]    - normal quantile (default 1.96)
 * @param {number} [maxN] - give up beyond this (default 1e6)
 * @returns {number|null} minimal separating n, or null if none ≤ maxN
 *                        (in particular null when pA === pB)
 */
export function minSeparatingN(pA, pB, z, maxN) {
  z = z || Z95;
  maxN = maxN || 1e6;
  if (pA === pB) return null;
  function sep(n) { return ciSeparated(wilsonFromRate(pA, n, z), wilsonFromRate(pB, n, z)); }
  if (!sep(maxN)) return null;
  var lo = 1, hi = maxN; // invariant: !sep(lo-ish) … sep(hi)
  if (sep(lo)) return lo;
  while (hi - lo > 1) {
    var mid = (lo + hi) >> 1;
    if (sep(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

/**
 * The verdict a paper would publish from the point estimates alone
 * (success counts out of the same n): higher count "beats" the other.
 *
 * @param {number} kA - successes for policy A
 * @param {number} kB - successes for policy B
 * @returns {'A'|'B'|'tie'}
 */
export function paperVerdict(kA, kB) {
  if (kA > kB) return 'A';
  if (kB > kA) return 'B';
  return 'tie';
}

/**
 * Ground truth: which policy is actually better?
 *
 * @param {number} pA - true success rate of policy A
 * @param {number} pB - true success rate of policy B
 * @returns {'A'|'B'|'tie'}
 */
export function trueWinner(pA, pB) {
  if (pA > pB) return 'A';
  if (pB > pA) return 'B';
  return 'tie';
}
