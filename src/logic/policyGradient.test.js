import { describe, it, expect } from 'vitest';
import { reward, policyGradientStep, clamp, logDerivativeIdentity } from './policyGradient.js';

// Initial values from the original IIFE:
//   mu=-1.1, logsig=Math.log(0.85), lr=0.12
const MU0 = -1.1;
const LOGSIG0 = Math.log(0.85);
const LR = 0.12;

describe('reward', () => {
  it('peaks near a=1.2 (true optimum)', () => {
    expect(reward(1.2)).toBeCloseTo(1.0, 8);
  });

  it('is strictly positive for all finite a', () => {
    [-3, -1, 0, 1, 2, 3].forEach(a => {
      expect(reward(a)).toBeGreaterThan(0);
    });
  });

  it('falls off symmetrically around a=1.2', () => {
    const left = reward(1.2 - 0.5);
    const right = reward(1.2 + 0.5);
    expect(left).toBeCloseTo(right, 8);
  });

  it('matches original formula at a=0', () => {
    const expected = Math.exp(-Math.pow(0 - 1.2, 2) / (2 * 0.45));
    expect(reward(0)).toBeCloseTo(expected, 10);
  });
});

describe('policyGradientStep', () => {
  it('gradient pushes mu toward high-reward region given actions near optimum', () => {
    // Actions near a*=1.2 should push mean toward the optimum
    const actions = [1.1, 1.15, 1.2, 1.25, 1.3, 0.9, 0.8, 0.7, -0.5, -0.6, -0.8, -1.0, -1.1, -1.2];
    const result = policyGradientStep(-1.5, LOGSIG0, LR, actions);
    // Since high-reward actions are on the right, mu should increase
    expect(result.mu).toBeGreaterThan(-1.5);
  });

  it('advantages sum to zero (baseline = mean)', () => {
    const actions = [0.5, 1.0, 1.5, 0.8, 1.2, 0.3, 1.8, 2.0, -0.5, -1.0, 0.1, 0.4, 0.7, 1.1];
    const result = policyGradientStep(MU0, LOGSIG0, LR, actions);
    const sum = result.advantages.reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0, 10);
  });

  it('mu stays clamped within [-3, 3]', () => {
    // Large gradient can't push mu out of bounds
    const actions = Array(14).fill(3);
    const result = policyGradientStep(2.9, LOGSIG0, LR, actions);
    expect(result.mu).toBeLessThanOrEqual(3);
    expect(result.mu).toBeGreaterThanOrEqual(-3);
  });

  it('logsig stays clamped within [log(0.18), log(1.2)]', () => {
    const actions = Array(14).fill(0).map((_, i) => i * 0.2);
    const result = policyGradientStep(MU0, LOGSIG0, LR, actions);
    expect(result.logsig).toBeGreaterThanOrEqual(Math.log(0.18));
    expect(result.logsig).toBeLessThanOrEqual(Math.log(1.2));
  });

  it('returns correct number of advantages (one per action)', () => {
    const K = 14;
    const actions = Array(K).fill(0).map((_, i) => i * 0.2 - 1);
    const result = policyGradientStep(MU0, LOGSIG0, LR, actions);
    expect(result.advantages.length).toBe(K);
  });

  it('gradient ascent step on a flat batch (all same action) yields zero gradient', () => {
    // If all actions are the same, all rewards are the same → all advantages = 0 → no update
    const actions = Array(14).fill(1.2);
    const result = policyGradientStep(MU0, LOGSIG0, LR, actions);
    expect(result.mu).toBeCloseTo(MU0, 10);
    expect(result.logsig).toBeCloseTo(LOGSIG0, 10);
  });
});

describe('clamp', () => {
  it('clamps below min', () => { expect(clamp(-5, -3, 3)).toBe(-3); });
  it('clamps above max', () => { expect(clamp(5, -3, 3)).toBe(3); });
  it('passes through mid-range', () => { expect(clamp(1, -3, 3)).toBe(1); });
});

// ---------------------------------------------------------------------------
// logDerivativeIdentity — numerical verification of the REINFORCE identity
//   ∇_θ 𝔼[R(a)] = 𝔼[ ∇_θ log π_θ(a) · R(a) ]
//
// Toy setup: 3-action discrete softmax policy.
//   θ = [θ0, θ1, θ2]
//   π_θ(a) = softmax(θ)[a]
//   R = fixed reward vector, one scalar per action.
// The function must return { analyticGrad, estimatorGrad } — two length-3 arrays.
// ---------------------------------------------------------------------------

describe('logDerivativeIdentity', () => {
  // Toy: 3 actions, fixed rewards, explicit θ
  const theta = [0.5, -0.3, 1.1];
  const rewards = [0.2, 0.9, 0.4];

  it('returns an object with analyticGrad and estimatorGrad arrays', () => {
    const result = logDerivativeIdentity(theta, rewards);
    expect(result).toHaveProperty('analyticGrad');
    expect(result).toHaveProperty('estimatorGrad');
    expect(Array.isArray(result.analyticGrad)).toBe(true);
    expect(Array.isArray(result.estimatorGrad)).toBe(true);
    expect(result.analyticGrad.length).toBe(theta.length);
    expect(result.estimatorGrad.length).toBe(theta.length);
  });

  it('analytic gradient matches score-function estimator to 6 decimal places', () => {
    const { analyticGrad, estimatorGrad } = logDerivativeIdentity(theta, rewards);
    for (let i = 0; i < theta.length; i++) {
      expect(analyticGrad[i]).toBeCloseTo(estimatorGrad[i], 6);
    }
  });

  it('analyticGrad[0] matches known finite-difference value', () => {
    // Finite-difference check: d/dθ0 𝔼[R] ≈ (𝔼_R(θ0+ε) - 𝔼_R(θ0-ε)) / (2ε)
    const eps = 1e-5;
    function eR(th) {
      // softmax
      const ex = th.map(v => Math.exp(v));
      const Z = ex.reduce((s, v) => s + v, 0);
      const p = ex.map(v => v / Z);
      return p.reduce((s, pi, i) => s + pi * rewards[i], 0);
    }
    const tPlus  = [theta[0] + eps, theta[1], theta[2]];
    const tMinus = [theta[0] - eps, theta[1], theta[2]];
    const fd = (eR(tPlus) - eR(tMinus)) / (2 * eps);
    const { analyticGrad } = logDerivativeIdentity(theta, rewards);
    expect(analyticGrad[0]).toBeCloseTo(fd, 5);
  });

  it('gradient is zero when all rewards are equal (no signal)', () => {
    const flatRewards = [0.5, 0.5, 0.5];
    const { analyticGrad, estimatorGrad } = logDerivativeIdentity(theta, flatRewards);
    for (let i = 0; i < theta.length; i++) {
      expect(analyticGrad[i]).toBeCloseTo(0, 10);
      expect(estimatorGrad[i]).toBeCloseTo(0, 10);
    }
  });

  it('works with uniform policy (all θ = 0)', () => {
    const uniformTheta = [0, 0, 0];
    const { analyticGrad, estimatorGrad } = logDerivativeIdentity(uniformTheta, rewards);
    // Both sides should still agree
    for (let i = 0; i < uniformTheta.length; i++) {
      expect(analyticGrad[i]).toBeCloseTo(estimatorGrad[i], 6);
    }
  });
});
