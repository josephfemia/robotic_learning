import { describe, it, expect } from 'vitest';
import { bcRegret, daggerRegret, regretRatio } from './compoundingError.js';

// Default values from the original IIFE: eps=0.06, Tcur=60, Tmax=100
const EPS = 0.06;

describe('bcRegret', () => {
  it('is 0 at T=0 (no steps, no regret)', () => {
    expect(bcRegret(EPS, 0)).toBe(0);
  });

  it('matches eps*T² at T=60 (Tcur from original)', () => {
    // Original: eps*t*t where eps=0.06, t=60 → 0.06*3600 = 216
    expect(bcRegret(0.06, 60)).toBeCloseTo(216, 10);
  });

  it('matches eps*T² at T=100 (Tmax from original)', () => {
    // 0.06*100*100 = 600
    expect(bcRegret(0.06, 100)).toBeCloseTo(600, 10);
  });

  it('is strictly greater than daggerRegret at T>1', () => {
    for (let T = 2; T <= 100; T++) {
      expect(bcRegret(EPS, T)).toBeGreaterThan(daggerRegret(EPS, T));
    }
  });

  it('scales quadratically — doubling T quadruples regret', () => {
    expect(bcRegret(EPS, 20)).toBeCloseTo(4 * bcRegret(EPS, 10), 10);
  });
});

describe('daggerRegret', () => {
  it('is 0 at T=0', () => {
    expect(daggerRegret(EPS, 0)).toBe(0);
  });

  it('matches eps*T at T=60', () => {
    // 0.06*60 = 3.6
    expect(daggerRegret(0.06, 60)).toBeCloseTo(3.6, 10);
  });

  it('scales linearly — doubling T doubles regret', () => {
    expect(daggerRegret(EPS, 20)).toBeCloseTo(2 * daggerRegret(EPS, 10), 10);
  });
});

describe('regretRatio', () => {
  it('equals T (the original label "cloning ≈ T× worse")', () => {
    expect(regretRatio(60)).toBe(60);
    expect(regretRatio(100)).toBe(100);
    expect(regretRatio(1)).toBe(1);
  });

  it('equals bcRegret / daggerRegret at any eps (confirming the formula)', () => {
    for (const T of [10, 30, 60, 100]) {
      const ratio = bcRegret(EPS, T) / daggerRegret(EPS, T);
      expect(regretRatio(T)).toBeCloseTo(ratio, 10);
    }
  });
});
