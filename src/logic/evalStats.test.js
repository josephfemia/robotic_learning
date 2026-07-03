import { describe, it, expect } from 'vitest';
import {
  makeRng,
  sampleBinomial,
  wilson,
  wilsonFromRate,
  ciSeparated,
  minSeparatingN,
  paperVerdict,
  trueWinner,
} from './evalStats.js';

// Pinned values below were computed independently from the textbook Wilson
// score formula (z = 1.96):
//   center = (p̂ + z²/2n) / (1 + z²/n)
//   half   = (z / (1 + z²/n)) · √(p̂(1−p̂)/n + z²/4n²)

// ── makeRng ───────────────────────────────────────────────────────────────────
describe('makeRng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(42), b = makeRng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('yields values in [0, 1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds diverge', () => {
    const a = makeRng(1), b = makeRng(2);
    expect(a()).not.toBe(b());
  });
});

// ── sampleBinomial ────────────────────────────────────────────────────────────
describe('sampleBinomial', () => {
  it('is deterministic under a seeded rng', () => {
    const kA = sampleBinomial(20, 0.8, makeRng(123));
    const kB = sampleBinomial(20, 0.8, makeRng(123));
    expect(kA).toBe(kB);
  });

  it('stays within [0, n]', () => {
    const r = makeRng(9);
    for (let i = 0; i < 50; i++) {
      const k = sampleBinomial(20, 0.5, r);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(20);
      expect(Number.isInteger(k)).toBe(true);
    }
  });

  it('p=0 → 0 successes, p=1 → n successes', () => {
    expect(sampleBinomial(50, 0, makeRng(1))).toBe(0);
    expect(sampleBinomial(50, 1, makeRng(1))).toBe(50);
  });

  it('mean over many draws is close to n·p (sanity, seeded)', () => {
    const r = makeRng(2026);
    let sum = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) sum += sampleBinomial(20, 0.8, r);
    expect(sum / runs).toBeGreaterThan(15.5); // n·p = 16
    expect(sum / runs).toBeLessThan(16.5);
  });
});

// ── wilson ────────────────────────────────────────────────────────────────────
describe('wilson (95% score interval)', () => {
  it('pins the interval at k=16, n=20 (p̂ = 0.80)', () => {
    const w = wilson(16, 20);
    expect(w.p).toBeCloseTo(0.8, 10);
    expect(w.lo).toBeCloseTo(0.583978, 5);
    expect(w.hi).toBeCloseTo(0.919344, 5);
  });

  it('pins the interval at k=18, n=20 (p̂ = 0.90)', () => {
    const w = wilson(18, 20);
    expect(w.lo).toBeCloseTo(0.698962, 5);
    expect(w.hi).toBeCloseTo(0.972134, 5);
  });

  it('pins the interval at k=50, n=100 (p̂ = 0.50)', () => {
    const w = wilson(50, 100);
    expect(w.lo).toBeCloseTo(0.403830, 5);
    expect(w.hi).toBeCloseTo(0.596170, 5);
  });

  it('edge cases k=0 and k=n stay inside [0, 1]', () => {
    const w0 = wilson(0, 20);
    expect(w0.lo).toBe(0);
    expect(w0.hi).toBeCloseTo(0.161130, 5);
    const w1 = wilson(20, 20);
    expect(w1.lo).toBeCloseTo(0.838870, 5);
    expect(w1.hi).toBe(1);
  });

  it('width shrinks with n at fixed p̂ (20 → 100 → 500)', () => {
    const width = (k, n) => { const w = wilson(k, n); return w.hi - w.lo; };
    expect(width(16, 20)).toBeGreaterThan(width(80, 100));
    expect(width(80, 100)).toBeGreaterThan(width(400, 500));
  });

  it('at n=20 the 80%-vs-90% intervals overlap massively', () => {
    const a = wilson(16, 20), b = wilson(18, 20);
    expect(ciSeparated(a, b)).toBe(false);
    // overlap covers more than a 0.2 span of success rate
    expect(Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo)).toBeGreaterThan(0.2);
  });
});

// ── wilsonFromRate ────────────────────────────────────────────────────────────
describe('wilsonFromRate', () => {
  it('matches wilson(k, n) when p̂ = k/n', () => {
    const a = wilson(16, 20), b = wilsonFromRate(0.8, 20);
    expect(b.lo).toBeCloseTo(a.lo, 12);
    expect(b.hi).toBeCloseTo(a.hi, 12);
  });
});

// ── ciSeparated ───────────────────────────────────────────────────────────────
describe('ciSeparated', () => {
  it('true when intervals are disjoint, either order', () => {
    expect(ciSeparated({ lo: 0.1, hi: 0.3 }, { lo: 0.4, hi: 0.6 })).toBe(true);
    expect(ciSeparated({ lo: 0.4, hi: 0.6 }, { lo: 0.1, hi: 0.3 })).toBe(true);
  });

  it('false when intervals touch or overlap', () => {
    expect(ciSeparated({ lo: 0.1, hi: 0.4 }, { lo: 0.4, hi: 0.6 })).toBe(false);
    expect(ciSeparated({ lo: 0.1, hi: 0.5 }, { lo: 0.4, hi: 0.6 })).toBe(false);
  });
});

// ── minSeparatingN ────────────────────────────────────────────────────────────
describe('minSeparatingN', () => {
  it('pins the separation threshold for the defaults: 80% vs 90% needs n = 196', () => {
    expect(minSeparatingN(0.8, 0.9)).toBe(196);
  });

  it('the threshold really is the minimum (n−1 still overlaps, n separates)', () => {
    const n = minSeparatingN(0.8, 0.9);
    expect(ciSeparated(wilsonFromRate(0.8, n - 1), wilsonFromRate(0.9, n - 1))).toBe(false);
    expect(ciSeparated(wilsonFromRate(0.8, n), wilsonFromRate(0.9, n))).toBe(true);
  });

  it('lands in the hundreds for the field-typical gap (the G3 claim)', () => {
    const n = minSeparatingN(0.8, 0.9);
    expect(n).toBeGreaterThan(100);
    expect(n).toBeLessThan(500);
  });

  it('a huge gap separates quickly: 50% vs 90% needs n = 21', () => {
    expect(minSeparatingN(0.5, 0.9)).toBe(21);
  });

  it('is symmetric in its arguments', () => {
    expect(minSeparatingN(0.9, 0.8)).toBe(minSeparatingN(0.8, 0.9));
  });

  it('returns null when the rates are equal (no n can separate them)', () => {
    expect(minSeparatingN(0.85, 0.85)).toBe(null);
  });

  it('returns null when the required n exceeds maxN', () => {
    expect(minSeparatingN(0.89, 0.9, 1.96, 1000)).toBe(null);
  });
});

// ── paperVerdict / trueWinner ─────────────────────────────────────────────────
describe('paperVerdict', () => {
  it('names the higher point estimate the winner', () => {
    expect(paperVerdict(14, 17)).toBe('B');
    expect(paperVerdict(17, 14)).toBe('A');
  });

  it('equal counts → tie', () => {
    expect(paperVerdict(16, 16)).toBe('tie');
  });
});

describe('trueWinner', () => {
  it('follows the true rates', () => {
    expect(trueWinner(0.8, 0.9)).toBe('B');
    expect(trueWinner(0.9, 0.8)).toBe('A');
    expect(trueWinner(0.85, 0.85)).toBe('tie');
  });
});

// ── Integration: the underpowered-eval story ──────────────────────────────────
describe('integration — at n=20 the paper verdict is often wrong', () => {
  it('with true rates 0.8 vs 0.9, the point-estimate verdict misses the true winner in a substantial fraction of reruns', () => {
    const r = makeRng(314159);
    let wrong = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const kA = sampleBinomial(20, 0.8, r);
      const kB = sampleBinomial(20, 0.9, r);
      if (paperVerdict(kA, kB) !== 'B') wrong++;
    }
    const frac = wrong / runs;
    // P(p̂A ≥ p̂B) for Bin(20,0.8) vs Bin(20,0.9) is ≈ 0.3 — the eval is a
    // loaded coin flip. Pin a generous band so the seed can't get lucky.
    expect(frac).toBeGreaterThan(0.15);
    expect(frac).toBeLessThan(0.45);
  });

  it('at n=500 the same eval almost never gets it wrong', () => {
    const r = makeRng(271828);
    let wrong = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      const kA = sampleBinomial(500, 0.8, r);
      const kB = sampleBinomial(500, 0.9, r);
      if (paperVerdict(kA, kB) !== 'B') wrong++;
    }
    expect(wrong / runs).toBeLessThan(0.02);
  });
});
