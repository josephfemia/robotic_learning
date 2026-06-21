import { describe, it, expect } from 'vitest';
import { softmax, entropy } from './softmax.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sum an array of numbers. */
const sum = arr => arr.reduce((a, b) => a + b, 0);

/** Index of the maximum element. */
const argmax = arr => arr.indexOf(Math.max(...arr));

// ---------------------------------------------------------------------------
// softmax
// ---------------------------------------------------------------------------

describe('softmax', () => {
  it('probabilities sum to 1 for a typical input (T=1)', () => {
    const probs = softmax([2, 1, 0.1, -1, 3]);
    expect(sum(probs)).toBeCloseTo(1.0, 10);
  });

  it('all probabilities are in (0, 1)', () => {
    const probs = softmax([2, 1, 0.1, -1, 3]);
    for (const p of probs) {
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });

  it('preserves the rank order of logits (monotonic)', () => {
    const logits = [3, 1, 4, 1, 5, 9, 2, 6];
    const probs  = softmax(logits);
    // for every pair i, j: logit[i] > logit[j]  ⟺  prob[i] > prob[j]
    for (let i = 0; i < logits.length; i++) {
      for (let j = 0; j < logits.length; j++) {
        if (logits[i] > logits[j]) expect(probs[i]).toBeGreaterThan(probs[j]);
        if (logits[i] < logits[j]) expect(probs[i]).toBeLessThan(probs[j]);
      }
    }
  });

  it('argmax of probs equals argmax of logits', () => {
    const logits = [1, 5, 2, 3];
    expect(argmax(softmax(logits))).toBe(argmax(logits));
  });

  it('low T (0.01) approaches a one-hot on the argmax', () => {
    const logits = [1, 2, 5, 0.5];       // argmax = index 2
    const probs  = softmax(logits, 0.01);
    expect(probs[2]).toBeGreaterThan(0.999);
    expect(sum(probs)).toBeCloseTo(1.0, 8);
  });

  it('very low T (0.001) is virtually one-hot', () => {
    const logits = [0, 0, 10, 0, 0];
    const probs  = softmax(logits, 0.001);
    expect(probs[2]).toBeCloseTo(1.0, 6);
  });

  it('high T (100) approaches a uniform distribution', () => {
    const logits  = [1, 2, 3, 4, 5];
    const probs   = softmax(logits, 100);
    const uniform = 1 / logits.length;   // 0.2
    for (const p of probs) {
      expect(p).toBeCloseTo(uniform, 1); // within ±0.05
    }
  });

  it('uniform distribution at T=1 when all logits equal', () => {
    const probs = softmax([3, 3, 3, 3]);
    const expected = 0.25;
    for (const p of probs) {
      expect(p).toBeCloseTo(expected, 10);
    }
  });

  it('numerically stable for very large logits (no NaN or Inf)', () => {
    const logits = [1000, 999, 1001, 998];
    const probs  = softmax(logits);
    expect(sum(probs)).toBeCloseTo(1.0, 10);
    for (const p of probs) {
      expect(isFinite(p)).toBe(true);
      expect(isNaN(p)).toBe(false);
    }
  });

  it('numerically stable for very negative logits', () => {
    const logits = [-1000, -999, -1001, -998];
    const probs  = softmax(logits);
    expect(sum(probs)).toBeCloseTo(1.0, 10);
    for (const p of probs) expect(isFinite(p)).toBe(true);
  });

  it('works with a single logit — returns [1]', () => {
    const probs = softmax([7]);
    expect(probs).toHaveLength(1);
    expect(probs[0]).toBeCloseTo(1.0, 10);
  });

  it('concrete values at T=1: softmax([0, 1]) ≈ [0.2689, 0.7311]', () => {
    const probs = softmax([0, 1]);
    // sigmoid(1) = 1/(1+e^{-1}) ≈ 0.7310586
    expect(probs[0]).toBeCloseTo(0.26894, 4);
    expect(probs[1]).toBeCloseTo(0.73106, 4);
  });

  it('concrete values at T=2: flatter than T=1', () => {
    const probs1 = softmax([0, 1], 1);
    const probs2 = softmax([0, 1], 2);
    // higher T → smaller spread
    expect(probs2[1] - probs2[0]).toBeLessThan(probs1[1] - probs1[0]);
  });

  it('default T=1 matches explicit T=1', () => {
    const logits = [2, -1, 3, 0.5];
    const p1 = softmax(logits);
    const p2 = softmax(logits, 1);
    for (let i = 0; i < logits.length; i++) {
      expect(p1[i]).toBeCloseTo(p2[i], 12);
    }
  });
});

// ---------------------------------------------------------------------------
// entropy
// ---------------------------------------------------------------------------

describe('entropy', () => {
  it('maximal at uniform distribution: entropy([0.25,0.25,0.25,0.25]) ≈ ln(4)', () => {
    const probs = [0.25, 0.25, 0.25, 0.25];
    expect(entropy(probs)).toBeCloseTo(Math.log(4), 8);
  });

  it('zero at a one-hot distribution (deterministic)', () => {
    // entropy of a near-one-hot; true 1.0 produces log(1) = 0
    // 0 * log(0) is treated as 0 by convention (limit)
    const probs = softmax([0, 0, 100, 0, 0]);
    expect(entropy(probs)).toBeCloseTo(0, 3);
  });

  it('entropy increases as T rises from 0.01 to 10', () => {
    const logits = [1, 2, 5, 0.5];
    const hLow  = entropy(softmax(logits, 0.01));
    const hHigh = entropy(softmax(logits, 10));
    expect(hHigh).toBeGreaterThan(hLow);
  });

  it('entropy for 5-class uniform is ln(5) ≈ 1.6094', () => {
    const probs = softmax([0, 0, 0, 0, 0]);
    expect(entropy(probs)).toBeCloseTo(Math.log(5), 8);
  });

  it('entropy for 2-class [0.5, 0.5] is ln(2) ≈ 0.6931', () => {
    expect(entropy([0.5, 0.5])).toBeCloseTo(Math.log(2), 8);
  });

  it('entropy is non-negative', () => {
    const cases = [
      softmax([1, 2, 3]),
      softmax([10, -5, 3], 0.5),
      [1],
    ];
    for (const probs of cases) expect(entropy(probs)).toBeGreaterThanOrEqual(0);
  });

  it('concrete value: entropy of softmax([0,1]) at T=1 ≈ 0.5822', () => {
    const probs = softmax([0, 1]);
    // H = -p*ln(p) - (1-p)*ln(1-p) where p ≈ 0.7311
    const p = 0.7310586;
    const expected = -(p * Math.log(p) + (1 - p) * Math.log(1 - p));
    expect(entropy(probs)).toBeCloseTo(expected, 5);
  });
});
