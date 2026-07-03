import { describe, it, expect } from 'vitest';
import {
  bcRegret,
  daggerRegret,
  regretRatio,
  perStepDamage,
  damageTriangleArea,
  daggerStripArea,
} from './compoundingError.js';

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

describe('perStepDamage', () => {
  it('is ε·T at t=0 (a first-step mistake ruins the whole episode)', () => {
    expect(perStepDamage(0.06, 0, 60)).toBeCloseTo(3.6, 10);
    expect(perStepDamage(0.2, 0, 100)).toBeCloseTo(20, 10);
  });

  it('is 0 at t=T and clamps to 0 beyond the horizon', () => {
    expect(perStepDamage(EPS, 60, 60)).toBe(0);
    expect(perStepDamage(EPS, 75, 60)).toBe(0);
  });

  it('decreases linearly in t: damage(t) − damage(t+1) = ε', () => {
    for (let t = 0; t < 60; t++) {
      expect(perStepDamage(EPS, t, 60) - perStepDamage(EPS, t + 1, 60))
        .toBeCloseTo(EPS, 10);
    }
  });

  it('pins a mid-episode value: ε=0.06, t=20, T=60 → 0.06·40 = 2.4', () => {
    expect(perStepDamage(0.06, 20, 60)).toBeCloseTo(2.4, 10);
  });
});

describe('damageTriangleArea', () => {
  it('is ½·ε·T² — half the BC regret at the same (ε, T)', () => {
    for (const T of [10, 30, 60, 100]) {
      expect(2 * damageTriangleArea(EPS, T)).toBeCloseTo(bcRegret(EPS, T), 10);
    }
  });

  it('pins the widget defaults ε=0.06, T=60 → 108', () => {
    expect(damageTriangleArea(0.06, 60)).toBeCloseTo(108, 10);
  });

  it('matches the discrete sum Σₜ ε·(T−t) up to the ½·ε·T discretisation term', () => {
    // Σ_{t=0}^{T-1} ε·(T−t) = ε·T(T+1)/2 = ½εT² + ½εT
    const T = 60;
    let sum = 0;
    for (let t = 0; t < T; t++) sum += perStepDamage(EPS, t, T);
    expect(sum).toBeCloseTo(damageTriangleArea(EPS, T) + 0.5 * EPS * T, 10);
  });
});

describe('daggerStripArea', () => {
  it('equals daggerRegret (T steps × ε per step)', () => {
    for (const T of [10, 30, 60, 100]) {
      expect(daggerStripArea(EPS, T)).toBeCloseTo(daggerRegret(EPS, T), 12);
    }
  });

  it('pins the widget defaults ε=0.06, T=60 → 3.6', () => {
    expect(daggerStripArea(0.06, 60)).toBeCloseTo(3.6, 10);
  });
});
