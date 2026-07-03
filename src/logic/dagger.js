/**
 * dagger.js — pure numeric core for the DAgger funnel widget (G9, L3 §3.3).
 *
 * Companion to driftFunnel.js (the BC error-funnel core): the same per-step
 * compounding-drift rule, extended with a *coverage band* — the region of
 * state space where aggregated expert labels exist.
 *
 * Model (stylized but mechanical):
 *   - On the demo line the learner errs with per-step probability ε; an error
 *     kicks it off-distribution by ±KICK (identical to driftFunnel).
 *   - Off the line but INSIDE the coverage band, the refit policy has expert
 *     labels nearby, so the compounding step (diffusion + outward bias) is
 *     scaled by a damping factor `damp` < 1. More DAgger rounds → denser
 *     labels → stronger damping: damp(k) = DAMP^k.
 *   - Off the line and OUTSIDE the band, no data lives there: the full
 *     compounding step applies, verbatim from driftFunnel.simulateRollout
 *     ((rand−0.5)*4 + sign(d)*DRIFT_BIAS).
 *   - After each round, the band widens to include every state the learner
 *     visited (labels land exactly where it drifted): cov ← max(cov, maxDrift).
 *
 * With cov = 0 and damp = 1 the rollout reduces EXACTLY to
 * driftFunnel.simulateRollout — round 0 is pure BC (pinned in the test).
 *
 * No DOM dependencies — pure ES module.
 */

/** Off-distribution kick magnitude on the first error (from driftFunnel). */
export const KICK = 4;

/** Outward drift bias per off-distribution step (from driftFunnel). */
export const DRIFT_BIAS = 0.6;

/**
 * Per-round damping base: each refit on the aggregated dataset multiplies the
 * covered-region compounding rate by this factor.
 */
export const DAMP = 0.35;

/**
 * Deterministic 32-bit PRNG (mulberry32). Drop-in for Math.random.
 *
 * @param {number} seed - any 32-bit integer
 * @returns {Function} () => float in [0, 1)
 */
export function mulberry32(seed) {
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
 * Damping factor for DAgger round k: DAMP^k.
 * Round 0 (pure BC, no aggregated labels) → 1: full compounding.
 *
 * @param {number} round - DAgger round index (0 = pure BC)
 * @returns {number} multiplier in (0, 1]
 */
export function dampingForRound(round) {
  return round <= 0 ? 1 : Math.pow(DAMP, round);
}

/**
 * Simulate one rollout of the (re)fit policy under coverage cov and damping damp.
 *
 * Same state variable as driftFunnel.simulateRollout: d = offset from the demo
 * line, clamped to ±maxA. The only change is the covered-region damping.
 *
 * @param {number}   eps   - per-step error probability (0–1)
 * @param {number}   steps - number of steps
 * @param {number}   maxA  - amplitude clamp
 * @param {number}   cov   - coverage-band half-width (states with |d| ≤ cov have labels)
 * @param {number}   damp  - compounding multiplier inside the band (1 = no labels help)
 * @param {Function} [rand] - drop-in for Math.random (injectable for tests)
 * @returns {Float64Array} offsets d[0..steps]
 */
export function simulateDaggerRollout(eps, steps, maxA, cov, damp, rand) {
  rand = rand || Math.random;
  var d = 0, off = false;
  var out = new Float64Array(steps + 1);
  out[0] = 0;
  for (var t = 1; t <= steps; t++) {
    if (!off) {
      if (rand() < eps) {
        off = true;
        d += (rand() < 0.5 ? -1 : 1) * KICK;
      }
    } else {
      var step = (rand() - 0.5) * 4 + (d > 0 ? DRIFT_BIAS : -DRIFT_BIAS);
      if (Math.abs(d) <= cov) step *= damp; // labels here → compounding damped
      d += step;
    }
    d = Math.max(-maxA, Math.min(maxA, d));
    out[t] = d;
  }
  return out;
}

/**
 * Simulate one round's bundle of nRoll rollouts.
 *
 * @param {object} o - { eps, steps, maxA, nRoll, cov, damp, rand }
 * @returns {{rolls: Float64Array[], maxDrift: number}}
 *   rolls    - the bundle
 *   maxDrift - max |d| visited across the whole bundle (the round's readout)
 */
export function simulateRound(o) {
  var rolls = [], maxDrift = 0;
  for (var n = 0; n < o.nRoll; n++) {
    var r = simulateDaggerRollout(o.eps, o.steps, o.maxA, o.cov, o.damp, o.rand);
    for (var t = 0; t <= o.steps; t++) {
      var a = Math.abs(r[t]);
      if (a > maxDrift) maxDrift = a;
    }
    rolls.push(r);
  }
  return { rolls: rolls, maxDrift: maxDrift };
}

/**
 * Coverage-band update after a round: expert labels landed on every state the
 * learner visited, so the band widens to include them (never shrinks — the
 * dataset is aggregated, not replaced).
 *
 * @param {number} cov      - current band half-width
 * @param {number} maxDrift - max |d| visited this round
 * @param {number} maxA     - amplitude clamp (band can't exceed the state space)
 * @returns {number} new band half-width
 */
export function coverageAfterRound(cov, maxDrift, maxA) {
  return Math.min(maxA, Math.max(cov, maxDrift));
}

/**
 * Extract expert-label states from a bundle: every stride-th step of every
 * rollout where the learner sits off the demo line (|d| > tol). These are the
 * states DAgger queries the expert at.
 *
 * @param {Float64Array[]} rolls - bundle from simulateRound
 * @param {number} tol    - on-distribution tolerance (|d| ≤ tol needs no label)
 * @param {number} stride - subsample interval along t (for display density)
 * @returns {Array<{t: number, d: number}>}
 */
export function collectLabels(rolls, tol, stride) {
  var out = [];
  for (var n = 0; n < rolls.length; n++) {
    for (var t = 0; t < rolls[n].length; t += stride) {
      if (Math.abs(rolls[n][t]) > tol) out.push({ t: t, d: rolls[n][t] });
    }
  }
  return out;
}

/**
 * Run a full DAgger session: rounds 0..rounds, threading the coverage band
 * through coverageAfterRound. Round k uses damping dampingForRound(k).
 *
 * @param {object} o - { eps, steps, maxA, nRoll, rounds, rand }
 * @returns {Array<{round: number, cov: number, maxDrift: number}>}
 *   cov is the band half-width the round was rolled out UNDER (0 for round 0).
 */
export function runDagger(o) {
  var cov = 0, out = [];
  for (var k = 0; k <= o.rounds; k++) {
    var res = simulateRound({
      eps: o.eps, steps: o.steps, maxA: o.maxA, nRoll: o.nRoll,
      cov: cov, damp: dampingForRound(k), rand: o.rand,
    });
    out.push({ round: k, cov: cov, maxDrift: res.maxDrift });
    cov = coverageAfterRound(cov, res.maxDrift, o.maxA);
  }
  return out;
}
