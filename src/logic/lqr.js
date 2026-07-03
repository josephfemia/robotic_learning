/**
 * lqr.js — pure numeric core for the LQR widget (W: lqr, L2 §2.2).
 *
 * The plant is the SAME discrete mass-damper the PID widget drives
 * (pid.js: dt=0.02, natural damping 0.6, m=1), rewritten in state-space
 * form around the target. State z = [position − target, velocity]:
 *
 *   z_{t+1} = A z_t + B u_t
 *   A = [[1, dt], [0, 1 − 0.6·dt]] = [[1, 0.02], [0, 0.988]]
 *   B = [0, dt] = [0, 0.02]
 *
 * Cost: c = zᵀQz + r·u²  with  Q = diag(q, 0)  (position error only) and
 * scalar effort weight r. The widget's single knob is log10(q/r), r ≡ 1.
 *
 * `riccati` iterates the discrete-time Riccati recursion
 *
 *   P ← Q + AᵀPA − AᵀPB (r + BᵀPB)⁻¹ BᵀPA
 *
 * to its stationary point and returns the optimal state-feedback gain
 *
 *   K = (r + BᵀPB)⁻¹ BᵀPA,   u = −Kz.
 *
 * `rollout` runs the closed loop from the fixed initial offset
 * z0 = [−1, 0] (mass one unit below the target, at rest — the PID lab's
 * starting picture). `costToGo` evaluates V(z) = zᵀPz; for z0 the realized
 * rollout cost matches it to ~6 decimals (verified when the tests were pinned).
 *
 * No DOM dependencies — pure ES module, vitest-pinned in lqr.test.js.
 */

export const DT = 0.02;
export const DAMPING = 0.6;
export const MASS = 1;
export const TARGET = 1;
/** Rollout horizon (600 steps × 0.02 s = 12 s of simulated time). */
export const T = 600;
/** Initial state: one unit below the target, at rest. */
export const Z0 = [-1, 0];

/** Discrete dynamics z' = Az + Bu (Euler, matching pid.js exactly). */
export const A = [[1, DT], [0, 1 - DAMPING * DT / MASS]];
export const B = [0, DT / MASS];

/**
 * Iterate the discrete-time Riccati recursion to its stationary point.
 *
 * @param {number} q - state-error weight (Q = diag(q, 0))
 * @param {number} r - effort weight (scalar R)
 * @returns {{ P: number[][], K: number[], iters: number }}
 *   P — stationary cost-to-go matrix (V(z) = zᵀPz)
 *   K — optimal gain row [k_pos, k_vel], u = −Kz
 *   iters — recursion sweeps until convergence (tol 1e-12)
 */
export function riccati(q, r) {
  var P = [[q, 0], [0, 0]];
  var iters = 0;
  for (; iters < 20000; iters++) {
    // PA = P·A
    var PA = [
      [P[0][0] * A[0][0] + P[0][1] * A[1][0], P[0][0] * A[0][1] + P[0][1] * A[1][1]],
      [P[1][0] * A[0][0] + P[1][1] * A[1][0], P[1][0] * A[0][1] + P[1][1] * A[1][1]],
    ];
    // BᵀP (row), BᵀPA (row), PB (column) — B is a column 2-vector
    var BtP = [B[0] * P[0][0] + B[1] * P[1][0], B[0] * P[0][1] + B[1] * P[1][1]];
    var BtPA = [B[0] * PA[0][0] + B[1] * PA[1][0], B[0] * PA[0][1] + B[1] * PA[1][1]];
    var PB = [P[0][0] * B[0] + P[0][1] * B[1], P[1][0] * B[0] + P[1][1] * B[1]];
    var AtPB = [A[0][0] * PB[0] + A[1][0] * PB[1], A[0][1] * PB[0] + A[1][1] * PB[1]];
    var S = r + BtP[0] * B[0] + BtP[1] * B[1];
    // AᵀPA
    var AtPA = [
      [A[0][0] * PA[0][0] + A[1][0] * PA[1][0], A[0][0] * PA[0][1] + A[1][0] * PA[1][1]],
      [A[0][1] * PA[0][0] + A[1][1] * PA[1][0], A[0][1] * PA[0][1] + A[1][1] * PA[1][1]],
    ];
    var Pn = [
      [q + AtPA[0][0] - AtPB[0] * BtPA[0] / S, AtPA[0][1] - AtPB[0] * BtPA[1] / S],
      [AtPA[1][0] - AtPB[1] * BtPA[0] / S, AtPA[1][1] - AtPB[1] * BtPA[1] / S],
    ];
    var d = Math.max(
      Math.abs(Pn[0][0] - P[0][0]), Math.abs(Pn[0][1] - P[0][1]),
      Math.abs(Pn[1][0] - P[1][0]), Math.abs(Pn[1][1] - P[1][1])
    );
    P = Pn;
    if (d < 1e-12) break;
  }
  var BtPf = [B[0] * P[0][0] + B[1] * P[1][0], B[0] * P[0][1] + B[1] * P[1][1]];
  var Sf = r + BtPf[0] * B[0] + BtPf[1] * B[1];
  var K = [
    (BtPf[0] * A[0][0] + BtPf[1] * A[1][0]) / Sf,
    (BtPf[0] * A[0][1] + BtPf[1] * A[1][1]) / Sf,
  ];
  return { P: P, K: K, iters: iters };
}

/**
 * Closed-loop rollout u = −Kz from the fixed initial offset Z0.
 *
 * @param {number[]} K - gain row from riccati()
 * @param {number} [steps=T] - number of simulation steps
 * @returns {{ pos: number[], u: number[] }}
 *   pos — absolute position TARGET + z[0] (starts at 0, converges to 1 —
 *         the PID widget's exact visual idiom)
 *   u — control effort applied at each step
 */
export function rollout(K, steps) {
  var n = steps || T;
  var z = [Z0[0], Z0[1]];
  var pos = [], u = [];
  for (var i = 0; i < n; i++) {
    var ui = -(K[0] * z[0] + K[1] * z[1]);
    u.push(ui);
    z = [
      A[0][0] * z[0] + A[0][1] * z[1] + B[0] * ui,
      A[1][0] * z[0] + A[1][1] * z[1] + B[1] * ui,
    ];
    pos.push(TARGET + z[0]);
  }
  return { pos: pos, u: u };
}

/**
 * Evaluate the quadratic cost-to-go V(z) = zᵀPz.
 *
 * @param {number[][]} P - stationary Riccati matrix
 * @param {number[]} [z=Z0] - state
 * @returns {number}
 */
export function costToGo(P, z) {
  var s = z || Z0;
  return P[0][0] * s[0] * s[0] + (P[0][1] + P[1][0]) * s[0] * s[1] + P[1][1] * s[1] * s[1];
}

/**
 * Widget convenience: everything the stage needs for one log10(q/r) setting.
 *
 * @param {number} logRatio - log10(q/r), with r fixed at 1
 * @returns {{ q: number, r: number, K: number[], P: number[][], J: number,
 *             pos: number[], u: number[] }}
 */
export function solve(logRatio) {
  var q = Math.pow(10, logRatio), r = 1;
  var res = riccati(q, r);
  var traj = rollout(res.K);
  return { q: q, r: r, K: res.K, P: res.P, J: costToGo(res.P), pos: traj.pos, u: traj.u };
}
