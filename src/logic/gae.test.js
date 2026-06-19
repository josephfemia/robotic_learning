import { describe, it, expect } from 'vitest';
import { gaeWeight, gaeWeights, effectiveHorizon } from './gae.js';

describe('gaeWeight', () => {
  it('at lam=0: all weight on n=0 (pure TD), zero elsewhere', () => {
    expect(gaeWeight(0, 0)).toBeCloseTo(1, 10);
    expect(gaeWeight(0, 1)).toBeCloseTo(0, 10);
    expect(gaeWeight(0, 5)).toBeCloseTo(0, 10);
  });

  it('at lam=0.95 (typical): exponentially decaying weights', () => {
    // w(n) = (1-0.95)*0.95^n = 0.05*0.95^n
    expect(gaeWeight(0.95, 0)).toBeCloseTo(0.05, 10);
    expect(gaeWeight(0.95, 1)).toBeCloseTo(0.05 * 0.95, 10);
    expect(gaeWeight(0.95, 5)).toBeCloseTo(0.05 * Math.pow(0.95, 5), 10);
  });

  it('at lam=1 (Monte Carlo): uses saturation formula pow(0.999, n)', () => {
    expect(gaeWeight(1.0, 0)).toBeCloseTo(Math.pow(0.999, 0), 10);
    expect(gaeWeight(1.0, 5)).toBeCloseTo(Math.pow(0.999, 5), 10);
  });

  it('at lam=0.999 (saturation threshold): uses saturation formula', () => {
    expect(gaeWeight(0.999, 3)).toBeCloseTo(Math.pow(0.999, 3), 10);
  });
});

describe('gaeWeights', () => {
  it('returns N weights', () => {
    const { weights } = gaeWeights(0.95, 18);
    expect(weights).toHaveLength(18);
  });

  it('maxWeight > 0 for any lam', () => {
    expect(gaeWeights(0, 18).maxWeight).toBeGreaterThan(0);
    expect(gaeWeights(0.95, 18).maxWeight).toBeGreaterThan(0);
    expect(gaeWeights(1, 18).maxWeight).toBeGreaterThan(0);
  });

  it('at lam=0: first weight is max, rest are 0', () => {
    const { weights, maxWeight } = gaeWeights(0, 18);
    expect(weights[0]).toBeCloseTo(maxWeight, 10);
    for (let n = 1; n < 18; n++) {
      expect(weights[n]).toBeCloseTo(0, 10);
    }
  });

  it('at lam=0.95: weights are monotonically decreasing', () => {
    const { weights } = gaeWeights(0.95, 18);
    for (let n = 1; n < 18; n++) {
      expect(weights[n]).toBeLessThan(weights[n - 1]);
    }
  });

  it('bias-variance endpoints: lam=0 concentrates at n=0, lam=1 spreads', () => {
    const td = gaeWeights(0, 18);
    const mc = gaeWeights(1, 18);
    // TD: first bar dominates, last bar ≈ 0
    // MC: first and last bar are more comparable (slow decay)
    const tdSpread = td.weights[17] / td.weights[0];
    const mcSpread = mc.weights[17] / mc.weights[0];
    expect(mcSpread).toBeGreaterThan(tdSpread);
  });
});

describe('effectiveHorizon', () => {
  it('returns 1/(1-lam) for lam < 0.99', () => {
    expect(effectiveHorizon(0)).toBeCloseTo(1, 10);
    expect(effectiveHorizon(0.5)).toBeCloseTo(2, 10);
    expect(effectiveHorizon(0.95)).toBeCloseTo(20, 5);
  });

  it('returns null for lam >= 0.99 (near Monte Carlo)', () => {
    expect(effectiveHorizon(0.99)).toBeNull();
    expect(effectiveHorizon(1.0)).toBeNull();
  });

  it('increases as lam increases (more Monte Carlo = wider horizon)', () => {
    const h1 = effectiveHorizon(0.0);
    const h2 = effectiveHorizon(0.5);
    const h3 = effectiveHorizon(0.9);
    expect(h2).toBeGreaterThan(h1);
    expect(h3).toBeGreaterThan(h2);
  });
});
