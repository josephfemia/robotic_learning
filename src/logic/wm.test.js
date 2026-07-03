import { describe, it, expect } from 'vitest';
import {
  latentDivergence,
  pixelDivergence,
  trustworthyHorizon,
  mulberry32,
  randnFrom,
  rolloutFan,
} from './wm.js';

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

describe('mulberry32', () => {
  it('is deterministic: same seed → same sequence', () => {
    const a = mulberry32(9);
    const b = mulberry32(9);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('pinned first value for seed 9', () => {
    expect(mulberry32(9)()).toBeCloseTo(0.19872892, 7);
  });

  it('different seeds give different sequences', () => {
    expect(mulberry32(9)()).not.toBeCloseTo(mulberry32(10)(), 7);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randnFrom', () => {
  it('is deterministic given a seeded rng', () => {
    const a = randnFrom(mulberry32(5));
    const b = randnFrom(mulberry32(5));
    expect(a).toBe(b);
  });

  it('is approximately standard normal over 2000 draws (seed 123)', () => {
    const rng = mulberry32(123);
    let s = 0, s2 = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const x = randnFrom(rng);
      s += x;
      s2 += x * x;
    }
    const mean = s / N;
    const std = Math.sqrt(s2 / N - mean * mean);
    expect(Math.abs(mean)).toBeLessThan(0.1);
    expect(std).toBeGreaterThan(0.9);
    expect(std).toBeLessThan(1.1);
  });
});

describe('rolloutFan', () => {
  const EPS = 0.05;

  it('returns n trajectories of length Hmax+1, each starting at 0', () => {
    const fan = rolloutFan(7, 20, EPS, 'latent', 1);
    expect(fan).toHaveLength(7);
    for (const traj of fan) {
      expect(traj).toHaveLength(21);
      expect(traj[0]).toBe(0);
    }
  });

  it('is deterministic: same seed reproduces the same fan', () => {
    const a = rolloutFan(3, 15, EPS, 'pixel', 42);
    const b = rolloutFan(3, 15, EPS, 'pixel', 42);
    expect(a).toEqual(b);
  });

  it('different seeds give different fans', () => {
    const a = rolloutFan(1, 10, EPS, 'latent', 1)[0];
    const b = rolloutFan(1, 10, EPS, 'latent', 2)[0];
    expect(a[10]).not.toBeCloseTo(b[10], 10);
  });

  it('pinned latent trajectory (Hmax=5, eps=0.05, seed=42)', () => {
    const t = rolloutFan(1, 5, 0.05, 'latent', 42)[0];
    const expected = [0, -0.046633, -0.068943, -0.256268, -0.388611, -0.455728];
    for (let h = 0; h <= 5; h++) expect(t[h]).toBeCloseTo(expected[h], 5);
  });

  it('pinned pixel trajectory (Hmax=5, eps=0.05, seed=42)', () => {
    const t = rolloutFan(1, 5, 0.05, 'pixel', 42)[0];
    const expected = [0, -0.015804, -0.026651, -0.139009, -0.230537, -0.282165];
    for (let h = 0; h <= 5; h++) expect(t[h]).toBeCloseTo(expected[h], 5);
  });

  it('RMS spread at horizon h matches the latent divergence envelope', () => {
    const n = 600, H = 40;
    const fan = rolloutFan(n, H, EPS, 'latent', 1);
    const rms = Math.sqrt(fan.reduce((s, t) => s + t[H] * t[H], 0) / n);
    const env = latentDivergence(H, EPS);
    expect(rms / env).toBeGreaterThan(0.88);
    expect(rms / env).toBeLessThan(1.12);
  });

  it('RMS spread at horizon h matches the pixel divergence envelope', () => {
    const n = 600, H = 40;
    const fan = rolloutFan(n, H, EPS, 'pixel', 1);
    const rms = Math.sqrt(fan.reduce((s, t) => s + t[H] * t[H], 0) / n);
    const env = pixelDivergence(H, EPS);
    expect(rms / env).toBeGreaterThan(0.88);
    expect(rms / env).toBeLessThan(1.12);
  });

  it('pixel fan is wider than latent fan at the same horizon (mean |offset|)', () => {
    const n = 300, H = 30;
    const meanAbs = (fan) => fan.reduce((s, t) => s + Math.abs(t[H]), 0) / n;
    const lat = meanAbs(rolloutFan(n, H, EPS, 'latent', 1));
    const pix = meanAbs(rolloutFan(n, H, EPS, 'pixel', 1));
    expect(pix).toBeGreaterThan(lat);
  });
});
