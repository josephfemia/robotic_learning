/**
 * reparam.js — pure numeric core for the score-function vs reparameterization widget (W: reparam, L5).
 *
 * Ported VERBATIM from the reparam IIFE in reference/robot-learning-companion.html
 * lines 2691–2713. Implements both gradient estimators for the same objective.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Objective function: f(a) = -(a-1)²
 *
 * Original (line 2693): function f(a){ return -Math.pow(a-1,2); }
 *
 * @param {number} a - action
 * @returns {number}
 */
export function objective(a) {
  return -Math.pow(a - 1, 2);
}

/**
 * Derivative of objective: f'(a) = -2(a-1)
 *
 * Original (line 2693): function fp(a){ return -2*(a-1); }
 *
 * @param {number} a - action
 * @returns {number}
 */
export function objectiveGrad(a) {
  return -2 * (a - 1);
}

/**
 * Score-function (REINFORCE) gradient estimate for one sample.
 *
 * Original (line 2695):
 *   var e=R.randn(), a=mu+sigma*e;
 *   sf.push(f(a)*(a-mu)/(sigma*sigma));
 *
 * Estimate of ∇_μ E[f(a)] via likelihood-ratio trick:
 *   f(a) * ∇_μ log π(a|μ,σ) = f(a) * (a-μ)/σ²
 *
 * @param {number} a     - sampled action (mu + sigma * epsilon)
 * @param {number} mu    - policy mean
 * @param {number} sigma - policy std
 * @returns {number} score-function estimate
 */
export function scoreFunctionEstimate(a, mu, sigma) {
  return objective(a) * (a - mu) / (sigma * sigma);
}

/**
 * Reparameterization gradient estimate for one sample.
 *
 * Original (line 2695):
 *   rp.push(fp(a));
 *
 * Estimate of ∇_μ E[f(μ + σ·ε)] = E[f'(μ + σ·ε)] via the reparameterization trick.
 * Since a = μ + σ·ε and ∂a/∂μ = 1, the gradient equals f'(a) exactly.
 *
 * @param {number} a - sampled action (mu + sigma * epsilon)
 * @returns {number} reparameterized estimate
 */
export function reparamEstimate(a) {
  return objectiveGrad(a);
}

/**
 * Compute mean and variance of an array.
 *
 * Original (lines 2696–2697):
 *   function vstat(arr){var m=0,i; for(i=0;i<arr.length;i++) m+=arr[i]; m/=arr.length;
 *     var v=0; for(i=0;i<arr.length;i++) v+=(arr[i]-m)*(arr[i]-m); v/=arr.length;
 *     return {m:m,v:v};}
 *
 * @param {number[]} arr
 * @returns {{ mean: number, variance: number }}
 */
export function vstat(arr) {
  var m = 0, i;
  for (i = 0; i < arr.length; i++) m += arr[i];
  m /= arr.length;
  var v = 0;
  for (i = 0; i < arr.length; i++) v += (arr[i] - m) * (arr[i] - m);
  v /= arr.length;
  return { mean: m, variance: v };
}

/**
 * True gradient of E[f(a)] with respect to mu.
 * a ~ N(mu, sigma²), f(a) = -(a-1)²
 * ∇_μ E[f(a)] = -2*(mu-1)
 *
 * Original (line 2697): var trueG = -2*(mu-1)
 *
 * @param {number} mu - policy mean
 * @returns {number}
 */
export function trueGradient(mu) {
  return -2 * (mu - 1);
}
