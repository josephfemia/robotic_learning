/**
 * maxBias.js — pure numeric core for the max-overestimation widget (G8, L4 §4.4).
 *
 * The setup: N actions with IDENTICAL true value Q = 0. An estimator sees each
 * action's value through Gaussian noise of scale σ. The DQN-style target takes
 * max_a of those noisy estimates — which systematically selects whichever
 * estimate got lucky, so its expected value is E[max of N N(0,σ²)] > 0 even
 * though every true value is 0. That expectation grows with both N and σ
 * (Jensen-flavored: E[max] ≥ max[E]).
 *
 * The Double-DQN fix, in miniature: SELECT the argmax with one noisy draw, but
 * EVALUATE the selected action with an independent second draw. The evaluation
 * noise is independent of the selection event, so its conditional mean is the
 * true value — the bias collapses to zero while the noise (per-sample sd ≈ σ)
 * survives untouched.
 *
 * Seeded RNG (LCG) + Box-Muller so widget runs and vitest pins are reproducible.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Seeded LCG returning uniforms in [0, 1). Numerical Recipes constants —
 * same generator as the other seeded logic cores in this repo.
 *
 * @param {number} seed
 * @returns {function(): number}
 */
export function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Box-Muller standard-normal generator driven by a uniform rng
 * (same transform as rllab.js randn, but seedable).
 *
 * @param {function(): number} rng - uniform [0,1) generator
 * @returns {function(): number} standard normal variate generator
 */
export function makeRandn(rng) {
  return function () {
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/**
 * Index of the maximum value in a; ties broken first-wins.
 *
 * @param {number[]} a
 * @returns {number}
 */
export function argmax(a) {
  var bi = 0, bv = -1e9;
  for (var i = 0; i < a.length; i++) { if (a[i] > bv) { bv = a[i]; bi = i; } }
  return bi;
}

/**
 * One set of noisy value estimates for N actions whose true value is 0:
 * est[i] ~ N(0, σ²).
 *
 * @param {number} N     - number of actions
 * @param {number} sigma - estimate noise scale
 * @param {function(): number} randn - standard normal generator
 * @returns {number[]}
 */
export function sampleEstimates(N, sigma, randn) {
  var est = [];
  for (var i = 0; i < N; i++) est[i] = sigma * randn();
  return est;
}

/**
 * One "build the target" event.
 *
 * Coupled (vanilla max, decoupled=false): pick = argmax(est) and the target
 * trusts that same estimate — value = est[pick]. Its overshoot above the true
 * value 0 is the overestimation bias.
 *
 * Decoupled (Double-DQN style, decoupled=true): pick = argmax(est) as before,
 * but the value comes from an INDEPENDENT second set of draws —
 * value = evalEst[pick].
 *
 * @param {number} N
 * @param {number} sigma
 * @param {function(): number} randn
 * @param {boolean} decoupled
 * @returns {{ est: number[], evalEst: number[]|null, pick: number, value: number }}
 */
export function resampleOnce(N, sigma, randn, decoupled) {
  var est = sampleEstimates(N, sigma, randn);
  var pick = argmax(est);
  var evalEst = null, value;
  if (decoupled) {
    evalEst = sampleEstimates(N, sigma, randn);
    value = evalEst[pick];
  } else {
    value = est[pick];
  }
  return { est: est, evalEst: evalEst, pick: pick, value: value };
}

/**
 * Monte-Carlo statistics of the trusted target value over `trials` repetitions.
 * Since the true value of every action is 0, `mean` IS the bias.
 *
 * @param {number} N
 * @param {number} sigma
 * @param {number} trials
 * @param {number} seed
 * @param {boolean} decoupled
 * @returns {{ mean: number, sd: number, n: number }}
 */
export function biasStats(N, sigma, trials, seed, decoupled) {
  var randn = makeRandn(makeRng(seed));
  var sum = 0, sumSq = 0;
  for (var i = 0; i < trials; i++) {
    var v = resampleOnce(N, sigma, randn, decoupled).value;
    sum += v;
    sumSq += v * v;
  }
  var mean = sum / trials;
  var sd = Math.sqrt(Math.max(0, sumSq / trials - mean * mean));
  return { mean: mean, sd: sd, n: trials };
}
