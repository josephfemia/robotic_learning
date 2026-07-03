/**
 * wm.js — pure numeric core for the world-model dream-rollout widget (W: wm, L8).
 *
 * latentDivergence / pixelDivergence / trustworthyHorizon were ported VERBATIM
 * from the wm IIFE in reference/robot-learning-companion.html lines 2799–2824.
 * Two model curves — latent-space and pixel-space — express how dream-vs-reality
 * divergence accumulates with rollout horizon h.
 *
 * Phase-3 (F4) additions: a seeded RNG (mulberry32/randnFrom) and rolloutFan,
 * which ENACTS the compounding process as a bundle of imagined trajectories
 * whose RMS spread at horizon h equals the closed-form divergence curve — the
 * curves become the statistical envelope of an actual fan of dreams.
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

/**
 * mulberry32 — tiny deterministic PRNG. Same seed → same sequence, values
 * uniform in [0, 1). Used so the rollout fan is reproducible (vitest-pinnable)
 * and stable while the ε slider is dragged.
 *
 * @param {number} seed - any 32-bit integer
 * @returns {Function} rng() → number in [0, 1)
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
 * randnFrom — Box–Muller standard normal variate drawn from an injectable
 * uniform rng (deterministic when the rng is seeded).
 *
 * @param {Function} rng - uniform [0,1) source, e.g. mulberry32(seed)
 * @returns {number} standard normal sample
 */
export function randnFrom(rng) {
  var u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * rolloutFan — a bundle of n imagined rollouts, each a Gaussian random walk
 * whose per-step increment std is chosen so the *cumulative* std at horizon h
 * exactly equals the closed-form divergence envelope:
 *
 *   step variance at h = div(h)² − div(h−1)²   (≥ 0: div is monotone)
 *   ⇒ E[offset(h)²] = div(h)²
 *
 * So the fan's RMS half-width IS latentDivergence / pixelDivergence — the
 * compounding process, enacted. Offsets are dream-vs-reality deviations
 * (0 = still on the real trajectory); they are unclamped raw values.
 *
 * @param {number} n     - number of imagined trajectories
 * @param {number} Hmax  - rollout length (each trajectory has Hmax+1 entries)
 * @param {number} eps   - per-step model error
 * @param {string} space - 'latent' or 'pixel' (selects the divergence envelope)
 * @param {number} seed  - PRNG seed (default 1)
 * @returns {number[][]} n trajectories; traj[h] = signed offset after h steps, traj[0] = 0
 */
export function rolloutFan(n, Hmax, eps, space, seed) {
  var divFn = space === 'pixel' ? pixelDivergence : latentDivergence;
  var rng = mulberry32(seed === undefined ? 1 : seed);
  var fan = [];
  for (var i = 0; i < n; i++) {
    var traj = [0], d = 0, prev = 0;
    for (var h = 1; h <= Hmax; h++) {
      var cur = divFn(h, eps);
      var stepSd = Math.sqrt(Math.max(0, cur * cur - prev * prev));
      d += randnFrom(rng) * stepSd;
      prev = cur;
      traj.push(d);
    }
    fan.push(traj);
  }
  return fan;
}
