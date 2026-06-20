/**
 * wm.js — pure numeric core for the world-model dream-rollout widget (W: wm, L8).
 *
 * Ported VERBATIM from the wm IIFE in reference/robot-learning-companion.html
 * lines 2799–2824. Two model curves — latent-space and pixel-space — express
 * how dream-vs-reality divergence accumulates with rollout horizon h.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Accumulated divergence of a compact latent model after h imagined steps.
 *
 * Original: function latent(h){ return 1 - Math.exp(-eps * h); }
 *
 * Models divergence as 1 − e^(−eps·h): starts at 0, saturates to 1.
 * The decay constant eps is the per-step model error.
 *
 * @param {number} h   - rollout horizon (steps imagined)
 * @param {number} eps - per-step model error (default 0.05 from original)
 * @returns {number} divergence in [0, 1)
 */
export function latentDivergence(h, eps) {
  return 1 - Math.exp(-eps * h);
}

/**
 * Accumulated divergence of a pixel-space model after h imagined steps.
 *
 * Original: function pixel(h){ return 1 - Math.exp(-eps * Math.pow(h, 1.4) / 3); }
 *
 * Same exponential form but with a superlinear horizon (h^1.4 / 3), reflecting
 * that pixel prediction errors compound faster than latent errors.
 *
 * @param {number} h   - rollout horizon (steps imagined)
 * @param {number} eps - per-step model error
 * @returns {number} divergence in [0, 1)
 */
export function pixelDivergence(h, eps) {
  return 1 - Math.exp(-eps * Math.pow(h, 1.4) / 3);
}

/**
 * The largest horizon h in [0, Hmax] at which latentDivergence(h, eps) <= 0.3.
 * Used by the widget to shade the "trustworthy zone".
 *
 * Original (inline in draw()):
 *   var hUse=0,hh; for(hh=0;hh<=Hmax;hh++){if(latent(hh)<=0.3)hUse=hh;}
 *
 * @param {number} eps  - per-step model error
 * @param {number} Hmax - maximum horizon to scan
 * @returns {number} largest h in [0, Hmax] where latent divergence <= 0.3
 */
export function trustworthyHorizon(eps, Hmax) {
  var hUse = 0;
  for (var hh = 0; hh <= Hmax; hh++) {
    if (latentDivergence(hh, eps) <= 0.3) hUse = hh;
  }
  return hUse;
}
