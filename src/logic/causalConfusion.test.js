import { describe, it, expect } from 'vitest';
import { trainingAccuracy, deploymentSuccess } from './causalConfusion.js';

describe('trainingAccuracy', () => {
  it('is 1.0 when brake-light is included (verbatim from original: incl?1.0:0.92)', () => {
    expect(trainingAccuracy(true)).toBe(1.0);
  });

  it('is 0.92 when brake-light is excluded', () => {
    expect(trainingAccuracy(false)).toBe(0.92);
  });

  it('is higher with the brake-light (spurious shortcut boosts train accuracy)', () => {
    expect(trainingAccuracy(true)).toBeGreaterThan(trainingAccuracy(false));
  });
});

describe('deploymentSuccess', () => {
  it('is 0.06 when brake-light is included (verbatim from original: incl?0.06:0.86)', () => {
    expect(deploymentSuccess(true)).toBe(0.06);
  });

  it('is 0.86 when brake-light is excluded', () => {
    expect(deploymentSuccess(false)).toBe(0.86);
  });

  it('is much lower with the brake-light than without (the core causal confusion claim)', () => {
    expect(deploymentSuccess(false)).toBeGreaterThan(deploymentSuccess(true));
  });

  it('the paradox holds: high train accuracy coexists with catastrophic deployment', () => {
    // The entire point of the widget: train↑ while deploy↓
    expect(trainingAccuracy(true)).toBeGreaterThan(trainingAccuracy(false));
    expect(deploymentSuccess(true)).toBeLessThan(deploymentSuccess(false));
  });
});
