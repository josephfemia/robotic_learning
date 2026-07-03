/**
 * latency.js — pure numeric core for the reasoning-latency widget (W: latency, L10 §10.4).
 *
 * Model: a policy tracks a smoothly drifting 1-D target at a fixed control rate
 * (TICK_MS per tick, i.e. 50 Hz). Each decision costs a thinking budget:
 *
 *   - MORE budget → BETTER decision: the aim-point noise shrinks,
 *       σ(budget) = noise0 · noiseHalfMs / (noiseHalfMs + budgetMs)
 *   - MORE budget → STALER decision: the action executed now was computed from
 *     the world as it was `delaySteps = round(budgetMs / TICK_MS)` ticks ago.
 *
 * Update rule (classic delayed proportional feedback — lags, then rings):
 *
 *   aim(t)  = target(t − d) + σ · ε(t),   ε ~ N(0,1) (seeded)
 *   x(t+1)  = x(t) + gain · (aim(t) − x(t − d)),   clamped to ±3
 *
 * The gain scales with world speed (a faster world demands a hotter controller:
 * gain = baseGain · (0.5 + speed)), so delayed feedback destabilizes at a
 * SMALLER delay when the world is fast — that, plus stale-target error growing
 * like speed × delay, is what drags the optimum budget left as speed rises.
 *
 * Success = fraction of post-warmup ticks with |x − target| ≤ band.
 * The success-vs-budget curve has an interior optimum that moves toward zero
 * as world speed rises (stale-target error grows like speed × delay).
 *
 * No DOM dependencies — pure ES module, everything seeded/deterministic.
 */

/** Control-loop period in ms (50 Hz). */
export const TICK_MS = 20;

/** Rough decode speed: 2 ms per thought-token (≈500 tok/s). */
export const MS_PER_TOKEN = 2;

/** Mulberry32 seeded PRNG → uniform [0,1). */
export function mulberry32(seed) {
  var s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller standard normal driven by a uniform rng. */
export function makeRandn(rng) {
  return function () {
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/**
 * Seeded smooth target drift: sum of three sinusoids with seeded phases.
 * Speed scales every frequency, so a faster world drifts (and turns) faster.
 *
 * @param {number} T     - number of ticks
 * @param {number} speed - world-speed multiplier (1 = default)
 * @param {Function} rng - uniform [0,1) source (consumes exactly 3 draws)
 * @returns {number[]} T positions, roughly in [-1, 1]
 */
export function targetTrack(T, speed, rng) {
  var amps = [0.55, 0.30, 0.15];
  var freqs = [0.013, 0.029, 0.061]; // rad per tick at speed 1
  var ph = [rng() * 2 * Math.PI, rng() * 2 * Math.PI, rng() * 2 * Math.PI];
  var out = new Array(T);
  for (var t = 0; t < T; t++) {
    out[t] = amps[0] * Math.sin(freqs[0] * speed * t + ph[0])
           + amps[1] * Math.sin(freqs[1] * speed * t + ph[1])
           + amps[2] * Math.sin(freqs[2] * speed * t + ph[2]);
  }
  return out;
}

/** Decision-noise std as a function of thinking budget (ms). */
export function decisionNoise(budgetMs, noise0, noiseHalfMs) {
  noise0 = noise0 == null ? 1.5 : noise0;
  noiseHalfMs = noiseHalfMs == null ? 40 : noiseHalfMs;
  return noise0 * noiseHalfMs / (noiseHalfMs + budgetMs);
}

/**
 * Run the delayed-feedback tracking simulation.
 *
 * @param {object} [opts]
 * @param {number} [opts.budgetMs=0]  - thinking budget per decision, ms
 * @param {number} [opts.speed=1]     - world-speed multiplier
 * @param {number} [opts.seed=7]      - PRNG seed (target phases + decision noise)
 * @param {number} [opts.T=420]       - ticks to simulate
 * @param {number} [opts.baseGain=0.14] - gain per tick is baseGain·(0.5+speed)
 * @param {number} [opts.noise0=1.5]  - decision-noise std at zero budget
 * @param {number} [opts.noiseHalfMs=40] - budget at which noise halves
 * @param {number} [opts.band=0.28]   - "on target" tolerance
 * @param {number} [opts.warmup=40]   - ticks excluded from the score
 * @returns {{target:number[], tracker:number[], delaySteps:number, sigma:number, success:number}}
 */
export function simulate(opts) {
  opts = opts || {};
  var budgetMs = opts.budgetMs || 0;
  var speed = opts.speed == null ? 1 : opts.speed;
  var seed = opts.seed == null ? 7 : opts.seed;
  var T = opts.T == null ? 420 : opts.T;
  var baseGain = opts.baseGain == null ? 0.14 : opts.baseGain;
  var gain = baseGain * (0.5 + speed);
  var band = opts.band == null ? 0.28 : opts.band;
  var warmup = opts.warmup == null ? 40 : opts.warmup;

  var rng = mulberry32(seed);
  var randn = makeRandn(rng);
  var target = targetTrack(T, speed, rng);
  var d = Math.round(budgetMs / TICK_MS);
  var sigma = decisionNoise(budgetMs, opts.noise0, opts.noiseHalfMs);

  var x = new Array(T);
  x[0] = 0;
  var hit = 0, n = 0;
  for (var t = 0; t < T - 1; t++) {
    var j = Math.max(0, t - d);           // world state the decision was computed from
    var aim = target[j] + sigma * randn(); // decision quality bought by the budget
    x[t + 1] = clamp(x[t] + gain * (aim - x[j]), -3, 3);
  }
  for (var k = warmup; k < T; k++) {
    n++;
    if (Math.abs(x[k] - target[k]) <= band) hit++;
  }
  return { target: target, tracker: x, delaySteps: d, sigma: sigma, success: n ? hit / n : 0 };
}

/** Default budget grid: 0..400 ms in 20 ms (one-tick) steps. */
export function defaultBudgets() {
  var b = [];
  for (var v = 0; v <= 400; v += 20) b.push(v);
  return b;
}

/**
 * Success-vs-budget curve, averaged over a few seeds so the interior optimum
 * is a property of the model, not of one noise draw.
 *
 * @param {object} [opts] - { speed, seed, budgetsMs, nSeeds } + simulate() opts
 * @returns {{budgetMs:number, success:number}[]}
 */
export function successCurve(opts) {
  opts = opts || {};
  var speed = opts.speed == null ? 1 : opts.speed;
  var seed = opts.seed == null ? 7 : opts.seed;
  var budgets = opts.budgetsMs || defaultBudgets();
  var nSeeds = opts.nSeeds == null ? 5 : opts.nSeeds;
  return budgets.map(function (b) {
    var s = 0;
    for (var i = 0; i < nSeeds; i++) {
      s += simulate({
        budgetMs: b, speed: speed, seed: seed + 101 * i,
        T: opts.T, baseGain: opts.baseGain, noise0: opts.noise0,
        noiseHalfMs: opts.noiseHalfMs, band: opts.band, warmup: opts.warmup,
      }).success;
    }
    return { budgetMs: b, success: s / nSeeds };
  });
}

/** Budget (ms) at the curve's maximum success (first max on ties). */
export function optimumBudget(curve) {
  var best = curve[0];
  for (var i = 1; i < curve.length; i++) {
    if (curve[i].success > best.success) best = curve[i];
  }
  return best.budgetMs;
}
