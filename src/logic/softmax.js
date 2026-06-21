/**
 * softmax.js — pure functions for temperature-scaled softmax and entropy.
 *
 * Used by SoftmaxWidget.vue (Primer Part B) to demonstrate how temperature
 * trades off greedy (peaked) vs. exploratory (uniform) action selection.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Compute the temperature-scaled softmax of a logit array.
 *
 * Formula: p_i = exp(z_i / T) / Σ_j exp(z_j / T)
 *
 * Numerically stable: subtracts the maximum logit before exponentiation
 * so that the largest exponent is always exp(0) = 1, preventing overflow.
 *
 * @param {number[]} logits - raw scores (unnormalised log-probs), length ≥ 1
 * @param {number}   [T=1]  - temperature (must be > 0)
 * @returns {number[]}        probability distribution that sums to 1
 */
export function softmax(logits, T = 1) {
  const max = Math.max(...logits);
  const exps = logits.map(z => Math.exp((z - max) / T));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / total);
}

/**
 * Compute the (natural-log) Shannon entropy of a probability distribution.
 *
 * H(p) = -Σ_i p_i · ln(p_i)
 *
 * The convention 0 · ln(0) = 0 is enforced by skipping zero-probability
 * terms, consistent with the limit lim_{p→0⁺} p ln p = 0.
 *
 * @param {number[]} probs - probability distribution; entries should sum to 1
 * @returns {number}         entropy in nats (natural-log base), ≥ 0
 */
export function entropy(probs) {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}
