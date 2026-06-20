/**
 * driftFunnel.js — pure numeric core for the error-funnel widget (W: drift, L3).
 *
 * Ported from the drift IIFE in reference/robot-learning-companion.html
 * lines 2470–2483.
 *
 * The drift widget is predominantly visual/stochastic: each rollout uses
 * Math.random() to decide when to "go off distribution" and how to drift
 * afterward. The extracted numeric core is the per-step drift update rule,
 * which IS the real math — the compounding bias term (d>0 ? 0.6 : -0.6)
 * that makes off-distribution trajectories diverge rather than diffuse.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Simulate one rollout of a cloned policy subject to compounding errors.
 *
 * Ported VERBATIM from the inner loop (lines 2475–2477):
 *   var d=0,off=false,pts='';
 *   for(var t=0;t<=STEPS;t++){
 *     if(!off){ if(Math.random()<eps){ off=true; d+=(Math.random()<0.5?-1:1)*4; } }
 *     else { d+=(Math.random()-0.5)*4+(d>0?0.6:-0.6); }
 *     d=R.clamp(d,-maxA,maxA);
 *     ...
 *   }
 *
 * Once the policy leaves the expert's distribution (sampled with probability
 * eps per step), subsequent steps compound: random diffusion ± 2 plus a
 * drift bias of ±0.6 that always pushes the trajectory further from centre.
 *
 * @param {number}   eps   - per-step error probability (0–1)
 * @param {number}   steps - number of steps (STEPS constant in original = 64)
 * @param {number}   maxA  - amplitude clamp (H/2 − 22, = 128 in original 300px widget)
 * @param {Function} rand  - drop-in for Math.random (default: Math.random) — injectable for tests
 * @returns {Float64Array} offsets d[0..steps], centred at 0, clamped to ±maxA
 */
export function simulateRollout(eps, steps, maxA, rand) {
  rand = rand || Math.random;
  var d = 0, off = false;
  var out = new Float64Array(steps + 1);
  out[0] = 0;
  for (var t = 1; t <= steps; t++) {
    if (!off) {
      if (rand() < eps) {
        off = true;
        d += (rand() < 0.5 ? -1 : 1) * 4;
      }
    } else {
      d += (rand() - 0.5) * 4 + (d > 0 ? 0.6 : -0.6);
    }
    d = Math.max(-maxA, Math.min(maxA, d));
    out[t] = d;
  }
  return out;
}

/**
 * Expected step at which the first error occurs, given per-step error rate eps.
 *
 * This is the geometric distribution mean: 1/eps.
 * Used in tests to verify that the simulation goes off-distribution at the
 * right average rate — the main claim of the compounding-errors story.
 *
 * @param {number} eps - per-step error probability
 * @returns {number} expected first-error step
 */
export function expectedFirstError(eps) {
  return 1 / eps;
}

/**
 * After going off-distribution, the drift term (d>0?0.6:-0.6) biases the
 * random walk away from zero. This function returns the per-step bias
 * magnitude — a constant 0.6 from the original.
 *
 * @returns {number} 0.6
 */
export function driftBias() {
  return 0.6;
}
