/**
 * bellman.js — pure Bellman-equation numeric core for the BellmanDeriveWidget.
 *
 * Models a generic finite MDP under a FIXED policy (or equivalently, a Markov
 * reward chain after the policy has been marginalized out):
 *
 *   S states indexed 0 … n-1
 *   P[s][s'] — n×n transition probability matrix (rows sum to 1)
 *   r[s]     — immediate reward in state s
 *   gamma    — discount factor ∈ [0, 1)
 *
 * The Bellman fixed-point equation for the value function is:
 *
 *   V(s) = r(s) + γ · Σ_{s'} P(s'|s) · V(s')      for all s
 *
 * In matrix form: V = r + γ P V  ⟹  V = (I − γP)^{-1} r
 *
 * This module provides three exports:
 *   bellmanBackup(V, P, r, gamma, s) — one-step backup for a SINGLE state s
 *   bellmanSweep(V, P, r, gamma)     — one synchronous backup over ALL states
 *   solveBellman(P, r, gamma, iters) — iterate to (near) fixed point
 *
 * No DOM dependencies — pure ES module, safe to import in Vitest.
 */

/**
 * One-step Bellman backup for a single state s.
 *
 * Computes:  V_new(s) = r(s) + γ · Σ_{s'} P[s][s'] · V[s']
 *
 * @param {number[]}   V     - current value array, length n
 * @param {number[][]} P     - n×n transition matrix
 * @param {number[]}   r     - reward array, length n
 * @param {number}     gamma - discount factor
 * @param {number}     s     - state index to back up
 * @returns {number}         - new value estimate for state s
 */
export function bellmanBackup(V, P, r, gamma, s) {
  var sum = 0;
  var row = P[s];
  for (var sp = 0; sp < row.length; sp++) {
    sum += row[sp] * V[sp];
  }
  return r[s] + gamma * sum;
}

/**
 * One synchronous Bellman sweep — backs up ALL states using the OLD V
 * (synchronous / Jacobi-style update, matching gridValueIteration.js).
 *
 * Returns a new V array and the max absolute change (maxDelta).
 *
 * @param {number[]}   V     - current value array, length n
 * @param {number[][]} P     - n×n transition matrix
 * @param {number[]}   r     - reward array, length n
 * @param {number}     gamma - discount factor
 * @returns {{ V: number[], maxDelta: number }}
 */
export function bellmanSweep(V, P, r, gamma) {
  var n = V.length;
  var nV = new Array(n);
  var maxDelta = 0;
  for (var s = 0; s < n; s++) {
    var newVal = bellmanBackup(V, P, r, gamma, s);
    nV[s] = newVal;
    var d = Math.abs(newVal - V[s]);
    if (d > maxDelta) maxDelta = d;
  }
  return { V: nV, maxDelta: maxDelta };
}

/**
 * Iterate Bellman sweeps until convergence or iters exhausted.
 *
 * Convergence threshold: maxDelta < 1e-9.
 *
 * @param {number[][]} P     - n×n transition matrix
 * @param {number[]}   r     - reward array, length n
 * @param {number}     gamma - discount factor
 * @param {number}     iters - maximum number of sweeps
 * @returns {{ V: number[], sweeps: number, maxDelta: number }}
 */
export function solveBellman(P, r, gamma, iters) {
  var n = r.length;
  var V = new Array(n).fill(0);
  var sweeps = 0;
  var maxDelta = Infinity;
  while (sweeps < iters && maxDelta > 1e-9) {
    var result = bellmanSweep(V, P, r, gamma);
    V = result.V;
    maxDelta = result.maxDelta;
    sweeps++;
  }
  return { V: V, sweeps: sweeps, maxDelta: maxDelta };
}
