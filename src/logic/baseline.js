/**
 * baseline.js — pure numeric core for the baseline variance-reduction widget (W: base, L5).
 *
 * Ported VERBATIM from the base IIFE in reference/robot-learning-companion.html
 * lines 2572–2593. Uses the same ten fixed returns Rs and centered scores sc.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Ten fixed return samples — verbatim from original line 2574.
 * Rs = [0.95,0.88,0.93,0.80,0.97,0.85,0.91,0.78,0.99,0.83]
 */
export var RETURNS = [0.95, 0.88, 0.93, 0.80, 0.97, 0.85, 0.91, 0.78, 0.99, 0.83];

/**
 * Ten score samples — verbatim from original line 2574–2575.
 * Raw: sc=[-1.2,0.6,1.4,-0.5,0.9,-1.6,0.3,1.1,-0.8,1.5]
 * Then centered: sm = mean(sc); sc[i] -= sm;
 */
export var SCORES = (function() {
  var raw = [-1.2, 0.6, 1.4, -0.5, 0.9, -1.6, 0.3, 1.1, -0.8, 1.5];
  var sm = 0, i;
  for (i = 0; i < raw.length; i++) sm += raw[i];
  sm /= raw.length;
  return raw.map(function(v) { return v - sm; });
})();

/**
 * Mean return of the fixed dataset.
 * Original: var meanR=0; for(i=0;i<data.length;i++) meanR+=data[i].R; meanR/=data.length;
 */
export var MEAN_RETURN = (function() {
  var s = 0;
  for (var i = 0; i < RETURNS.length; i++) s += RETURNS[i];
  return s / RETURNS.length;
})();

/**
 * Optimal baseline b* — the variance-minimising value.
 *
 * Original (lines 2578):
 *   var num=0,den=0;
 *   for(i=0;i<data.length;i++){num+=data[i].s*data[i].s*data[i].R; den+=data[i].s*data[i].s;}
 *   var bStar=num/den;
 *
 * This is the score-weighted mean return: b* = Σ(sᵢ² Rᵢ) / Σ(sᵢ²).
 */
export var OPTIMAL_BASELINE = (function() {
  var num = 0, den = 0;
  for (var i = 0; i < RETURNS.length; i++) {
    var s2 = SCORES[i] * SCORES[i];
    num += s2 * RETURNS[i];
    den += s2;
  }
  return num / den;
})();

/**
 * Compute per-sample gradient terms and their mean/variance for a given baseline b.
 *
 * Original (lines 2580):
 *   function stats(bv){var gs=[],m=0,v=0,j;
 *     for(j=0;j<data.length;j++){gs.push((data[j].R-bv)*data[j].s);m+=gs[j];}
 *     m/=gs.length;
 *     for(j=0;j<gs.length;j++) v+=(gs[j]-m)*(gs[j]-m);
 *     v/=gs.length;
 *     return {gs:gs,mean:m,varr:v};}
 *
 * @param {number} b - baseline value
 * @returns {{ gs: number[], mean: number, variance: number }}
 */
export function gradientStats(b) {
  var gs = [], m = 0, v = 0, j;
  for (j = 0; j < RETURNS.length; j++) {
    gs.push((RETURNS[j] - b) * SCORES[j]);
    m += gs[j];
  }
  m /= gs.length;
  for (j = 0; j < gs.length; j++) v += (gs[j] - m) * (gs[j] - m);
  v /= gs.length;
  return { gs: gs, mean: m, variance: v };
}
