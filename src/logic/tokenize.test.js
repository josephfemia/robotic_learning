import { describe, it, expect } from 'vitest';
import {
  RIDGE,
  mulberry32,
  makeRandn,
  ridgeSamples,
  binIndex,
  binCenter,
  snapSamples,
  quantError,
  jointHist,
  marginalsOf,
  productHist,
  phantomMass,
  distinctCells,
} from './tokenize.js';

// The widget's fixed cloud: 160 samples, seed 42 (RIDGE defaults).
const S = ridgeSamples();

describe('mulberry32 / makeRandn', () => {
  it('is deterministic for a fixed seed', () => {
    const a = mulberry32(7), b = mulberry32(7);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });

  it('outputs are in [0, 1)', () => {
    const r = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('makeRandn produces roughly standard-normal variates', () => {
    const randn = makeRandn(mulberry32(1));
    let sum = 0, sum2 = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) { const v = randn(); sum += v; sum2 += v * v; }
    expect(sum / N).toBeCloseTo(0, 1);           // mean ≈ 0
    expect(sum2 / N).toBeCloseTo(1, 0.5);        // var ≈ 1
  });
});

describe('ridgeSamples — pinned seeded cloud', () => {
  it('returns RIDGE.n samples inside the clamp bounds', () => {
    expect(S.length).toBe(RIDGE.n);
    for (const p of S) {
      expect(p.x).toBeGreaterThanOrEqual(RIDGE.lo);
      expect(p.x).toBeLessThanOrEqual(RIDGE.hi);
      expect(p.y).toBeGreaterThanOrEqual(RIDGE.lo);
      expect(p.y).toBeLessThanOrEqual(RIDGE.hi);
    }
  });

  it('pins the first two samples (seed 42)', () => {
    expect(S[0].x).toBeCloseTo(0.33482994, 7);
    expect(S[0].y).toBeCloseTo(0.31359349, 7);
    expect(S[1].x).toBeCloseTo(0.20579086, 7);
    expect(S[1].y).toBeCloseTo(0.11705106, 7);
  });

  it('is a strongly correlated ridge (corr ≈ 0.907)', () => {
    let mx = 0, my = 0;
    S.forEach(p => { mx += p.x; my += p.y; });
    mx /= S.length; my /= S.length;
    let sxy = 0, sxx = 0, syy = 0;
    S.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
    expect(sxy / Math.sqrt(sxx * syy)).toBeCloseTo(0.9070, 3);
  });
});

describe('binIndex / binCenter / snapSamples', () => {
  it('binIndex maps [0,1] onto [0, k-1] with edge clamping', () => {
    expect(binIndex(0, 4)).toBe(0);
    expect(binIndex(0.24, 4)).toBe(0);
    expect(binIndex(0.25, 4)).toBe(1);
    expect(binIndex(0.99, 4)).toBe(3);
    expect(binIndex(1, 4)).toBe(3);     // top edge stays in the last bin
  });

  it('binCenter is the midpoint of the bin', () => {
    expect(binCenter(0, 2)).toBe(0.25);
    expect(binCenter(1, 2)).toBe(0.75);
    expect(binCenter(3, 8)).toBeCloseTo(0.4375, 12);
  });

  it('snapped points land exactly on bin centers of their indices', () => {
    const snapped = snapSamples(S, 8);
    expect(snapped.length).toBe(S.length);
    for (const p of snapped) {
      expect(p.x).toBe(binCenter(p.ix, 8));
      expect(p.y).toBe(binCenter(p.iy, 8));
    }
  });
});

describe('quantError — pinned + monotone', () => {
  it('pins mean quantization error at fixed bin counts (seed 42)', () => {
    expect(quantError(S, 2)).toBeCloseTo(0.19366728, 7);
    expect(quantError(S, 8)).toBeCloseTo(0.04766363, 7);
    expect(quantError(S, 256)).toBeCloseTo(0.0015597, 6);
  });

  it('error decreases monotonically over the slider ladder 2 → 256', () => {
    const ks = [2, 4, 8, 16, 32, 64, 128, 256];
    for (let i = 1; i < ks.length; i++) {
      expect(quantError(S, ks[i])).toBeLessThan(quantError(S, ks[i - 1]));
    }
  });

  it('returns 0 for an empty cloud', () => {
    expect(quantError([], 8)).toBe(0);
  });
});

describe('jointHist / marginalsOf / productHist — pinned at k=4', () => {
  const J = jointHist(S, 4);
  const P = productHist(J, 4);
  const M = marginalsOf(J, 4);

  it('joint and product both sum to 1', () => {
    expect(J.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(P.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('pins joint histogram cells: mass on the diagonal, zero off-ridge corners', () => {
    // row-major: hist[iy*4 + ix]
    expect(J[1 * 4 + 1]).toBeCloseTo(0.34375, 10);  // dense mid-ridge cell
    expect(J[2 * 4 + 2]).toBeCloseTo(0.31875, 10);  // dense mid-ridge cell
    expect(J[0 * 4 + 0]).toBeCloseTo(0.05, 10);     // ridge tail
    expect(J[0 * 4 + 3]).toBe(0);                   // off-ridge corner: no demos
    expect(J[3 * 4 + 0]).toBe(0);                   // off-ridge corner: no demos
  });

  it('pins the marginals at k=4', () => {
    expect(M.px[1]).toBeCloseTo(0.425, 10);
    expect(M.py[2]).toBeCloseTo(0.39375, 10);
  });

  it('product-of-marginals puts visible mass in the off-ridge corners', () => {
    expect(P[0 * 4 + 3]).toBeCloseTo(0.00625, 8);    // corner the joint left empty
    expect(P[3 * 4 + 0]).toBeCloseTo(0.00664062, 7); // corner the joint left empty
    expect(P[1 * 4 + 2]).toBeCloseTo(0.18046875, 8); // checkerboard-cross arm
  });

  it('the product distribution preserves the marginals of the joint', () => {
    const Mp = marginalsOf(P, 4);
    for (let i = 0; i < 4; i++) {
      expect(Mp.px[i]).toBeCloseTo(M.px[i], 10);
      expect(Mp.py[i]).toBeCloseTo(M.py[i], 10);
    }
  });
});

describe('phantomMass — pinned; grows as the grid refines', () => {
  it('pins phantom mass at fixed bin counts (seed 42)', () => {
    const p4 = phantomMass(jointHist(S, 4), productHist(jointHist(S, 4), 4));
    const p8 = phantomMass(jointHist(S, 8), productHist(jointHist(S, 8), 8));
    const p16 = phantomMass(jointHist(S, 16), productHist(jointHist(S, 16), 16));
    expect(p4).toBeCloseTo(0.1521875, 7);
    expect(p8).toBeCloseTo(0.34984375, 7);
    expect(p16).toBeCloseTo(0.50847656, 7);
    expect(p4).toBeLessThan(p8);
    expect(p8).toBeLessThan(p16);
  });

  it('is zero when the joint IS a product distribution (independent dims)', () => {
    // Uniform joint over a 2×2 grid factorizes exactly — nothing is phantom.
    const J = [0.25, 0.25, 0.25, 0.25];
    expect(phantomMass(J, productHist(J, 2))).toBe(0);
  });
});

describe('distinctCells — pinned collapse counts', () => {
  it('pins how many representable actions survive at fixed bin counts', () => {
    expect(distinctCells(S, 2)).toBe(4);     // 160 demos collapse onto 4 actions
    expect(distinctCells(S, 8)).toBe(23);
    expect(distinctCells(S, 256)).toBe(159); // nearly every demo keeps its own cell
  });
});
