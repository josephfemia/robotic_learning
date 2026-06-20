import { describe, it, expect } from 'vitest';
import { clippedObjective, unclippedObjective, isFlat } from './ppoClip.js';

const EPS = 0.2;

describe('unclippedObjective', () => {
  it('is r * A', () => {
    expect(unclippedObjective(1.5, 2)).toBeCloseTo(3.0, 10);
    expect(unclippedObjective(0.8, -1)).toBeCloseTo(-0.8, 10);
    expect(unclippedObjective(1.0, 1)).toBeCloseTo(1.0, 10);
  });
});

describe('clippedObjective', () => {
  describe('A > 0 (good action)', () => {
    it('equals r*A inside the band [1-eps, 1+eps]', () => {
      // r=1.0: inside band → L = min(1*1, 1*1) = 1.0
      expect(clippedObjective(1.0, 1, EPS)).toBeCloseTo(1.0, 10);
      // r=1.1 (inside): L = min(1.1, 1.1) = 1.1
      expect(clippedObjective(1.1, 1, EPS)).toBeCloseTo(1.1, 10);
    });

    it('is flat (capped) beyond r = 1+eps', () => {
      // r=1.5 > 1+eps=1.2: clip to 1.2 → L = min(1.5, 1.2) = 1.2
      expect(clippedObjective(1.5, 1, EPS)).toBeCloseTo(1.2, 10);
      expect(clippedObjective(2.0, 1, EPS)).toBeCloseTo(1.2, 10);
    });

    it('stays sloped below r=1 (allows pulling back a bad update)', () => {
      // r=0.5 < 1: L = min(0.5, 0.8) = 0.5 (still sloped)
      expect(clippedObjective(0.5, 1, EPS)).toBeCloseTo(0.5, 10);
      expect(clippedObjective(0.7, 1, EPS)).toBeCloseTo(0.7, 10);
    });
  });

  describe('A < 0 (bad action)', () => {
    it('is flat below r = 1-eps', () => {
      // r=0.5, A=-1, eps=0.2: clip to max(0.8, min(1.2, 0.5))=0.8
      // L = min(0.5*-1, 0.8*-1) = min(-0.5, -0.8) = -0.8
      expect(clippedObjective(0.5, -1, EPS)).toBeCloseTo(-0.8, 10);
      expect(clippedObjective(0.3, -1, EPS)).toBeCloseTo(-0.8, 10);
    });

    it('slopes above r=1 (allows pulling back)', () => {
      // r=1.3 > 1, A=-1: clip to min(1.2,1.3)=1.2 → L=min(1.3*-1, 1.2*-1)=min(-1.3,-1.2)=-1.3
      expect(clippedObjective(1.3, -1, EPS)).toBeCloseTo(-1.3, 10);
    });
  });

  it('clipped objective <= unclipped when A>0 and r>1+eps', () => {
    const r = 1.8;
    expect(clippedObjective(r, 1, EPS)).toBeLessThanOrEqual(unclippedObjective(r, 1));
  });

  it('at r=1 clip has no effect (ratio=1 is always in-band)', () => {
    expect(clippedObjective(1, 1, EPS)).toBeCloseTo(unclippedObjective(1, 1), 10);
    expect(clippedObjective(1, -1, EPS)).toBeCloseTo(unclippedObjective(1, -1), 10);
  });
});

describe('isFlat', () => {
  it('is flat for A>0 when r > 1+eps', () => {
    expect(isFlat(1.3, 1, EPS)).toBe(true);
    expect(isFlat(2.0, 1, EPS)).toBe(true);
  });

  it('is not flat for A>0 inside [1-eps, 1+eps]', () => {
    expect(isFlat(1.0, 1, EPS)).toBe(false);
    expect(isFlat(1.1, 1, EPS)).toBe(false);
  });

  it('is flat for A<0 when r < 1-eps', () => {
    expect(isFlat(0.7, -1, EPS)).toBe(true);
    expect(isFlat(0.5, -1, EPS)).toBe(true);
  });

  it('is not flat for A<0 inside band', () => {
    expect(isFlat(1.0, -1, EPS)).toBe(false);
    expect(isFlat(1.1, -1, EPS)).toBe(false);
  });

  it('returns false for A=0', () => {
    expect(isFlat(1.5, 0, EPS)).toBe(false);
    expect(isFlat(0.5, 0, EPS)).toBe(false);
  });
});
