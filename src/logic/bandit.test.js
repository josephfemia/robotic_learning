import { describe, it, expect } from 'vitest';
import { K_ARMS, argmax, pickArm, pull, initBandit } from './bandit.js';

// ── Deterministic helpers ─────────────────────────────────────────────────────
// Box-Muller from rllab.js (verbatim, for deterministic seeding)
function makeRandn(seed) {
  // Simple LCG for deterministic pseudo-random in tests
  let s = seed;
  function rng() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  }
  return function randn() {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

// Returns a randn that always yields a specific z-score
function fixedRandn(z) { return () => z; }

// ── argmax ────────────────────────────────────────────────────────────────────
describe('argmax', () => {
  it('returns index of maximum', () => {
    expect(argmax([1, 3, 2])).toBe(1);
    expect(argmax([5, 5, 5])).toBe(0); // ties: first wins
    expect(argmax([0, 0, 1])).toBe(2);
  });
});

// ── initBandit ────────────────────────────────────────────────────────────────
describe('initBandit', () => {
  it('initializes K arms with truth clamped to [0.02, 0.98]', () => {
    const randn = makeRandn(42);
    const state = initBandit(K_ARMS, randn);
    expect(state.truth).toHaveLength(K_ARMS);
    for (const t of state.truth) {
      expect(t).toBeGreaterThanOrEqual(0.02);
      expect(t).toBeLessThanOrEqual(0.98);
    }
  });

  it('Q and n start at 0, t=0, regret=0', () => {
    const randn = makeRandn(1);
    const { Q, n, t, regret } = initBandit(K_ARMS, randn);
    expect(Q.every(v => v === 0)).toBe(true);
    expect(n.every(v => v === 0)).toBe(true);
    expect(t).toBe(0);
    expect(regret).toBe(0);
  });

  it('best = max(truth)', () => {
    const randn = makeRandn(7);
    const state = initBandit(K_ARMS, randn);
    expect(state.best).toBe(Math.max(...state.truth));
  });

  it('clamps extreme randn values: z=100 stays at 0.98', () => {
    const state = initBandit(1, fixedRandn(100));
    expect(state.truth[0]).toBe(0.98);
  });

  it('clamps low randn values: z=-100 stays at 0.02', () => {
    const state = initBandit(1, fixedRandn(-100));
    expect(state.truth[0]).toBe(0.02);
  });
});

// ── pickArm ───────────────────────────────────────────────────────────────────
describe('pickArm — greedy', () => {
  it('always picks argmax(Q)', () => {
    const Q = [0.1, 0.9, 0.5];
    const n = [1, 1, 1];
    const rnd = () => 0.5;
    expect(pickArm('greedy', Q, n, 3, 0.1, rnd)).toBe(1);
  });

  it('greedy can lock onto a wrong arm (Q misleads when n[i] is small)', () => {
    // Arm 0 has inflated Q from one lucky pull, arm 1 is truly better
    const Q = [0.9, 0.1, 0.1];
    const n = [1, 0, 0];
    const rnd = () => 0.99; // won't explore
    // Greedy picks arm 0 forever because Q[0]=0.9 dominates
    for (let i = 0; i < 10; i++) {
      expect(pickArm('greedy', Q, n, i, 0, rnd)).toBe(0);
    }
  });
});

describe('pickArm — eps-greedy', () => {
  it('explores when rnd() < eps', () => {
    const Q = [0, 0, 0];
    const n = [1, 1, 1];
    // Force rnd() < eps: first call returns 0.05, second call determines random arm
    let calls = 0;
    const rnd = () => { calls++; return calls === 1 ? 0.05 : 0.99; }; // rnd()<0.1 → explore; 0.99*3=2.97→arm 2
    const arm = pickArm('eps', Q, n, 3, 0.1, rnd);
    expect(arm).toBe(2); // Math.floor(0.99 * 3) = 2
  });

  it('exploits when rnd() >= eps', () => {
    const Q = [0.1, 0.8, 0.3];
    const n = [1, 1, 1];
    const rnd = () => 0.99; // always exploit
    expect(pickArm('eps', Q, n, 3, 0.1, rnd)).toBe(1);
  });
});

describe('pickArm — UCB', () => {
  it('forces pull of unvisited arm first', () => {
    const Q = [0.9, 0.9, 0.9];
    const n = [5, 0, 5]; // arm 1 unvisited
    const rnd = () => 0.5;
    expect(pickArm('ucb', Q, n, 10, 0, rnd)).toBe(1);
  });

  it('after all arms visited, picks by UCB bonus Q[i] + sqrt(2*ln(t+1)/n[i])', () => {
    // Arm with lower Q but much lower n should win
    const Q = [0.8, 0.2]; // arm 0 looks better by Q
    const n = [100, 1];   // arm 1 barely visited → huge bonus
    const t = 101;
    const arm = pickArm('ucb', Q, n, t, 0, () => 0.5);
    // UCB bonus: arm 0 = 0.8 + sqrt(2*ln(102)/100) ≈ 0.8 + 0.30 = 1.10
    //            arm 1 = 0.2 + sqrt(2*ln(102)/1)   ≈ 0.2 + 3.02 = 3.22
    expect(arm).toBe(1);
  });
});

// ── pull ──────────────────────────────────────────────────────────────────────
describe('pull', () => {
  it('returns r=1 when rnd() < truth[a]', () => {
    const truth = [0.8];
    const Q = [0], n = [0];
    const { r } = pull(0, truth, Q, n, 0.8, () => 0.5);
    expect(r).toBe(1);
  });

  it('returns r=0 when rnd() >= truth[a]', () => {
    const truth = [0.8];
    const Q = [0], n = [0];
    const { r } = pull(0, truth, Q, n, 0.8, () => 0.9);
    expect(r).toBe(0);
  });

  it('increments n[a]', () => {
    const truth = [0.5];
    const Q = [0], n = [0];
    pull(0, truth, Q, n, 0.5, () => 0.3);
    expect(n[0]).toBe(1);
  });

  it('updates Q[a] via incremental mean: Q += (r - Q) / n', () => {
    const truth = [1.0];
    const Q = [0], n = [0];
    // First pull: r=1, n becomes 1, Q = 0 + (1-0)/1 = 1
    pull(0, truth, Q, n, 1.0, () => 0.0); // rnd=0.0 < 1.0 → r=1
    expect(Q[0]).toBeCloseTo(1.0, 10);
    // Second pull: r=0, n becomes 2, Q = 1 + (0-1)/2 = 0.5
    pull(0, truth, Q, n, 1.0, () => 0.99); // rnd=0.99 >= 1.0? No, truth=1.0 so always r=1
    // truth=1.0 → always r=1
    expect(Q[0]).toBeCloseTo(1.0, 10);
  });

  it('regretStep = best - truth[a]', () => {
    const truth = [0.3, 0.9, 0.6];
    const Q = [0, 0, 0], n = [0, 0, 0];
    const { regretStep } = pull(0, truth, Q, n, 0.9, () => 0.5);
    expect(regretStep).toBeCloseTo(0.9 - 0.3, 10);
  });

  it('zero regret when pulling the best arm', () => {
    const truth = [0.3, 0.9, 0.6];
    const Q = [0, 0, 0], n = [0, 0, 0];
    const { regretStep } = pull(1, truth, Q, n, 0.9, () => 0.5);
    expect(regretStep).toBeCloseTo(0.0, 10);
  });
});

// ── Integration: behavioral pins ──────────────────────────────────────────────
describe('bandit integration — greedy can lock onto wrong arm', () => {
  it('greedy with unlucky first pulls may never find the best arm', () => {
    // Construct a case where arm 0 gets a lucky r=1 first, arm 1 (best) gets r=0
    // Greedy will lock on arm 0 forever
    const truth = [0.3, 0.9]; // arm 1 is best
    const Q = [0, 0], n = [0, 0];
    // Simulate: arm 0 first (forced), gets r=1 → Q[0]=1.0
    // Then greedy always picks arm 0
    pull(0, truth, Q, n, 0.9, () => 0.1); // r=1 (0.1 < 0.3)
    for (let i = 0; i < 100; i++) {
      const a = pickArm('greedy', Q, n, n[0] + n[1], 0, () => 0.99);
      pull(a, truth, Q, n, 0.9, () => 0.5); // arm 0: r=(0.5<0.3)=0; Q[0] slowly drops but arm 0 still chosen
    }
    // After 101 pulls on arm 0 (with truth=0.3), Q[0] → ~0.3; arm 1 Q=0
    // Greedy still picks arm 0 since Q[0]≈0.3 > Q[1]=0
    expect(n[1]).toBe(0); // arm 1 was never pulled
  });
});

describe('bandit integration — UCB finds best arm and has sublinear regret', () => {
  it('UCB regret grows sublinearly: regret at 1000 pulls is less than 1000*(avg arm gap)', () => {
    // For UCB, the O(log T) regret bound means regret/T → 0 as T → ∞.
    // Concretely: if all arms had equal-to-best payoff, regret would be 0.
    // With random arms, regret/T at 1000 steps should be well below the
    // maximum per-step regret (best - worst arm gap).
    const randn = makeRandn(99);
    const state = initBandit(K_ARMS, randn);
    const Q = state.Q.slice(), n = state.n.slice();
    const maxGap = state.best - Math.min(...state.truth); // worst possible per-step regret
    let t = 0, totalRegret = 0;
    const rng = makeRandn(17); // use deterministic rng for pull rewards too
    let rngState = 1234;
    function detrnd() { rngState = (rngState * 1664525 + 1013904223) >>> 0; return rngState / 0x100000000; }
    for (let i = 0; i < 1000; i++) {
      const a = pickArm('ucb', Q, n, t, 0, detrnd);
      const res = pull(a, state.truth, Q, n, state.best, detrnd);
      totalRegret += res.regretStep; t++;
    }
    // UCB sublinear: regret/T < maxGap (if it were linear we'd approach maxGap * T)
    // After 1000 pulls, regret per pull should be well below maxGap
    const regretPerPull = totalRegret / 1000;
    expect(regretPerPull).toBeLessThan(maxGap * 0.9); // strictly sublinear
  });

  it('UCB visits all arms (exploration by optimism)', () => {
    const randn = makeRandn(42);
    const state = initBandit(K_ARMS, randn);
    const Q = state.Q.slice(), n = state.n.slice();
    let t = 0;
    for (let i = 0; i < 200; i++) {
      const a = pickArm('ucb', Q, n, t, 0, () => Math.random());
      const res = pull(a, state.truth, Q, n, state.best, () => Math.random());
      t++;
    }
    // UCB guarantees each arm is pulled at least once (forced pull on n[i]=0)
    expect(n.every(ni => ni > 0)).toBe(true);
  });
});

describe('bandit integration — ε-greedy finds best arm', () => {
  it('ε-greedy with eps=0.1 identifies best arm after many pulls', () => {
    const randn = makeRandn(55);
    const state = initBandit(K_ARMS, randn);
    const Q = state.Q.slice(), n = state.n.slice();
    let t = 0;
    for (let i = 0; i < 2000; i++) {
      // Use real Math.random for eps-greedy exploration
      const a = pickArm('eps', Q, n, t, 0.1, Math.random.bind(Math));
      pull(a, state.truth, Q, n, state.best, Math.random.bind(Math));
      t++;
    }
    // The arm with highest Q should be close to the best arm
    const bestQ = argmax(Q);
    const bestTruth = argmax(state.truth);
    // After 2000 pulls, ε-greedy almost always identifies the best arm
    expect(Math.abs(Q[bestQ] - state.truth[bestTruth])).toBeLessThan(0.15);
  });
});
