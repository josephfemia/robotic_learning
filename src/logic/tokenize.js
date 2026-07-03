/**
 * tokenize.js — pure numeric core for the action-tokenization widget (W: tokenize, L7 §7.5).
 *
 * Models the two costs of per-dimension action binning (RT-1/RT-2 style):
 *   1. Quantization error — actions snap to grid centers; error shrinks as bins grow.
 *   2. Factorization — an independent per-dimension softmax can only represent the
 *      outer product of its marginals, which puts mass on action combinations
 *      ("phantom cells") no demonstrator ever produced.
 *
 * The demonstrator's actions are a correlated 2-D Gaussian ridge along the main
 * diagonal ("reach further ⇒ open gripper wider"), seeded for reproducibility.
 *
 * No DOM dependencies — pure ES module, vitest-pinned in tokenize.test.js.
 */

/** Default sample-cloud parameters shared by the widget and the tests. */
export var RIDGE = {
  n: 160,          // number of demonstrator actions
  seed: 42,        // PRNG seed
  cx: 0.5,         // ridge center (both dims)
  cy: 0.5,
  sAlong: 0.26,    // std-dev along the diagonal
  sPerp: 0.055,    // std-dev perpendicular to it (thin ridge ⇒ strong correlation)
  lo: 0.02,        // clamp bounds keeping samples inside the unit action square
  hi: 0.98,
};

/**
 * mulberry32 — tiny seeded PRNG, Math.random()-compatible output in [0, 1).
 *
 * @param {number} seed - 32-bit integer seed
 * @returns {function(): number}
 */
export function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box–Muller normal variate built on an injected uniform generator
 * (same construction as rllab's randn, but seedable).
 *
 * @param {function(): number} rand - uniform [0,1) generator
 * @returns {function(): number} standard-normal generator
 */
export function makeRandn(rand) {
  return function () {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/**
 * Seeded correlated 2-D action cloud: a Gaussian ridge along the main diagonal.
 * x = "reach distance", y = "gripper width"; positive correlation by construction.
 *
 * @param {number} [n=RIDGE.n]     - number of samples
 * @param {number} [seed=RIDGE.seed]
 * @returns {{x: number, y: number}[]} samples clamped to [RIDGE.lo, RIDGE.hi]²
 */
export function ridgeSamples(n, seed) {
  if (n == null) n = RIDGE.n;
  if (seed == null) seed = RIDGE.seed;
  var randn = makeRandn(mulberry32(seed));
  var inv = Math.SQRT1_2; // cos 45° = sin 45°
  var out = [], i;
  for (i = 0; i < n; i++) {
    var u = randn() * RIDGE.sAlong;  // along-diagonal offset
    var v = randn() * RIDGE.sPerp;   // perpendicular offset
    var x = RIDGE.cx + (u - v) * inv;
    var y = RIDGE.cy + (u + v) * inv;
    out.push({ x: clampU(x), y: clampU(y) });
  }
  return out;
}

function clampU(v) { return v < RIDGE.lo ? RIDGE.lo : (v > RIDGE.hi ? RIDGE.hi : v); }

/**
 * Bin index of a value in [0,1] under k uniform bins.
 *
 * @param {number} v - value in [0, 1]
 * @param {number} k - bins per dimension
 * @returns {number} index in [0, k-1]
 */
export function binIndex(v, k) {
  var i = Math.floor(v * k);
  return i < 0 ? 0 : (i >= k ? k - 1 : i);
}

/**
 * Center of bin i under k uniform bins.
 *
 * @param {number} i - bin index
 * @param {number} k - bins per dimension
 * @returns {number}
 */
export function binCenter(i, k) { return (i + 0.5) / k; }

/**
 * Snap each sample to its bin center.
 *
 * @param {{x:number,y:number}[]} samples
 * @param {number} k - bins per dimension
 * @returns {{x:number,y:number,ix:number,iy:number}[]} snapped points + bin indices
 */
export function snapSamples(samples, k) {
  var out = [], i;
  for (i = 0; i < samples.length; i++) {
    var ix = binIndex(samples[i].x, k), iy = binIndex(samples[i].y, k);
    out.push({ x: binCenter(ix, k), y: binCenter(iy, k), ix: ix, iy: iy });
  }
  return out;
}

/**
 * Mean Euclidean quantization error: average distance from each sample to the
 * center of the grid cell it snaps to.
 *
 * @param {{x:number,y:number}[]} samples
 * @param {number} k - bins per dimension
 * @returns {number}
 */
export function quantError(samples, k) {
  if (!samples.length) return 0;
  var sum = 0, i;
  for (i = 0; i < samples.length; i++) {
    var dx = samples[i].x - binCenter(binIndex(samples[i].x, k), k);
    var dy = samples[i].y - binCenter(binIndex(samples[i].y, k), k);
    sum += Math.sqrt(dx * dx + dy * dy);
  }
  return sum / samples.length;
}

/**
 * Joint histogram over the k×k grid, normalized to probabilities.
 * Row-major layout: hist[iy * k + ix].
 *
 * @param {{x:number,y:number}[]} samples
 * @param {number} k - bins per dimension
 * @returns {number[]} length k*k, sums to 1 (for non-empty samples)
 */
export function jointHist(samples, k) {
  var hist = new Array(k * k).fill(0), i;
  for (i = 0; i < samples.length; i++) {
    hist[binIndex(samples[i].y, k) * k + binIndex(samples[i].x, k)] += 1;
  }
  var n = samples.length || 1;
  for (i = 0; i < hist.length; i++) hist[i] /= n;
  return hist;
}

/**
 * Per-dimension marginals of a joint histogram.
 *
 * @param {number[]} hist - k*k joint probabilities (row-major, iy*k+ix)
 * @param {number} k
 * @returns {{px: number[], py: number[]}}
 */
export function marginalsOf(hist, k) {
  var px = new Array(k).fill(0), py = new Array(k).fill(0), ix, iy;
  for (iy = 0; iy < k; iy++) {
    for (ix = 0; ix < k; ix++) {
      var p = hist[iy * k + ix];
      px[ix] += p;
      py[iy] += p;
    }
  }
  return { px: px, py: py };
}

/**
 * Outer-product-of-marginals histogram — the only distribution an independent
 * per-dimension softmax head can represent.
 *
 * @param {number[]} hist - k*k joint probabilities
 * @param {number} k
 * @returns {number[]} length k*k product distribution (sums to 1)
 */
export function productHist(hist, k) {
  var m = marginalsOf(hist, k);
  var out = new Array(k * k), ix, iy;
  for (iy = 0; iy < k; iy++) {
    for (ix = 0; ix < k; ix++) out[iy * k + ix] = m.px[ix] * m.py[iy];
  }
  return out;
}

/**
 * Phantom mass: total product-distribution probability sitting on cells the
 * joint histogram never occupied — action combinations no demonstrator took.
 *
 * @param {number[]} joint - k*k joint probabilities
 * @param {number[]} prod  - k*k product-of-marginals probabilities
 * @returns {number} mass in [0, 1]
 */
export function phantomMass(joint, prod) {
  var sum = 0, i;
  for (i = 0; i < joint.length; i++) { if (joint[i] === 0) sum += prod[i]; }
  return sum;
}

/**
 * Number of distinct grid cells the samples occupy after snapping —
 * how many representable actions survive tokenization.
 *
 * @param {{x:number,y:number}[]} samples
 * @param {number} k - bins per dimension
 * @returns {number}
 */
export function distinctCells(samples, k) {
  var seen = new Set(), i;
  for (i = 0; i < samples.length; i++) {
    seen.add(binIndex(samples[i].y, k) * k + binIndex(samples[i].x, k));
  }
  return seen.size;
}
