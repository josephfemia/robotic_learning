import { describe, it, expect } from 'vitest';
import { barycentricToXY, VERTICES } from './worldview.js';

describe('barycentricToXY', () => {
  it('pure Sutton corner → vertex A', () => {
    const p = barycentricToXY([1, 0, 0]);
    expect(p.x).toBeCloseTo(VERTICES.A.x, 10);
    expect(p.y).toBeCloseTo(VERTICES.A.y, 10);
  });

  it('pure LeCun corner → vertex B', () => {
    const p = barycentricToXY([0, 1, 0]);
    expect(p.x).toBeCloseTo(VERTICES.B.x, 10);
    expect(p.y).toBeCloseTo(VERTICES.B.y, 10);
  });

  it('pure Brooks corner → vertex C', () => {
    const p = barycentricToXY([0, 0, 1]);
    expect(p.x).toBeCloseTo(VERTICES.C.x, 10);
    expect(p.y).toBeCloseTo(VERTICES.C.y, 10);
  });

  it('equal weights → centroid of triangle', () => {
    const p = barycentricToXY([1, 1, 1]);
    const cx = (VERTICES.A.x + VERTICES.B.x + VERTICES.C.x) / 3;
    const cy = (VERTICES.A.y + VERTICES.B.y + VERTICES.C.y) / 3;
    expect(p.x).toBeCloseTo(cx, 8);
    expect(p.y).toBeCloseTo(cy, 8);
  });

  it('normalises weights that do not sum to 1 — π0.5 spot check', () => {
    // π0.5: w=[0.7, 0.2, 0.1] — exact pixel from the IIFE
    const p = barycentricToXY([0.7, 0.2, 0.1]);
    const expected = {
      x: 0.7 * VERTICES.A.x + 0.2 * VERTICES.B.x + 0.1 * VERTICES.C.x,
      y: 0.7 * VERTICES.A.y + 0.2 * VERTICES.B.y + 0.1 * VERTICES.C.y,
    };
    expect(p.x).toBeCloseTo(expected.x, 8);
    expect(p.y).toBeCloseTo(expected.y, 8);
  });

  it('DreamerV3 spot check: w=[0.25, 0.65, 0.1]', () => {
    const p = barycentricToXY([0.25, 0.65, 0.1]);
    const expected = {
      x: 0.25 * VERTICES.A.x + 0.65 * VERTICES.B.x + 0.10 * VERTICES.C.x,
      y: 0.25 * VERTICES.A.y + 0.65 * VERTICES.B.y + 0.10 * VERTICES.C.y,
    };
    expect(p.x).toBeCloseTo(expected.x, 8);
    expect(p.y).toBeCloseTo(expected.y, 8);
  });

  it('unnormalised weights give same result as normalised', () => {
    const p1 = barycentricToXY([2, 4, 2]);
    const p2 = barycentricToXY([0.25, 0.5, 0.25]);
    expect(p1.x).toBeCloseTo(p2.x, 8);
    expect(p1.y).toBeCloseTo(p2.y, 8);
  });
});
