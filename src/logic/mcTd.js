/**
 * mcTd.js — pure numeric core for the Monte Carlo vs. TD widget (W: mctd, L4).
 *
 * Ported VERBATIM from the mctd IIFE in reference/robot-learning-companion.html
 * lines 2828–2871.
 *
 * Setup: a 5-state deterministic chain (states 0..4), always-right policy.
 * Terminal reward +1 entering past state N-1. True value of state i:
 *   trueV[i] = gamma^(N-1-i)
 *
 * MC update: use the actual return G = gamma^(N-1-i) (known, deterministic),
 *   V(i) += alpha * (G - V(i))
 *
 * TD(0) update: step through the chain bootstrapping off the next state,
 *   V(t) += alpha * (r + gamma * V(t+1) - V(t))
 *
 * No DOM dependencies — pure ES module.
 */

/** Number of states in the chain (original: N=5). */
export var N_STATES = 5;

/** Default discount (original: gamma=0.9). */
export var DEFAULT_GAMMA = 0.9;

/** Default learning rate (original: alpha=0.15). */
export var DEFAULT_ALPHA = 0.15;

/**
 * Compute the true value for each state in the always-right chain.
 * Original: for(var i=0;i<N;i++){trueV[i]=Math.pow(gamma,(N-1-i));}
 *
 * @param {number} gamma - discount factor
 * @param {number} N     - number of states
 * @returns {number[]} trueV — true value for state i = gamma^(N-1-i)
 */
export function trueValues(gamma, N) {
  var tv = [];
  for (var i = 0; i < N; i++) { tv[i] = Math.pow(gamma, (N - 1 - i)); }
  return tv;
}

/**
 * Run one episode of MC and TD updates on the 5-state chain.
 * Modifies Vmc and Vtd arrays in-place.
 *
 * Original episode():
 *   // MC: V(i) += alpha*(gamma^(N-1-i) - V(i))
 *   // TD: for t=0..N-1, r=(t===N-1?1:0), vnext=(t===N-1?0:Vtd[t+1])
 *
 * @param {number[]} Vmc   - MC value estimates (mutated in place)
 * @param {number[]} Vtd   - TD value estimates (mutated in place)
 * @param {number}   alpha - learning rate
 * @param {number}   gamma - discount factor
 * @param {number}   N     - number of states
 */
export function runEpisode(Vmc, Vtd, alpha, gamma, N) {
  // MC: exact return G = gamma^(N-1-i) for deterministic always-right chain
  for (var i = 0; i < N; i++) {
    var G = Math.pow(gamma, (N - 1 - i));
    Vmc[i] += alpha * (G - Vmc[i]);
  }
  // TD(0): step through, bootstrap off next state
  for (var t = 0; t < N; t++) {
    var r = (t === N - 1) ? 1 : 0;
    var vnext = (t === N - 1) ? 0 : Vtd[t + 1];
    var target = r + gamma * vnext;
    Vtd[t] += alpha * (target - Vtd[t]);
  }
}

/**
 * Initialize fresh value arrays (all zeros) and episode count.
 *
 * Original reset():
 *   Vmc=[];Vtd=[];for(var i=0;i<N;i++){Vmc[i]=0;Vtd[i]=0;}nEp=0;
 *
 * @param {number} N - number of states
 * @returns {{ Vmc: number[], Vtd: number[], nEp: number }}
 */
export function initState(N) {
  var Vmc = [], Vtd = [];
  for (var i = 0; i < N; i++) { Vmc[i] = 0; Vtd[i] = 0; }
  return { Vmc: Vmc, Vtd: Vtd, nEp: 0 };
}

/**
 * Compute total absolute error for MC and TD estimates vs. true values.
 * Original:
 *   var emc=0,etd=0;for(var i=0;i<N;i++){emc+=Math.abs(Vmc[i]-trueV[i]);etd+=Math.abs(Vtd[i]-trueV[i]);}
 *
 * @param {number[]} Vmc   - MC estimates
 * @param {number[]} Vtd   - TD estimates
 * @param {number[]} trueV - ground truth
 * @returns {{ emc: number, etd: number }}
 */
export function totalError(Vmc, Vtd, trueV) {
  var emc = 0, etd = 0;
  for (var i = 0; i < trueV.length; i++) {
    emc += Math.abs(Vmc[i] - trueV[i]);
    etd += Math.abs(Vtd[i] - trueV[i]);
  }
  return { emc: emc, etd: etd };
}
