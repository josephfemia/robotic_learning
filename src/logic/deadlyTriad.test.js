import { describe, it, expect } from 'vitest';
import { runTriad, isDiverging } from './deadlyTriad.js';

// ─── The single most important correctness gate ─────────────────────────────
//
// The deadly triad diverges if and only if ALL THREE legs are on:
//   fa=true, boot=true, off=true  →  DIVERGES
//   Any 0/1/2 legs on            →  STABLE
//
// Math (from the IIFE, lines 3275–3287):
//   w=1.0, alpha=0.1, gamma=0.99
//   fa:   v(s)=w,      v(s')=2w       (shared weight, features 1 and 2)
//   boot: target = gamma*v(s') = 0.99*2w = 1.98w
//         delta  = target - v(s) = (1.98 - 1)w = 0.98w
//         w     += alpha * delta * 1 = w + 0.098w = 1.098w  each step
//   off:  the corrective s'→ update is SKIPPED (never sampled)
//
// So with all three on: w grows by factor ~1.098 per step → geometric → unbounded.
// With any leg missing:
//   ~fa:   tabular (wTab[0], wTab[1] separate) — errors cancel, stays bounded
//   ~boot: target=0 → weight shrinks to 0 (converges)
//   ~off:  the s'→ corrective update fires, negative feedback keeps w bounded
//
// The test simulates all 8 boolean combinations and asserts the exact property.
// ─────────────────────────────────────────────────────────────────────────────

describe('deadlyTriad — runTriad math', () => {
  it('initial hist[0] is [v(s)=1, v(s\')=2] (initial w=1.0 with fa=true)', () => {
    const hist = runTriad(true, true, true);
    expect(hist[0][0]).toBeCloseTo(1.0, 10);
    expect(hist[0][1]).toBeCloseTo(2.0, 10);
  });

  it('initial tabular hist[0] is [wTab[0]=1, wTab[1]=2] (fa=false)', () => {
    const hist = runTriad(false, true, true);
    expect(hist[0][0]).toBeCloseTo(1.0, 10);
    expect(hist[0][1]).toBeCloseTo(2.0, 10);
  });

  it('with all legs off (0/3): weight converges to 0 — bootstrap target is 0', () => {
    // boot=false → target=0 → each step: w += alpha*(0 - w) → w→0
    const hist = runTriad(false, false, false);
    const lastVs = hist[hist.length - 1][0];
    expect(Math.abs(lastVs)).toBeLessThan(0.01);
  });

  it('with fa+boot on but off=false (2/3): s\'→ corrective update fires → stable', () => {
    // The corrective update injects negative feedback → bounded
    const hist = runTriad(true, true, false);
    const allFinite = hist.every(([vs, vsp]) => isFinite(vs) && isFinite(vsp));
    const maxV = Math.max(...hist.map(([vs, vsp]) => Math.max(Math.abs(vs), Math.abs(vsp))));
    expect(allFinite).toBe(true);
    expect(maxV).toBeLessThanOrEqual(1000);
  });
});

describe('deadlyTriad — isDiverging: 3/3-only divergence gate', () => {
  // All 8 combinations of (fa, boot, off)
  const combos = [
    [false, false, false],
    [true,  false, false],
    [false, true,  false],
    [false, false, true ],
    [true,  true,  false],
    [true,  false, true ],
    [false, true,  true ],
    [true,  true,  true ],
  ];

  it.each(combos)(
    'fa=%s boot=%s off=%s → diverges only when all three are true',
    (fa, boot, off) => {
      const allThree = fa && boot && off;
      const result = isDiverging(fa, boot, off);
      if (allThree) {
        expect(result).toBe(true);
      } else {
        expect(result).toBe(false);
      }
    }
  );

  // Explicit breakdown for each individual "one leg" case:
  it('only FA (1/3): stable', () => {
    expect(isDiverging(true, false, false)).toBe(false);
  });
  it('only bootstrapping (1/3): stable', () => {
    expect(isDiverging(false, true, false)).toBe(false);
  });
  it('only off-policy (1/3): stable', () => {
    expect(isDiverging(false, false, true)).toBe(false);
  });
  it('FA + bootstrapping, no off-policy (2/3): stable', () => {
    expect(isDiverging(true, true, false)).toBe(false);
  });
  it('FA + off-policy, no bootstrapping (2/3): stable', () => {
    expect(isDiverging(true, false, true)).toBe(false);
  });
  it('bootstrapping + off-policy, no FA (2/3): stable', () => {
    expect(isDiverging(false, true, true)).toBe(false);
  });
  it('ALL THREE legs (3/3): DIVERGES', () => {
    expect(isDiverging(true, true, true)).toBe(true);
  });
});

describe('deadlyTriad — divergence geometry', () => {
  it('3/3 run terminates early (breaks on |vs|>1e9)', () => {
    const hist = runTriad(true, true, true);
    // With alpha=0.1, gamma=0.99: each step w *= ~1.098. After 120 steps that's
    // ~1.098^120 ≈ 8e4 — well above 1e9 guard if enough steps; it may terminate early.
    // Either way the last value must be very large (>1000)
    const last = hist[hist.length - 1];
    expect(Math.max(Math.abs(last[0]), Math.abs(last[1]))).toBeGreaterThan(1000);
  });

  it('3/3 run: v(s\')=2w is always double v(s)=w while using function approximation', () => {
    const hist = runTriad(true, true, true);
    for (const [vs, vsp] of hist) {
      // v(s')=2w = 2*v(s) by construction (feature 2 vs feature 1)
      if (isFinite(vs) && vs !== 0) {
        expect(vsp / vs).toBeCloseTo(2.0, 10);
      }
    }
  });

  it('0/3 run runs exactly 120 steps (no early break)', () => {
    const hist = runTriad(false, false, false);
    expect(hist.length).toBe(120);
  });

  it('3/3 run grows geometrically: each step multiplies weight by (1 + alpha*(2*gamma-1))', () => {
    // With fa=true, boot=true, off=true:
    // delta = gamma*vsp() - vs() = 0.99*2w - w = (1.98-1)w = 0.98w
    // w_new = w + alpha*delta*1 = w*(1 + 0.1*0.98) = w*1.098
    const hist = runTriad(true, true, true);
    const alpha = 0.1, gamma = 0.99;
    const growthFactor = 1 + alpha * (2 * gamma - 1);
    // Check first few steps before numerical issues
    for (let t = 0; t < Math.min(hist.length - 1, 5); t++) {
      const wt = hist[t][0];         // vs() = w at step t
      const wt1 = hist[t + 1][0];   // vs() = w at step t+1
      if (isFinite(wt) && isFinite(wt1) && Math.abs(wt) > 1e-12) {
        expect(wt1 / wt).toBeCloseTo(growthFactor, 8);
      }
    }
  });
});
