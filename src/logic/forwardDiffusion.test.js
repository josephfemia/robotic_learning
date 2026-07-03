import { describe, it, expect } from 'vitest';
import {
  MODES, SIGMA0, WEIGHTS, K_MAX,
  alphaBar, noisedParams, noisedDensity, noisedScore,
  epsTarget, blend, mulberry32, randnFrom, samplePairs,
} from './forwardDiffusion.js';

// Pinned constants — the widget geometry and the L3/L6 story depend on these.
describe('constants', () => {
  it('modes match the ±1.4 swerve modes of logic/diffusion.js', () => {
    expect(MODES).toEqual([-1.4, 1.4]);
    expect(SIGMA0).toBeCloseTo(0.35, 12);
    expect(WEIGHTS).toEqual([0.5, 0.5]);
    expect(K_MAX).toBe(40);
  });
});

describe('alphaBar (cosine schedule, s = 0.008, pinned)', () => {
  it('starts at exactly 1 (k = 0 is pure data)', () => {
    expect(alphaBar(0)).toBe(1);
  });

  it('ends clamped at 1e-5 (k = K is essentially pure noise)', () => {
    expect(alphaBar(K_MAX)).toBeCloseTo(1e-5, 12);
  });

  it('pins interior values of the schedule', () => {
    expect(alphaBar(10)).toBeCloseTo(0.847012161327, 10);
    expect(alphaBar(20)).toBeCloseTo(0.493843590441, 10);
    expect(alphaBar(30)).toBeCloseTo(0.144272102386, 10);
  });

  it('is monotone decreasing over the full range', () => {
    for (let k = 1; k <= K_MAX; k++) {
      expect(alphaBar(k)).toBeLessThan(alphaBar(k - 1));
    }
  });

  it('clamps k outside [0, K]', () => {
    expect(alphaBar(-3)).toBe(1);
    expect(alphaBar(K_MAX + 5)).toBeCloseTo(alphaBar(K_MAX), 12);
  });
});

describe('noisedParams', () => {
  it('at ᾱ = 1 the mixture is the clean data', () => {
    const P = noisedParams(1);
    expect(P.means).toEqual(MODES);
    expect(P.variance).toBeCloseTo(SIGMA0 * SIGMA0, 12);
  });

  it('at ᾱ = alphaBar(20) means shrink by √ᾱ and variances blend (pinned)', () => {
    const P = noisedParams(alphaBar(20));
    expect(P.means[0]).toBeCloseTo(-0.9838360825176367, 12);
    expect(P.means[1]).toBeCloseTo(0.9838360825176367, 12);
    expect(P.variance).toBeCloseTo(0.5666522493883404, 12);
  });

  it('at ᾱ → 0 the marginal approaches N(0, 1)', () => {
    const P = noisedParams(1e-5);
    expect(Math.abs(P.means[0])).toBeLessThan(0.01);
    expect(P.variance).toBeCloseTo(1, 3);
  });
});

describe('noisedDensity (pinned at fixed k)', () => {
  it('k = 0: bimodal — peak at a mode, near-zero in the valley', () => {
    expect(noisedDensity(-1.4, 1)).toBeCloseTo(0.569917543431, 10);
    expect(noisedDensity(0, 1)).toBeCloseTo(0.000382372073614, 12);
  });

  it('k = 20: valley has filled in (pinned)', () => {
    const ab = alphaBar(20);
    expect(noisedDensity(0, ab)).toBeCloseTo(0.225594883738, 10);
    expect(noisedDensity(0.7, ab)).toBeCloseTo(0.268514435732, 10);
  });

  it('k = K: essentially a standard Gaussian, peak at 0', () => {
    const ab = alphaBar(K_MAX);
    expect(noisedDensity(0, ab)).toBeCloseTo(0.398940121106, 10); // ≈ 1/√(2π)
    expect(noisedDensity(0, ab)).toBeGreaterThan(noisedDensity(1.4, ab));
  });

  it('is symmetric about 0 at every level', () => {
    for (const k of [0, 10, 20, 40]) {
      const ab = alphaBar(k);
      expect(noisedDensity(0.9, ab)).toBeCloseTo(noisedDensity(-0.9, ab), 12);
    }
  });
});

describe('noisedScore (score of the NOISED density, pinned at fixed k)', () => {
  it('is zero at the symmetry point x = 0', () => {
    expect(noisedScore(0, 1)).toBeCloseTo(0, 12);
    expect(noisedScore(0, alphaBar(20))).toBeCloseTo(0, 12);
  });

  it('k small: crisply bimodal — a point between the modes is pulled to the NEAR basin', () => {
    // x = 0.7 sits right of the valley: at low noise it must point RIGHT (toward +1.4)
    expect(noisedScore(0.7, alphaBar(2))).toBeCloseTo(5.3615451042, 8);
    expect(noisedScore(-0.7, alphaBar(2))).toBeCloseTo(-5.3615451042, 8);
  });

  it('k = K: unimodal — every point is pulled toward 0, ≈ −x (score of N(0,1))', () => {
    const ab = alphaBar(K_MAX);
    expect(noisedScore(0.7, ab)).toBeCloseTo(-0.699992422357, 10);
    expect(noisedScore(-0.7, ab)).toBeCloseTo(0.699992422357, 10);
  });

  it('pins the k = 20 crossover value', () => {
    expect(noisedScore(0.7, alphaBar(20))).toBeCloseTo(0.220116660053, 10);
  });

  it('k = 0 matches the analytic single-Gaussian score deep inside a mode', () => {
    // At x = -1.3 the left mode dominates: score ≈ (μ₁ − x)/σ₀²
    const s = noisedScore(-1.3, 1);
    expect(s).toBeCloseTo((-1.4 + 1.3) / (SIGMA0 * SIGMA0), 4);
  });
});

describe('epsTarget', () => {
  it('is −√(1−ᾱ)·score (pinned at k = 20)', () => {
    const ab = alphaBar(20);
    expect(epsTarget(0.7, ab)).toBeCloseTo(-0.156601271815, 10);
    expect(epsTarget(0.7, ab)).toBeCloseTo(-Math.sqrt(1 - ab) * noisedScore(0.7, ab), 12);
  });

  it('vanishes at ᾱ = 1 (no noise was mixed in)', () => {
    expect(epsTarget(0.7, 1)).toBe(-0);
  });
});

describe('blend (closed-form forward process)', () => {
  it('k = 0 returns the clean sample; k = K returns (almost) the noise', () => {
    expect(blend(1.4, -0.5, 1)).toBeCloseTo(1.4, 12);
    expect(blend(1.4, -0.5, 1e-5)).toBeCloseTo(-0.5, 2);
  });

  it('pins the k = 20 mix', () => {
    expect(blend(1.4, -0.5, alphaBar(20))).toBeCloseTo(0.628112731598, 10);
  });
});

describe('seeded sampling', () => {
  it('mulberry32 is deterministic and in [0, 1)', () => {
    const a = mulberry32(7), b = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const va = a(), vb = b();
      expect(va).toBe(vb);
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
    }
  });

  it('randnFrom produces roughly standard-normal draws (sanity, seeded)', () => {
    const rng = mulberry32(99);
    let s = 0, s2 = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) { const z = randnFrom(rng); s += z; s2 += z * z; }
    expect(s / N).toBeCloseTo(0, 1);
    expect(s2 / N).toBeCloseTo(1, 1);
  });

  it('samplePairs is deterministic per seed (pinned first pairs, seed 12345)', () => {
    const p = samplePairs(4, 12345);
    expect(p).toHaveLength(4);
    expect(p[0].x0).toBeCloseTo(0.864576708511, 10);
    expect(p[0].eps).toBeCloseTo(-0.632880170991, 10);
    expect(p[1].x0).toBeCloseTo(-1.31781115474, 10);
    expect(p[1].eps).toBeCloseTo(0.0362076701025, 10);
    expect(samplePairs(4, 12345)).toEqual(p);
  });

  it('different seeds give different pairs', () => {
    expect(samplePairs(4, 1)[0].x0).not.toBeCloseTo(samplePairs(4, 2)[0].x0, 6);
  });

  it('x0 draws sit near the two modes', () => {
    const p = samplePairs(200, 42);
    for (const q of p) {
      expect(Math.min(Math.abs(q.x0 - MODES[0]), Math.abs(q.x0 - MODES[1]))).toBeLessThan(5 * SIGMA0);
    }
  });
});
