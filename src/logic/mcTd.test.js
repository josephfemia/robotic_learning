import { describe, it, expect } from 'vitest';
import {
  N_STATES, DEFAULT_GAMMA, DEFAULT_ALPHA,
  trueValues, runEpisode, initState, totalError,
} from './mcTd.js';

// Original defaults from the IIFE
const N = N_STATES;       // 5
const GAMMA = DEFAULT_GAMMA;  // 0.9
const ALPHA = DEFAULT_ALPHA;  // 0.15

describe('trueValues', () => {
  it('has N entries', () => {
    expect(trueValues(GAMMA, N)).toHaveLength(N);
  });

  it('trueV[i] = gamma^(N-1-i)', () => {
    const tv = trueValues(GAMMA, N);
    for (let i = 0; i < N; i++) {
      expect(tv[i]).toBeCloseTo(Math.pow(GAMMA, N - 1 - i), 10);
    }
  });

  it('state 0 (farthest from terminal) has lowest value', () => {
    const tv = trueValues(GAMMA, N);
    expect(tv[0]).toBeLessThan(tv[N - 1]);
  });

  it('state N-1 (one step from terminal) has value = 1.0', () => {
    const tv = trueValues(GAMMA, N);
    expect(tv[N - 1]).toBeCloseTo(1.0, 10);
  });

  it('values decrease monotonically from right to left', () => {
    const tv = trueValues(GAMMA, N);
    for (let i = 1; i < N; i++) {
      expect(tv[i]).toBeGreaterThan(tv[i - 1]);
    }
  });
});

describe('initState', () => {
  it('returns all-zero Vmc and Vtd', () => {
    const { Vmc, Vtd, nEp } = initState(N);
    expect(Vmc).toHaveLength(N);
    expect(Vtd).toHaveLength(N);
    expect(Vmc.every(v => v === 0)).toBe(true);
    expect(Vtd.every(v => v === 0)).toBe(true);
    expect(nEp).toBe(0);
  });
});

describe('runEpisode — MC is unbiased (converges to trueV)', () => {
  it('MC converges toward true values after many episodes', () => {
    const { Vmc, Vtd } = initState(N);
    const tv = trueValues(GAMMA, N);
    // Run many episodes — MC should approach true values
    for (let e = 0; e < 500; e++) runEpisode(Vmc, Vtd, ALPHA, GAMMA, N);
    for (let i = 0; i < N; i++) {
      expect(Math.abs(Vmc[i] - tv[i])).toBeLessThan(0.01);
    }
  });

  it('MC update formula: V(i) += alpha*(G - V(i)) with G = gamma^(N-1-i)', () => {
    // One episode from zero: Vmc[i] = 0 + alpha * (G - 0) = alpha * G
    const { Vmc, Vtd } = initState(N);
    runEpisode(Vmc, Vtd, ALPHA, GAMMA, N);
    for (let i = 0; i < N; i++) {
      const G = Math.pow(GAMMA, N - 1 - i);
      expect(Vmc[i]).toBeCloseTo(ALPHA * G, 10);
    }
  });
});

describe('runEpisode — TD(0) converges toward true values', () => {
  it('TD converges toward true values after many episodes', () => {
    const { Vmc, Vtd } = initState(N);
    const tv = trueValues(GAMMA, N);
    for (let e = 0; e < 500; e++) runEpisode(Vmc, Vtd, ALPHA, GAMMA, N);
    for (let i = 0; i < N; i++) {
      expect(Math.abs(Vtd[i] - tv[i])).toBeLessThan(0.05);
    }
  });

  it('TD is biased early: after 1 episode, Vtd[0] leans on bootstrapped zeros', () => {
    // After 1 episode from all-zero init:
    // TD sweeps left-to-right. At t=0: r=0, vnext=Vtd[1] (still 0), target=0 → no change
    // All t except N-1 have r=0, vnext=0 → no movement except last state
    // At t=N-1: r=1, vnext=0, target=1 → Vtd[N-1] = alpha*1
    // Vtd[N-2]: r=0, vnext=Vtd[N-1]=alpha (already updated above), target=gamma*alpha
    //          → Vtd[N-2] = alpha*gamma*alpha (small)
    // Key point: Vtd[0] stays at 0 or near 0 after just 1 episode (biased low)
    const { Vmc, Vtd } = initState(N);
    const tv = trueValues(GAMMA, N);
    runEpisode(Vmc, Vtd, ALPHA, GAMMA, N);
    // MC[0] = alpha * gamma^(N-1) > 0 already (unbiased estimate)
    // TD[0] is still 0 (hasn't bootstrapped through the chain yet — biased)
    expect(Vmc[0]).toBeGreaterThan(0);
    expect(Vtd[0]).toBeCloseTo(0, 10); // biased: zero after first episode
  });
});

describe('runEpisode — MC vs TD behavioral contrast', () => {
  it('MC is unbiased: converges to same limit as trueValues', () => {
    const { Vmc, Vtd } = initState(N);
    const tv = trueValues(GAMMA, N);
    for (let e = 0; e < 1000; e++) runEpisode(Vmc, Vtd, ALPHA, GAMMA, N);
    const { emc } = totalError(Vmc, Vtd, tv);
    expect(emc).toBeLessThan(0.001);
  });

  it('MC has higher variance per step than TD early on (jumpy vs smooth)', () => {
    // Each MC update injects the full G = gamma^(N-1-i) from scratch,
    // while TD only moves alpha*(r + gamma*Vnext - V(t)) one step.
    // After one episode, MC[i] = alpha*G[i] jumps proportional to G.
    // TD[N-1] = alpha*1 and lower states barely move.
    // We measure total movement: MC should show more spread.
    const { Vmc: Vmc1, Vtd: Vtd1 } = initState(N);
    runEpisode(Vmc1, Vtd1, ALPHA, GAMMA, N);
    const mcTotal = Vmc1.reduce((s, v) => s + v, 0);
    const tdTotal = Vtd1.reduce((s, v) => s + v, 0);
    // MC updates all states immediately; TD only starts from the terminal
    // so TD total should be lower early
    expect(mcTotal).toBeGreaterThan(tdTotal);
  });
});

describe('totalError', () => {
  it('returns 0 error when estimates equal true values', () => {
    const tv = trueValues(GAMMA, N);
    const { emc, etd } = totalError(tv.slice(), tv.slice(), tv);
    expect(emc).toBeCloseTo(0, 10);
    expect(etd).toBeCloseTo(0, 10);
  });

  it('returns correct sum of absolute errors', () => {
    const tv = [1, 2, 3, 4, 5];
    const Vmc = [0, 0, 0, 0, 0];
    const Vtd = [1, 1, 1, 1, 1];
    const { emc, etd } = totalError(Vmc, Vtd, tv);
    expect(emc).toBeCloseTo(1 + 2 + 3 + 4 + 5, 10); // 15
    expect(etd).toBeCloseTo(0 + 1 + 2 + 3 + 4, 10); // 10
  });

  it('MC error decreases over many episodes', () => {
    const { Vmc, Vtd } = initState(N);
    const tv = trueValues(GAMMA, N);
    runEpisode(Vmc, Vtd, ALPHA, GAMMA, N);
    const { emc: e1 } = totalError(Vmc, Vtd, tv);
    for (let ep = 0; ep < 199; ep++) runEpisode(Vmc, Vtd, ALPHA, GAMMA, N);
    const { emc: e200 } = totalError(Vmc, Vtd, tv);
    expect(e200).toBeLessThan(e1);
  });
});
