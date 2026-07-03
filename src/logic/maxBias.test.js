import { describe, it, expect } from 'vitest';
import {
  makeRng, makeRandn, argmax, sampleEstimates, resampleOnce, biasStats,
} from './maxBias.js';

// ── makeRng / makeRandn ───────────────────────────────────────────────────────
describe('makeRng', () => {
  it('is deterministic: same seed → same sequence', () => {
    const a = makeRng(11), b = makeRng(11);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });
});

describe('makeRandn', () => {
  it('is deterministic under a fixed seed', () => {
    const a = makeRandn(makeRng(5)), b = makeRandn(makeRng(5));
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('has roughly zero mean and unit sd over many draws', () => {
    const randn = makeRandn(makeRng(1234));
    let sum = 0, sumSq = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) { const z = randn(); sum += z; sumSq += z * z; }
    const mean = sum / n;
    const sd = Math.sqrt(sumSq / n - mean * mean);
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(sd - 1)).toBeLessThan(0.05);
  });
});

// ── argmax ────────────────────────────────────────────────────────────────────
describe('argmax', () => {
  it('returns index of maximum; ties first-wins', () => {
    expect(argmax([1, 3, 2])).toBe(1);
    expect(argmax([5, 5, 5])).toBe(0);
    expect(argmax([-2, -1, -3])).toBe(1);
  });
});

// ── sampleEstimates ───────────────────────────────────────────────────────────
describe('sampleEstimates', () => {
  it('returns N draws', () => {
    const randn = makeRandn(makeRng(3));
    expect(sampleEstimates(7, 1, randn)).toHaveLength(7);
  });

  it('scales linearly with σ (same seed → exactly doubled draws)', () => {
    const e1 = sampleEstimates(6, 1, makeRandn(makeRng(9)));
    const e2 = sampleEstimates(6, 2, makeRandn(makeRng(9)));
    for (let i = 0; i < 6; i++) expect(e2[i]).toBeCloseTo(2 * e1[i], 12);
  });
});

// ── resampleOnce ──────────────────────────────────────────────────────────────
describe('resampleOnce — coupled (vanilla max)', () => {
  it('picks the argmax of the estimates and trusts that same estimate', () => {
    const randn = makeRandn(makeRng(21));
    const s = resampleOnce(5, 1, randn, false);
    expect(s.est).toHaveLength(5);
    expect(s.pick).toBe(argmax(s.est));
    expect(s.value).toBe(s.est[s.pick]);
    expect(s.evalEst).toBeNull();
  });
});

describe('resampleOnce — decoupled (Double-DQN style)', () => {
  it('selects with one draw, evaluates the picked action with an independent draw', () => {
    const randn = makeRandn(makeRng(21));
    const s = resampleOnce(5, 1, randn, true);
    expect(s.pick).toBe(argmax(s.est));
    expect(s.evalEst).toHaveLength(5);
    expect(s.value).toBe(s.evalEst[s.pick]);
    expect(s.value).not.toBe(s.est[s.pick]); // independent draw, a.s. different
  });
});

// ── biasStats — the headline numbers ─────────────────────────────────────────
describe('biasStats — coupled bias matches E[max of N standard normals]·σ', () => {
  it('N=5, σ=1: mean bias ≈ 1.163', () => {
    const { mean } = biasStats(5, 1, 4000, 77, false);
    expect(Math.abs(mean - 1.163)).toBeLessThan(0.05);
  });

  it('bias grows with N: N=10 exceeds N=2', () => {
    const b2 = biasStats(2, 1, 3000, 77, false).mean;
    const b10 = biasStats(10, 1, 3000, 77, false).mean;
    expect(b10).toBeGreaterThan(b2);
    // rough anchors: E[max of 2] ≈ 0.564, E[max of 10] ≈ 1.539
    expect(Math.abs(b2 - 0.564)).toBeLessThan(0.05);
    expect(Math.abs(b10 - 1.539)).toBeLessThan(0.05);
  });

  it('bias scales exactly linearly with σ under the same seed', () => {
    const b1 = biasStats(6, 1, 500, 5, false).mean;
    const b2 = biasStats(6, 2, 500, 5, false).mean;
    expect(b2).toBeCloseTo(2 * b1, 12);
  });
});

describe('biasStats — decoupling kills the bias but not the noise', () => {
  it('decoupled mean bias ≈ 0', () => {
    const { mean } = biasStats(5, 1, 4000, 77, true);
    expect(Math.abs(mean)).toBeLessThan(0.06);
  });

  it('decoupled sd stays ≈ σ (the noise survives)', () => {
    const { sd } = biasStats(5, 1, 4000, 77, true);
    expect(sd).toBeGreaterThan(0.9);
    expect(sd).toBeLessThan(1.1);
  });

  it('coupled sd is smaller than σ (max-of-N concentrates) — the bar is bias, not noise', () => {
    const { sd } = biasStats(5, 1, 4000, 77, false);
    expect(sd).toBeLessThan(0.8);
  });
});

// ── pinned regression at a fixed seed ────────────────────────────────────────
describe('pinned mean bias (N=5, σ=1, 500 trials, seed 42)', () => {
  it('pins coupled and decoupled means', () => {
    expect(biasStats(5, 1, 500, 42, false).mean).toBeCloseTo(PINNED_COUPLED, 8);
    expect(biasStats(5, 1, 500, 42, true).mean).toBeCloseTo(PINNED_DECOUPLED, 8);
  });
});

// Regression pins from the first verified implementation run (2026-07-03).
const PINNED_COUPLED = 1.1454444234894863;
const PINNED_DECOUPLED = 0.10842957437855327;
