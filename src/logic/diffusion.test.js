import { describe, it, expect } from 'vitest';
import { scoreField, noiseSchedule, denoisingStep } from './diffusion.js';

// Fixed modes from the original IIFE: m1=[-1.4,0], m2=[1.4,0]
const M1 = [-1.4, 0];
const M2 = [1.4, 0];

describe('scoreField', () => {
  it('score at mode m1 has near-zero sy (both modes share y=0)', () => {
    // At m1=[-1.4,0]: p.y=0 and both mode centers have y=0, so sy term vanishes
    const p = { x: M1[0], y: M1[1] };
    const sc = scoreField(p, 1.0);
    expect(sc.sy).toBeCloseTo(0, 10);
  });

  it('score at mode m2 has near-zero sy (both modes share y=0)', () => {
    // Same reasoning: both modes have y=0, so sy=0 at any point with y=0
    const p = { x: M2[0], y: M2[1] };
    const sc = scoreField(p, 1.0);
    expect(sc.sy).toBeCloseTo(0, 10);
  });

  it('score at origin (0,0) is zero by symmetry — equal pull from both modes', () => {
    // At the exact midpoint, r1=r2=0.5, so:
    // sx = 0.5*(m1[0]-0)/s2 + 0.5*(m2[0]-0)/s2 = 0.5*(-1.4+1.4)/s2 = 0
    const p = { x: 0, y: 0 };
    const sc = scoreField(p, 1.0);
    expect(sc.sx).toBeCloseTo(0, 10);
    expect(sc.sy).toBeCloseTo(0, 10);
  });

  it('score at x=0.5 (closer to m2) has positive sx — pulled right', () => {
    const p = { x: 0.5, y: 0 };
    const sc = scoreField(p, 1.0);
    // r2 > r1 since p is closer to m2=[1.4,0], so net pull is toward m2 (positive x)
    expect(sc.sx).toBeGreaterThan(0);
  });

  it('score at x=-0.5 has negative sx — pulled left toward m1', () => {
    const p = { x: -0.5, y: 0 };
    const sc = scoreField(p, 1.0);
    expect(sc.sx).toBeLessThan(0);
  });

  it('score magnitude grows with smaller s2 (sharper distribution)', () => {
    const p = { x: 0.5, y: 0 };
    const sc_large = scoreField(p, 2.0);
    const sc_small = scoreField(p, 0.2);
    expect(Math.abs(sc_small.sx)).toBeGreaterThan(Math.abs(sc_large.sx));
  });

  it('pins exact score value at step 0 defaults (s2=1.2, p={x:0.7,y:0.3})', () => {
    // Pinned from original algorithm: s2=noiseSchedule(0)=1.2, representative p
    const p = { x: 0.7, y: 0.3 };
    const s2 = 1.2;
    const sc = scoreField(p, s2);
    // Manually computed:
    // dx1=0.7-(-1.4)=2.1, dy1=0.3, g1=exp(-(2.1^2+0.09)/(2*1.2))=exp(-4.5/2.4)=exp(-1.875)
    // dx2=0.7-1.4=-0.7, dy2=0.3, g2=exp(-(0.49+0.09)/(2*1.2))=exp(-0.58/2.4)=exp(-0.2417)
    const g1 = Math.exp(-(2.1 * 2.1 + 0.09) / (2 * s2));
    const g2 = Math.exp(-(0.49 + 0.09) / (2 * s2));
    const Z = g1 + g2 + 1e-12;
    const r1 = g1 / Z, r2 = g2 / Z;
    const expectedSx = (r1 * (-1.4 - 0.7) + r2 * (1.4 - 0.7)) / s2;
    const expectedSy = (r1 * (0 - 0.3) + r2 * (0 - 0.3)) / s2;
    expect(sc.sx).toBeCloseTo(expectedSx, 10);
    expect(sc.sy).toBeCloseTo(expectedSy, 10);
  });
});

describe('noiseSchedule', () => {
  it('returns 1.2 at step 0 (initial full variance)', () => {
    expect(noiseSchedule(0)).toBeCloseTo(1.2, 10);
  });

  it('decays exponentially with step count', () => {
    expect(noiseSchedule(6)).toBeCloseTo(1.2 * Math.exp(-1), 10);
  });

  it('floors at 0.05', () => {
    // At step=100, 1.2*exp(-100/6) ≈ 1e-7, clamped to 0.05
    expect(noiseSchedule(100)).toBe(0.05);
  });

  it('pins step=3 value from original: max(0.05, 1.2*exp(-3/6))', () => {
    const expected = Math.max(0.05, 1.2 * Math.exp(-3 / 6));
    expect(noiseSchedule(3)).toBeCloseTo(expected, 10);
  });

  it('is monotonically non-increasing (schedule only shrinks)', () => {
    for (let t = 1; t <= 30; t++) {
      expect(noiseSchedule(t)).toBeLessThanOrEqual(noiseSchedule(t - 1));
    }
  });
});

describe('denoisingStep', () => {
  it('moves particle toward m2 when starting at x=0.8 (close to m2)', () => {
    const p = { x: 0.8, y: 0.0 };
    const s2 = noiseSchedule(0); // 1.2
    const lr = 0.18;
    const p2 = denoisingStep(p, s2, lr);
    // Should have moved toward m2=[1.4,0], so x should increase
    expect(p2.x).toBeGreaterThan(p.x);
  });

  it('moves particle toward m1 when starting at x=-0.8', () => {
    const p = { x: -0.8, y: 0.0 };
    const s2 = noiseSchedule(0);
    const lr = 0.18;
    const p2 = denoisingStep(p, s2, lr);
    expect(p2.x).toBeLessThan(p.x);
  });

  it('does not mutate the input particle', () => {
    const p = { x: 0.5, y: 0.2 };
    const pCopy = { x: 0.5, y: 0.2 };
    denoisingStep(p, 1.0, 0.18);
    expect(p.x).toBe(pCopy.x);
    expect(p.y).toBe(pCopy.y);
  });

  it('pins drift at step 0 defaults from original (p={x:0.5,y:0}, s2=1.2, lr=0.18)', () => {
    const p = { x: 0.5, y: 0 };
    const s2 = 1.2;
    const lr = 0.18;
    const sc = scoreField(p, s2);
    const expected = { x: p.x + lr * sc.sx, y: p.y + lr * sc.sy };
    const result = denoisingStep(p, s2, lr);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
  });

  it('after many steps from x=0.8, particle lands near m2=[1.4,0]', () => {
    let p = { x: 0.8, y: 0.0 };
    for (let t = 0; t < 24; t++) {
      const s2 = noiseSchedule(t);
      p = denoisingStep(p, s2, 0.18);
    }
    // Without stochastic noise, the particle should converge near m2
    expect(p.x).toBeGreaterThan(1.0);
  });

  it('after many steps from x=-0.8, particle lands near m1=[-1.4,0]', () => {
    let p = { x: -0.8, y: 0.0 };
    for (let t = 0; t < 24; t++) {
      const s2 = noiseSchedule(t);
      p = denoisingStep(p, s2, 0.18);
    }
    expect(p.x).toBeLessThan(-1.0);
  });
});
