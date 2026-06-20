import { describe, it, expect } from 'vitest';
import { simulateRollout, expectedFirstError, driftBias } from './driftFunnel.js';

// Constants from the original IIFE: STEPS=64, H=300, maxA=H/2-22=128, eps=0.06
const STEPS = 64;
const MAX_A = 128;
const EPS = 0.06;

describe('simulateRollout', () => {
  it('returns an array of length STEPS+1', () => {
    const result = simulateRollout(EPS, STEPS, MAX_A);
    expect(result.length).toBe(STEPS + 1);
  });

  it('starts at 0 (no drift before any step)', () => {
    const result = simulateRollout(EPS, STEPS, MAX_A);
    expect(result[0]).toBe(0);
  });

  it('all values are clamped to [-maxA, maxA]', () => {
    for (let trial = 0; trial < 20; trial++) {
      const result = simulateRollout(EPS, STEPS, MAX_A);
      for (let t = 0; t <= STEPS; t++) {
        expect(result[t]).toBeGreaterThanOrEqual(-MAX_A);
        expect(result[t]).toBeLessThanOrEqual(MAX_A);
      }
    }
  });

  it('stays at 0 when eps=0 (never goes off distribution)', () => {
    // With eps=0, the policy never errors — all d stays 0
    const result = simulateRollout(0, STEPS, MAX_A);
    for (let t = 0; t <= STEPS; t++) {
      expect(result[t]).toBe(0);
    }
  });

  it('deterministic with injected seeded rand — first error at step 1 when rand always returns 0', () => {
    // rand() < eps (0.06) is true when rand returns 0
    // first call goes off-dist immediately, d += (0<0.5?-1:1)*4 = -4 (second rand=0 < 0.5)
    let callCount = 0;
    const deterministicRand = () => {
      callCount++;
      return 0; // always 0: triggers error immediately, always picks -1 side
    };
    const result = simulateRollout(EPS, STEPS, MAX_A, deterministicRand);
    // After t=1: off=true, d = -4
    expect(result[1]).toBe(-4);
    // After t=2 off: d += (rand()-0.5)*4 + (d<0?-0.6:0.6)
    //   = (0 - 0.5)*4 + (-0.6)  [d=-4 so d>0 is false → bias is -0.6]
    //   = -2.0 + (-0.6) = -2.6  → d = -4 + (-2.6) = -6.6
    expect(result[2]).toBeCloseTo(-6.6, 10);
  });

  it('higher eps produces larger average absolute drift at end (statistical)', () => {
    // Average final |d| should be larger for eps=0.2 vs eps=0.01
    const N = 200;
    let sum_low = 0, sum_high = 0;
    for (let i = 0; i < N; i++) {
      const low = simulateRollout(0.01, STEPS, MAX_A);
      const high = simulateRollout(0.2, STEPS, MAX_A);
      sum_low += Math.abs(low[STEPS]);
      sum_high += Math.abs(high[STEPS]);
    }
    expect(sum_high / N).toBeGreaterThan(sum_low / N);
  });
});

describe('expectedFirstError', () => {
  it('returns 1/eps (geometric distribution mean)', () => {
    expect(expectedFirstError(0.06)).toBeCloseTo(1 / 0.06, 10);
    expect(expectedFirstError(0.2)).toBeCloseTo(5, 10);
    expect(expectedFirstError(0.01)).toBeCloseTo(100, 10);
  });

  it('is larger for smaller eps (errors are rarer)', () => {
    expect(expectedFirstError(0.01)).toBeGreaterThan(expectedFirstError(0.1));
  });
});

describe('driftBias', () => {
  it('is 0.6 (verbatim from original)', () => {
    expect(driftBias()).toBe(0.6);
  });
});
