/**
 * gridValueIteration.js — pure numeric core for the gridworld value iteration widget (W2: grid, L2).
 *
 * Ported VERBATIM from the grid IIFE in reference/robot-learning-companion.html
 * lines 2432–2466. All constants, grid layout, walls, terminals, step reward, and
 * Bellman update logic are taken directly from the original.
 *
 * Grid: 3×4, wall at (1,1), terminal +1 at (0,3), terminal −1 at (1,3).
 * Actions: [up, right, down, left] = [[-1,0],[0,1],[1,0],[0,-1]].
 * Step reward: −0.04 per non-terminal step.
 * Transitions: deterministic; bumping a wall/border stays in place.
 * Terminals: pinned at their reward value, never updated.
 *
 * No DOM dependencies — pure ES module.
 */

/** Grid dimensions from IIFE: 3 rows × 4 columns. */
export const ROWS = 3;
export const COLS = 4;

/** Wall cells — object keyed by "r,c" string. Wall at (1,1). */
export const WALLS = { '1,1': 1 };

/** Terminal cells — keyed by "r,c", value is terminal reward (+1 or −1). */
export const TERMINALS = { '0,3': 1, '1,3': -1 };

/** Per-step living cost applied to every non-terminal, non-wall transition. */
export const STEP_R = -0.04;

/** Action deltas: [up, right, down, left] → [Δrow, Δcol]. */
export const ACT = [[-1, 0], [0, 1], [1, 0], [0, -1]];

/**
 * Return true if (r,c) is a terminal cell.
 * Original: function isT(r,c){return term[r+','+c]!==undefined;}
 */
export function isTerminal(r, c) {
  return TERMINALS[r + ',' + c] !== undefined;
}

/**
 * Return true if (r,c) is within bounds and not a wall.
 * Original: function inb(r,c){return r>=0&&r<ROWS&&c>=0&&c<COLS&&!walls[r+','+c];}
 */
export function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS && !WALLS[r + ',' + c];
}

/**
 * Given current cell (r,c) and action [Δr,Δc], return the resulting [r,c].
 * If the resulting cell is out of bounds or a wall, the agent stays in place.
 * Original: function nxt(r,c,a){var nr=r+a[0],nc=c+a[1];return inb(nr,nc)?[nr,nc]:[r,c];}
 *
 * @param {number} r - current row
 * @param {number} c - current column
 * @param {number[]} a - action [Δrow, Δcol]
 * @returns {number[]} [nextRow, nextCol]
 */
export function nextCell(r, c, a) {
  var nr = r + a[0], nc = c + a[1];
  return inBounds(nr, nc) ? [nr, nc] : [r, c];
}

/**
 * Build the initial value table V.
 * Terminals are pinned at their reward value; all others start at 0;
 * walls get null.
 *
 * Original (reset function):
 *   V=[];for(var r=0;r<ROWS;r++){V[r]=[];for(var c=0;c<COLS;c++){
 *     var k=r+','+c;V[r][c]=term[k]!==undefined?term[k]:0;}}
 *
 * @returns {Array<Array<number|null>>} ROWS×COLS value table
 */
export function initV() {
  var V = [];
  for (var r = 0; r < ROWS; r++) {
    V[r] = [];
    for (var c = 0; c < COLS; c++) {
      var k = r + ',' + c;
      if (WALLS[k]) {
        V[r][c] = null;
      } else if (TERMINALS[k] !== undefined) {
        V[r][c] = TERMINALS[k];
      } else {
        V[r][c] = 0;
      }
    }
  }
  return V;
}

/**
 * Perform one synchronous Bellman sweep over the entire grid (value iteration).
 * Returns { V: newValueTable, maxDelta: maxAbsChange }.
 *
 * Original (step function):
 *   function step(){var nV=[];maxd=0;for(var r=0;r<ROWS;r++){nV[r]=[];for(var c=0;c<COLS;c++){var k=r+','+c;
 *     if(walls[k]){nV[r][c]=null;continue;}if(isT(r,c)){nV[r][c]=term[k];continue;}
 *     var best=-1e9;for(var i=0;i<ACT.length;i++){var n=nxt(r,c,ACT[i]);var vn=V[n[0]][n[1]];
 *       if(vn===null)vn=V[r][c];var val=stepR+gamma*vn;if(val>best)best=val;}
 *     nV[r][c]=best;var d=Math.abs(best-V[r][c]);if(d>maxd)maxd=d;}}V=nV;sweeps++;draw();return maxd;}
 *
 * NOTE: when the neighbor value is null (wall), the original falls back to V[r][c]
 * (the agent stays, so you compare your own value). This is preserved verbatim.
 *
 * @param {Array<Array<number|null>>} V - current value table (ROWS×COLS)
 * @param {number} gamma - discount factor
 * @returns {{ V: Array<Array<number|null>>, maxDelta: number }}
 */
export function bellmanSweep(V, gamma) {
  var nV = [];
  var maxd = 0;
  for (var r = 0; r < ROWS; r++) {
    nV[r] = [];
    for (var c = 0; c < COLS; c++) {
      var k = r + ',' + c;
      if (WALLS[k]) { nV[r][c] = null; continue; }
      if (isTerminal(r, c)) { nV[r][c] = TERMINALS[k]; continue; }
      var best = -1e9;
      for (var i = 0; i < ACT.length; i++) {
        var n = nextCell(r, c, ACT[i]);
        var vn = V[n[0]][n[1]];
        if (vn === null) vn = V[r][c];
        var val = STEP_R + gamma * vn;
        if (val > best) best = val;
      }
      nV[r][c] = best;
      var d = Math.abs(best - V[r][c]);
      if (d > maxd) maxd = d;
    }
  }
  return { V: nV, maxDelta: maxd };
}

/**
 * Return the greedy action [Δrow, Δcol] for cell (r,c) under value table V and gamma.
 * Returns null for wall/terminal cells.
 *
 * Original (bestA function):
 *   function bestA(r,c){var best=-1e9,ba=null;for(var i=0;i<ACT.length;i++){
 *     var n=nxt(r,c,ACT[i]);var vn=V[n[0]][n[1]];if(vn===null)vn=V[r][c];
 *     var val=stepR+gamma*vn;if(val>best+1e-9){best=val;ba=ACT[i];}}return ba;}
 *
 * @param {Array<Array<number|null>>} V - value table
 * @param {number} r - row
 * @param {number} c - column
 * @param {number} gamma - discount factor
 * @returns {number[]|null} best action [Δrow, Δcol] or null
 */
export function bestAction(V, r, c, gamma) {
  if (WALLS[r + ',' + c] || isTerminal(r, c)) return null;
  var best = -1e9, ba = null;
  for (var i = 0; i < ACT.length; i++) {
    var n = nextCell(r, c, ACT[i]);
    var vn = V[n[0]][n[1]];
    if (vn === null) vn = V[r][c];
    var val = STEP_R + gamma * vn;
    if (val > best + 1e-9) { best = val; ba = ACT[i]; }
  }
  return ba;
}
