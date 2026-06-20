/**
 * causalConfusion.js — pure numeric core for the brake-light trap widget (W: causal, L3).
 *
 * Ported from the causal IIFE in reference/robot-learning-companion.html
 * lines 2670–2688.
 *
 * The widget shows two bar charts (training accuracy, closed-loop success)
 * that flip when the user toggles whether the brake-light feature is included
 * in the observation. The numeric core is the four hard-coded accuracy values
 * from the original plus the logic for selecting between them.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Training accuracy on logged demos.
 *
 * Original (inline in draw()):
 *   var trainAcc = incl ? 1.0 : 0.92;
 *
 * With the brake-light feature included: the network memorises
 * "brake-light on → brake" giving 100% training accuracy.
 * Without it: 92% (the network must learn the real causal signal).
 *
 * @param {boolean} includesBrakeLight - whether the observation includes the brake-light feature
 * @returns {number} training accuracy in [0, 1]
 */
export function trainingAccuracy(includesBrakeLight) {
  return includesBrakeLight ? 1.0 : 0.92;
}

/**
 * Closed-loop (deployment) success rate.
 *
 * Original (inline in draw()):
 *   var deploy = incl ? 0.06 : 0.86;
 *
 * With the brake-light: the policy learned a spurious correlation and almost
 * never initiates braking when deployed (6% success).
 * Without it: it learned the real cause — 86% success.
 *
 * @param {boolean} includesBrakeLight - whether the observation includes the brake-light feature
 * @returns {number} deployment success rate in [0, 1]
 */
export function deploymentSuccess(includesBrakeLight) {
  return includesBrakeLight ? 0.06 : 0.86;
}
