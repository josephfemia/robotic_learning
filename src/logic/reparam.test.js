import { describe, it, expect } from 'vitest';
import {
  objective, objectiveGrad,
  scoreFunctionEstimate, reparamEstimate,
  vstat, trueGradient
} from './reparam.js';

// Default widget values: mu=-0.6, sigma=0.9, K=24
const MU = -0.6;
const SIGMA = 0.9;

describe('objective', () => {
  it('peaks at a=1 (value=0)', () => {
    expect(objective(1)).toBeCloseTo(0, 10);
  });
  it('matches -(a-1)² formula', () => {
    expect(objective(0)).toBeCloseTo(-1, 10);
    expect(objective(2)).toBeCloseTo(-1, 10);
    expect(objective(3)).toBeCloseTo(-4, 10);
  });
  it('is always <= 0', () => {
    [-5, -2, 0, 1, 2, 5].forEach(a => {
      expect(objective(a)).toBeLessThanOrEqual(0);
    });
  });
});

describe('objectiveGrad', () => {
  it('is 0 at a=1 (gradient = 0 at optimum)', () => {
    expect(objectiveGrad(1)).toBeCloseTo(0, 10);
  });
  it('matches -2*(a-1) formula', () => {
    expect(objectiveGrad(0)).toBeCloseTo(2, 10);
    expect(objectiveGrad(2)).toBeCloseTo(-2, 10);
    expect(objectiveGrad(3)).toBeCloseTo(-4, 10);
  });
});

describe('trueGradient', () => {
  it('equals -2*(mu-1)', () => {
    expect(trueGradient(MU)).toBeCloseTo(-2 * (MU - 1), 10);
    expect(trueGradient(1)).toBeCloseTo(0, 10);
    expect(trueGradient(0)).toBeCloseTo(2, 10);
  });
});

describe('scoreFunctionEstimate', () => {
  it('matches f(a)*(a-mu)/sigma² formula', () => {
    const a = 0.5;
    const expected = objective(a) * (a - MU) / (SIGMA * SIGMA);
    expect(scoreFunctionEstimate(a, MU, SIGMA)).toBeCloseTo(expected, 10);
  });

  it('both estimators are unbiased: large-sample means converge to trueGradient', () => {
    // Use a deterministic pseudo-random sequence to test unbiasedness in expectation.
    // We'll use a grid approximation instead of random sampling.
    // E[score] = integral over a~N(mu,sigma²) of f(a)*(a-mu)/sigma²
    // For Gaussian, this equals ∇_mu E[f] = true gradient.
    // Verify by numerical integration with many points.
    const N = 2000;
    let sfSum = 0, rpSum = 0;
    // Use evenly-spaced quantiles from standard normal (deterministic)
    // a_i = mu + sigma * Phi^{-1}((i+0.5)/N)
    // Approximate: just use -4 to 4 uniformly spaced as quadrature
    const dx = 8 / N;
    const sqrtTwoPi = Math.sqrt(2 * Math.PI);
    for (let i = 0; i < N; i++) {
      const z = -4 + (i + 0.5) * dx;  // standard normal variate approximation
      const a = MU + SIGMA * z;
      const pz = Math.exp(-z * z / 2) / sqrtTwoPi; // N(0,1) density at z
      // weight = N(a; mu, sigma) * da = (1/sigma)*pz * (sigma*dz) = pz * dz
      const wt = pz * (8 / N);
      sfSum += scoreFunctionEstimate(a, MU, SIGMA) * wt;
      rpSum += reparamEstimate(a) * wt;
    }
    const tg = trueGradient(MU);
    expect(sfSum).toBeCloseTo(tg, 1);   // both unbiased
    expect(rpSum).toBeCloseTo(tg, 1);
  });
});

describe('reparamEstimate', () => {
  it('matches f\'(a) formula directly', () => {
    const a = 0.5;
    expect(reparamEstimate(a)).toBeCloseTo(objectiveGrad(a), 10);
  });

  it('reparameterization has lower variance than score-function for wide sigma', () => {
    // For f(a) = -(a-1)², wide sigma → large score-function variance
    // This is the core property tested in the widget.
    // Sample deterministically using a fixed seed-like approach.
    const sigma = 1.8;  // wide policy spread
    const sfSamples = [];
    const rpSamples = [];
    // Use N evenly-spaced actions in [-4, 4] range of standard normal
    const N = 500;
    for (let i = 0; i < N; i++) {
      const z = -4 + (i + 0.5) * 8 / N;
      const a = MU + sigma * z;
      sfSamples.push(scoreFunctionEstimate(a, MU, sigma));
      rpSamples.push(reparamEstimate(a));
    }
    const sfStats = vstat(sfSamples);
    const rpStats = vstat(rpSamples);
    // Reparameterization variance should be lower
    expect(rpStats.variance).toBeLessThan(sfStats.variance);
  });
});

describe('vstat', () => {
  it('computes mean correctly', () => {
    const { mean } = vstat([1, 2, 3, 4, 5]);
    expect(mean).toBeCloseTo(3, 10);
  });

  it('computes variance correctly (population variance)', () => {
    // [1,2,3,4,5]: mean=3, var = (4+1+0+1+4)/5 = 2
    const { variance } = vstat([1, 2, 3, 4, 5]);
    expect(variance).toBeCloseTo(2, 10);
  });

  it('variance is 0 for constant array', () => {
    const { variance } = vstat([5, 5, 5, 5]);
    expect(variance).toBeCloseTo(0, 10);
  });
});
