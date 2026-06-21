/**
 * bellman.test.js — TDD-first tests for the generic Bellman MDP logic.
 *
 * MDP representation used throughout:
 *   S states indexed 0..n-1
 *   P[s][s'] = transition probability from state s to state s' (under a fixed policy)
 *   r[s]     = immediate reward in state s
 *   gamma    = discount factor
 *
 * Reference: V = (I − γP)^{-1} r  (matrix closed form for the fixed-policy case)
 *
 * Tests pin concrete values derived analytically from small MDPs so regressions
 * are immediately obvious.
 */

import { describe, it, expect } from 'vitest';
import { bellmanBackup, bellmanSweep, solveBellman } from './bellman.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Solve V = (I − γP)^{-1} r analytically for a small n-state system.
 * Uses Cramer/direct inversion for n=2 and n=3.
 * For n=1: V[0] = r[0] / (1 - gamma * P[0][0])
 */
function analyticV(P, r, gamma) {
  const n = r.length;
  // Build A = I - γP, solve A·V = r
  // For n=1
  if (n === 1) {
    return [r[0] / (1 - gamma * P[0][0])];
  }
  // For n=2: solve 2×2 system
  if (n === 2) {
    const a00 = 1 - gamma * P[0][0];
    const a01 = -gamma * P[0][1];
    const a10 = -gamma * P[1][0];
    const a11 = 1 - gamma * P[1][1];
    const det = a00 * a11 - a01 * a10;
    return [
      (r[0] * a11 - r[1] * a01) / det,
      (a00 * r[1] - a10 * r[0]) / det,
    ];
  }
  // For n=3: Gaussian elimination
  if (n === 3) {
    // Build augmented matrix [A | r]
    const A = P.map((row, i) =>
      row.map((v, j) => (i === j ? 1 - gamma * v : -gamma * v))
    );
    const b = [...r];
    // Forward elimination
    for (let col = 0; col < 3; col++) {
      for (let row = col + 1; row < 3; row++) {
        const factor = A[row][col] / A[col][col];
        for (let k = col; k < 3; k++) A[row][k] -= factor * A[col][k];
        b[row] -= factor * b[col];
      }
    }
    // Back substitution
    const V = [0, 0, 0];
    for (let i = 2; i >= 0; i--) {
      V[i] = b[i];
      for (let j = i + 1; j < 3; j++) V[i] -= A[i][j] * V[j];
      V[i] /= A[i][i];
    }
    return V;
  }
  throw new Error('analyticV: only n=1,2,3 supported');
}

// ---------------------------------------------------------------------------
// MDP fixtures
// ---------------------------------------------------------------------------

// ONE-STATE SELF-LOOP: V = r/(1−γ)
// P = [[1]], r = [1], gamma = 0.8  → V[0] = 1/(1-0.8) = 5
const MDP1 = {
  P: [[1]],
  r: [1],
  gamma: 0.8,
  analytic: [5],
};

// TWO-STATE CHAIN:
//   State 0 transitions to state 1 with prob 1.
//   State 1 self-loops (absorbing) with prob 1.
//   r = [0, 1], gamma = 0.9
//   V[1] = 1 / (1 - 0.9*1) = 10
//   V[0] = 0 + 0.9 * V[1] = 9
const MDP2 = {
  P: [
    [0, 1],
    [0, 1],
  ],
  r: [0, 1],
  gamma: 0.9,
  analytic: [9, 10],
};

// THREE-STATE CHAIN:
//   0 → 1 → 2 (absorbing self-loop), r = [0, 0, 1], gamma = 0.9
//   V[2] = 1/(1-0.9) = 10
//   V[1] = 0.9 * V[2] = 9
//   V[0] = 0.9 * V[1] = 8.1
const MDP3 = {
  P: [
    [0, 1, 0],
    [0, 0, 1],
    [0, 0, 1],
  ],
  r: [0, 0, 1],
  gamma: 0.9,
  analytic: [8.1, 9, 10],
};

// ---------------------------------------------------------------------------
// bellmanBackup — single-state one-step backup
// ---------------------------------------------------------------------------

describe('bellmanBackup — one-step backup for a single state', () => {
  it('one-state self-loop: backup = r + gamma * V[0] (before convergence)', () => {
    // V=[3], backup = 1 + 0.8*1*3 = 3.4
    const result = bellmanBackup([3], MDP1.P, MDP1.r, MDP1.gamma, 0);
    expect(result).toBeCloseTo(1 + 0.8 * 3, 10);
  });

  it('two-state chain, s=0: backup = r[0] + gamma * P[0][1] * V[1]', () => {
    const V = [0, 10];
    // V[0] backup = 0 + 0.9 * (0*0 + 1*10) = 9
    const result = bellmanBackup(V, MDP2.P, MDP2.r, MDP2.gamma, 0);
    expect(result).toBeCloseTo(9, 10);
  });

  it('two-state chain, s=1: backup = r[1] + gamma * P[1][1] * V[1]', () => {
    const V = [0, 10];
    // V[1] backup = 1 + 0.9 * (0*0 + 1*10) = 10
    const result = bellmanBackup(V, MDP2.P, MDP2.r, MDP2.gamma, 1);
    expect(result).toBeCloseTo(10, 10);
  });

  it('three-state chain, s=0 from V=[0,9,10]: backup = 0 + 0.9*9 = 8.1', () => {
    const V = [0, 9, 10];
    const result = bellmanBackup(V, MDP3.P, MDP3.r, MDP3.gamma, 0);
    expect(result).toBeCloseTo(8.1, 10);
  });
});

// ---------------------------------------------------------------------------
// bellmanSweep — one full sweep, moves V toward fixed point
// ---------------------------------------------------------------------------

describe('bellmanSweep — one sweep moves V toward analytic fixed point', () => {
  it('one-state: V moves toward r/(1-gamma) = 5', () => {
    const V0 = [0];
    const { V: V1, maxDelta } = bellmanSweep(V0, MDP1.P, MDP1.r, MDP1.gamma);
    // After 1 sweep: V1[0] = r[0] + gamma*P[0][0]*V0[0] = 1 + 0 = 1
    expect(V1[0]).toBeCloseTo(1, 10);
    expect(maxDelta).toBeCloseTo(1, 10);
  });

  it('two-state chain: after 1 sweep from zero, V[1] = r[1] + gamma*V[1]_old = 1', () => {
    const V0 = [0, 0];
    const { V: V1 } = bellmanSweep(V0, MDP2.P, MDP2.r, MDP2.gamma);
    // s=1 absorbing: 1 + 0.9*0 = 1
    expect(V1[1]).toBeCloseTo(1, 10);
    // s=0: 0 + 0.9*V_old[1] = 0 (uses old V)
    expect(V1[0]).toBeCloseTo(0, 10);
  });

  it('two-state chain: after 2 sweeps, V[0] moves toward 9', () => {
    let V = [0, 0];
    ({ V } = bellmanSweep(V, MDP2.P, MDP2.r, MDP2.gamma)); // V=[0,1]
    ({ V } = bellmanSweep(V, MDP2.P, MDP2.r, MDP2.gamma)); // V=[0.9, 1.9]
    expect(V[0]).toBeGreaterThan(0);
    expect(V[1]).toBeGreaterThan(1);
  });

  it('maxDelta = 0 when V is already the fixed point', () => {
    const Vstar = analyticV(MDP2.P, MDP2.r, MDP2.gamma);
    const { maxDelta } = bellmanSweep(Vstar, MDP2.P, MDP2.r, MDP2.gamma);
    expect(maxDelta).toBeLessThan(1e-10);
  });

  it('maxDelta decreases monotonically toward 0 over sweeps', () => {
    let V = [0, 0, 0];
    let prevDelta = Infinity;
    for (let i = 0; i < 20; i++) {
      const { V: V2, maxDelta } = bellmanSweep(V, MDP3.P, MDP3.r, MDP3.gamma);
      V = V2;
      expect(maxDelta).toBeLessThanOrEqual(prevDelta + 1e-14);
      prevDelta = maxDelta;
    }
  });
});

// ---------------------------------------------------------------------------
// solveBellman — convergence to (I−γP)^{-1} r
// ---------------------------------------------------------------------------

describe('solveBellman — converges to analytic fixed point', () => {
  it('one-state self-loop: V = r/(1−γ) = 5', () => {
    const Vstar = analyticV(MDP1.P, MDP1.r, MDP1.gamma)[0];
    expect(Vstar).toBeCloseTo(5, 10);

    const result = solveBellman(MDP1.P, MDP1.r, MDP1.gamma, 200);
    expect(result.V[0]).toBeCloseTo(5, 3);
  });

  it('two-state chain: V = [9, 10]', () => {
    const ref = analyticV(MDP2.P, MDP2.r, MDP2.gamma);
    expect(ref[0]).toBeCloseTo(9, 10);
    expect(ref[1]).toBeCloseTo(10, 10);

    const { V } = solveBellman(MDP2.P, MDP2.r, MDP2.gamma, 300);
    expect(V[0]).toBeCloseTo(9, 2);
    expect(V[1]).toBeCloseTo(10, 2);
  });

  it('three-state chain: V = [8.1, 9, 10]', () => {
    const ref = analyticV(MDP3.P, MDP3.r, MDP3.gamma);
    expect(ref[0]).toBeCloseTo(8.1, 10);
    expect(ref[1]).toBeCloseTo(9, 10);
    expect(ref[2]).toBeCloseTo(10, 10);

    const { V } = solveBellman(MDP3.P, MDP3.r, MDP3.gamma, 500);
    expect(V[0]).toBeCloseTo(8.1, 2);
    expect(V[1]).toBeCloseTo(9, 2);
    expect(V[2]).toBeCloseTo(10, 2);
  });

  it('solveBellman returns sweeps count > 0', () => {
    const { sweeps } = solveBellman(MDP2.P, MDP2.r, MDP2.gamma, 500);
    expect(sweeps).toBeGreaterThan(0);
  });

  it('solveBellman with iters=1 does exactly 1 sweep', () => {
    const { sweeps } = solveBellman(MDP2.P, MDP2.r, MDP2.gamma, 1);
    expect(sweeps).toBe(1);
  });

  it('one-state self-loop convergence: |V - analytic| < 0.001', () => {
    const analytic = MDP1.analytic[0]; // 5
    const { V } = solveBellman(MDP1.P, MDP1.r, MDP1.gamma, 300);
    expect(Math.abs(V[0] - analytic)).toBeLessThan(0.001);
  });

  it('two-state chain convergence: all states within 0.01 of analytic', () => {
    const ref = MDP2.analytic; // [9, 10]
    const { V } = solveBellman(MDP2.P, MDP2.r, MDP2.gamma, 500);
    for (let s = 0; s < ref.length; s++) {
      expect(Math.abs(V[s] - ref[s])).toBeLessThan(0.01);
    }
  });

  it('three-state chain convergence: all states within 0.01 of analytic', () => {
    const ref = MDP3.analytic; // [8.1, 9, 10]
    const { V } = solveBellman(MDP3.P, MDP3.r, MDP3.gamma, 500);
    for (let s = 0; s < ref.length; s++) {
      expect(Math.abs(V[s] - ref[s])).toBeLessThan(0.01);
    }
  });
});
