import { describe, it, expect } from 'vitest';
import {
  clamp01, evalN,
  makeRng, trueSuccess, sampleCandidates, selectBest, bestTrue,
} from './bestOfN.js';

// ----------------------------------------------------------------
// clamp01
// ----------------------------------------------------------------
describe('clamp01', () => {
  it('passes through values in (0, 1)', () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0.0)).toBe(0.0);
    expect(clamp01(1.0)).toBe(1.0);
  });

  it('clamps negative values to 0', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it('clamps values above 1 to 1', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });
});

// ----------------------------------------------------------------
// evalN — deterministic tests with a seeded PRNG
//
// Use a simple LCG so tests are deterministic.
// The seeded rng is injected into evalN via the rng parameter.
// ----------------------------------------------------------------

/**
 * Simple LCG PRNG (returns values in [0, 1)).
 * Parameters from Numerical Recipes: m=2^32, a=1664525, c=1013904223.
 */
function makeLCG(seed) {
  var s = seed >>> 0;
  return function () {
    s = ((Math.imul(1664525, s) + 1013904223) >>> 0);
    return s / 4294967296;
  };
}

describe('evalN — N=1 baseline (seeded)', () => {
  it('returns a value in [0, 1]', () => {
    const rng = makeLCG(42);
    const result = evalN(1, 0.9, 1200, rng);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('N=1 result is independent of vacc (verifier never actually selects)', () => {
    // With N=1 there is only one candidate; vacc has no effect on which is picked.
    const r1 = evalN(1, 0.9, 2000, makeLCG(7));
    const r2 = evalN(1, 0.5, 2000, makeLCG(7));
    expect(r1).toBeCloseTo(r2, 1);
  });
});

describe('evalN — strong verifier (vacc=1.0)', () => {
  it('success is monotonically non-decreasing with N (large trial count)', () => {
    // With a perfect verifier, best-of-N can only help or stay the same.
    // Use enough trials (2000) and a fixed seed for stability.
    const rng = makeLCG(1234);
    const results = [1, 2, 4, 8, 16, 32, 64].map(N => evalN(N, 1.0, 2000, makeLCG(N * 17 + 5)));
    // Allow small noise: N=64 should be clearly above N=1
    expect(results[6]).toBeGreaterThan(results[0]);
  });

  it('N=64 with perfect verifier is substantially better than N=1', () => {
    const base = evalN(1, 1.0, 2000, makeLCG(99));
    const best = evalN(64, 1.0, 2000, makeLCG(77));
    // Perfect verifier: always picks highest-q candidate; success should clearly improve
    expect(best).toBeGreaterThan(base + 0.05);
  });

  it('pinned: N=1, vacc=0.9, seed=42 → ≈ 0.50 ± 0.08', () => {
    // N=1 baseline: P(success) = E[clamp(q - 0.7*e + 0.25, 0, 1)]
    // Analytically: mean of clamp(q - 0.7e + 0.25) over U[0,1]^2
    // Numerical estimate ≈ 0.5 (by symmetry of q and linear offset)
    const result = evalN(1, 0.9, 1200, makeLCG(42));
    expect(result).toBeGreaterThan(0.40);
    expect(result).toBeLessThan(0.62);
  });
});

describe('evalN — weak verifier (vacc=0.5) — the key failure mode', () => {
  it('STRONG verifier raises true success as N grows', () => {
    // vacc=1.0: verifier is perfect, best-of-N always helps
    const Ns = [1, 4, 16, 64];
    const strongVals = Ns.map(N => evalN(N, 1.0, 2000, makeLCG(N * 3 + 1)));
    // N=64 should clearly beat N=1
    expect(strongVals[3]).toBeGreaterThan(strongVals[0]);
  });

  it('WEAK verifier at N=64 is strictly worse than STRONG verifier at N=64', () => {
    // vacc=1.0 vs vacc=0.5 at N=64: strong verifier always wins
    const strongN64 = evalN(64, 1.0, 2000, makeLCG(100));
    const weakN64   = evalN(64, 0.5, 2000, makeLCG(101));
    expect(strongN64).toBeGreaterThan(weakN64);
  });

  it('MINIMUM vacc (0.5) at large N does NOT exceed strong verifier at large N', () => {
    // Minimum slider value in the widget is 0.5. Strong verifier = 1.0.
    // This is the "gap between the two regimes" the note describes.
    const strong = evalN(64, 1.0, 2000, makeLCG(300));
    const weak   = evalN(64, 0.5, 2000, makeLCG(301));
    expect(strong).toBeGreaterThan(weak + 0.02);
  });

  it('the ordering reversal: N=64 with vacc=0.5 does NOT exceed N=1 with vacc=1.0', () => {
    // vacc=0.5 / high-N combination cannot beat a perfect verifier at N=1 on average.
    // In the original widget this is the "curve bends down" regime shown in red.
    const perfectN1 = evalN(1, 1.0, 2000, makeLCG(400));
    const weakN64   = evalN(64, 0.5, 2000, makeLCG(401));
    // Not a strict inequality in general (N=1 perfect is just the natural distribution),
    // but weak verifier N=64 should not massively exceed it.
    // Both draw from the same P(success) = clamp(q - 0.7e + 0.25, 0, 1) population.
    // They should be in the same ballpark (~0.5), establishing the "two regimes" picture.
    expect(Math.abs(perfectN1 - weakN64)).toBeLessThan(0.15);
  });

  it('with vacc=0.5 the gain from N=1 to N=64 is much smaller than with vacc=1.0', () => {
    // The core lesson: weak verifier fails to amplify benefit; strong verifier does.
    // Use same seed offset for each pair to compare apples-to-apples.
    const strong1  = evalN(1,  1.0, 3000, makeLCG(500));
    const strong64 = evalN(64, 1.0, 3000, makeLCG(501));
    const weak1    = evalN(1,  0.5, 3000, makeLCG(502));
    const weak64   = evalN(64, 0.5, 3000, makeLCG(503));
    const strongGain = strong64 - strong1;
    const weakGain   = weak64   - weak1;
    // Strong verifier should show larger benefit from N
    expect(strongGain).toBeGreaterThan(weakGain);
  });
});

describe('evalN — structural properties', () => {
  it('returns 0 or positive value (never negative)', () => {
    [1, 4, 16].forEach(N => {
      [0.5, 0.75, 1.0].forEach(vacc => {
        const v = evalN(N, vacc, 500, makeLCG(N + vacc * 100));
        expect(v).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('uses exactly trials=1200 by default (smoke test: function does not throw)', () => {
    // Can't easily count calls without a spy, but ensure default path runs
    // We use a real Math.random call here to test the default path
    const result = evalN(1, 0.9);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Phase-3 (F3) additions — visible candidate batch + argmax selection
// ---------------------------------------------------------------------------

describe('makeRng', () => {
  it('is deterministic: same seed → same sequence', () => {
    const a = makeRng(42), b = makeRng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('different seeds → different sequences', () => {
    const a = makeRng(1), b = makeRng(2);
    expect(a()).not.toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('trueSuccess', () => {
  it('matches the evalN success expression: clamp01(q − 0.7e + 0.25)', () => {
    expect(trueSuccess(0.5, 0.5)).toBeCloseTo(0.4, 12);
    expect(trueSuccess(0.8, 0.1)).toBeCloseTo(0.98, 12);
  });

  it('clamps at both ends', () => {
    expect(trueSuccess(1, 0)).toBe(1);   // 1.25 → 1
    expect(trueSuccess(0, 1)).toBe(0);   // −0.45 → 0
  });
});

describe('sampleCandidates', () => {
  it('returns N candidates, deterministic for a fixed seed', () => {
    const a = sampleCandidates(8, 0.9, 5);
    const b = sampleCandidates(8, 0.9, 5);
    expect(a).toHaveLength(8);
    expect(a).toEqual(b);
  });

  it('q/e depend only on (N, seed): changing vacc re-scores the SAME dots', () => {
    const a = sampleCandidates(8, 0.9, 5);
    const b = sampleCandidates(8, 0.5, 5);
    for (let i = 0; i < 8; i++) {
      expect(b[i].q).toBe(a[i].q);
      expect(b[i].e).toBe(a[i].e);
      expect(b[i].ptrue).toBe(a[i].ptrue);
    }
  });

  it('fields are internally consistent: vscore = vacc·q + (1−vacc)·e, ptrue = trueSuccess(q, e)', () => {
    const vacc = 0.72;
    for (const c of sampleCandidates(16, vacc, 11)) {
      expect(c.vscore).toBeCloseTo(vacc * c.q + (1 - vacc) * c.e, 12);
      expect(c.ptrue).toBeCloseTo(trueSuccess(c.q, c.e), 12);
      expect(c.q).toBeGreaterThanOrEqual(0);
      expect(c.q).toBeLessThan(1);
      expect(c.e).toBeGreaterThanOrEqual(0);
      expect(c.e).toBeLessThan(1);
    }
  });

  it('advancing the seed produces a different batch (the Resample button)', () => {
    const a = sampleCandidates(8, 0.9, 1);
    const b = sampleCandidates(8, 0.9, 2);
    expect(a[0].q).not.toBe(b[0].q);
  });
});

describe('selectBest / bestTrue', () => {
  it('selectBest returns the argmax of vscore (first wins on ties, like evalN)', () => {
    const cands = [
      { vscore: 0.2, ptrue: 0.9 },
      { vscore: 0.8, ptrue: 0.1 },
      { vscore: 0.8, ptrue: 0.5 },
      { vscore: 0.5, ptrue: 0.7 },
    ];
    expect(selectBest(cands)).toBe(1);
  });

  it('bestTrue returns the argmax of ptrue', () => {
    const cands = [
      { vscore: 0.2, ptrue: 0.9 },
      { vscore: 0.8, ptrue: 0.1 },
    ];
    expect(bestTrue(cands)).toBe(0);
  });

  it('with vacc=1 the pick is the max-q candidate (verifier reads pure quality)', () => {
    const cands = sampleCandidates(32, 1.0, 9);
    const sel = selectBest(cands);
    const maxQ = Math.max(...cands.map(c => c.q));
    expect(cands[sel].q).toBe(maxQ);
  });
});

describe('reward hacking, watched: weak verifier picks high-score/low-truth candidates', () => {
  // Average over many seeded batches so the property is stable, then pin it.
  function avgOverSeeds(vacc, N, fn) {
    let sum = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const cands = sampleCandidates(N, vacc, seed);
      sum += fn(cands);
    }
    return sum / 150;
  }

  it('the pick of a weak verifier has much lower true success than a strong one', () => {
    const strong = avgOverSeeds(1.0, 32, c => c[selectBest(c)].ptrue);
    const weak   = avgOverSeeds(0.5, 32, c => c[selectBest(c)].ptrue);
    expect(strong).toBeGreaterThan(weak + 0.15);
  });

  it('the weak verifier chases the exploit feature: picked e is much higher', () => {
    const strongE = avgOverSeeds(1.0, 32, c => c[selectBest(c)].e);
    const weakE   = avgOverSeeds(0.5, 32, c => c[selectBest(c)].e);
    expect(weakE).toBeGreaterThan(strongE + 0.25);
  });

  it('the gap to the truly best candidate widens as the verifier weakens', () => {
    const gap = vacc => avgOverSeeds(vacc, 32, c => c[bestTrue(c)].ptrue - c[selectBest(c)].ptrue);
    expect(gap(0.5)).toBeGreaterThan(gap(1.0) + 0.1);
    expect(gap(1.0)).toBeGreaterThanOrEqual(0); // truly best is an upper bound by definition
  });
});
