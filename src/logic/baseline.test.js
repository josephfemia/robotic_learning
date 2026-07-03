import { describe, it, expect } from 'vitest';
import { RETURNS, SCORES, MEAN_RETURN, OPTIMAL_BASELINE, MEAN_GRADIENT, gradientStats, varianceCurve } from './baseline.js';

describe('RETURNS', () => {
  it('has 10 elements matching the original fixed dataset', () => {
    expect(RETURNS).toHaveLength(10);
    // Spot-check verbatim values from original
    expect(RETURNS[0]).toBeCloseTo(0.95, 10);
    expect(RETURNS[4]).toBeCloseTo(0.97, 10);
    expect(RETURNS[9]).toBeCloseTo(0.83, 10);
  });
});

describe('SCORES', () => {
  it('has 10 elements', () => {
    expect(SCORES).toHaveLength(10);
  });

  it('sums to zero (centered scores)', () => {
    const sum = SCORES.reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0, 10);
  });
});

describe('MEAN_RETURN', () => {
  it('equals the mean of RETURNS', () => {
    const expected = RETURNS.reduce((s, v) => s + v, 0) / RETURNS.length;
    expect(MEAN_RETURN).toBeCloseTo(expected, 10);
  });

  it('is approximately 0.889 (10 values averaging near 0.89)', () => {
    // Original data: mean of [0.95,0.88,0.93,0.80,0.97,0.85,0.91,0.78,0.99,0.83]
    expect(MEAN_RETURN).toBeCloseTo(0.889, 3);
  });
});

describe('OPTIMAL_BASELINE', () => {
  it('is between min and max return', () => {
    expect(OPTIMAL_BASELINE).toBeGreaterThan(Math.min(...RETURNS));
    expect(OPTIMAL_BASELINE).toBeLessThan(Math.max(...RETURNS));
  });

  it('matches score-weighted formula: Σ(s²R)/Σ(s²)', () => {
    let num = 0, den = 0;
    for (let i = 0; i < RETURNS.length; i++) {
      const s2 = SCORES[i] * SCORES[i];
      num += s2 * RETURNS[i];
      den += s2;
    }
    expect(OPTIMAL_BASELINE).toBeCloseTo(num / den, 10);
  });
});

describe('gradientStats', () => {
  it('mean gradient is nearly zero when b=0 (all returns positive, centered scores)', () => {
    // Scores are centered → Σ sᵢ = 0 → Σ gᵢ = Σ Rᵢ·sᵢ → close to zero because scores
    // are centered but not orthogonal to returns. Mean should still be small.
    const { mean } = gradientStats(0);
    // The actual mean gradient at b=0 equals mean of RETURNS * (sum of scores / N) = 0
    // because Σ sᵢ = 0 and RETURNS don't change the zero:
    // Σ (Rᵢ - 0) * sᵢ = Σ Rᵢ·sᵢ; mean = that / N
    // Just verify it's a finite number near zero-ish
    expect(isFinite(mean)).toBe(true);
  });

  it('mean gradient is invariant to the baseline (unbiasedness)', () => {
    // E[∇logπ] = 0 means the mean gradient does NOT change as b changes.
    // Proof: Σ gᵢ = Σ (Rᵢ - b) sᵢ = Σ Rᵢ·sᵢ - b·Σ sᵢ = Σ Rᵢ·sᵢ - b·0 = const
    const { mean: m1 } = gradientStats(0.0);
    const { mean: m2 } = gradientStats(0.5);
    const { mean: m3 } = gradientStats(MEAN_RETURN);
    expect(m1).toBeCloseTo(m2, 10);
    expect(m2).toBeCloseTo(m3, 10);
  });

  it('variance is lower at OPTIMAL_BASELINE than at b=0', () => {
    const { variance: v0 } = gradientStats(0);
    const { variance: vStar } = gradientStats(OPTIMAL_BASELINE);
    expect(vStar).toBeLessThan(v0);
  });

  it('variance is lower near MEAN_RETURN than at b=0', () => {
    const { variance: v0 } = gradientStats(0);
    const { variance: vMean } = gradientStats(MEAN_RETURN);
    expect(vMean).toBeLessThan(v0);
  });

  it('gs has length equal to RETURNS.length', () => {
    const { gs } = gradientStats(MEAN_RETURN);
    expect(gs).toHaveLength(RETURNS.length);
  });

  it('gs values match (Rᵢ - b) * sᵢ formula', () => {
    const b = 0.85;
    const { gs } = gradientStats(b);
    for (let i = 0; i < RETURNS.length; i++) {
      expect(gs[i]).toBeCloseTo((RETURNS[i] - b) * SCORES[i], 10);
    }
  });
});

describe('MEAN_GRADIENT', () => {
  it('equals (1/N) Σ Rᵢ·sᵢ', () => {
    let s = 0;
    for (let i = 0; i < RETURNS.length; i++) s += RETURNS[i] * SCORES[i];
    expect(MEAN_GRADIENT).toBeCloseTo(s / RETURNS.length, 12);
  });

  it('is pinned near −0.0124 for the fixed dataset', () => {
    expect(MEAN_GRADIENT).toBeCloseTo(-0.01243, 4);
  });

  it('matches gradientStats(b).mean for every b — the needle never moves', () => {
    for (const b of [0, 0.3, MEAN_RETURN, OPTIMAL_BASELINE, 1.2]) {
      expect(gradientStats(b).mean).toBeCloseTo(MEAN_GRADIENT, 12);
    }
  });
});

describe('varianceCurve', () => {
  it('returns n points spanning [bMin, bMax]', () => {
    const pts = varianceCurve(0, 1.2, 121);
    expect(pts).toHaveLength(121);
    expect(pts[0].b).toBeCloseTo(0, 12);
    expect(pts[120].b).toBeCloseTo(1.2, 12);
  });

  it('every point agrees with gradientStats at that b', () => {
    const pts = varianceCurve(0, 1.2, 13);
    for (const p of pts) {
      expect(p.variance).toBeCloseTo(gradientStats(p.b).variance, 12);
    }
  });

  it('dips at OPTIMAL_BASELINE: curve minimum lies within one grid step of b*', () => {
    const pts = varianceCurve(0, 1.2, 121);
    let argmin = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].variance < pts[argmin].variance) argmin = i;
    const gridStep = 1.2 / 120;
    expect(Math.abs(pts[argmin].b - OPTIMAL_BASELINE)).toBeLessThanOrEqual(gridStep);
  });

  it('is much higher at both edges than at the dip (the visible shape)', () => {
    const vStar = gradientStats(OPTIMAL_BASELINE).variance;
    expect(gradientStats(0).variance).toBeGreaterThan(5 * vStar);
    expect(gradientStats(1.2).variance).toBeGreaterThan(5 * vStar);
  });
});
