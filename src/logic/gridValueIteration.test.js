import { describe, it, expect } from 'vitest';
import {
  ROWS, COLS, WALLS, TERMINALS, STEP_R, ACT,
  isTerminal, inBounds, nextCell, initV, bellmanSweep, bestAction,
} from './gridValueIteration.js';

/**
 * Reference IIFE: reference/robot-learning-companion.html lines 2432–2466.
 * Grid: 3×4, wall (1,1), terminals (0,3)=+1, (1,3)=−1, stepR=−0.04, gamma=0.9.
 */

describe('constants', () => {
  it('ROWS=3, COLS=4', () => {
    expect(ROWS).toBe(3);
    expect(COLS).toBe(4);
  });

  it('wall at (1,1)', () => {
    expect(WALLS['1,1']).toBe(1);
    expect(Object.keys(WALLS).length).toBe(1);
  });

  it('terminal +1 at (0,3), -1 at (1,3)', () => {
    expect(TERMINALS['0,3']).toBe(1);
    expect(TERMINALS['1,3']).toBe(-1);
    expect(Object.keys(TERMINALS).length).toBe(2);
  });

  it('STEP_R = -0.04', () => {
    expect(STEP_R).toBeCloseTo(-0.04, 10);
  });

  it('4 actions: up right down left', () => {
    expect(ACT.length).toBe(4);
    // up, right, down, left
    expect(ACT[0]).toEqual([-1, 0]);
    expect(ACT[1]).toEqual([0, 1]);
    expect(ACT[2]).toEqual([1, 0]);
    expect(ACT[3]).toEqual([0, -1]);
  });
});

describe('isTerminal', () => {
  it('(0,3) is terminal', () => expect(isTerminal(0, 3)).toBe(true));
  it('(1,3) is terminal', () => expect(isTerminal(1, 3)).toBe(true));
  it('(0,0) is not terminal', () => expect(isTerminal(0, 0)).toBe(false));
  it('(1,1) wall is not terminal', () => expect(isTerminal(1, 1)).toBe(false));
});

describe('inBounds', () => {
  it('(0,0) is in bounds', () => expect(inBounds(0, 0)).toBe(true));
  it('(2,3) is in bounds', () => expect(inBounds(2, 3)).toBe(true));
  it('(-1,0) is out of bounds', () => expect(inBounds(-1, 0)).toBe(false));
  it('(3,0) is out of bounds', () => expect(inBounds(3, 0)).toBe(false));
  it('(0,4) is out of bounds', () => expect(inBounds(0, 4)).toBe(false));
  it('(1,1) wall is not in bounds', () => expect(inBounds(1, 1)).toBe(false));
});

describe('nextCell', () => {
  it('moving right from (0,0) goes to (0,1)', () => {
    expect(nextCell(0, 0, [0, 1])).toEqual([0, 1]);
  });
  it('moving left from (0,0) hits border, stays at (0,0)', () => {
    expect(nextCell(0, 0, [0, -1])).toEqual([0, 0]);
  });
  it('moving into wall (1,1) from (1,0) stays at (1,0)', () => {
    // from (1,0), action right [0,1] → (1,1) is wall → stay
    expect(nextCell(1, 0, [0, 1])).toEqual([1, 0]);
  });
  it('moving up from (1,0) goes to (0,0)', () => {
    expect(nextCell(1, 0, [-1, 0])).toEqual([0, 0]);
  });
});

describe('initV', () => {
  const V = initV();

  it('has ROWS rows', () => expect(V.length).toBe(ROWS));
  it('each row has COLS columns', () => V.forEach(row => expect(row.length).toBe(COLS)));

  it('terminal (0,3) initialized to +1', () => expect(V[0][3]).toBe(1));
  it('terminal (1,3) initialized to -1', () => expect(V[1][3]).toBe(-1));
  it('wall (1,1) initialized to null', () => expect(V[1][1]).toBeNull());
  it('non-terminal (0,0) initialized to 0', () => expect(V[0][0]).toBe(0));
  it('non-terminal (2,0) initialized to 0', () => expect(V[2][0]).toBe(0));
});

describe('bellmanSweep — after sweep 1 with gamma=0.9', () => {
  // After 1 sweep from all-zeros (terminals pinned at ±1):
  // Each free cell takes: max over actions of (STEP_R + gamma * neighbor_V)
  // Neighbor values are all 0 except terminals.
  // (0,2): can go right to (0,3)=+1 → STEP_R + 0.9*1 = -0.04 + 0.9 = 0.86
  // (1,2): can go right to (1,3)=-1 → STEP_R + 0.9*(-1) = -0.04 - 0.9 = -0.94
  //         or go up to (0,2)=0 → -0.04; best = -0.04
  // (0,0): all neighbors are 0 or stay 0 → best = -0.04 + 0.9*0 = -0.04

  let V0, result1;
  V0 = initV();
  result1 = bellmanSweep(V0, 0.9);

  it('cell (0,3) stays pinned at +1 (terminal)', () => {
    expect(result1.V[0][3]).toBe(1);
  });

  it('cell (1,3) stays pinned at -1 (terminal)', () => {
    expect(result1.V[1][3]).toBe(-1);
  });

  it('cell (1,1) stays null (wall)', () => {
    expect(result1.V[1][1]).toBeNull();
  });

  it('cell (0,2) = 0.86 after sweep 1: adjacent to +1 goal', () => {
    // best action is right → (0,3) with V=+1: STEP_R + 0.9*1 = 0.86
    expect(result1.V[0][2]).toBeCloseTo(0.86, 8);
  });

  it('cell (0,0) = -0.04 after sweep 1: all reachable neighbors are 0', () => {
    // From (0,0): up hits border (stays), left hits border (stays), down (1,0)=0, right (0,1)=0
    // all → STEP_R + 0.9*0 = -0.04
    expect(result1.V[0][0]).toBeCloseTo(-0.04, 8);
  });

  it('maxDelta > 0 after first sweep (values changed)', () => {
    expect(result1.maxDelta).toBeGreaterThan(0);
  });
});

describe('bellmanSweep — convergence behavior', () => {
  it('maxDelta approaches 0 after many sweeps (gamma=0.9)', () => {
    let V = initV();
    for (let i = 0; i < 100; i++) {
      const result = bellmanSweep(V, 0.9);
      V = result.V;
    }
    const final = bellmanSweep(V, 0.9);
    expect(final.maxDelta).toBeLessThan(1e-4);
  });

  it('terminals stay pinned throughout convergence', () => {
    let V = initV();
    for (let i = 0; i < 50; i++) {
      const result = bellmanSweep(V, 0.9);
      V = result.V;
      expect(V[0][3]).toBe(1);
      expect(V[1][3]).toBe(-1);
    }
  });

  it('(0,2) value is positive after several sweeps (near +1 goal)', () => {
    let V = initV();
    for (let i = 0; i < 5; i++) {
      ({ V } = bellmanSweep(V, 0.9));
    }
    expect(V[0][2]).toBeGreaterThan(0.5);
  });
});

describe('bestAction — greedy policy', () => {
  it('returns null for wall (1,1)', () => {
    const V = initV();
    expect(bestAction(V, 1, 1, 0.9)).toBeNull();
  });

  it('returns null for terminal (0,3)', () => {
    const V = initV();
    expect(bestAction(V, 0, 3, 0.9)).toBeNull();
  });

  it('(0,2) greedy action is right [0,1] after sweep 1: goes toward goal', () => {
    let V = initV();
    ({ V } = bellmanSweep(V, 0.9));
    const act = bestAction(V, 0, 2, 0.9);
    // (0,2) right → (0,3)=+1, which is best
    expect(act).toEqual([0, 1]);
  });

  it('greedy action at (0,1) points right toward goal after several sweeps', () => {
    // After enough sweeps the goal's value bleeds outward
    let V = initV();
    for (let i = 0; i < 10; i++) {
      ({ V } = bellmanSweep(V, 0.9));
    }
    const act = bestAction(V, 0, 1, 0.9);
    // Should point right [0,1] toward (0,2) → (0,3)
    expect(act).toEqual([0, 1]);
  });

  it('raising gamma extends goal influence: (2,0) greedy action is not left/down after many sweeps', () => {
    // With high gamma, the positive goal value propagates farther
    let V = initV();
    for (let i = 0; i < 50; i++) {
      ({ V } = bellmanSweep(V, 0.99));
    }
    // (2,0) should move toward goal, not away
    const act = bestAction(V, 2, 0, 0.99);
    expect(act).not.toBeNull();
    // Should be moving right or up, not left [0,-1] or down [1,0] from (2,0) corner
    expect(act).not.toEqual([1, 0]);   // down is out of bounds from (2,x)
    expect(act).not.toEqual([0, -1]);  // left is out of bounds from (x,0)
  });
});
