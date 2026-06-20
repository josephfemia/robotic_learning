import { describe, it, expect } from 'vitest';
import { achievedReturn, isInDistribution, MAX_DATA } from './decisionTransformer.js';

describe('MAX_DATA constant', () => {
  it('matches the original IIFE value of 0.82', () => {
    expect(MAX_DATA).toBeCloseTo(0.82, 10);
  });
});

describe('achievedReturn — in-distribution (r <= maxData)', () => {
  it('returns r*0.97 for r=0 (zero prompt)', () => {
    expect(achievedReturn(0)).toBeCloseTo(0 * 0.97, 10);
  });

  it('returns r*0.97 for r=0.5 (mid-range prompt)', () => {
    expect(achievedReturn(0.5)).toBeCloseTo(0.5 * 0.97, 10);
  });

  it('returns r*0.97 at the boundary r=maxData=0.82', () => {
    expect(achievedReturn(MAX_DATA)).toBeCloseTo(MAX_DATA * 0.97, 10);
  });

  it('requesting a higher in-distribution return yields a higher achieved return', () => {
    // The core in-distribution pin: more prompt → more delivery
    expect(achievedReturn(0.7)).toBeGreaterThan(achievedReturn(0.5));
    expect(achievedReturn(0.82)).toBeGreaterThan(achievedReturn(0.6));
  });

  it('is nearly ideal (slope ~0.97) within support — close to the diagonal', () => {
    // achieved ≈ prompted within data support
    const r = 0.6;
    expect(achievedReturn(r)).toBeCloseTo(r * 0.97, 8);
  });
});

describe('achievedReturn — out-of-distribution (r > maxData)', () => {
  it('achieved drops below maxData*0.97 once r exceeds maxData', () => {
    const atBoundary = achievedReturn(MAX_DATA);
    const justOver = achievedReturn(MAX_DATA + 0.01);
    expect(justOver).toBeLessThan(atBoundary);
  });

  it('degrades linearly: over=r-maxData, achieved = maxData*0.97 - over*1.4', () => {
    const r = 0.95;
    const over = r - MAX_DATA;
    const expected = Math.max(0.15, MAX_DATA * 0.97 - over * 1.4);
    expect(achievedReturn(r)).toBeCloseTo(expected, 10);
  });

  it('is floored at 0.15 (cannot degrade below minimum)', () => {
    // At r=1.2 (max slider), over = 1.2 - 0.82 = 0.38
    // maxData*0.97 - 0.38*1.4 = 0.7954 - 0.532 = 0.2634 > 0.15, so floor not hit yet
    // But at r large enough, floor kicks in
    const r = 1.5;
    expect(achievedReturn(r)).toBeCloseTo(0.15, 10);
  });

  it('at r=1.2 (top of slider), formula gives > 0.15 (not floored)', () => {
    const r = 1.2;
    const over = r - MAX_DATA;
    const raw = MAX_DATA * 0.97 - over * 1.4;
    expect(raw).toBeGreaterThan(0.15);
    expect(achievedReturn(r)).toBeCloseTo(raw, 10);
  });

  it('pushing beyond the data degrades achieved — cannot stitch beyond training', () => {
    // The core out-of-distribution pin:
    // More prompt does NOT yield more delivery once r > maxData
    expect(achievedReturn(0.9)).toBeLessThan(achievedReturn(MAX_DATA));
    expect(achievedReturn(1.0)).toBeLessThan(achievedReturn(MAX_DATA));
    expect(achievedReturn(1.2)).toBeLessThan(achievedReturn(MAX_DATA));
  });

  it('uses custom maxData correctly', () => {
    const customMax = 0.6;
    const r = 0.7;
    const over = r - customMax;
    const expected = Math.max(0.15, customMax * 0.97 - over * 1.4);
    expect(achievedReturn(r, customMax)).toBeCloseTo(expected, 10);
  });
});

describe('isInDistribution', () => {
  it('returns true for r=0', () => {
    expect(isInDistribution(0)).toBe(true);
  });

  it('returns true at r=maxData (boundary is inclusive)', () => {
    expect(isInDistribution(MAX_DATA)).toBe(true);
  });

  it('returns false for r just above maxData', () => {
    expect(isInDistribution(MAX_DATA + 0.001)).toBe(false);
  });

  it('returns false at r=1.2 (top of slider, out of distribution)', () => {
    expect(isInDistribution(1.2)).toBe(false);
  });

  it('works with custom maxData', () => {
    expect(isInDistribution(0.5, 0.6)).toBe(true);
    expect(isInDistribution(0.7, 0.6)).toBe(false);
  });
});
