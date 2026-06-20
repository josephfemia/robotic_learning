/**
 * arm.js — pure forward-kinematics functions for the 2-link arm widget.
 *
 * These implement the math from the arm IIFE
 * (reference/robot-learning-companion.html lines 3206–3233).
 *
 * Link lengths and origin offset are taken verbatim from the IIFE:
 *   L1 = 110, L2 = 92, origin = (W/2, H*0.62) where W=560, H=380
 *   → ox = 280, oy = 235.6
 *
 * No DOM dependencies — pure ES module.
 */

/** Length of link 1 (pixels in the original SVG viewport). */
export const L1 = 110;

/** Length of link 2 (pixels in the original SVG viewport). */
export const L2 = 92;

/**
 * 2-link planar arm forward kinematics.
 *
 * Given joint angles θ1 (shoulder) and θ2 (elbow, relative to link 1),
 * returns the positions of the elbow joint and the end-effector in the
 * SVG coordinate frame (y-axis points DOWN, so sin terms are negated).
 *
 * @param {number} ox  - x-coordinate of the shoulder (base) in SVG pixels
 * @param {number} oy  - y-coordinate of the shoulder (base) in SVG pixels
 * @param {number} th1 - shoulder angle in radians
 * @param {number} th2 - elbow angle in radians (relative to link 1)
 * @returns {{ x1: number, y1: number, x2: number, y2: number }}
 *   x1/y1 = elbow position, x2/y2 = end-effector position
 */
export function forwardKinematics(ox, oy, th1, th2) {
  const x1 = ox + L1 * Math.cos(th1);
  const y1 = oy - L1 * Math.sin(th1);
  const x2 = x1 + L2 * Math.cos(th1 + th2);
  const y2 = y1 - L2 * Math.sin(th1 + th2);
  return { x1, y1, x2, y2 };
}

/**
 * End-effector position in world coordinates (with origin at the base).
 * Uses the standard planar 2-link FK formula:
 *   px = L1·cos(θ1) + L2·cos(θ1+θ2)
 *   py = L1·sin(θ1) + L2·sin(θ1+θ2)
 *
 * @param {number} th1 - shoulder angle in radians
 * @param {number} th2 - elbow angle in radians
 * @returns {{ px: number, py: number }}
 */
export function endEffectorWorld(th1, th2) {
  const px = L1 * Math.cos(th1) + L2 * Math.cos(th1 + th2);
  const py = L1 * Math.sin(th1) + L2 * Math.sin(th1 + th2);
  return { px, py };
}
