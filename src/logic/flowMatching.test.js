import { describe, it, expect } from 'vitest';
import { velocityField, eulerStep, integratePath } from './flowMatching.js';

// Fixed constants from the original IIFE
const M1 = -1.3;
const M2 = 1.3;

describe('velocityField', () => {
  it('returns a finite velocity at the origin at t=0', () => {
    const v = velocityField(0, 0);
    expect(isFinite(v)).toBe(true);
  });

  it('velocity at x=0, t=0 is near zero (symmetric — equal pull from both modes)', () => {
    // At x=0, both modes are equidistant: w1=w2, so x1=(m1+m2)/2=0; v=(0-0)/(1-0)=0
    const v = velocityField(0, 0);
    expect(v).toBeCloseTo(0, 5);
  });

  it('velocity at x>0 pulls toward m2 (positive velocity near m2)', () => {
    // At x=0.5, t=0.5: particle is closer to the interpolated m2 path → v > 0
    const v = velocityField(0.5, 0.5);
    expect(v).toBeGreaterThan(0);
  });

  it('velocity at x<0 pulls toward m1 (negative velocity near m1)', () => {
    const v = velocityField(-0.5, 0.5);
    expect(v).toBeLessThan(0);
  });

  it('clips t at 0.985 to avoid singularity at t=1', () => {
    // Both t=0.99 and t=1.0 should not throw and should produce the same result
    expect(() => velocityField(0.5, 0.99)).not.toThrow();
    expect(() => velocityField(0.5, 1.0)).not.toThrow();
    // t=0.99 and t=1.0 both clip to 0.985
    expect(velocityField(0.5, 0.99)).toBeCloseTo(velocityField(0.5, 1.0), 10);
  });

  it('pins exact velocity at x=0.8, t=0 from original algorithm', () => {
    const x = 0.8, t = 0;
    const tt = Math.min(t, 0.985);
    const sg = 0.32;
    function w(m) { var mean = tt * m; var d = x - mean; return Math.exp(-d * d / (2 * (sg * sg * (1 - tt) * (1 - tt) + 0.02))); }
    const w1 = w(M1), w2 = w(M2), Z = w1 + w2 + 1e-9, x1 = (w1 * M1 + w2 * M2) / Z;
    const expected = (x1 - x) / (1 - tt);
    expect(velocityField(x, t)).toBeCloseTo(expected, 10);
  });

  it('pins exact velocity at x=-0.6, t=0.5 from original algorithm', () => {
    const x = -0.6, t = 0.5;
    const tt = Math.min(t, 0.985);
    const sg = 0.32;
    function w(m) { var mean = tt * m; var d = x - mean; return Math.exp(-d * d / (2 * (sg * sg * (1 - tt) * (1 - tt) + 0.02))); }
    const w1 = w(M1), w2 = w(M2), Z = w1 + w2 + 1e-9, x1 = (w1 * M1 + w2 * M2) / Z;
    const expected = (x1 - x) / (1 - tt);
    expect(velocityField(x, t)).toBeCloseTo(expected, 10);
  });
});

describe('eulerStep', () => {
  it('matches x + dt * vel(x,t) exactly', () => {
    const x = 0.3, t = 0.2, dt = 0.125; // 1/8 steps
    const expected = x + dt * velocityField(x, t);
    expect(eulerStep(x, t, dt)).toBeCloseTo(expected, 10);
  });

  it('moves x toward center at t=0 (noise phase: all paths contract to 0)', () => {
    // At t=0 (tt=0): mean_m1=0, mean_m2=0 for both modes, so x1≈0 and
    // vel = (0 - x) / 1 = -x. Positive x moves left, negative x moves right.
    const x2 = eulerStep(0.5, 0, 0.125);
    expect(x2).toBeLessThan(0.5); // pushed toward 0
  });

  it('moves x toward m2 at t=0.7 (data phase: modes have separated)', () => {
    // At t=0.7, mode means are tt*m1=-0.91 and tt*m2=0.91.
    // A particle at x=0.5 is close to m2's position (0.91) → pulled right.
    const x2 = eulerStep(0.5, 0.7, 0.05);
    expect(x2).toBeGreaterThan(0.5);
  });

  it('pins value for original defaults: x=1.0, t=0, dt=1/8 (8 steps)', () => {
    // dt = 1/8 = 0.125 (steps=8 is the default in the original IIFE)
    const dt = 1 / 8;
    const x = 1.0, t = 0;
    const expected = x + dt * velocityField(x, t);
    expect(eulerStep(x, t, dt)).toBeCloseTo(expected, 10);
  });
});

describe('integratePath', () => {
  it('returns steps+1 points (start + one per step)', () => {
    const pts = integratePath(0.5, 8);
    expect(pts.length).toBe(9);
  });

  it('first point has t=0 and the given starting x', () => {
    const pts = integratePath(0.7, 8);
    expect(pts[0].x).toBe(0.7);
    expect(pts[0].t).toBe(0);
  });

  it('last point has t=1', () => {
    const pts = integratePath(0.7, 8);
    expect(pts[pts.length - 1].t).toBeCloseTo(1.0, 10);
  });

  it('particle starting at x=0.8 (positive) arrives near m2=[1.3] with 40 steps', () => {
    // With many steps the ODE converges well; 40 steps is the slider max in original
    const pts = integratePath(0.8, 40);
    const xFinal = pts[pts.length - 1].x;
    expect(xFinal).toBeGreaterThan(1.0);
  });

  it('particle starting at x=-0.8 (negative) arrives near m1=[-1.3] with 40 steps', () => {
    const pts = integratePath(-0.8, 40);
    const xFinal = pts[pts.length - 1].x;
    expect(xFinal).toBeLessThan(-1.0);
  });

  it('more steps → end position closer to the target mode than fewer steps', () => {
    // Starting at x=0.9, heading to m2=1.3. More steps = more accurate.
    const x0 = 0.9;
    const pts1 = integratePath(x0, 1);   // coarsest
    const pts8 = integratePath(x0, 8);   // default
    const pts40 = integratePath(x0, 40); // finest
    // All should be moving toward m2; 40 steps should be closest
    expect(Math.abs(pts40[pts40.length - 1].x - M2))
      .toBeLessThan(Math.abs(pts8[pts8.length - 1].x - M2));
    expect(Math.abs(pts8[pts8.length - 1].x - M2))
      .toBeLessThan(Math.abs(pts1[pts1.length - 1].x - M2));
  });

  it('pins exact endpoint for x0=0.5, steps=8 from original algorithm', () => {
    // Reproduce the original build() loop verbatim for steps=8, x0=0.5
    const steps = 8;
    var x = 0.5;
    var dt = 1 / steps;
    for (var s = 0; s < steps; s++) {
      x = x + dt * velocityField(x, s * dt);
    }
    const pts = integratePath(0.5, steps);
    expect(pts[pts.length - 1].x).toBeCloseTo(x, 10);
  });

  it('pins exact endpoint for x0=-0.5, steps=8', () => {
    const steps = 8;
    var x = -0.5;
    var dt = 1 / steps;
    for (var s = 0; s < steps; s++) {
      x = x + dt * velocityField(x, s * dt);
    }
    const pts = integratePath(-0.5, steps);
    expect(pts[pts.length - 1].x).toBeCloseTo(x, 10);
  });

  it('intermediate t values are evenly spaced at dt=1/steps', () => {
    const pts = integratePath(0.5, 4);
    expect(pts[1].t).toBeCloseTo(0.25, 10);
    expect(pts[2].t).toBeCloseTo(0.50, 10);
    expect(pts[3].t).toBeCloseTo(0.75, 10);
    expect(pts[4].t).toBeCloseTo(1.00, 10);
  });
});
