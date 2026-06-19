import { describe, it, expect } from 'vitest';
import {
  gaussian,
  msePrediction,
  MODE_LEFT,
  MODE_RIGHT,
  DEMO_SIGMA2,
  MSE_SIGMA2,
} from './meanCollapse.js';

describe('gaussian', () => {
  it('peaks at 1 when a equals centre', () => {
    expect(gaussian(0.6, 0.6, 0.01)).toBeCloseTo(1, 10);
    expect(gaussian(-0.6, -0.6, 0.01)).toBeCloseTo(1, 10);
    expect(gaussian(0, 0, 0.0016)).toBeCloseTo(1, 10);
  });

  it('is symmetric around centre', () => {
    const left = gaussian(0.6 - 0.1, 0.6, 0.01);
    const right = gaussian(0.6 + 0.1, 0.6, 0.01);
    expect(left).toBeCloseTo(right, 10);
  });

  it('decreases away from centre', () => {
    expect(gaussian(0.6, 0.6, 0.01)).toBeGreaterThan(gaussian(0.5, 0.6, 0.01));
    expect(gaussian(0.5, 0.6, 0.01)).toBeGreaterThan(gaussian(0.0, 0.6, 0.01));
  });

  it('matches demo hump formula: exp(-(a-cx)²/(2*0.01)) at a=-0.6, cx=-0.6', () => {
    // a exactly at mode centre → 1
    const expected = Math.exp(-Math.pow(-0.6 - (-0.6), 2) / (2 * DEMO_SIGMA2));
    expect(gaussian(-0.6, -0.6, DEMO_SIGMA2)).toBeCloseTo(expected, 10);
  });

  it('matches MSE curve formula: exp(-a²/(2*0.0016)) at a=0.1', () => {
    const a = 0.1;
    const expected = Math.exp(-Math.pow(a, 2) / (2 * MSE_SIGMA2));
    expect(gaussian(a, 0, MSE_SIGMA2)).toBeCloseTo(expected, 10);
  });

  it('MSE hump at a=0 (obstacle) — this IS the crash prediction (peak = 1)', () => {
    expect(gaussian(0, 0, MSE_SIGMA2)).toBeCloseTo(1, 10);
  });

  it('MSE hump is negligible at the demo mode centres (±0.6 far from mean 0)', () => {
    // With sigma²=0.0016, sigma≈0.04, so ±0.6 is 15 sigma away → essentially 0
    expect(gaussian(0.6, 0, MSE_SIGMA2)).toBeCloseTo(0, 5);
    expect(gaussian(-0.6, 0, MSE_SIGMA2)).toBeCloseTo(0, 5);
  });
});

describe('MODE_LEFT and MODE_RIGHT', () => {
  it('are ±0.6 (verbatim from original)', () => {
    expect(MODE_LEFT).toBe(-0.6);
    expect(MODE_RIGHT).toBe(0.6);
  });

  it('are symmetric around 0', () => {
    expect(MODE_LEFT + MODE_RIGHT).toBeCloseTo(0, 10);
  });
});

describe('msePrediction', () => {
  it('returns 0 for symmetric modes at ±0.6 (the mean = the obstacle)', () => {
    expect(msePrediction(MODE_LEFT, MODE_RIGHT)).toBeCloseTo(0, 10);
  });

  it('returns the midpoint of any two symmetric modes', () => {
    expect(msePrediction(-1, 1)).toBeCloseTo(0, 10);
    expect(msePrediction(-0.4, 0.8)).toBeCloseTo(0.2, 10);
  });
});
