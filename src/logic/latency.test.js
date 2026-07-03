import { describe, it, expect } from 'vitest';
import {
  TICK_MS, MS_PER_TOKEN, mulberry32, makeRandn, targetTrack,
  decisionNoise, simulate, defaultBudgets, successCurve, optimumBudget,
} from './latency.js';

/**
 * Delayed-feedback tracking core for the L10 reasoning-latency widget.
 *
 * Model recap (see latency.js header):
 *   aim(t) = target(t−d) + σ(budget)·ε,  x(t+1) = x(t) + gain·(aim(t) − x(t−d))
 *   d = round(budgetMs / TICK_MS), σ shrinks in budget, gain = 0.14·(0.5+speed).
 *
 * Pins below were generated from this implementation at seed=7 and are the
 * regression contract: do not change the numerics without re-pinning.
 */

describe('constants', () => {
  it('control loop is 50 Hz (20 ms/tick) and tokens decode at 2 ms/token', () => {
    expect(TICK_MS).toBe(20);
    expect(MS_PER_TOKEN).toBe(2);
  });
});

describe('mulberry32 / makeRandn — seeded determinism', () => {
  it('same seed → identical uniform stream', () => {
    const a = mulberry32(7), b = mulberry32(7);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('uniforms lie in [0,1)', () => {
    const r = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randn is deterministic given a seeded rng and roughly centered', () => {
    const randn = makeRandn(mulberry32(7));
    let s = 0;
    for (let i = 0; i < 500; i++) s += randn();
    expect(Math.abs(s / 500)).toBeLessThan(0.15);
  });
});

describe('targetTrack — seeded smooth drift', () => {
  it('returns T finite samples bounded by the summed amplitudes (±1)', () => {
    const y = targetTrack(420, 1, mulberry32(7));
    expect(y.length).toBe(420);
    y.forEach(v => {
      expect(isFinite(v)).toBe(true);
      expect(Math.abs(v)).toBeLessThanOrEqual(1.0);
    });
  });

  it('pinned: seed=7, speed=1 → target[0] and target[100]', () => {
    const y = targetTrack(420, 1, mulberry32(7));
    expect(y[0]).toBeCloseTo(0.13258544814074902, 12);
    expect(y[100]).toBeCloseTo(0.4468227413739657, 12);
  });

  it('speed only rescales time: track(speed=2)[t] = track(speed=1)[2t]', () => {
    const y1 = targetTrack(420, 1, mulberry32(7));
    const y2 = targetTrack(210, 2, mulberry32(7));
    expect(y2[50]).toBeCloseTo(y1[100], 12);
    expect(y2[100]).toBeCloseTo(y1[200], 12);
  });
});

describe('decisionNoise — quality bought by budget', () => {
  it('is noise0 at zero budget and halves at noiseHalfMs', () => {
    expect(decisionNoise(0)).toBeCloseTo(1.5, 12);
    expect(decisionNoise(40)).toBeCloseTo(0.75, 12);
  });

  it('is strictly decreasing in budget', () => {
    let prev = decisionNoise(0);
    for (const b of [20, 60, 120, 240, 400]) {
      const s = decisionNoise(b);
      expect(s).toBeLessThan(prev);
      prev = s;
    }
  });
});

describe('simulate — shape, delay bookkeeping, determinism', () => {
  it('returns T tracker/target samples, all finite', () => {
    const { target, tracker } = simulate({ budgetMs: 100 });
    expect(target.length).toBe(420);
    expect(tracker.length).toBe(420);
    tracker.forEach(v => expect(isFinite(v)).toBe(true));
  });

  it('delaySteps = round(budgetMs / TICK_MS)', () => {
    expect(simulate({ budgetMs: 0 }).delaySteps).toBe(0);
    expect(simulate({ budgetMs: 100 }).delaySteps).toBe(5);
    expect(simulate({ budgetMs: 400 }).delaySteps).toBe(20);
    expect(simulate({ budgetMs: 30 }).delaySteps).toBe(2); // round, not floor
  });

  it('same seed → identical run; different seed → different run', () => {
    const a = simulate({ budgetMs: 100, seed: 7 });
    const b = simulate({ budgetMs: 100, seed: 7 });
    const c = simulate({ budgetMs: 100, seed: 8 });
    expect(a.tracker).toEqual(b.tracker);
    expect(a.tracker[50]).not.toBe(c.tracker[50]);
  });

  it('first step matches manual integration (budget=0, seed=7)', () => {
    // rng consumes 3 phase draws, then Box-Muller noise; gain = 0.14·(0.5+1).
    const rng = mulberry32(7);
    const target = targetTrack(420, 1, rng);
    const randn = makeRandn(rng);
    const expected = 0.21 * (target[0] + 1.5 * randn() - 0);
    const { tracker } = simulate({ budgetMs: 0, speed: 1, seed: 7 });
    expect(tracker[0]).toBe(0);
    expect(tracker[1]).toBeCloseTo(expected, 12);
  });
});

describe('simulate — pinned trajectory samples (budget=100 ms, speed=1, seed=7)', () => {
  const { tracker, sigma, success } = simulate({ budgetMs: 100 });

  it('pinned tracker samples', () => {
    expect(tracker[1]).toBeCloseTo(-0.047628555441426315, 12);
    expect(tracker[50]).toBeCloseTo(0.9740669299099921, 12);
    expect(tracker[200]).toBeCloseTo(-0.46818855725063635, 12);
    expect(tracker[419]).toBeCloseTo(-0.7289671526152464, 12);
  });

  it('pinned decision noise at 100 ms: 1.5·40/140', () => {
    expect(sigma).toBeCloseTo(1.5 * 40 / 140, 12);
  });

  it('pinned success', () => {
    expect(success).toBeCloseTo(0.5289473684210526, 12);
  });
});

describe('simulate — the latency tradeoff itself (speed=1, seed=7)', () => {
  const s0 = simulate({ budgetMs: 0 });
  const s100 = simulate({ budgetMs: 100 });
  const s400 = simulate({ budgetMs: 400 });

  it('pinned endpoints: zero thought 0.413, max thought 0.058', () => {
    expect(s0.success).toBeCloseTo(0.4131578947368421, 12);
    expect(s400.success).toBeCloseTo(0.05789473684210526, 12);
  });

  it('moderate thought beats both extremes (interior optimum exists)', () => {
    expect(s100.success).toBeGreaterThan(s0.success);
    expect(s100.success).toBeGreaterThan(s400.success);
  });

  it('max thought oscillates: tracker overshoots the ±1 target envelope', () => {
    const peak = Math.max(...s400.tracker.map(Math.abs));
    expect(peak).toBeGreaterThan(1.5);
    // zero-thought tracker is noisy but not ringing that hard
    const peak0 = Math.max(...s0.tracker.map(Math.abs));
    expect(peak0).toBeLessThan(peak);
  });
});

describe('successCurve / optimumBudget', () => {
  it('defaultBudgets is 0..400 in 20 ms steps', () => {
    const b = defaultBudgets();
    expect(b.length).toBe(21);
    expect(b[0]).toBe(0);
    expect(b[1]).toBe(20);
    expect(b[20]).toBe(400);
  });

  it('curve entries carry {budgetMs, success} on the requested grid', () => {
    const c = successCurve({ speed: 1, budgetsMs: [0, 100, 400] });
    expect(c.map(p => p.budgetMs)).toEqual([0, 100, 400]);
    c.forEach(p => {
      expect(p.success).toBeGreaterThanOrEqual(0);
      expect(p.success).toBeLessThanOrEqual(1);
    });
  });

  it('optimumBudget picks the argmax (first on ties)', () => {
    expect(optimumBudget([
      { budgetMs: 0, success: 0.2 },
      { budgetMs: 20, success: 0.7 },
      { budgetMs: 40, success: 0.7 },
      { budgetMs: 60, success: 0.1 },
    ])).toBe(20);
  });

  it('pinned: speed=1, seed=7 → interior optimum at 80 ms, success ≈ 0.648', () => {
    const c = successCurve({ speed: 1 });
    expect(optimumBudget(c)).toBe(80);
    const at80 = c.find(p => p.budgetMs === 80);
    expect(at80.success).toBeCloseTo(0.6478947368421052, 12);
    // interior: strictly better than both endpoints
    expect(at80.success).toBeGreaterThan(c[0].success);
    expect(at80.success).toBeGreaterThan(c[c.length - 1].success);
  });

  it('pinned: optimum slides left as the world speeds up (80 → 60 → 40 → 20 ms)', () => {
    const opts = [1, 1.6, 2.2, 3].map(sp => optimumBudget(successCurve({ speed: sp })));
    expect(opts).toEqual([80, 60, 40, 20]);
    for (let i = 1; i < opts.length; i++) expect(opts[i]).toBeLessThan(opts[i - 1]);
  });
});
