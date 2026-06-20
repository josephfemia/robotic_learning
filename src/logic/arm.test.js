import { describe, it, expect } from 'vitest';
import { forwardKinematics, endEffectorWorld, L1, L2 } from './arm.js';

/**
 * Reference link lengths from the original IIFE (lines 3206-3233):
 *   L1=110, L2=92
 */
describe('link lengths', () => {
  it('L1 is 110', () => {
    expect(L1).toBe(110);
  });

  it('L2 is 92', () => {
    expect(L2).toBe(92);
  });
});

/**
 * endEffectorWorld tests — pure world-frame FK (origin at base):
 *   px = L1·cos(θ1) + L2·cos(θ1+θ2)
 *   py = L1·sin(θ1) + L2·sin(θ1+θ2)
 */
describe('endEffectorWorld', () => {
  it('θ1=0, θ2=0: arm fully extended along +x', () => {
    const { px, py } = endEffectorWorld(0, 0);
    // px = L1 + L2 = 202, py = 0
    expect(px).toBeCloseTo(L1 + L2, 10);
    expect(py).toBeCloseTo(0, 10);
  });

  it('θ1=π/2, θ2=0: arm fully extended along +y', () => {
    const { px, py } = endEffectorWorld(Math.PI / 2, 0);
    // px = 0, py = L1 + L2 = 202
    expect(px).toBeCloseTo(0, 10);
    expect(py).toBeCloseTo(L1 + L2, 10);
  });

  it('θ1=0, θ2=π/2: elbow bent 90° upward', () => {
    const { px, py } = endEffectorWorld(0, Math.PI / 2);
    // px = L1·cos(0) + L2·cos(π/2) = L1 + 0 = 110
    // py = L1·sin(0) + L2·sin(π/2) = 0 + L2 = 92
    expect(px).toBeCloseTo(L1, 10);
    expect(py).toBeCloseTo(L2, 10);
  });

  it('θ1=π/2, θ2=-π/2: link 2 folds back to horizontal', () => {
    const { px, py } = endEffectorWorld(Math.PI / 2, -Math.PI / 2);
    // θ1+θ2 = 0 → px = L1·cos(π/2) + L2·cos(0) = 0 + L2 = 92
    //            → py = L1·sin(π/2) + L2·sin(0) = L1 + 0 = 110
    expect(px).toBeCloseTo(L2, 10);
    expect(py).toBeCloseTo(L1, 10);
  });

  it('θ1=π, θ2=0: fully extended along -x', () => {
    const { px, py } = endEffectorWorld(Math.PI, 0);
    expect(px).toBeCloseTo(-(L1 + L2), 10);
    expect(py).toBeCloseTo(0, 10);
  });

  it('θ1=0, θ2=π: arm fully folded back', () => {
    const { px, py } = endEffectorWorld(0, Math.PI);
    // px = L1·cos(0) + L2·cos(π) = L1 - L2 = 18
    // py = 0
    expect(px).toBeCloseTo(L1 - L2, 10);
    expect(py).toBeCloseTo(0, 10);
  });
});

/**
 * forwardKinematics tests — SVG frame (y-axis DOWN, so sin terms negated).
 * Uses ox=280, oy=235.6 (W/2 and H*0.62 from IIFE with W=560, H=380).
 */
describe('forwardKinematics', () => {
  const ox = 280;
  const oy = 380 * 0.62; // 235.6

  it('θ1=0, θ2=0: elbow and end-effector both to the right of base', () => {
    const p = forwardKinematics(ox, oy, 0, 0);
    expect(p.x1).toBeCloseTo(ox + L1, 10);
    expect(p.y1).toBeCloseTo(oy, 10);
    expect(p.x2).toBeCloseTo(ox + L1 + L2, 10);
    expect(p.y2).toBeCloseTo(oy, 10);
  });

  it('θ1=π/2, θ2=0: arm points upward in SVG (y decreases)', () => {
    const p = forwardKinematics(ox, oy, Math.PI / 2, 0);
    // x1 = ox + L1*cos(π/2) ≈ ox, y1 = oy - L1*sin(π/2) = oy - L1
    expect(p.x1).toBeCloseTo(ox, 10);
    expect(p.y1).toBeCloseTo(oy - L1, 10);
    // x2 ≈ ox, y2 = (oy - L1) - L2
    expect(p.x2).toBeCloseTo(ox, 10);
    expect(p.y2).toBeCloseTo(oy - L1 - L2, 10);
  });

  it('returns 4 numeric fields', () => {
    const p = forwardKinematics(ox, oy, 0.7, 0.8);
    expect(typeof p.x1).toBe('number');
    expect(typeof p.y1).toBe('number');
    expect(typeof p.x2).toBe('number');
    expect(typeof p.y2).toBe('number');
  });

  it('θ1=0.7, θ2=0.8: matches manual calculation (IIFE defaults)', () => {
    // Default values from the IIFE: th1=0.7, th2=0.8
    const p = forwardKinematics(ox, oy, 0.7, 0.8);
    const ex1 = ox + L1 * Math.cos(0.7);
    const ey1 = oy - L1 * Math.sin(0.7);
    const ex2 = ex1 + L2 * Math.cos(0.7 + 0.8);
    const ey2 = ey1 - L2 * Math.sin(0.7 + 0.8);
    expect(p.x1).toBeCloseTo(ex1, 10);
    expect(p.y1).toBeCloseTo(ey1, 10);
    expect(p.x2).toBeCloseTo(ex2, 10);
    expect(p.y2).toBeCloseTo(ey2, 10);
  });
});
