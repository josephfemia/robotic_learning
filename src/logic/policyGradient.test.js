import { describe, it, expect } from 'vitest';
import { reward, policyGradientStep, clamp } from './policyGradient.js';

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
