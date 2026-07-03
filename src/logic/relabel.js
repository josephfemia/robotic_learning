/**
 * relabel.js — pure numeric core for the hindsight-relabeling widget
 * (G7: manufacturing supervision from play, L9 §9.2).
 *
 * The widget shows ONE pinned meandering "play" trajectory in a top-down
 * kitchen. Any window of the stream is already a perfect demonstration of
 * reaching its own endpoint — so window-slicing math IS the dataset math:
 * a single unlabeled stream yields windowCount(...) goal-conditioned demos.
 *
 * Core invariants:
 *   - The trajectory is deterministic (a pinned sum of incommensurate
 *     sinusoids — a seeded Lissajous-style meander), smooth (consecutive
 *     samples < 0.02 apart in unit space), and stays inside the unit square
 *     with margin, so goal flags and landmark blobs never clip.
 *   - windowCount(n, len, stride) counts windows [s, s+len] with valid
 *     endpoints: floor((n-1-len)/stride) + 1, or 0 if len > n-1.
 *
 * No DOM dependencies — pure ES module, vitest-pinned in relabel.test.js.
 */

/** Default number of samples in the play stream (≈10 min at one sample / 2 s). */
export const N_PLAY = 300;

/**
 * Pinned play-trajectory sample i of an n-sample stream, in unit space.
 *
 * Sum of three incommensurate sinusoids per axis — smooth, aimless,
 * self-crossing meander that fills the kitchen without leaving it.
 *
 * @param {number} i - sample index in [0, n-1]
 * @param {number} [n=N_PLAY] - total samples in the stream
 * @returns {{x: number, y: number}} position in the unit square
 */
export function point(i, n = N_PLAY) {
  var u = i / (n - 1);
  return {
    x: 0.5 + 0.30 * Math.sin(6.2 * u + 1.7) + 0.12 * Math.sin(14.9 * u + 0.4) + 0.05 * Math.sin(33.0 * u + 2.1),
    y: 0.5 + 0.28 * Math.cos(5.1 * u + 0.6) + 0.13 * Math.sin(12.3 * u + 2.8) + 0.05 * Math.cos(29.0 * u + 1.0),
  };
}

/**
 * The full pinned trajectory as an array of {x, y} samples.
 *
 * @param {number} [n=N_PLAY] - number of samples
 * @returns {{x: number, y: number}[]}
 */
export function trajectory(n = N_PLAY) {
  var pts = new Array(n);
  for (var i = 0; i < n; i++) pts[i] = point(i, n);
  return pts;
}

/**
 * How many hindsight demos one stream yields: windows [s, s+len] whose
 * endpoint s+len is a real sample, s stepping by `stride` from 0.
 *
 * @param {number} n      - samples in the stream
 * @param {number} len    - window length in samples (endpoint = start + len)
 * @param {number} stride - step between window starts
 * @returns {number} demo count; 0 if the window doesn't fit
 */
export function windowCount(n, len, stride) {
  var maxStart = n - 1 - len;
  if (maxStart < 0) return 0;
  return Math.floor(maxStart / stride) + 1;
}

/**
 * Endpoint sample index of the window starting at `start` — the hindsight goal.
 *
 * @param {number} start - window start sample
 * @param {number} len   - window length in samples
 * @param {number} n     - samples in the stream
 * @returns {number} endpoint index, clamped to the last sample
 */
export function windowEnd(start, len, n) {
  return Math.min(start + len, n - 1);
}

/**
 * Clamp a window start so the whole window [start, start+len] fits the stream.
 *
 * @param {number} start - requested window start
 * @param {number} len   - window length in samples
 * @param {number} n     - samples in the stream
 * @returns {number} start clamped to [0, max(0, n-1-len)]
 */
export function clampStart(start, len, n) {
  var maxStart = Math.max(0, n - 1 - len);
  return start < 0 ? 0 : (start > maxStart ? maxStart : start);
}

export default { N_PLAY, point, trajectory, windowCount, windowEnd, clampStart };
