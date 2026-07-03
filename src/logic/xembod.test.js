import { describe, it, expect } from 'vitest';
import {
  soloRate, pooledRate,
  lensOverlapArea, overlapFraction, distanceForOverlap,
  transferGain, flowStrength,
} from './xembod.js';

describe('soloRate', () => {
  it('always returns 0.46', () => {
    expect(soloRate()).toBeCloseTo(0.46, 10);
  });
});

describe('pooledRate', () => {
  it('equals soloRate when n=0 regardless of share', () => {
    // exp(-0.42*0) = 1, so gain = 0 → pooled = solo
    expect(pooledRate(0, 0.55)).toBeCloseTo(soloRate(), 10);
    expect(pooledRate(0, 0.10)).toBeCloseTo(soloRate(), 10);
    expect(pooledRate(0, 1.00)).toBeCloseTo(soloRate(), 10);
  });

  it('positive transfer: pooled > solo for share=0.55, n=3 (default scenario)', () => {
    // dir = (0.55-0.30)/0.70 = 0.357...; gain > 0
    expect(pooledRate(3, 0.55)).toBeGreaterThan(soloRate());
  });

  it('negative transfer: pooled < solo for share=0.10, n=5', () => {
    // dir = (0.10-0.30)/0.70 ≈ -0.286; gain < 0
    expect(pooledRate(5, 0.10)).toBeLessThan(soloRate());
  });

  it('neutral at share=0.30 (breakeven): gain ≈ 0 for any n', () => {
    // dir = (0.30-0.30)/0.70 = 0 → gain = 0
    expect(pooledRate(8, 0.30)).toBeCloseTo(soloRate(), 10);
  });

  it('saturates with large n: gain approaches asymptote for share=1.0', () => {
    // asymptote = soloRate + 0.55*(1-0.30)/0.70 * 1 = 0.46 + 0.55 = 1.01 → clamped to 0.97
    const large = pooledRate(100, 1.0);
    expect(large).toBeCloseTo(0.97, 5);
  });

  it('clamps low end to 0.05 for extreme negative transfer (share near 0)', () => {
    // With share→0: dir=(0-0.30)/0.70=-0.4286; gain≈0.55*(-0.4286)*1=-0.2357
    // raw=0.46-0.2357=0.2243 — still above floor for share=0.
    // The 0.05 floor is mathematically reachable only for share<0 (outside slider range).
    // Verify clamp is applied: pass a value that would go below 0.05.
    // soloRate()=0.46; need gain < -0.41 → dir < -0.745 → share < 0.30-0.745*0.70 < 0
    // Original slider min is 0.1 so clamp to 0.05 is effectively unreachable via the UI.
    // Confirm the raw value at share=0.10 n=100 is ~0.303 (NO clamp triggered):
    const val = pooledRate(100, 0.10);
    expect(val).toBeGreaterThan(0.05);
    expect(val).toBeLessThan(soloRate());
    // Confirm clamp works when share is forced below practical range:
    // dir=(−1−0.30)/0.70 = -1.857; gain=0.55*(−1.857)*1=−1.021; raw=0.46−1.021=−0.561 → clamped to 0.05
    expect(pooledRate(100, -1)).toBeCloseTo(0.05, 5);
  });

  it('pinned value: pooledRate(3, 0.55) ≈ 0.5905', () => {
    // dir=(0.55-0.30)/0.70=0.35714; gain=0.55*0.35714*(1-exp(-1.26))≈0.1305
    // 0.46+0.1305=0.5905
    const val = pooledRate(3, 0.55);
    const dir = (0.55 - 0.30) / 0.70;
    const expected = 0.46 + 0.55 * dir * (1 - Math.exp(-0.42 * 3));
    expect(val).toBeCloseTo(expected, 10);
    expect(val).toBeGreaterThan(0.56);
    expect(val).toBeLessThan(0.65);
  });

  it('diminishing returns: gain from n=1→2 > gain from n=7→8', () => {
    const share = 0.55;
    const gain12 = pooledRate(2, share) - pooledRate(1, share);
    const gain78 = pooledRate(8, share) - pooledRate(7, share);
    expect(gain12).toBeGreaterThan(gain78);
  });
});

// ---------------------------------------------------------------------------
// Phase-3 (F2) additions — disc-overlap geometry + flow mapping
// ---------------------------------------------------------------------------

describe('lensOverlapArea', () => {
  it('is 0 when the circles are disjoint (d ≥ r1 + r2)', () => {
    expect(lensOverlapArea(92, 54, 38)).toBe(0);
    expect(lensOverlapArea(200, 54, 38)).toBe(0);
  });

  it('equals π·rMin² when the smaller circle is contained (d ≤ rMax − rMin)', () => {
    expect(lensOverlapArea(0, 54, 38)).toBeCloseTo(Math.PI * 38 * 38, 8);
    expect(lensOverlapArea(16, 54, 38)).toBeCloseTo(Math.PI * 38 * 38, 8);
  });

  it('equal circles at d=0 overlap fully: π·r²', () => {
    expect(lensOverlapArea(0, 10, 10)).toBeCloseTo(Math.PI * 100, 8);
  });

  it('pinned: unit circles at d=1 → 2·acos(1/2) − (√3)/2 ≈ 1.2284', () => {
    // Standard formula for equal circles: 2r²·acos(d/2r) − (d/2)·√(4r²−d²)
    const expected = 2 * Math.acos(0.5) - 0.5 * Math.sqrt(3);
    expect(lensOverlapArea(1, 1, 1)).toBeCloseTo(expected, 10);
  });

  it('is symmetric in r1/r2 and monotone decreasing in d', () => {
    expect(lensOverlapArea(40, 54, 38)).toBeCloseTo(lensOverlapArea(40, 38, 54), 10);
    expect(lensOverlapArea(20, 54, 38)).toBeGreaterThan(lensOverlapArea(60, 54, 38));
  });
});

describe('overlapFraction', () => {
  it('is 1 at containment and 0 when disjoint', () => {
    expect(overlapFraction(10, 54, 38)).toBeCloseTo(1, 10);
    expect(overlapFraction(92, 54, 38)).toBe(0);
  });

  it('stays within [0, 1] across distances', () => {
    for (let d = 0; d <= 100; d += 5) {
      const f = overlapFraction(d, 54, 38);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
});

describe('distanceForOverlap', () => {
  it('round-trips: overlapFraction(distanceForOverlap(f)) ≈ f', () => {
    for (const f of [0.1, 0.3, 0.55, 0.8, 0.95]) {
      const d = distanceForOverlap(f, 54, 38);
      expect(overlapFraction(d, 54, 38)).toBeCloseTo(f, 6);
    }
  });

  it('clamps: frac ≥ 1 → rMax − rMin; frac ≤ 0 → r1 + r2', () => {
    expect(distanceForOverlap(1, 54, 38)).toBe(16);
    expect(distanceForOverlap(1.5, 54, 38)).toBe(16);
    expect(distanceForOverlap(0, 54, 38)).toBe(92);
    expect(distanceForOverlap(-0.2, 54, 38)).toBe(92);
  });

  it('is monotone: more overlap → smaller distance', () => {
    expect(distanceForOverlap(0.8, 54, 38)).toBeLessThan(distanceForOverlap(0.2, 54, 38));
  });
});

describe('transferGain', () => {
  it('equals pooledRate − soloRate (pinned at the default scenario)', () => {
    expect(transferGain(3, 0.55)).toBeCloseTo(pooledRate(3, 0.55) - soloRate(), 12);
    // dir=0.35714; gain=0.55*0.35714*(1−exp(−1.26)) ≈ 0.1395
    expect(transferGain(3, 0.55)).toBeGreaterThan(0.12);
    expect(transferGain(3, 0.55)).toBeLessThan(0.16);
  });

  it('is 0 at the breakeven share=0.30 and at n=0', () => {
    expect(transferGain(8, 0.30)).toBeCloseTo(0, 10);
    expect(transferGain(0, 0.9)).toBeCloseTo(0, 10);
  });

  it('is negative below breakeven (negative transfer)', () => {
    expect(transferGain(5, 0.10)).toBeLessThan(0);
  });
});

describe('flowStrength', () => {
  it('is 0 for share ≤ 0.30 (no flow in the negative-transfer regime)', () => {
    expect(flowStrength(8, 0.10)).toBe(0);
    expect(flowStrength(8, 0.30)).toBeCloseTo(0, 10);
    expect(flowStrength(3, 0.25)).toBe(0);
  });

  it('is 0 at n=0 regardless of share', () => {
    expect(flowStrength(0, 1.0)).toBeCloseTo(0, 10);
  });

  it('pinned: flowStrength(3, 0.55) = transferGain/0.55 ≈ 0.2537', () => {
    const expected = transferGain(3, 0.55) / 0.55;
    expect(flowStrength(3, 0.55)).toBeCloseTo(expected, 12);
    expect(flowStrength(3, 0.55)).toBeGreaterThan(0.2);
    expect(flowStrength(3, 0.55)).toBeLessThan(0.3);
  });

  it('is monotone in share at fixed n and stays in [0, 1]', () => {
    let prev = -1;
    for (let s = 0.1; s <= 1.0001; s += 0.05) {
      const f = flowStrength(8, s);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
      prev = f;
    }
  });
});
