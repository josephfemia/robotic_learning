import { describe, it, expect } from 'vitest';
import { buildAffinities, softmaxRow, computeAttentionWeights } from './attention.js';

const N = 12; // default from original IIFE

describe('buildAffinities', () => {
  it('returns an N×N matrix', () => {
    const aff = buildAffinities(N);
    expect(aff).toHaveLength(N);
    for (let i = 0; i < N; i++) {
      expect(aff[i]).toHaveLength(N);
    }
  });

  it('is deterministic — same values on repeated calls', () => {
    const a1 = buildAffinities(N);
    const a2 = buildAffinities(N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        expect(a1[i][j]).toBe(a2[i][j]);
      }
    }
  });

  it('uses the exact formula: sin((i+1)*1.7+(j+1)*0.9)+cos((i+1)*0.6-(j+1)*1.3)', () => {
    const aff = buildAffinities(N);
    // spot-check aff[0][0]: i=0, j=0 → sin(1.7+0.9)+cos(0.6-1.3)
    const expected = Math.sin(1.7 + 0.9) + Math.cos(0.6 - 1.3);
    expect(aff[0][0]).toBeCloseTo(expected, 12);
  });

  it('aff[2][5] matches formula at i=2,j=5', () => {
    const aff = buildAffinities(N);
    const expected = Math.sin(3 * 1.7 + 6 * 0.9) + Math.cos(3 * 0.6 - 6 * 1.3);
    expect(aff[2][5]).toBeCloseTo(expected, 12);
  });

  it('values are in a finite range (roughly [-2, 2])', () => {
    const aff = buildAffinities(N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        expect(aff[i][j]).toBeGreaterThanOrEqual(-2.1);
        expect(aff[i][j]).toBeLessThanOrEqual(2.1);
      }
    }
  });
});

describe('softmaxRow', () => {
  it('weights sum to 1 (non-causal, all unmasked)', () => {
    const aff = buildAffinities(N);
    for (let i = 0; i < N; i++) {
      const w = softmaxRow(aff[i], i, 1.0, false);
      const sum = w.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });

  it('weights sum to 1 in causal mode (only j<=i are unmasked)', () => {
    const aff = buildAffinities(N);
    for (let i = 0; i < N; i++) {
      const w = softmaxRow(aff[i], i, 1.0, true);
      const sum = w.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });

  it('causal mask: positions j>i have weight 0', () => {
    const aff = buildAffinities(N);
    const i = 5;
    const w = softmaxRow(aff[i], i, 1.0, true);
    for (let j = i + 1; j < N; j++) {
      expect(w[j]).toBe(0);
    }
  });

  it('causal mask: positions j<=i have weight > 0', () => {
    const aff = buildAffinities(N);
    // Each unmasked weight may not be individually > 0 in theory but in practice
    // with non-degenerate affinities they all are
    const i = 5;
    const w = softmaxRow(aff[i], i, 1.0, true);
    for (let j = 0; j <= i; j++) {
      expect(w[j]).toBeGreaterThan(0);
    }
  });

  it('lower temperature sharpens distribution (max weight increases)', () => {
    const aff = buildAffinities(N);
    const i = 6;
    const wHot = softmaxRow(aff[i], i, 3.0, false);  // high temp = flat
    const wCold = softmaxRow(aff[i], i, 0.25, false); // low temp = sharp
    expect(Math.max(...wCold)).toBeGreaterThan(Math.max(...wHot));
  });

  it('higher temperature flattens distribution (entropy increases)', () => {
    const aff = buildAffinities(N);
    const i = 7;
    const wHot = softmaxRow(aff[i], i, 3.0, false);
    const wCold = softmaxRow(aff[i], i, 0.25, false);
    // hot: all weights closer to 1/N
    const maxHot = Math.max(...wHot);
    const maxCold = Math.max(...wCold);
    expect(maxHot).toBeLessThan(maxCold);
  });

  it('no distance decay: a late query (i=11) can put max weight on an early key (j=0)', () => {
    // This is the core structural claim of the widget
    const aff = buildAffinities(N);
    // Use very low temperature so the argmax is deterministic
    const w = softmaxRow(aff[11], 11, 0.1, false);
    const maxWeight = Math.max(...w);
    const maxIdx = w.indexOf(maxWeight);
    // The argmax position depends only on aff[11][j], not on distance from j=11
    // We just verify that the winning key is NOT forced to be j=11 by any decay:
    // at temp=0.1 whatever key has the highest affinity wins
    const highestAffIdx = aff[11].indexOf(Math.max(...aff[11]));
    expect(maxIdx).toBe(highestAffIdx);
  });

  it('with uniform affinities, weights are uniform (1/N)', () => {
    const uniform = new Array(N).fill(1.0);
    const w = softmaxRow(uniform, N - 1, 1.0, false);
    for (let j = 0; j < N; j++) {
      expect(w[j]).toBeCloseTo(1 / N, 10);
    }
  });

  it('all weights are non-negative', () => {
    const aff = buildAffinities(N);
    for (let i = 0; i < N; i++) {
      const w = softmaxRow(aff[i], i, 1.0, true);
      for (let j = 0; j < N; j++) {
        expect(w[j]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('computeAttentionWeights', () => {
  it('returns N×N matrix', () => {
    const aff = buildAffinities(N);
    const w = computeAttentionWeights(aff, 1.0, false);
    expect(w).toHaveLength(N);
    for (let i = 0; i < N; i++) {
      expect(w[i]).toHaveLength(N);
    }
  });

  it('each row sums to 1 (non-causal)', () => {
    const aff = buildAffinities(N);
    const w = computeAttentionWeights(aff, 1.0, false);
    for (let i = 0; i < N; i++) {
      const sum = w[i].reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });

  it('each row sums to 1 (causal)', () => {
    const aff = buildAffinities(N);
    const w = computeAttentionWeights(aff, 1.0, true);
    for (let i = 0; i < N; i++) {
      const sum = w[i].reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });

  it('causal: upper triangle (j>i) is all zeros', () => {
    const aff = buildAffinities(N);
    const w = computeAttentionWeights(aff, 1.0, true);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        expect(w[i][j]).toBe(0);
      }
    }
  });

  it('non-causal: no zeros forced by mask', () => {
    const aff = buildAffinities(N);
    const w = computeAttentionWeights(aff, 1.0, false);
    // with non-degenerate affinities, all weights should be positive
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        expect(w[i][j]).toBeGreaterThan(0);
      }
    }
  });

  it('attention weight depends on query-key match, not position distance', () => {
    // Verify: weights[11][0] can be larger than weights[11][10]
    // (late query attending to early key more than near key)
    const aff = buildAffinities(N);
    const w = computeAttentionWeights(aff, 0.5, false);
    // aff[11][0] vs aff[11][10]: check which affinity is higher and verify the weight follows
    const a0 = aff[11][0];
    const a10 = aff[11][10];
    if (a0 > a10) {
      expect(w[11][0]).toBeGreaterThan(w[11][10]);
    } else {
      expect(w[11][10]).toBeGreaterThan(w[11][0]);
    }
  });
});
