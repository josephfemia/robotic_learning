import { describe, it, expect } from 'vitest';
import {
  START, MAX_STEPS, FREE_CELLS, makeRng, initQ, greedyA, chooseAction, qStep,
  valueOf, runEpisode,
} from './qlearn.js';
import { ROWS, COLS, WALLS, TERMINALS, isTerminal, bellmanSweep, initV } from './gridValueIteration.js';

// ── makeRng ───────────────────────────────────────────────────────────────────
describe('makeRng', () => {
  it('is deterministic: same seed → same sequence', () => {
    const a = makeRng(42), b = makeRng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('emits values in [0, 1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds diverge', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });
});

// ── grid wiring: constants come from gridValueIteration, not a copy ──────────
describe('grid wiring', () => {
  it('START is the bottom-left free cell of the pinned grid', () => {
    expect(START).toEqual([2, 0]);
    expect(WALLS[START[0] + ',' + START[1]]).toBeUndefined();
    expect(isTerminal(START[0], START[1])).toBe(false);
  });

  it('FREE_CELLS counts non-wall non-terminal cells of the pinned 3×4 grid (= 9)', () => {
    expect(FREE_CELLS).toBe(ROWS * COLS - Object.keys(WALLS).length - Object.keys(TERMINALS).length);
    expect(FREE_CELLS).toBe(9);
  });
});

// ── initQ ─────────────────────────────────────────────────────────────────────
describe('initQ', () => {
  it('gives every free cell four zero action-values', () => {
    const Q = initQ();
    expect(Q).toHaveLength(ROWS);
    expect(Q[2][0]).toEqual([0, 0, 0, 0]);
    expect(Q[0][0]).toEqual([0, 0, 0, 0]);
  });

  it('walls and terminals are null (never learned)', () => {
    const Q = initQ();
    expect(Q[1][1]).toBeNull();   // wall
    expect(Q[0][3]).toBeNull();   // +1 terminal
    expect(Q[1][3]).toBeNull();   // −1 terminal
  });
});

// ── greedyA ───────────────────────────────────────────────────────────────────
describe('greedyA', () => {
  it('breaks ties first-wins (all-zero → action 0 = up)', () => {
    const Q = initQ();
    expect(greedyA(Q, 2, 0)).toBe(0);
  });

  it('returns argmax over the four action values', () => {
    const Q = initQ();
    Q[2][0] = [-1, 0.2, 0.1, -0.5];
    expect(greedyA(Q, 2, 0)).toBe(1);
  });

  it('a tried (negative) action loses to an untried zero', () => {
    const Q = initQ();
    Q[2][0] = [-0.02, 0, 0, 0];
    expect(greedyA(Q, 2, 0)).toBe(1);
  });
});

// ── chooseAction ──────────────────────────────────────────────────────────────
describe('chooseAction', () => {
  it('ε=0 is fully greedy and consumes no randomness', () => {
    const Q = initQ();
    const boom = () => { throw new Error('rng consumed at ε=0'); };
    expect(chooseAction(Q, 2, 0, 0, boom)).toBe(0);
  });

  it('explores uniformly when rng() < ε', () => {
    const Q = initQ();
    Q[2][0] = [9, 0, 0, 0]; // greedy would say 0
    let calls = 0;
    const rng = () => (++calls === 1 ? 0.05 : 0.9); // explore; floor(0.9*4)=3
    expect(chooseAction(Q, 2, 0, 0.1, rng)).toBe(3);
  });

  it('exploits when rng() >= ε', () => {
    const Q = initQ();
    Q[2][0] = [0, 0, 0.7, 0];
    expect(chooseAction(Q, 2, 0, 0.1, () => 0.99)).toBe(2);
  });
});

// ── qStep — the one-line Q-learning update, hand-checked ─────────────────────
describe('qStep', () => {
  it('non-terminal move: target = stepR + γ·maxQ(s′); fresh grid → −0.04', () => {
    const Q = initQ();
    // (2,0) --right--> (2,1): target = −0.04 + 0.9·0 = −0.04; α=0.5 → Q=−0.02
    const res = qStep(Q, 2, 0, 1, 0.5, 0.9);
    expect(res).toEqual({ nr: 2, nc: 1, done: false });
    expect(Q[2][0][1]).toBeCloseTo(-0.02, 12);
  });

  it('into the +1 goal: target = −0.04 + γ·(+1) = 0.86', () => {
    const Q = initQ();
    const res = qStep(Q, 0, 2, 1, 1.0, 0.9); // (0,2) --right--> (0,3)
    expect(res.done).toBe(true);
    expect(Q[0][2][1]).toBeCloseTo(0.86, 12);
  });

  it('into the −1 pit: target = −0.04 + γ·(−1) = −0.94', () => {
    const Q = initQ();
    const res = qStep(Q, 1, 2, 1, 1.0, 0.9); // (1,2) --right--> (1,3)
    expect(res.done).toBe(true);
    expect(Q[1][2][1]).toBeCloseTo(-0.94, 12);
  });

  it('bumping the border stays in place and still costs a step', () => {
    const Q = initQ();
    const res = qStep(Q, 0, 0, 0, 0.5, 0.9); // up from top row
    expect(res).toEqual({ nr: 0, nc: 0, done: false });
    expect(Q[0][0][0]).toBeCloseTo(-0.02, 12);
  });

  it('bumping the wall at (1,1) stays in place', () => {
    const Q = initQ();
    const res = qStep(Q, 1, 0, 1, 0.5, 0.9); // right into the wall
    expect(res.nr).toBe(1);
    expect(res.nc).toBe(0);
    expect(res.done).toBe(false);
  });
});

// ── runEpisode ────────────────────────────────────────────────────────────────
describe('runEpisode', () => {
  it('starts at START, ends at a terminal when it terminates, respects MAX_STEPS', () => {
    const Q = initQ();
    const rng = makeRng(3);
    const ep = runEpisode(Q, { eps: 0.3, alpha: 0.5, gamma: 0.9, rng });
    expect(ep.path[0]).toEqual(START);
    expect(ep.steps).toBeLessThanOrEqual(MAX_STEPS);
    if (ep.terminated) {
      const last = ep.path[ep.path.length - 1];
      expect(isTerminal(last[0], last[1])).toBe(true);
    }
  });

  it('is deterministic under a fixed seed', () => {
    const runBatch = () => {
      const Q = initQ();
      const rng = makeRng(99);
      for (let i = 0; i < 50; i++) runEpisode(Q, { eps: 0.2, alpha: 0.5, gamma: 0.9, rng });
      return Q;
    };
    expect(JSON.stringify(runBatch())).toBe(JSON.stringify(runBatch()));
  });
});

// ── behavior: ε=0 locks onto one corridor ────────────────────────────────────
describe('ε=0 lock-in', () => {
  it('after enough greedy episodes the path repeats exactly (locked corridor to +1)', () => {
    const Q = initQ();
    const rng = makeRng(1); // never consumed at ε=0, but pass one anyway
    for (let i = 0; i < 100; i++) runEpisode(Q, { eps: 0, alpha: 0.5, gamma: 0.9, rng });
    const a = runEpisode(Q, { eps: 0, alpha: 0.5, gamma: 0.9, rng });
    const b = runEpisode(Q, { eps: 0, alpha: 0.5, gamma: 0.9, rng });
    expect(a.terminated).toBe(true);
    expect(JSON.stringify(a.path)).toBe(JSON.stringify(b.path));
    const last = a.path[a.path.length - 1];
    expect(TERMINALS[last[0] + ',' + last[1]]).toBe(1); // it found the goal, not the pit
  });
});

// ── convergence: with exploration, maxQ approaches the value-iteration V* ────
describe('convergence toward value iteration', () => {
  it('valueOf(Q) approaches V* on the corridor states', () => {
    // Ground truth from the L2 core: iterate Bellman sweeps to convergence.
    let V = initV(), gamma = 0.9;
    for (let i = 0; i < 500; i++) {
      const r = bellmanSweep(V, gamma);
      V = r.V;
      if (r.maxDelta < 1e-12) break;
    }
    const Q = initQ();
    const rng = makeRng(2026);
    for (let i = 0; i < 3000; i++) runEpisode(Q, { eps: 0.3, alpha: 0.2, gamma, rng });
    expect(Math.abs(valueOf(Q, 2, 0) - V[2][0])).toBeLessThan(0.12);
    expect(Math.abs(valueOf(Q, 0, 2) - V[0][2])).toBeLessThan(0.08);
    expect(Math.abs(valueOf(Q, 0, 0) - V[0][0])).toBeLessThan(0.12);
  });
});

// ── pinned regression: seeded episode batch ──────────────────────────────────
describe('pinned Q-values after a seeded batch (seed 123, ε=0.2, α=0.5, γ=0.9, 100 episodes)', () => {
  function batch() {
    const Q = initQ();
    const rng = makeRng(123);
    for (let i = 0; i < 100; i++) runEpisode(Q, { eps: 0.2, alpha: 0.5, gamma: 0.9, rng });
    return Q;
  }

  it('pins the start-state and goal-adjacent values', () => {
    const Q = batch();
    // PINNED_START / PINNED_GOAL_ADJ are filled from the first verified run.
    expect(valueOf(Q, 2, 0)).toBeCloseTo(PINNED_START, 8);
    expect(valueOf(Q, 0, 2)).toBeCloseTo(PINNED_GOAL_ADJ, 8);
  });
});

// Regression pins from the first verified implementation run (2026-07-03).
// Note: with α=0.5 the deterministic corridor has fully converged by episode 100,
// so the pinned start value equals the VI fixed point V*(2,0) = 0.426686 to fp precision.
const PINNED_START = 0.42668599999999979;
const PINNED_GOAL_ADJ = 0.85999999999999988;
