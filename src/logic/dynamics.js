/**
 * dynamics.js — Manipulator dynamics for a planar 2-link arm.
 *
 * Implements the manipulator equation:
 *   M(q)q̈ + C(q,q̇)q̇ + g(q) = τ
 *
 * Physical constants (SI units):
 *   m1  = 1.0 kg   — mass of link 1
 *   m2  = 0.5 kg   — mass of link 2
 *   L1  = 1.0 m    — length of link 1
 *   L2  = 0.8 m    — length of link 2
 *   lc1 = 0.5 m    — distance from joint 1 to center of mass of link 1 (L1/2)
 *   lc2 = 0.4 m    — distance from joint 2 to center of mass of link 2 (L2/2)
 *   I1  = m1*L1^2/12 ≈ 0.0833 kg·m²  — moment of inertia of link 1 (slender rod about center)
 *   I2  = m2*L2^2/12 ≈ 0.0267 kg·m²  — moment of inertia of link 2
 *   g   = 9.81 m/s²  — gravitational acceleration
 *
 * Derived inertia scalars (Craig / Siciliano notation):
 *   alpha = I1 + I2 + m1*lc1² + m2*(L1² + lc2²) ≈ 0.940
 *   beta  = m2 * L1 * lc2 = 0.200
 *   delta = I2 + m2 * lc2²                       ≈ 0.1067
 *
 * Mass matrix M(q):
 *   M[0][0] = alpha + 2·beta·cos(q2)
 *   M[0][1] = M[1][0] = delta + beta·cos(q2)
 *   M[1][1] = delta
 *
 * Coriolis vector C(q,q̇)q̇  (h = beta·sin(q2)):
 *   [0]: −2·h·q̇1·q̇2 − h·q̇2²
 *   [1]:  h·q̇1²
 *
 * Gravity vector g(q):
 *   [0]: (m1·lc1 + m2·L1)·g·cos(q1) + m2·lc2·g·cos(q1+q2)
 *   [1]:  m2·lc2·g·cos(q1+q2)
 *
 * References:
 *   - Siciliano et al., "Robotics: Modelling, Planning and Control" (2009), Ch. 7
 *   - Craig, "Introduction to Robotics" (2005), Ch. 6
 *
 * No DOM dependencies — pure ES module.
 */

// ---------------------------------------------------------------------------
// Physical constants
// ---------------------------------------------------------------------------

const m1  = 1.0;
const m2  = 0.5;
const L1  = 1.0;
const L2  = 0.8;
const lc1 = L1 / 2;              // 0.5
const lc2 = L2 / 2;              // 0.4
const I1  = m1 * L1 * L1 / 12;  // ≈ 0.0833
const I2  = m2 * L2 * L2 / 12;  // ≈ 0.0267
const G   = 9.81;

// Pre-computed inertia scalars
const alpha = I1 + I2 + m1 * lc1 * lc1 + m2 * (L1 * L1 + lc2 * lc2); // ≈ 0.940
const beta  = m2 * L1 * lc2;                                             // 0.200
const delta = I2 + m2 * lc2 * lc2;                                       // ≈ 0.1067

/** Exported physical constants for tests and widget display. */
export const DYNAMICS_CONSTANTS = {
  m1, m2, L1, L2, lc1, lc2, I1, I2, g: G,
  alpha, beta, delta,
};

// ---------------------------------------------------------------------------
// Core dynamics functions
// ---------------------------------------------------------------------------

/**
 * Mass (inertia) matrix M(q) — 2×2 symmetric, positive-definite.
 *
 * @param {[number, number]} q  - joint angles [q1, q2] in radians
 * @returns {[[number,number],[number,number]]}  2×2 mass matrix
 */
export function massMatrix(q) {
  const c2 = Math.cos(q[1]);
  const M00 = alpha + 2 * beta * c2;
  const M01 = delta + beta * c2;
  return [
    [M00, M01],
    [M01, delta],
  ];
}

/**
 * Coriolis and centrifugal torque vector C(q,q̇)·q̇.
 *
 * Uses the Christoffel-symbols form; h = beta·sin(q2).
 *
 * @param {[number, number]} q   - joint angles [q1, q2] in radians
 * @param {[number, number]} qd  - joint velocities [q̇1, q̇2] in rad/s
 * @returns {[number, number]}  2-vector of Coriolis/centrifugal torques (N·m)
 */
export function coriolis(q, qd) {
  const h = beta * Math.sin(q[1]);
  const qd1 = qd[0], qd2 = qd[1];
  return [
    -2 * h * qd1 * qd2 - h * qd2 * qd2,
     h * qd1 * qd1,
  ];
}

/**
 * Gravity torque vector g(q) — torque each joint must exert to hold the arm
 * stationary against gravity.
 *
 * @param {[number, number]} q  - joint angles [q1, q2] in radians
 * @returns {[number, number]}  2-vector of gravity torques (N·m)
 */
export function gravity(q) {
  const q1 = q[0], q12 = q[0] + q[1];
  return [
    (m1 * lc1 + m2 * L1) * G * Math.cos(q1) + m2 * lc2 * G * Math.cos(q12),
    m2 * lc2 * G * Math.cos(q12),
  ];
}

/**
 * Inverse dynamics: given motion, compute required joint torques.
 *   τ = M(q)·q̈ + C(q,q̇)·q̇ + g(q)
 *
 * @param {[number, number]} q    - joint angles [q1, q2] in radians
 * @param {[number, number]} qd   - joint velocities [q̇1, q̇2] in rad/s
 * @param {[number, number]} qdd  - joint accelerations [q̈1, q̈2] in rad/s²
 * @returns {[number, number]}  required torques [τ1, τ2] in N·m
 */
export function inverseDynamics(q, qd, qdd) {
  const M = massMatrix(q);
  const C = coriolis(q, qd);
  const gv = gravity(q);
  return [
    M[0][0] * qdd[0] + M[0][1] * qdd[1] + C[0] + gv[0],
    M[1][0] * qdd[0] + M[1][1] * qdd[1] + C[1] + gv[1],
  ];
}
