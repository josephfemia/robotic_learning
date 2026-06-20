/**
 * deadlyTriad.js — pure numeric core for the deadly-triad widget (W: triad, L4).
 *
 * Ported VERBATIM from the triad IIFE in reference/robot-learning-companion.html
 * lines 3268–3308. This is the Sutton & Barto §11.2 two-state construction:
 *   v(s) = w,  v(s') = 2w  (one shared weight w, feature x(s)=1, x(s')=2)
 *
 * The three legs that together cause divergence:
 *   fa   — Function approximation: both states share a single weight w
 *   boot — Bootstrapping: TD target built from current estimates, not real returns
 *   off  — Off-policy data: the corrective s'→ transition is never sampled
 *
 * With all three on, the weight update on s→s' yields:
 *   delta = gamma*v(s') - v(s) = (2*gamma - 1)*w
 *   w += alpha * delta * 1    (gradient of (w·1 = v(s)) w.r.t. w is 1)
 * So w grows geometrically when 2*gamma - 1 > 0, which is true for gamma ≥ 0.5.
 *
 * Drop any single leg and it stays bounded.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Run the two-state training simulation and return the value-estimate history.
 *
 * Original run() function, lines 3275–3287, reproduced character-for-character
 * except variable declarations split for readability.
 *
 * @param {boolean} fa   - function approximation on (shared weight)
 * @param {boolean} boot - bootstrapping on (TD targets)
 * @param {boolean} off  - off-policy data on (s'→ transition never sampled)
 * @returns {Array<[number, number]>} hist — array of [v(s), v(s')] pairs per step
 */
export function runTriad(fa, boot, off) {
  var w = 1.0, wTab = [1, 2], alpha = 0.1, gamma = 0.99, steps = 120, hist = [];
  function vs()  { return fa ? w      : wTab[0]; }
  function vsp() { return fa ? 2 * w  : wTab[1]; }
  for (var t = 0; t < steps; t++) {
    hist.push([vs(), vsp()]);
    var target = boot ? gamma * vsp() : 0; var delta = target - vs();
    if (fa) { w += alpha * delta * 1; } else { wTab[0] += alpha * delta; }
    if (!off) { var t2 = boot ? gamma * vs() : 0; var d2 = t2 - vsp(); if (fa) { w += alpha * d2 * 2; } else { wTab[1] += alpha * d2; } }
    if (!isFinite(vs()) || Math.abs(vs()) > 1e9) break;
  }
  return hist;
}

/**
 * Return true if the simulation diverges (weight grows unbounded).
 * Uses the same guard as the IIFE: maxv > 1000 signals divergence.
 *
 * @param {boolean} fa
 * @param {boolean} boot
 * @param {boolean} off
 * @returns {boolean}
 */
export function isDiverging(fa, boot, off) {
  var hist = runTriad(fa, boot, off);
  var maxv = 0;
  for (var t = 0; t < hist.length; t++) {
    for (var i = 0; i < hist[t].length; i++) {
      var a = Math.abs(hist[t][i]);
      if (isFinite(a)) maxv = Math.max(maxv, a);
    }
  }
  return maxv > 1000;
}
