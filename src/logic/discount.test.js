import { describe, it, expect } from 'vitest';
import { discountWeights, effectiveHorizon, totalWeight } from './discount.js';

describe('discountWeights', () => {
  it('returns [1, 0.9, 0.81] for gamma=0.9, N=3', () => {
    const w = discountWeights(0.9, 3);
    expect(w).toHaveLength(3);
    expect(w[0]).toBeCloseTo(1.0, 10);
    expect(w[1]).toBeCloseTo(0.9, 10);
    expect(w[2]).toBeCloseTo(0.81, 10);
  });

  it('first element is always 1 (gamma^0) for any gamma', () => {
    expect(discountWeights(0.5, 5)[0]).toBeCloseTo(1.0, 10);
    expect(discountWeights(0.99, 10)[0]).toBeCloseTo(1.0, 10);
  });

  it('returns a single element [1] for N=1', () => {
    const w = discountWeights(0.9, 1);
    expect(w).toHaveLength(1);
    expect(w[0]).toBeCloseTo(1.0, 10);
  });

  it('all weights are 1 when gamma=0', () => {
    // gamma^0 = 1, gamma^k = 0 for k>=1
    const w = discountWeights(0, 4);
    expect(w[0]).toBeCloseTo(1.0, 10);
    expect(w[1]).toBeCloseTo(0.0, 10);
    expect(w[2]).toBeCloseTo(0.0, 10);
    expect(w[3]).toBeCloseTo(0.0, 10);
  });

  it('weights decay geometrically for gamma=0.5', () => {
    const w = discountWeights(0.5, 4);
    expect(w[0]).toBeCloseTo(1.0, 10);
    expect(w[1]).toBeCloseTo(0.5, 10);
    expect(w[2]).toBeCloseTo(0.25, 10);
    expect(w[3]).toBeCloseTo(0.125, 10);
  });

  it('weights near 1 for high gamma=0.99, N=5', () => {
    const w = discountWeights(0.99, 5);
    expect(w[0]).toBeCloseTo(1.0, 5);
    expect(w[1]).toBeCloseTo(0.99, 5);
    expect(w[4]).toBeCloseTo(Math.pow(0.99, 4), 10);
  });

  it('returns an array of length N', () => {
    expect(discountWeights(0.9, 26)).toHaveLength(26);
  });
});

describe('effectiveHorizon', () => {
  it('returns 10 for gamma=0.9', () => {
    expect(effectiveHorizon(0.9)).toBeCloseTo(10, 10);
  });

  it('returns 2 for gamma=0.5', () => {
    expect(effectiveHorizon(0.5)).toBeCloseTo(2, 10);
  });

  it('returns 100 for gamma=0.99', () => {
    expect(effectiveHorizon(0.99)).toBeCloseTo(100, 5);
  });

  it('returns 1 for gamma=0', () => {
    expect(effectiveHorizon(0)).toBeCloseTo(1, 10);
  });
});

describe('totalWeight', () => {
  it('returns 2 for gamma=0.5', () => {
    expect(totalWeight(0.5)).toBeCloseTo(2, 10);
  });

  it('returns 10 for gamma=0.9', () => {
    expect(totalWeight(0.9)).toBeCloseTo(10, 10);
  });

  it('returns 100 for gamma=0.99', () => {
    expect(totalWeight(0.99)).toBeCloseTo(100, 5);
  });

  it('returns 1 for gamma=0', () => {
    expect(totalWeight(0)).toBeCloseTo(1, 10);
  });
});
