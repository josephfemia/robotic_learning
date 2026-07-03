import { describe, it, expect } from 'vitest';
import {
  KICK, DRIFT_BIAS, DAMP,
  mulberry32, dampingForRound, simulateDaggerRollout,
  simulateRound, coverageAfterRound, collectLabels, runDagger,
} from './dagger.js';
import { simulateRollout } from './driftFunnel.js';

// Widget constants: STEPS=64, H=320, maxA=H/2-38=122, NRoll=26, default eps=0.06
const STEPS = 64;
const MAX_A = 122;
const N_ROLL = 26;
const EPS = 0.06;
const SEED = 42;

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(SEED), b = mulberry32(SEED);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds give different streams', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('dampingForRound', () => {
  it('is 1 at round 0 (pure BC — no aggregated labels)', () => {
    expect(dampingForRound(0)).toBe(1);
  });

  it('decays geometrically: DAMP^k', () => {
    expect(dampingForRound(1)).toBeCloseTo(DAMP, 12);
    expect(dampingForRound(2)).toBeCloseTo(DAMP * DAMP, 12);
    expect(dampingForRound(5)).toBeCloseTo(Math.pow(DAMP, 5), 12);
  });
});

describe('simulateDaggerRollout', () => {
  it('returns an array of length steps+1 starting at 0', () => {
    const r = simulateDaggerRollout(EPS, STEPS, MAX_A, 0, 1, mulberry32(SEED));
    expect(r.length).toBe(STEPS + 1);
    expect(r[0]).toBe(0);
  });

  it('with cov=0, damp=1 reduces EXACTLY to driftFunnel.simulateRollout (pure BC)', () => {
    const a = simulateDaggerRollout(EPS, STEPS, MAX_A, 0, 1, mulberry32(SEED));
    const b = simulateRollout(EPS, STEPS, MAX_A, mulberry32(SEED));
    for (let t = 0; t <= STEPS; t++) expect(a[t]).toBe(b[t]);
  });

  it('stays at 0 when eps=0 (never goes off distribution)', () => {
    const r = simulateDaggerRollout(0, STEPS, MAX_A, 30, 0.35, mulberry32(SEED));
    for (let t = 0; t <= STEPS; t++) expect(r[t]).toBe(0);
  });

  it('all values clamped to ±maxA', () => {
    const rand = mulberry32(99);
    for (let trial = 0; trial < 20; trial++) {
      const r = simulateDaggerRollout(0.2, STEPS, MAX_A, 0, 1, rand);
      for (let t = 0; t <= STEPS; t++) expect(Math.abs(r[t])).toBeLessThanOrEqual(MAX_A);
    }
  });

  it('full coverage + damp=0 freezes drift at the kick: labels kill compounding entirely', () => {
    // rand always 0 → error at t=1, kick to -KICK; every later step is damped to 0.
    const r = simulateDaggerRollout(EPS, STEPS, MAX_A, MAX_A, 0, () => 0);
    expect(r[1]).toBe(-KICK);
    for (let t = 2; t <= STEPS; t++) expect(r[t]).toBe(-KICK);
  });

  it('outside the coverage band the compounding step is undamped (verbatim drift rule)', () => {
    // cov=1 < KICK: the kick lands outside the band, so step 2 is the full
    // driftFunnel update: (0-0.5)*4 + (-DRIFT_BIAS) = -2.6 → d = -6.6
    const r = simulateDaggerRollout(EPS, STEPS, MAX_A, 1, 0.35, () => 0);
    expect(r[1]).toBe(-KICK);
    expect(r[2]).toBeCloseTo(-KICK - 2 - DRIFT_BIAS, 10);
  });

  it('inside the band the same step is scaled by damp', () => {
    // cov=10 > KICK: kick lands inside → step 2 = (-2.6) * 0.35 = -0.91
    const r = simulateDaggerRollout(EPS, STEPS, MAX_A, 10, 0.35, () => 0);
    expect(r[2]).toBeCloseTo(-KICK + (-2 - DRIFT_BIAS) * 0.35, 10);
  });
});

describe('simulateRound', () => {
  it('returns nRoll rollouts and the bundle max |drift|', () => {
    const res = simulateRound({
      eps: EPS, steps: STEPS, maxA: MAX_A, nRoll: N_ROLL,
      cov: 0, damp: 1, rand: mulberry32(SEED),
    });
    expect(res.rolls.length).toBe(N_ROLL);
    let m = 0;
    for (const r of res.rolls) for (const d of r) m = Math.max(m, Math.abs(d));
    expect(res.maxDrift).toBe(m);
  });
});

describe('coverageAfterRound', () => {
  it('widens to include the visited max drift', () => {
    expect(coverageAfterRound(10, 40, MAX_A)).toBe(40);
  });

  it('never shrinks (dataset is aggregated, not replaced)', () => {
    expect(coverageAfterRound(40, 10, MAX_A)).toBe(40);
  });

  it('is capped at maxA', () => {
    expect(coverageAfterRound(10, 500, MAX_A)).toBe(MAX_A);
  });
});

describe('collectLabels', () => {
  it('labels sit exactly on visited off-line states (|d| > tol), subsampled by stride', () => {
    const rolls = [Float64Array.from([0, 1, 5, -8, 2, 12, 0])];
    const labels = collectLabels(rolls, 2, 1);
    expect(labels).toEqual([
      { t: 2, d: 5 }, { t: 3, d: -8 }, { t: 5, d: 12 },
    ]);
  });

  it('respects the stride', () => {
    const rolls = [Float64Array.from([0, 9, 9, 9, 9])];
    const labels = collectLabels(rolls, 2, 2);
    expect(labels.map((l) => l.t)).toEqual([2, 4]);
  });

  it('returns nothing when the learner never leaves the line', () => {
    expect(collectLabels([new Float64Array(10)], 2, 1)).toEqual([]);
  });
});

describe('runDagger — pinned session at seed 42, ε=0.06 (the widget defaults)', () => {
  const session = runDagger({
    eps: EPS, steps: STEPS, maxA: MAX_A, nRoll: N_ROLL,
    rounds: 5, rand: mulberry32(SEED),
  });

  it('per-round max drift is pinned and falls geometrically toward the kick size', () => {
    const expected = [51.549197, 20.011765, 10.393311, 6.030279, 4.763841, 4.265749];
    expect(session.length).toBe(6);
    session.forEach((r, k) => expect(r.maxDrift).toBeCloseTo(expected[k], 4));
    // geometric fall: each round at most ~0.6× the previous, monotone decreasing
    for (let k = 1; k < session.length; k++) {
      expect(session[k].maxDrift).toBeLessThan(session[k - 1].maxDrift);
    }
    expect(session[1].maxDrift / session[0].maxDrift).toBeLessThan(0.6);
    expect(session[2].maxDrift / session[1].maxDrift).toBeLessThan(0.6);
  });

  it('band widths are pinned: 0 for pure BC, then widened to cover everything visited', () => {
    const expectedCov = [0, 51.549197, 51.549197, 51.549197, 51.549197, 51.549197];
    session.forEach((r, k) => expect(r.cov).toBeCloseTo(expectedCov[k], 4));
    // band never shrinks
    for (let k = 1; k < session.length; k++) {
      expect(session[k].cov).toBeGreaterThanOrEqual(session[k - 1].cov);
    }
  });

  it('every round after round 0 stays inside the round-1 band (labels cover the learner)', () => {
    for (let k = 1; k < session.length; k++) {
      expect(session[k].maxDrift).toBeLessThanOrEqual(session[k].cov);
    }
  });
});
