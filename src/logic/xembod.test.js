import { describe, it, expect } from 'vitest';
import { soloRate, pooledRate } from './xembod.js';

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
