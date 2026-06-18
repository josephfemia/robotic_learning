/**
 * discount.js — pure functions for the discount-factor widget (W1: disc).
 *
 * These implement the math shown in the disc IIFE
 * (reference/robot-learning-companion.html ~lines 2412–2429).
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Returns an array of length N where entry k = gamma^k (k = 0 … N-1).
 * Represents the discounted weight given to a reward k steps in the future.
 *
 * @param {number} gamma - discount factor in [0, 1)
 * @param {number} N     - number of steps
 * @returns {number[]}
 */
export function discountWeights(gamma, N) {
  const weights = [];
  for (let k = 0; k < N; k++) {
    weights.push(Math.pow(gamma, k));
  }
  return weights;
}

/**
 * Returns the effective horizon = 1 / (1 − gamma).
 * This is the geometric-series interpretation: how many effective steps
 * the agent "sees" when discounting future rewards with factor gamma.
 *
 * @param {number} gamma - discount factor in [0, 1)
 * @returns {number}
 */
export function effectiveHorizon(gamma) {
  return 1 / (1 - gamma);
}

/**
 * Returns the total discounted weight Σ_{k=0}^{∞} gamma^k = 1 / (1 − gamma).
 * Identical to effectiveHorizon — exposed as a separate named export to
 * match the two distinct labels the disc widget displays.
 *
 * @param {number} gamma - discount factor in [0, 1)
 * @returns {number}
 */
export function totalWeight(gamma) {
  return 1 / (1 - gamma);
}
