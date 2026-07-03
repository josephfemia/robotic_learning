/**
 * filterDream.js — pure numeric core for the "Filter, then dream" widget
 * (G1, L8 §8.3 — the posterior→prior hand-off inside a world model).
 *
 * The story in numbers:
 *   - A hidden 1-D state meanders as a (mean-reverting) random walk — pinned
 *     by a seeded PRNG so the trajectory is identical across visits.
 *   - While observations stream in, the belief is a one-line Kalman-style
 *     blend:  μ ← μ_pred + K(o − μ_pred),  K = P_pred/(P_pred + r).
 *     The band (σ) snaps tight after every observation tick.
 *   - Past the observe→dream boundary there are no observations: the belief
 *     is prediction-only and the variance can only grow. A KL-trained prior
 *     grows it slowly (additive, ~random-walk honest); an untrained prior
 *     compounds it multiplicatively — it explodes almost immediately, and
 *     its mean runs away on wrong dynamics.
 *
 * No DOM dependencies — pure ES module, vitest-pinned in filterDream.test.js.
 */

/** Mulberry32 — tiny seeded PRNG, uniform in [0, 1). Deterministic per seed. */
export function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal variate drawn from an injectable uniform source. */
export function gaussian(rand) {
  var u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Shared defaults — the widget and the tests read the same pinned constants. */
export const DEFAULTS = {
  steps: 60, //     horizon (t = 0 … steps)
  trajSeed: 11, //  seed for the true state walk (pinned)
  obsSeed: 7, //    seed for observation noise (pinned)
  dreamSeed: 1, //  seed for dream-phase prior noise (Resample bumps this)
  stepSigma: 6, //  process-noise std of the true walk
  pull: 0.05, //    mean-reversion so the walk meanders but stays on stage
  obsSigma: 8, //   observation-noise std
  q: 36, //         process-noise variance assumed by the filter (= stepSigma²)
  r: 64, //         observation-noise variance assumed by the filter (= obsSigma²)
  sigma0: 20, //    prior std before the first observation
};

/**
 * Pinned meandering true state: mean-reverting random walk.
 *   x[0] = 0;  x[t] = (1 − pull)·x[t−1] + stepSigma·N(0,1)
 *
 * @param {object} [opts] - overrides for DEFAULTS (steps, trajSeed, stepSigma, pull)
 * @returns {Float64Array} x[0..steps]
 */
export function makeTrueTrajectory(opts) {
  var o = Object.assign({}, DEFAULTS, opts);
  var rand = mulberry32(o.trajSeed);
  var x = new Float64Array(o.steps + 1);
  for (var t = 1; t <= o.steps; t++) {
    x[t] = (1 - o.pull) * x[t - 1] + gaussian(rand) * o.stepSigma;
  }
  return x;
}

/**
 * Pinned noisy observations of the true state: o[t] = x[t] + obsSigma·N(0,1).
 *
 * @param {Float64Array} traj - output of makeTrueTrajectory
 * @param {object} [opts]     - overrides (obsSeed, obsSigma)
 * @returns {Float64Array} o[0..steps]
 */
export function makeObservations(traj, opts) {
  var o = Object.assign({}, DEFAULTS, opts);
  var rand = mulberry32(o.obsSeed);
  var obs = new Float64Array(traj.length);
  for (var t = 0; t < traj.length; t++) {
    obs[t] = traj[t] + gaussian(rand) * o.obsSigma;
  }
  return obs;
}

/**
 * Run the belief over the whole horizon.
 *
 * Observe phase (t ≤ boundary) — filtering, the posterior peeking at o:
 *   predict:  μ_pred = μ,  P_pred = P + q
 *   correct:  K = P_pred/(P_pred + r);  μ = μ_pred + K(o − μ_pred);  P = (1−K)P_pred
 *
 * Dream phase (t > boundary) — prediction only, the prior alone:
 *   trained (KL-trained prior):  mean continues the hand-off velocity with
 *     decay + small wobble; P = 1.02·P + q          (graceful, ~additive growth)
 *   untrained prior:  mean overshoots the velocity with growing wobble;
 *     P = 1.5·P + 4q                                 (multiplicative — explodes)
 *
 * σ (and σ_pred) do not depend on dreamSeed — variance growth is deterministic;
 * only the dreamed *mean* path resamples.
 *
 * @param {object} args
 * @param {Float64Array} args.traj      - true state (only its length is used here)
 * @param {Float64Array} args.obs       - observations (used for t ≤ boundary)
 * @param {number}  args.boundary       - last observed step (1 … steps)
 * @param {boolean} args.trained        - KL-trained prior vs untrained
 * @param {number} [args.dreamSeed]     - seed for dream-phase mean wobble
 * @param {number} [args.q] [args.r] [args.sigma0] - filter constants
 * @returns {{mu, sigma, muPred, sigmaPred}} Float64Arrays over t = 0..steps
 *   (sigma = posterior std after any correction; sigmaPred = pre-correction std,
 *    so [sigmaPred → sigma] at an observed step is the visible "snap")
 */
export function runBelief(args) {
  var o = Object.assign({}, DEFAULTS, args);
  var N = o.traj.length - 1;
  var b = Math.max(1, Math.min(N, Math.round(o.boundary)));
  var g = mulberry32(o.dreamSeed);

  var mu = new Float64Array(N + 1);
  var sigma = new Float64Array(N + 1);
  var muPred = new Float64Array(N + 1);
  var sigmaPred = new Float64Array(N + 1);

  var m = 0;
  var P = o.sigma0 * o.sigma0;
  var v = 0; // hand-off velocity, estimated when the dream starts

  for (var t = 0; t <= N; t++) {
    var mp, Pp;
    if (t === 0) {
      mp = m;
      Pp = P;
    } else if (t <= b) {
      // filtering predict step: random-walk model
      mp = m;
      Pp = P + o.q;
    } else {
      // dream predict step: prior alone
      var k = t - b;
      if (k === 1) {
        // estimate the velocity the posterior was tracking at hand-off
        var back = Math.min(4, b);
        v = (mu[b] - mu[b - back]) / back;
      }
      if (o.trained) {
        mp = m + v * Math.pow(0.9, k) + gaussian(g) * 1.5;
        Pp = P * 1.02 + o.q;
      } else {
        mp = m + v * 1.7 + gaussian(g) * (3 + 0.6 * k);
        Pp = P * 1.5 + 4 * o.q;
      }
    }
    muPred[t] = mp;
    sigmaPred[t] = Math.sqrt(Pp);

    if (t <= b) {
      // the one-line Kalman-style blend — the posterior peeking at o
      var K = Pp / (Pp + o.r);
      m = mp + K * (o.obs[t] - mp);
      P = (1 - K) * Pp;
    } else {
      m = mp;
      P = Pp;
    }
    mu[t] = m;
    sigma[t] = Math.sqrt(P);
  }
  return { mu: mu, sigma: sigma, muPred: muPred, sigmaPred: sigmaPred };
}
