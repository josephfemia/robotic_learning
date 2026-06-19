/**
 * meanCollapse.js — pure numeric core for the multimodal mean-collapse widget (W: mean, L3).
 *
 * Ported from the mean IIFE in reference/robot-learning-companion.html
 * lines 2512–2536.
 *
 * The widget is predominantly visual: two Gaussian humps representing demo
 * clusters at action = −0.6 and +0.6, an obstacle at 0, and either a
 * unimodal MSE policy (Gaussian centred at 0) or a generative policy
 * (scatter of samples from each mode). The extracted numeric core is the
 * Gaussian density used for both the demo humps and the MSE prediction curve,
 * plus the two mode centres and the MSE mean (always 0 for symmetric modes).
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Gaussian density (unnormalized, peak = 1) with a given centre and variance.
 *
 * Used by the widget for BOTH the demo humps and the MSE prediction curve:
 *   Demo hump:   gaussian(a, cx, 0.01)   — cx = ±0.6, sigma² = 0.01
 *   MSE curve:   gaussian(a, 0, 0.0016)  — mean = 0,  sigma² = 0.0016
 *
 * Original (inline in hump() and MSE branch):
 *   var g = Math.exp(-Math.pow(a - cx, 2) / (2 * 0.01));
 *   var g = Math.exp(-Math.pow(a, 2) / (2 * 0.0016));
 *
 * @param {number} a       - action value (x-axis, range −1 to +1)
 * @param {number} centre  - Gaussian centre
 * @param {number} sigma2  - Gaussian variance (sigma²)
 * @returns {number} unnormalized density in [0, 1]
 */
export function gaussian(a, centre, sigma2) {
  return Math.exp(-Math.pow(a - centre, 2) / (2 * sigma2));
}

/**
 * The two demo mode centres from the original.
 * Hard-coded in the original as cx = −0.6 and cx = +0.6.
 */
export var MODE_LEFT = -0.6;
export var MODE_RIGHT = 0.6;

/**
 * Variance used for each demo hump in the original.
 * Hard-coded as 0.01 in hump().
 */
export var DEMO_SIGMA2 = 0.01;

/**
 * Variance used for the MSE single-Gaussian prediction in the original.
 * Hard-coded as 0.0016 in the MSE branch.
 */
export var MSE_SIGMA2 = 0.0016;

/**
 * The MSE policy's predicted action when trained on two symmetric modes.
 *
 * With modes at ±centre (equal weight), the MSE minimizer is 0 — the
 * arithmetic mean — regardless of centre.
 *
 * @param {number} modeLeft  - left mode centre (e.g. −0.6)
 * @param {number} modeRight - right mode centre (e.g. +0.6)
 * @returns {number} MSE-optimal action (always the midpoint)
 */
export function msePrediction(modeLeft, modeRight) {
  return (modeLeft + modeRight) / 2;
}
