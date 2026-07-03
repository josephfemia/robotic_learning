/**
 * qlearn.js — pure numeric core for the Q-learning gridworld widget (G5, L4 §4.3).
 *
 * Tabular Q-learning with ε-greedy exploration over the SAME pinned gridworld
 * as the L2 value-iteration widget: all grid constants (ROWS, COLS, WALLS,
 * TERMINALS, STEP_R, ACT) are imported from logic/gridValueIteration.js — the
 * grid is deliberately NOT redefined here, so the two widgets can never drift.
 *
 * Reward convention matches the L2 widget exactly, so Q* here converges to the
 * V* that value iteration computes:
 *   target = STEP_R + γ · ( s′ terminal ? TERMINALS[s′] : max_a′ Q(s′, a′) )
 * Terminals are absorbing with pinned value ±1 and are never themselves updated.
 * Bumping a wall/border keeps the agent in place and still costs a step.
 *
 * Tie-breaking in the greedy argmax is first-wins (same as bandit.js argmax),
 * which makes ε=0 runs fully deterministic — no randomness is consumed at ε=0.
 *
 * Seeded RNG (LCG) is provided so widget runs and vitest pins are reproducible.
 *
 * No DOM dependencies — pure ES module.
 */

import { ACT, STEP_R, ROWS, COLS, WALLS, TERMINALS, isTerminal, nextCell } from './gridValueIteration.js';

/** Episode start cell: bottom-left, the classic Russell–Norvig start. */
export var START = [2, 0];

/** Safety cap on episode length (greedy loops can otherwise cycle a while). */
export var MAX_STEPS = 100;

/** Number of learnable (non-wall, non-terminal) cells — the coverage denominator. */
export var FREE_CELLS = ROWS * COLS - Object.keys(WALLS).length - Object.keys(TERMINALS).length;

/**
 * Seeded LCG returning uniforms in [0, 1). Numerical Recipes constants —
 * the same generator the logic-core tests use elsewhere in this repo.
 *
 * @param {number} seed
 * @returns {function(): number}
 */
export function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Build the initial Q-table: ROWS×COLS, each free cell → [0,0,0,0]
 * (one entry per action in ACT order: up, right, down, left).
 * Walls and terminals → null (never learned; terminals are pinned at ±1).
 *
 * @returns {Array<Array<number[]|null>>}
 */
export function initQ() {
  var Q = [];
  for (var r = 0; r < ROWS; r++) {
    Q[r] = [];
    for (var c = 0; c < COLS; c++) {
      var k = r + ',' + c;
      Q[r][c] = (WALLS[k] || TERMINALS[k] !== undefined) ? null : [0, 0, 0, 0];
    }
  }
  return Q;
}

/**
 * Greedy action index at (r,c): argmax over the four action values,
 * ties broken first-wins (deterministic).
 *
 * @param {Array<Array<number[]|null>>} Q
 * @param {number} r
 * @param {number} c
 * @returns {number} action index into ACT
 */
export function greedyA(Q, r, c) {
  var q = Q[r][c], bi = 0, bv = -1e9;
  for (var i = 0; i < q.length; i++) { if (q[i] > bv) { bv = q[i]; bi = i; } }
  return bi;
}

/**
 * ε-greedy action choice. With probability ε pick uniformly at random,
 * else greedy. At ε=0 no randomness is consumed (fully deterministic).
 *
 * @param {Array<Array<number[]|null>>} Q
 * @param {number} r
 * @param {number} c
 * @param {number} eps - exploration rate in [0,1]
 * @param {function(): number} rng - uniform [0,1) generator
 * @returns {number} action index
 */
export function chooseAction(Q, r, c, eps, rng) {
  if (eps > 0 && rng() < eps) return Math.floor(rng() * ACT.length);
  return greedyA(Q, r, c);
}

/**
 * One Q-learning update from (r,c) taking action index a:
 *   Q(s,a) += α · [ STEP_R + γ·(terminal ? ±1 : max_a′ Q(s′,a′)) − Q(s,a) ]
 * Mutates Q. Returns where the agent landed and whether the episode ended.
 *
 * @param {Array<Array<number[]|null>>} Q - mutated in place
 * @param {number} r
 * @param {number} c
 * @param {number} a - action index into ACT
 * @param {number} alpha - learning rate
 * @param {number} gamma - discount
 * @returns {{ nr: number, nc: number, done: boolean }}
 */
export function qStep(Q, r, c, a, alpha, gamma) {
  var n = nextCell(r, c, ACT[a]);
  var nr = n[0], nc = n[1];
  var done = isTerminal(nr, nc);
  var next = done ? TERMINALS[nr + ',' + nc] : Math.max.apply(null, Q[nr][nc]);
  var target = STEP_R + gamma * next;
  Q[r][c][a] += alpha * (target - Q[r][c][a]);
  return { nr: nr, nc: nc, done: done };
}

/**
 * Displayed state value: max_a Q(r,c,a). (The Q-learning analogue of the
 * cell value the L2 widget paints.) Only meaningful for free cells.
 *
 * @param {Array<Array<number[]|null>>} Q
 * @param {number} r
 * @param {number} c
 * @returns {number}
 */
export function valueOf(Q, r, c) {
  return Math.max.apply(null, Q[r][c]);
}

/**
 * Run one full episode from START, mutating Q.
 *
 * @param {Array<Array<number[]|null>>} Q - mutated in place
 * @param {object} opts
 * @param {number} opts.eps
 * @param {number} opts.alpha
 * @param {number} opts.gamma
 * @param {function(): number} opts.rng
 * @param {number} [opts.maxSteps=MAX_STEPS]
 * @returns {{ path: number[][], steps: number, terminated: boolean }}
 *          path includes START and every cell landed on (terminal last if terminated)
 */
export function runEpisode(Q, opts) {
  var maxSteps = opts.maxSteps || MAX_STEPS;
  var r = START[0], c = START[1];
  var path = [[r, c]];
  var done = false, steps = 0;
  while (!done && steps < maxSteps) {
    var a = chooseAction(Q, r, c, opts.eps, opts.rng);
    var res = qStep(Q, r, c, a, opts.alpha, opts.gamma);
    r = res.nr; c = res.nc; done = res.done;
    path.push([r, c]);
    steps++;
  }
  return { path: path, steps: steps, terminated: done };
}
