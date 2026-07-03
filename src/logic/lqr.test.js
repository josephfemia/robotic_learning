import { describe, it, expect } from 'vitest';
import { riccati, rollout, costToGo, solve, A, B, DT, T, Z0 } from './lqr.js';

/**
 * Pinned against an independent reference implementation (scratch script,
 * 2026-07-03). Plant: the SAME discrete mass-damper as pid.js —
 * dt=0.02, damping 0.6, m=1 — written in state-space form
 * z = [position − target, velocity]:
 *
 *   A = [[1, 0.02], [0, 0.988]],  B = [0, 0.02]
 *
 * Cost: Q = diag(q, 0), R = r (scalar). The widget's one knob is
 * logRatio = log10(q/r) with r fixed at 1.
 *
 * Cross-check baked into these pins: for every preset, the realized
 * infinite-horizon rollout cost Σ (q·z₀² + r·u²) matched z₀ᵀPz₀ to 6
 * decimals — the Riccati P really is the cost-to-go.
 */

describe('plant constants — same mass-damper as pid.js', () => {
  it('A matches Euler discretization of the PID plant', () => {
    expect(A[0][0]).toBe(1);
    expect(A[0][1]).toBeCloseTo(0.02, 12);
    expect(A[1][0]).toBe(0);
    expect(A[1][1]).toBeCloseTo(0.988, 12); // 1 − 0.6·0.02
  });

  it('B injects force into velocity only', () => {
    expect(B[0]).toBe(0);
    expect(B[1]).toBeCloseTo(0.02, 12);
  });

  it('dt, horizon, and initial offset are as specified', () => {
    expect(DT).toBe(0.02);
    expect(T).toBe(600);
    expect(Z0).toEqual([-1, 0]);
  });
});

describe('riccati — stationary gain K for the three preset ratios', () => {
  it('cheap effort (log q/r = 2.5): K ≈ [16.8463, 5.4032]', () => {
    const { K } = riccati(Math.pow(10, 2.5), 1);
    expect(K[0]).toBeCloseTo(16.846268, 4);
    expect(K[1]).toBeCloseTo(5.403186, 4);
  });

  it('balanced (log q/r = 0): K ≈ [0.9907, 0.9379]', () => {
    const { K } = riccati(1, 1);
    expect(K[0]).toBeCloseTo(0.990664, 4);
    expect(K[1]).toBeCloseTo(0.937891, 4);
  });

  it('expensive effort (log q/r = −2): K ≈ [0.0999, 0.1484]', () => {
    const { K } = riccati(0.01, 1);
    expect(K[0]).toBeCloseTo(0.099852, 4);
    expect(K[1]).toBeCloseTo(0.148419, 4);
  });

  it('P is symmetric positive (a cost-to-go is never negative)', () => {
    const { P } = riccati(1, 1);
    expect(P[0][1]).toBeCloseTo(P[1][0], 8);
    expect(P[0][0]).toBeGreaterThan(0);
    expect(P[1][1]).toBeGreaterThan(0);
    // pinned P for balanced
    expect(P[0][0]).toBeCloseTo(77.619188, 3);
    expect(P[0][1]).toBeCloseTo(50.471192, 3);
    expect(P[1][1]).toBeCloseTo(47.341236, 3);
  });

  it('gain scales monotonically with q/r (more hate for error → harder gains)', () => {
    const kLo = riccati(0.01, 1).K[0];
    const kMid = riccati(1, 1).K[0];
    const kHi = riccati(316.227766, 1).K[0];
    expect(kLo).toBeLessThan(kMid);
    expect(kMid).toBeLessThan(kHi);
  });
});

describe('costToGo — V(z) = zᵀPz', () => {
  it('J from z0 = [−1, 0] equals P[0][0]', () => {
    const { P } = riccati(1, 1);
    expect(costToGo(P, [-1, 0])).toBeCloseTo(P[0][0], 10);
  });

  it('pinned J for the three presets', () => {
    expect(costToGo(riccati(Math.pow(10, 2.5), 1).P)).toBeCloseTo(5634.405422, 2);
    expect(costToGo(riccati(1, 1).P)).toBeCloseTo(77.619188, 3);
    expect(costToGo(riccati(0.01, 1).P)).toBeCloseTo(3.747653, 4);
  });
});

describe('rollout — closed-loop trajectory from the fixed initial offset', () => {
  it('returns T=600 samples of position and control', () => {
    const { pos, u } = rollout(riccati(1, 1).K);
    expect(pos.length).toBe(600);
    expect(u.length).toBe(600);
    pos.forEach(v => expect(isFinite(v)).toBe(true));
    u.forEach(v => expect(isFinite(v)).toBe(true));
  });

  it('first control is K[0] (u = −K·z0 with z0 = [−1, 0])', () => {
    const { K } = riccati(Math.pow(10, 2.5), 1);
    const { u } = rollout(K);
    expect(u[0]).toBeCloseTo(K[0], 8);
  });

  it('cheap effort: hard fast convergence — at target by t=300, peak |u| ≈ 16.85', () => {
    const { K } = riccati(Math.pow(10, 2.5), 1);
    const { pos, u } = rollout(K);
    expect(pos[49]).toBeCloseTo(1.039949, 4);
    expect(pos[299]).toBeCloseTo(1.0, 3);
    expect(Math.max(...u.map(Math.abs))).toBeCloseTo(16.846268, 3);
  });

  it('balanced: settles near the target by the end of the window', () => {
    const { pos } = rollout(riccati(1, 1).K);
    expect(pos[299]).toBeCloseTo(1.015211, 4);
    expect(pos[599]).toBeCloseTo(0.9999, 3);
  });

  it('expensive effort: lazy gentle glide — still short of target at the window end', () => {
    const { K } = riccati(0.01, 1);
    const { pos, u } = rollout(K);
    expect(pos[299]).toBeCloseTo(0.509072, 4);
    expect(pos[599]).toBeCloseTo(0.8229, 3);
    expect(Math.max(...u.map(Math.abs))).toBeLessThan(0.1);
  });

  it('never rings unstably at either slider extreme — that is the point', () => {
    for (const logRatio of [-2, -1, 0, 1, 2, 3]) {
      const { pos } = rollout(riccati(Math.pow(10, logRatio), 1).K);
      const peak = Math.max(...pos);
      expect(peak).toBeLessThan(1.1); // at most a whisper of overshoot
      // monotone tail: distance to target never grows late in the window
      const tailErr = Math.abs(1 - pos[599]);
      expect(tailErr).toBeLessThanOrEqual(Math.abs(1 - pos[299]) + 1e-9);
    }
  });
});

describe('solve — widget convenience wrapper', () => {
  it('bundles K, P, J, and the rollout for a given log10(q/r)', () => {
    const s = solve(0);
    expect(s.q).toBeCloseTo(1, 12);
    expect(s.r).toBe(1);
    expect(s.K[0]).toBeCloseTo(0.990664, 4);
    expect(s.J).toBeCloseTo(77.619188, 3);
    expect(s.pos.length).toBe(600);
    expect(s.u.length).toBe(600);
  });

  it('cheap-effort preset via solve matches riccati directly', () => {
    const s = solve(2.5);
    expect(s.K[0]).toBeCloseTo(16.846268, 4);
    expect(s.K[1]).toBeCloseTo(5.403186, 4);
  });
});
