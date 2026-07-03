import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  gaussian,
  DEFAULTS,
  makeTrueTrajectory,
  makeObservations,
  runBelief,
} from './filterDream.js';

// Widget defaults: steps=60, trajSeed=11, obsSeed=7, dreamSeed=1, q=36, r=64,
// sigma0=20, default boundary in the widget = 30.
const traj = makeTrueTrajectory();
const obs = makeObservations(traj);
const B = 30;

describe('mulberry32 / gaussian', () => {
  it('is deterministic per seed and uniform in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      const v = a();
      expect(b()).toBe(v);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds give different streams', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('gaussian draws from the injected uniform source deterministically', () => {
    expect(gaussian(mulberry32(5))).toBeCloseTo(gaussian(mulberry32(5)), 12);
  });
});

describe('makeTrueTrajectory — pinned meandering walk', () => {
  it('has length steps+1 and starts at 0', () => {
    expect(traj.length).toBe(DEFAULTS.steps + 1);
    expect(traj[0]).toBe(0);
  });

  it('is pinned at the default seed (values frozen)', () => {
    expect(traj[10]).toBeCloseTo(-29.133933, 5);
    expect(traj[30]).toBeCloseTo(-4.200946, 5);
    expect(traj[60]).toBeCloseTo(-18.388649, 5);
  });

  it('meanders but stays on stage (mean reversion bounds it)', () => {
    let maxAbs = 0;
    for (let t = 0; t <= DEFAULTS.steps; t++) maxAbs = Math.max(maxAbs, Math.abs(traj[t]));
    expect(maxAbs).toBeLessThan(60); // pinned walk peaks at ~31; ±90 stage units
    expect(maxAbs).toBeGreaterThan(10); // …but it genuinely moves
  });

  it('a different trajSeed gives a different walk', () => {
    const other = makeTrueTrajectory({ trajSeed: 12 });
    expect(other[10]).not.toBeCloseTo(traj[10], 5);
  });
});

describe('makeObservations — pinned noisy ticks', () => {
  it('is pinned and stays near the true state', () => {
    expect(obs[30]).toBeCloseTo(1.934722, 5);
    let sumAbs = 0;
    for (let t = 0; t < obs.length; t++) sumAbs += Math.abs(obs[t] - traj[t]);
    // mean |noise| of N(0, 8²) is 8·√(2/π) ≈ 6.4; allow slack, but well under 2σ
    expect(sumAbs / obs.length).toBeLessThan(16);
    expect(sumAbs / obs.length).toBeGreaterThan(1);
  });
});

describe('runBelief — observe phase (the posterior peeking at o)', () => {
  const T = runBelief({ traj, obs, boundary: B, trained: true });

  it('snaps tight after every tick: σ_post < σ_pred at each observed step', () => {
    for (let t = 1; t <= B; t++) {
      expect(T.sigma[t]).toBeLessThan(T.sigmaPred[t]);
    }
  });

  it('reaches the pinned Kalman steady state (σ constant from t=10 on)', () => {
    // steady-state posterior std for q=36, r=64: P solves P = (1−K)(P+q)
    for (let t = 10; t <= B; t++) {
      expect(T.sigma[t]).toBeCloseTo(5.767497, 5);
    }
    // the per-tick snap: σ_pred 8.32 → σ_post 5.77
    expect(T.sigmaPred[30]).toBeCloseTo(8.322501, 5);
  });

  it('tracks the true state: pinned mean at the boundary', () => {
    expect(T.mu[30]).toBeCloseTo(1.739333, 5);
    // within ~1σ of steady-state tracking error of the truth (pinned run: 5.94)
    expect(Math.abs(T.mu[30] - traj[30])).toBeLessThan(3 * 5.767497);
  });
});

describe('runBelief — dream phase (the prior alone)', () => {
  const T = runBelief({ traj, obs, boundary: B, trained: true });
  const U = runBelief({ traj, obs, boundary: B, trained: false });

  it('band can only grow once observations stop (both priors)', () => {
    for (let t = B + 1; t <= DEFAULTS.steps; t++) {
      expect(T.sigma[t]).toBeGreaterThan(T.sigma[t - 1]);
      expect(U.sigma[t]).toBeGreaterThan(U.sigma[t - 1]);
    }
  });

  it('prediction-only: no correction, so pred == post in the dream', () => {
    for (let t = B + 1; t <= DEFAULTS.steps; t++) {
      expect(T.mu[t]).toBe(T.muPred[t]);
      expect(T.sigma[t]).toBe(T.sigmaPred[t]);
    }
  });

  it('KL-trained prior degrades gracefully — pinned band and mean at horizon', () => {
    expect(T.sigma[60]).toBeCloseTo(38.996205, 5);
    expect(T.mu[60]).toBeCloseTo(10.452871, 5);
  });

  it('untrained prior explodes — pinned band and runaway mean at horizon', () => {
    expect(U.sigma[60]).toBeCloseTo(7848.721463, 3);
    expect(U.mu[60]).toBeCloseTo(74.018206, 5);
    // the point of the toggle: ~200× wider band than the trained prior
    expect(U.sigma[60] / T.sigma[60]).toBeGreaterThan(20);
  });

  it('untrained explosion is immediate: band already blown up a few steps in', () => {
    // 5 dream steps after the boundary the untrained band dwarfs the trained one
    expect(U.sigma[B + 5]).toBeGreaterThan(3 * T.sigma[B + 5]);
  });
});

describe('runBelief — boundary extremes (slider ends)', () => {
  it('boundary=1: almost the whole horizon is dream; untrained band is astronomical', () => {
    const E1 = runBelief({ traj, obs, boundary: 1, trained: false });
    expect(E1.sigma[1]).toBeCloseTo(6.132174, 5); // one tick still snaps the band
    expect(E1.sigma[60]).toBeGreaterThan(1e5); // pinned run: ≈2.8e6
  });

  it('boundary=59: one dream step; trained band barely grows past steady state', () => {
    const E59 = runBelief({ traj, obs, boundary: 59, trained: true });
    expect(E59.sigma[60]).toBeCloseTo(8.362374, 5);
    expect(E59.sigma[59]).toBeCloseTo(5.767497, 5);
  });
});

describe('runBelief — resample semantics (dreamSeed)', () => {
  const T1 = runBelief({ traj, obs, boundary: B, trained: true, dreamSeed: 1 });
  const T2 = runBelief({ traj, obs, boundary: B, trained: true, dreamSeed: 2 });

  it('σ is independent of dreamSeed (variance growth is deterministic)', () => {
    for (let t = 0; t <= DEFAULTS.steps; t++) {
      expect(T2.sigma[t]).toBe(T1.sigma[t]);
    }
  });

  it('the observed segment of μ is identical; only the dreamed mean resamples', () => {
    for (let t = 0; t <= B; t++) expect(T2.mu[t]).toBe(T1.mu[t]);
    expect(T2.mu[60]).not.toBeCloseTo(T1.mu[60], 5);
    expect(T2.mu[60]).toBeCloseTo(19.936363, 5); // pinned alternate dream
  });

  it('identical args reproduce identical arrays (full determinism)', () => {
    const again = runBelief({ traj, obs, boundary: B, trained: true, dreamSeed: 1 });
    for (let t = 0; t <= DEFAULTS.steps; t++) {
      expect(again.mu[t]).toBe(T1.mu[t]);
      expect(again.sigma[t]).toBe(T1.sigma[t]);
    }
  });
});
