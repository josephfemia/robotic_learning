/**
 * forwardDiffusion.js — pure numeric core for the forward-process widget (W: fwd, L6 §6.3).
 *
 * NEW for phase 3 (G6): shows where diffusion's training signal comes from.
 * A 1-D two-component Gaussian mixture (the "go left"/"go right" swerve modes
 * from L3's averaging trap, at ±1.4 as in logic/diffusion.js) is blended toward
 * a standard Gaussian by the closed-form forward process
 *
 *     x_k = √ᾱ_k · x₀ + √(1−ᾱ_k) · ε,   ε ~ N(0,1)
 *
 * so the noised marginal p_k is itself a two-component mixture with means
 * √ᾱ_k·μ_i and shared variance ᾱ_k·σ₀² + (1−ᾱ_k). Everything here is analytic:
 * density, score (∇_x log p_k — the Stein score of the NOISED density), and the
 * ε-prediction target ε* = −√(1−ᾱ_k)·score(x_k).
 *
 * The ᾱ schedule is NOT exported by logic/diffusion.js (its noiseSchedule() is
 * the reverse-sampler variance, a different parametrization), so we pin our own:
 * the Nichol–Dhariwal cosine schedule with s = 0.008 over K_MAX = 40 steps.
 *
 * No DOM dependencies — pure ES module, vitest-pinned in forwardDiffusion.test.js.
 */

/** Clean-data mode centers — matches the ±1.4 modes of logic/diffusion.js. */
export var MODES = [-1.4, 1.4];

/** Clean-data per-mode standard deviation. */
export var SIGMA0 = 0.35;

/** Equal mixture weights. */
export var WEIGHTS = [0.5, 0.5];

/** Number of forward steps (slider max). */
export var K_MAX = 40;

var S_COS = 0.008;

/**
 * Cumulative noise schedule ᾱ_k — cosine schedule (Nichol & Dhariwal, s=0.008),
 * normalized so ᾱ_0 = 1 (pure data). Monotone decreasing to ≈0 at k = K.
 * Clamped to [1e-5, 1] so downstream √(1−ᾱ) and divisions stay finite.
 *
 * @param {number} k - step index in [0, K]
 * @param {number} [K=K_MAX] - total number of steps
 * @returns {number} ᾱ_k ∈ (0, 1]
 */
export function alphaBar(k, K) {
  if (K == null) K = K_MAX;
  var kk = Math.min(Math.max(k, 0), K);
  function f(u) {
    var c = Math.cos(((u / K + S_COS) / (1 + S_COS)) * Math.PI / 2);
    return c * c;
  }
  var ab = f(kk) / f(0);
  return Math.min(1, Math.max(1e-5, ab));
}

/**
 * Parameters of the noised mixture p_k given ᾱ.
 * Means shrink toward 0 by √ᾱ; every component shares one variance.
 *
 * @param {number} abar - ᾱ_k
 * @returns {{ means: number[], variance: number, weights: number[] }}
 */
export function noisedParams(abar) {
  var s = Math.sqrt(abar);
  return {
    means: [MODES[0] * s, MODES[1] * s],
    variance: abar * SIGMA0 * SIGMA0 + (1 - abar),
    weights: WEIGHTS.slice(),
  };
}

/**
 * Density of the noised marginal p_k(x) — analytic Gaussian-mixture pdf.
 *
 * @param {number} x    - point in action space
 * @param {number} abar - ᾱ_k
 * @returns {number} p_k(x)
 */
export function noisedDensity(x, abar) {
  var P = noisedParams(abar), v = P.variance, sum = 0;
  for (var i = 0; i < P.means.length; i++) {
    var d = x - P.means[i];
    sum += P.weights[i] * Math.exp(-d * d / (2 * v)) / Math.sqrt(2 * Math.PI * v);
  }
  return sum;
}

/**
 * Score of the noised marginal: ∇_x log p_k(x).
 * For a shared-variance mixture: score = Σ_i r_i (m_i − x) / v with
 * responsibilities r_i ∝ w_i·exp(−(x−m_i)²/2v).
 *
 * At low ᾱ→0 (heavy noise) this field is unimodal (pulls everything toward 0);
 * at ᾱ→1 (no noise) it points crisply into the two data basins.
 *
 * @param {number} x    - point in action space
 * @param {number} abar - ᾱ_k
 * @returns {number} d/dx log p_k(x)
 */
export function noisedScore(x, abar) {
  var P = noisedParams(abar), v = P.variance;
  var g = [], Z = 1e-300, i;
  for (i = 0; i < P.means.length; i++) {
    var d = x - P.means[i];
    g[i] = P.weights[i] * Math.exp(-d * d / (2 * v));
    Z += g[i];
  }
  var s = 0;
  for (i = 0; i < P.means.length; i++) s += (g[i] / Z) * (P.means[i] - x) / v;
  return s;
}

/**
 * The ε-prediction regression target at a noised point:
 * ε*(x_k) = E[ε | x_k] = −√(1−ᾱ_k) · ∇_x log p_k(x_k).
 * (Exactly the Tweedie/score identity behind the ε-loss.)
 *
 * @param {number} x    - noised point x_k
 * @param {number} abar - ᾱ_k
 * @returns {number} expected mixed-in noise
 */
export function epsTarget(x, abar) {
  return -Math.sqrt(Math.max(0, 1 - abar)) * noisedScore(x, abar);
}

/**
 * Closed-form forward blend: x_k = √ᾱ·x₀ + √(1−ᾱ)·ε.
 *
 * @param {number} x0   - clean sample
 * @param {number} eps  - the Gaussian noise draw
 * @param {number} abar - ᾱ_k
 * @returns {number} x_k
 */
export function blend(x0, eps, abar) {
  return Math.sqrt(abar) * x0 + Math.sqrt(Math.max(0, 1 - abar)) * eps;
}

/**
 * mulberry32 — tiny seeded PRNG, returns a Math.random-compatible function.
 *
 * @param {number} seed - 32-bit integer seed
 * @returns {function(): number} uniform in [0, 1)
 */
export function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller normal variate driven by an injected uniform RNG.
 *
 * @param {function(): number} rng - uniform in [0,1)
 * @returns {number} standard normal draw
 */
export function randnFrom(rng) {
  var u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Seeded sampling of (x₀, ε) latent pairs. Each pair defines a full forward
 * trajectory: for ANY k the widget just evaluates blend(x0, eps, ᾱ_k), so
 * dragging the slider slides every point along its own path deterministically.
 *
 * @param {number} n    - number of pairs
 * @param {number} seed - PRNG seed (same seed ⇒ identical pairs)
 * @returns {Array<{x0: number, eps: number}>}
 */
export function samplePairs(n, seed) {
  var rng = mulberry32(seed), out = [];
  for (var i = 0; i < n; i++) {
    var m = MODES[rng() < WEIGHTS[0] ? 0 : 1];
    out.push({ x0: m + SIGMA0 * randnFrom(rng), eps: randnFrom(rng) });
  }
  return out;
}
