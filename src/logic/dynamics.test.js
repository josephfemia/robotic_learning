import { describe, it, expect } from 'vitest';
import {
  massMatrix,
  coriolis,
  gravity,
  inverseDynamics,
  DYNAMICS_CONSTANTS,
} from './dynamics.js';

/**
 * dynamics.test.js — TDD tests for 2-link planar manipulator dynamics.
 *
 * Model constants (pinned from DYNAMICS_CONSTANTS):
 *   m1 = 1.0 kg, m2 = 0.5 kg
 *   L1 = 1.0 m,  L2 = 0.8 m
 *   lc1 = 0.5,   lc2 = 0.4   (center-of-mass at link midpoint)
 *   I1  = m1*L1^2/12 ≈ 0.0833  (slender rod)
 *   I2  = m2*L2^2/12 ≈ 0.0267
 *   g   = 9.81 m/s^2
 *
 * Derived scalars (for documentation):
 *   alpha = I1 + I2 + m1*lc1^2 + m2*(L1^2 + lc2^2) ≈ 0.940
 *   beta  = m2 * L1 * lc2 = 0.2
 *   delta = I2 + m2 * lc2^2 ≈ 0.1067
 *
 * Mass matrix:
 *   M[0][0] = alpha + 2*beta*cos(q2)
 *   M[0][1] = M[1][0] = delta + beta*cos(q2)
 *   M[1][1] = delta
 *
 * Coriolis vector C(q,qd)*qd (h = beta*sin(q2)):
 *   c[0] = -2*h*qd1*qd2 - h*qd2^2
 *   c[1] = h*qd1^2
 *
 * Gravity vector g(q):
 *   g[0] = (m1*lc1 + m2*L1)*g_acc*cos(q1) + m2*lc2*g_acc*cos(q1+q2)
 *   g[1] = m2*lc2*g_acc*cos(q1+q2)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('DYNAMICS_CONSTANTS', () => {
  it('exports expected physical constants', () => {
    const { m1, m2, L1, L2, lc1, lc2, g: g_acc } = DYNAMICS_CONSTANTS;
    expect(m1).toBeCloseTo(1.0, 10);
    expect(m2).toBeCloseTo(0.5, 10);
    expect(L1).toBeCloseTo(1.0, 10);
    expect(L2).toBeCloseTo(0.8, 10);
    expect(lc1).toBeCloseTo(0.5, 10);
    expect(lc2).toBeCloseTo(0.4, 10);
    expect(g_acc).toBeCloseTo(9.81, 10);
  });
});

// ---------------------------------------------------------------------------
// massMatrix M(q)
// ---------------------------------------------------------------------------
describe('massMatrix', () => {
  it('returns a 2×2 symmetric matrix (M[0][1] === M[1][0])', () => {
    const M = massMatrix([0.5, 0.3]);
    expect(M).toHaveLength(2);
    expect(M[0]).toHaveLength(2);
    expect(M[1]).toHaveLength(2);
    expect(M[0][1]).toBeCloseTo(M[1][0], 12);
  });

  it('is positive-definite at q=[0,0]: diagonal positive and det > 0', () => {
    // q2=0: M[0][0] = alpha + 2*beta*1 = 0.940 + 0.4 = 1.34
    //        M[0][1] = delta + beta*1  = 0.1067 + 0.2 = 0.3067
    //        M[1][1] = delta           = 0.1067
    //        det = 1.34*0.1067 - 0.3067^2 ≈ 0.0489
    const M = massMatrix([0, 0]);
    expect(M[0][0]).toBeGreaterThan(0);
    expect(M[1][1]).toBeGreaterThan(0);
    const det = M[0][0] * M[1][1] - M[0][1] * M[0][1];
    expect(det).toBeGreaterThan(0);
  });

  it('is positive-definite at q=[π/4, π/3]', () => {
    const M = massMatrix([Math.PI / 4, Math.PI / 3]);
    expect(M[0][0]).toBeGreaterThan(0);
    expect(M[1][1]).toBeGreaterThan(0);
    const det = M[0][0] * M[1][1] - M[0][1] * M[0][1];
    expect(det).toBeGreaterThan(0);
  });

  it('is positive-definite at q=[-π/2, π/2]', () => {
    const M = massMatrix([-Math.PI / 2, Math.PI / 2]);
    expect(M[0][0]).toBeGreaterThan(0);
    expect(M[1][1]).toBeGreaterThan(0);
    const det = M[0][0] * M[1][1] - M[0][1] * M[0][1];
    expect(det).toBeGreaterThan(0);
  });

  it('pins concrete values at q=[0,0]', () => {
    // M[0][0] = 0.9400 + 2*0.2*cos(0) = 0.940 + 0.400 = 1.340
    // M[0][1] = 0.1067 + 0.2*cos(0) = 0.3067
    // M[1][1] = 0.1067
    const M = massMatrix([0, 0]);
    expect(M[0][0]).toBeCloseTo(1.34, 8);
    expect(M[0][1]).toBeCloseTo(0.30666666666666667, 8);
    expect(M[1][0]).toBeCloseTo(0.30666666666666667, 8);
    expect(M[1][1]).toBeCloseTo(0.10666666666666669, 8);
  });

  it('M[1][1] (delta) is configuration-independent', () => {
    // delta does not depend on q, so M[1][1] is the same for all q
    const M1 = massMatrix([0, 0]);
    const M2 = massMatrix([1.2, -0.8]);
    const M3 = massMatrix([Math.PI, 0.5]);
    expect(M1[1][1]).toBeCloseTo(M2[1][1], 12);
    expect(M2[1][1]).toBeCloseTo(M3[1][1], 12);
  });
});

// ---------------------------------------------------------------------------
// coriolis C(q,qd)*qd
// ---------------------------------------------------------------------------
describe('coriolis', () => {
  it('returns the zero vector when qd=[0,0]', () => {
    const c = coriolis([0.5, 0.3], [0, 0]);
    expect(c[0]).toBeCloseTo(0, 12);
    expect(c[1]).toBeCloseTo(0, 12);
  });

  it('returns the zero vector when qd=[0,0] at any q', () => {
    const c = coriolis([-1.2, 0.8], [0, 0]);
    expect(c[0]).toBeCloseTo(0, 12);
    expect(c[1]).toBeCloseTo(0, 12);
  });

  it('returns zero vector when q2=0 (sin(q2)=0, so h=0)', () => {
    // h = beta * sin(q2) = 0 when q2=0
    const c = coriolis([0.5, 0], [1.0, 2.0]);
    expect(c[0]).toBeCloseTo(0, 12);
    expect(c[1]).toBeCloseTo(0, 12);
  });

  it('pins concrete values at q=[0,pi/4], qd=[1,0.5]', () => {
    // h = 0.2 * sin(pi/4) = 0.2 * 0.70711 = 0.14142
    // c[0] = -2*h*1*0.5 - h*0.5^2 = -2*0.14142*0.5 - 0.14142*0.25
    //       = -0.14142 - 0.03536 = -0.17678
    // c[1] = h*1^2 = 0.14142
    const c = coriolis([0, Math.PI / 4], [1, 0.5]);
    expect(c[0]).toBeCloseTo(-0.17677669529663687, 8);
    expect(c[1]).toBeCloseTo(0.1414213562373095, 8);
  });

  it('c[1] grows with qd1^2 (Coriolis/centrifugal coupling)', () => {
    // joint-2 Coriolis term scales as qd1^2
    const c1 = coriolis([0, Math.PI / 4], [1, 0]);
    const c2 = coriolis([0, Math.PI / 4], [2, 0]);
    expect(c2[1]).toBeCloseTo(4 * c1[1], 8); // 2^2 = 4× scaling
  });
});

// ---------------------------------------------------------------------------
// gravity g(q)
// ---------------------------------------------------------------------------
describe('gravity', () => {
  it('pins concrete values at q=[0,0] (arm horizontal)', () => {
    // g[0] = (1.0*0.5 + 0.5*1.0)*9.81*cos(0) + 0.5*0.4*9.81*cos(0)
    //       = 1.0 * 9.81 + 0.2 * 9.81 = 9.81 + 1.962 = 11.772
    // g[1] = 0.5*0.4*9.81*cos(0) = 0.2 * 9.81 = 1.962
    const gv = gravity([0, 0]);
    expect(gv[0]).toBeCloseTo(11.772, 6);
    expect(gv[1]).toBeCloseTo(1.962, 6);
  });

  it('is near zero at q=[π/2,0] (arm pointing straight up — balanced)', () => {
    // cos(π/2) ≈ 0, so both gravity components are ≈ 0
    const gv = gravity([Math.PI / 2, 0]);
    expect(Math.abs(gv[0])).toBeLessThan(1e-10);
    expect(Math.abs(gv[1])).toBeLessThan(1e-10);
  });

  it('g[1] = g[0] contribution from link-2 only (g[1] depends on q1+q2)', () => {
    // g[1] = m2*lc2*g_acc*cos(q1+q2)
    // g[0] includes that same term plus (m1*lc1+m2*L1)*g_acc*cos(q1)
    // So g[0] >= g[1] when both links add positive gravity (q1+q2 in same half-plane)
    const gv = gravity([0, 0]);
    expect(gv[0]).toBeGreaterThan(gv[1]);
  });

  it('pins concrete values at q=[0.5,0.3]', () => {
    // g[0] = (0.5 + 0.5)*9.81*cos(0.5) + 0.2*9.81*cos(0.8)
    //       = 9.81*cos(0.5) + 1.962*cos(0.8)
    //       ≈ 9.81*0.87758 + 1.962*0.69671
    //       ≈ 8.60896 + 1.36706 = 9.97602
    // g[1] = 0.2*9.81*cos(0.8) = 1.96200*0.69671 = 1.36694
    const gv = gravity([0.5, 0.3]);
    expect(gv[0]).toBeCloseTo(9.976023495883695, 8);
    expect(gv[1]).toBeCloseTo(1.3669385637391387, 8);
  });

  it('torque opposes gravity: positive g-vector when arm is horizontal (q=[0,0])', () => {
    // The gravity torque vector represents the torque needed to hold the arm against gravity.
    // When horizontal (q1=q2=0), both joints need positive torque to resist downward pull.
    const gv = gravity([0, 0]);
    expect(gv[0]).toBeGreaterThan(0);
    expect(gv[1]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// inverseDynamics τ = M(q)q̈ + C(q,q̇)q̇ + g(q)
// ---------------------------------------------------------------------------
describe('inverseDynamics', () => {
  it('reduces to g(q) when qd=qdd=[0,0]', () => {
    const q = [0.5, 0.3];
    const tau = inverseDynamics(q, [0, 0], [0, 0]);
    const gv = gravity(q);
    expect(tau[0]).toBeCloseTo(gv[0], 10);
    expect(tau[1]).toBeCloseTo(gv[1], 10);
  });

  it('reduces to g(q) for any q when qd=qdd=0', () => {
    const q = [-0.8, 1.2];
    const tau = inverseDynamics(q, [0, 0], [0, 0]);
    const gv = gravity(q);
    expect(tau[0]).toBeCloseTo(gv[0], 10);
    expect(tau[1]).toBeCloseTo(gv[1], 10);
  });

  it('adds inertia term when qdd is nonzero (qd=0)', () => {
    // tau = M*qdd + g; should be larger than g alone
    const q = [0, 0];
    const qdd = [1, 0];
    const tau = inverseDynamics(q, [0, 0], qdd);
    const gv = gravity(q);
    const M = massMatrix(q);
    // tau[0] = M[0][0]*1 + M[0][1]*0 + g[0] = 1.34 + 11.772
    expect(tau[0]).toBeCloseTo(M[0][0] * qdd[0] + gv[0], 8);
    expect(tau[1]).toBeCloseTo(M[1][0] * qdd[0] + gv[1], 8);
  });

  it('pins concrete values at q=[0.5,0.3], qd=[0.2,-0.1], qdd=[0.3,0.1]', () => {
    // tau1 ≈ 10.40421, tau2 ≈ 1.46929 (computed from formulas above)
    const tau = inverseDynamics([0.5, 0.3], [0.2, -0.1], [0.3, 0.1]);
    expect(tau[0]).toBeCloseTo(10.404210392267915, 8);
    expect(tau[1]).toBeCloseTo(1.4692895814066325, 8);
  });

  it('returns a 2-element array', () => {
    const tau = inverseDynamics([0, 0], [0, 0], [0, 0]);
    expect(tau).toHaveLength(2);
  });
});
