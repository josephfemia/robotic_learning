import { describe, it, expect } from 'vitest';
import { noDR, withDR } from './domainRandomization.js';

// Default values from the original IIFE: nom=1.0, wdt=0.25
const NOM = 1.0;
const WDT = 0.25;

describe('noDR', () => {
  it('peaks at 1.0 at nominal friction', () => {
    expect(noDR(NOM)).toBeCloseTo(1.0, 8);
  });

  it('is strictly positive for all f', () => {
    [0.5, 0.7, 1.0, 1.3, 1.5].forEach(f => {
      expect(noDR(f)).toBeGreaterThan(0);
    });
  });

  it('falls sharply away from nominal (very tight Gaussian, sigma²=0.012)', () => {
    // At f=nom±0.1: exp(-0.01/(2*0.012)) ≈ exp(-0.417) ≈ 0.659
    const atOffset = noDR(NOM + 0.1);
    expect(atOffset).toBeLessThan(0.7);
  });

  it('matches original formula at f=1.2', () => {
    const expected = Math.exp(-Math.pow(1.2 - NOM, 2) / (2 * 0.012));
    expect(noDR(1.2)).toBeCloseTo(expected, 10);
  });

  it('is symmetric around nom', () => {
    expect(noDR(NOM - 0.15)).toBeCloseTo(noDR(NOM + 0.15), 10);
  });

  it('near-zero performance far from nominal', () => {
    expect(noDR(0.5)).toBeLessThan(0.01);
    expect(noDR(1.5)).toBeLessThan(0.01);
  });
});

describe('withDR', () => {
  it('returns 0.9 at nominal friction (inside plateau)', () => {
    expect(withDR(NOM)).toBeCloseTo(0.9, 10);
  });

  it('returns 0.9 anywhere inside the plateau [nom-wdt, nom+wdt]', () => {
    expect(withDR(NOM - WDT)).toBeCloseTo(0.9, 10);  // edge is inclusive
    expect(withDR(NOM + WDT)).toBeCloseTo(0.9, 10);
    expect(withDR(NOM - 0.1)).toBeCloseTo(0.9, 10);
    expect(withDR(NOM + 0.1)).toBeCloseTo(0.9, 10);
  });

  it('drops below 0.9 outside the band', () => {
    expect(withDR(NOM - WDT - 0.1)).toBeLessThan(0.9);
    expect(withDR(NOM + WDT + 0.1)).toBeLessThan(0.9);
  });

  it('withDR outperforms noDR far from nominal', () => {
    // At deployment friction 1.4 (far from nom=1.0):
    // withDR: still in plateau or just outside (1.0+0.25=1.25 < 1.4 → outside)
    // But DR performance >> noDR performance
    expect(withDR(1.4)).toBeGreaterThan(noDR(1.4));
    expect(withDR(0.6)).toBeGreaterThan(noDR(0.6));
  });

  it('robust policy wins under perturbation: the core result', () => {
    // The DR plateau covers [nom-wdt, nom+wdt] = [0.75, 1.25].
    // At nom=1.0 exactly, noDR=1.0 > withDR=0.9 (peak vs plateau tradeoff).
    // But anywhere other than nom, DR outperforms noDR within the plateau:
    // At the edges of the DR band noDR has already collapsed.
    expect(withDR(0.75)).toBeGreaterThan(noDR(0.75));
    expect(withDR(1.25)).toBeGreaterThan(noDR(1.25));
    // Clearly off-nominal but still inside (or just outside) the DR band:
    expect(withDR(0.8)).toBeGreaterThan(noDR(0.8));
    expect(withDR(0.9)).toBeGreaterThan(noDR(0.9));
    expect(withDR(1.1)).toBeGreaterThan(noDR(1.1));
    expect(withDR(1.2)).toBeGreaterThan(noDR(1.2));
  });

  it('withDR peak (0.9) < noDR peak (1.0): robustness costs peak performance', () => {
    expect(withDR(NOM)).toBeLessThan(noDR(NOM));
  });

  it('wider randomization extends the plateau', () => {
    // With wdt=0.4 the plateau covers further friction ranges
    const narrowSuccess = withDR(1.3, NOM, 0.1);
    const wideSuccess = withDR(1.3, NOM, 0.4);
    expect(wideSuccess).toBeGreaterThan(narrowSuccess);
  });

  it('matches original formula at f=1.5 (outside band)', () => {
    const lo = NOM - WDT, hi = NOM + WDT;  // [0.75, 1.25]
    const d = 1.5 - hi;  // 0.25
    const edge = 0.045;
    const expected = 0.9 * Math.exp(-d * d / (2 * edge * edge));
    expect(withDR(1.5, NOM, WDT)).toBeCloseTo(expected, 10);
  });
});
