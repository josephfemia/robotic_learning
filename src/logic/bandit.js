/**
 * bandit.js — pure numeric core for the multi-armed bandit widget (W: bandit, L4).
 *
 * Ported VERBATIM from the bandit IIFE in reference/robot-learning-companion.html
 * lines 2875–2921.
 *
 * Setup: K arms with hidden Bernoulli payoffs (truth[i] ~ clamp(0.5 + 0.32*randn(), 0.02, 0.98)).
 * Strategies:
 *   'greedy'  — always pick arm with highest current estimate Q[i]
 *   'eps'     — pick randomly with probability eps, else greedy
 *   'ucb'     — UCB1: pick arg max (Q[i] + sqrt(2*ln(t+1)/n[i])), force pull unvisited arms first
 *
 * Arm update: incremental sample mean  Q[a] += (r - Q[a]) / n[a]
 * Regret: cumulative (best_truth - truth[chosen]) per step.
 *
 * NOTE: The regretHist rolling window (max 400 entries, oldest shifted out) is
 * NOT included here — that is purely a display concern handled in the widget.
 * The pure numeric core tracks cumulative regret as a scalar.
 *
 * No DOM dependencies — pure ES module.
 * Requires a seeded randn (or the caller's Math.random) for reproducibility in tests.
 */

/** Number of arms (original: K=6). */
export var K_ARMS = 6;

/**
 * Return the index of the maximum value in array a.
 * Original: function argmax(a){var bi=0,bv=-1e9;for(var i=0;i<a.length;i++){if(a[i]>bv){bv=a[i];bi=i;}}return bi;}
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
 * Pick the next arm to pull for a given strategy.
 * Original pick() function, lines 2880–2884.
 *
 * @param {'greedy'|'eps'|'ucb'} strat - strategy
 * @param {number[]} Q   - current value estimates
 * @param {number[]} n   - pull counts per arm
 * @param {number}   t   - total pulls so far
 * @param {number}   eps - exploration rate for eps-greedy
 * @param {function} rnd - Math.random()-compatible function (injectable for testing)
 * @returns {number} arm index
 */
export function pickArm(strat, Q, n, t, eps, rnd) {
  if (strat === 'greedy') { return argmax(Q); }
  if (strat === 'eps') {
    if (rnd() < eps) return Math.floor(rnd() * Q.length);
    return argmax(Q);
  }
  // UCB1: sqrt(2 * ln(t+1) / n[i]) — force pull unvisited arms first
  var bi = 0, bv = -1e9;
  for (var i = 0; i < Q.length; i++) {
    if (n[i] === 0) return i;
    var u = Q[i] + Math.sqrt(2 * Math.log(t + 1) / n[i]);
    if (u > bv) { bv = u; bi = i; }
  }
  return bi;
}

/**
 * Execute one pull: observe reward, update Q[a], increment n[a] and t, add regret.
 * Original step() logic, lines 2887–2888.
 *
 * @param {number}   a     - chosen arm index
 * @param {number[]} truth - true Bernoulli payoffs per arm
 * @param {number[]} Q     - value estimates (mutated)
 * @param {number[]} n     - pull counts (mutated)
 * @param {number}   best  - max(truth)
 * @param {function} rnd   - Math.random()-compatible function
 * @returns {{ r: number, regretStep: number }} reward and instantaneous regret
 */
export function pull(a, truth, Q, n, best, rnd) {
  var r = (rnd() < truth[a]) ? 1 : 0;
  n[a]++;
  Q[a] += (r - Q[a]) / n[a];
  var regretStep = best - truth[a];
  return { r: r, regretStep: regretStep };
}

/**
 * Initialize a fresh bandit state with randomized arm truths.
 * Original reset():
 *   truth[i] = R.clamp(0.5 + 0.32 * R.randn(), 0.02, 0.98)
 *   Q[i]=0, n[i]=0, t=0, regret=0
 *
 * @param {number}   K    - number of arms
 * @param {function} randn - Box-Muller normal variate function (injectable)
 * @returns {{ truth: number[], Q: number[], n: number[], t: number, regret: number, best: number }}
 */
export function initBandit(K, randn) {
  var truth = [];
  for (var i = 0; i < K; i++) {
    var v = 0.5 + 0.32 * randn();
    truth[i] = v < 0.02 ? 0.02 : (v > 0.98 ? 0.98 : v);
  }
  var best = Math.max.apply(null, truth);
  var Q = [], n = [];
  for (var i = 0; i < K; i++) { Q[i] = 0; n[i] = 0; }
  return { truth: truth, Q: Q, n: n, t: 0, regret: 0, best: best };
}
