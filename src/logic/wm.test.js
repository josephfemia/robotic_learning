import { describe, it, expect } from 'vitest';
import { latentDivergence, pixelDivergence, trustworthyHorizon } from './wm.js';

// Default eps from the original IIFE: 0.05
const EPS = 0.05;

describe('latentDivergence', () => {
  it('is 0 at h=0 (no steps, no divergence)', () => {
    expect(latentDivergence(0, EPS)).toBeCloseTo(0, 10);
  });

  it('approaches 1 asymptotically as h grows large', () => {
    expect(latentDivergence(200, EPS)).toBeCloseTo(1, 4);
  });

  it('matches 1 - exp(-eps*h) at h=10, eps=0.05', () => {
    const expected = 1 - Math.exp(-EPS * 10);
    expect(latentDivergence(10, EPS)).toBeCloseTo(expected, 10);
  });

  it('matches original at h=15 (Dreamer horizon), eps=0.05', () => {
    // Original default: eps=0.05, h=15 → latent divergence ~0.528
    const expected = 1 - Math.exp(-0.05 * 15);
    expect(latentDivergence(15, EPS)).toBeCloseTo(expected, 10);
  });

  it('higher eps yields higher divergence at same horizon', () => {
    expect(latentDivergence(10, 0.1)).toBeGreaterThan(latentDivergence(10, 0.05));
  });

  it('is monotonically increasing with h', () => {
    for (let h = 1; h <= 50; h++) {
      expect(latentDivergence(h, EPS)).toBeGreaterThan(latentDivergence(h - 1, EPS));
    }
  });
});

describe('pixelDivergence', () => {
  it('is 0 at h=0', () => {
    expect(pixelDivergence(0, EPS)).toBeCloseTo(0, 10);
  });

  it('matches 1 - exp(-eps * h^1.4 / 3) at h=10, eps=0.05', () => {
    const expected = 1 - Math.exp(-EPS * Math.pow(10, 1.4) / 3);
    expect(pixelDivergence(10, EPS)).toBeCloseTo(expected, 10);
  });

  it('approaches 1 asymptotically', () => {
    expect(pixelDivergence(200, EPS)).toBeCloseTo(1, 4);
  });

  it('pixel model diverges faster than latent for h>0', () => {
    // h^1.4/3 vs h: pixel is worse when h^0.4/3 > 1, i.e. h > 3^(1/0.4) ≈ 46.8
    // but for small h, pixel may be lower. Check a mid-range horizon where pixel>latent.
    // At h=50, eps=0.05: pixel exponent = 0.05*50^1.4/3 ≈ 0.05*178.5/3 ≈ 2.97
    //   latent exponent = 0.05*50 = 2.5 → pixel diverges more
    expect(pixelDivergence(50, EPS)).toBeGreaterThan(latentDivergence(50, EPS));
  });

  it('is monotonically increasing with h', () => {
    for (let h = 1; h <= 50; h++) {
      expect(pixelDivergence(h, EPS)).toBeGreaterThanOrEqual(pixelDivergence(h - 1, EPS));
    }
  });
});

describe('trustworthyHorizon', () => {
  it('returns 0 when eps is very large (diverges immediately)', () => {
    // eps=2: latent(1, 2) = 1-exp(-2) ≈ 0.865 > 0.3 → hUse stays 0
    expect(trustworthyHorizon(2, 50)).toBe(0);
  });

  it('returns Hmax when eps is very small (always trustworthy)', () => {
    // eps=0.001: latent(50, 0.001) = 1-exp(-0.05) ≈ 0.0488 <= 0.3
    expect(trustworthyHorizon(0.001, 50)).toBe(50);
  });

  it('matches the original scan at eps=0.05, Hmax=50', () => {
    // latent(h, 0.05) <= 0.3 iff 1-exp(-0.05h) <= 0.3 iff exp(-0.05h) >= 0.7
    // iff h <= -ln(0.7)/0.05 ≈ 7.13 → largest integer h <= 7.13 is 7
    expect(trustworthyHorizon(EPS, 50)).toBe(7);
  });

  it('increases as eps decreases (more trustworthy at lower error)', () => {
    expect(trustworthyHorizon(0.02, 50)).toBeGreaterThan(trustworthyHorizon(0.05, 50));
  });
});
