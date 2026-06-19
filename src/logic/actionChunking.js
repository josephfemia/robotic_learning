/**
 * actionChunking.js — pure numeric core for the action chunking / receding-horizon
 * widget (W: chunk, L7).
 *
 * Ported VERBATIM from the chunk IIFE in robot-learning-companion.html
 * lines 2953–2992.
 *
 * Core invariant (the widget's educational point — reactivity vs smoothness tradeoff):
 *   - Short stride (re-plan often): more reactive to the truth path, but can jitter.
 *   - Long stride (commit to a long chunk): smoother but slower to correct errors.
 *   - Temporal ensembling (ensemble=true): averages overlapping chunk predictions with
 *     exponential weights, recovering smoothness AND reactivity simultaneously.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Ground-truth target path — the demos imply this trajectory.
 *
 * Original: function truth(i){ return 0.5+0.32*Math.sin(i*0.32)+0.06*Math.sin(i*0.9); }
 *
 * @param {number} i - time step index
 * @returns {number} target value at step i
 */
export function truth(i) {
  return 0.5 + 0.32 * Math.sin(i * 0.32) + 0.06 * Math.sin(i * 0.9);
}

/**
 * Predicted value for time step (s + k), from a chunk planned at step s.
 *
 * Original:
 *   function predict(s,k){
 *     var bias=0.05*Math.sin(s*0.7)+0.012*k*Math.cos(s*0.5);
 *     return truth(s+k)+bias;
 *   }
 *
 * Adds a small bias that grows with k (model less certain further into the chunk).
 *
 * @param {number} s - planning step (the time when this chunk was generated)
 * @param {number} k - offset within the chunk (0 = first predicted action)
 * @returns {number} predicted value at absolute step s+k
 */
export function predict(s, k) {
  var bias = 0.05 * Math.sin(s * 0.7) + 0.012 * k * Math.cos(s * 0.5);
  return truth(s + k) + bias;
}

/**
 * Build the committed (executed) path up to the current time t, applying
 * receding-horizon execution with optional temporal ensembling.
 *
 * Original:
 *   function rebuild(){committed=[];var acc=[],cnt=[];
 *     for(var s=0;s<=t;s+=stride){for(var k=0;k<chunk;k++){var idx=s+k;if(idx>=T)break;
 *       var p=predict(s,k);var wgt=ensemble?Math.exp(-0.25*k):(k<stride?1:0);
 *       if(wgt<=0)continue;acc[idx]=(acc[idx]||0)+p*wgt;cnt[idx]=(cnt[idx]||0)+wgt;}}
 *     for(var i=0;i<T;i++){if(cnt[i])committed[i]=acc[i]/cnt[i];}
 *   }
 *
 * The ensembling weight Math.exp(-0.25*k) decays within each chunk (actions
 * near the start of each chunk get more weight). Without ensembling, only the
 * first 'stride' positions of each chunk are executed and later positions are ignored.
 *
 * @param {number}  t        - current time step (inclusive)
 * @param {number}  T        - total trajectory length
 * @param {number}  chunk    - chunk length (number of actions to predict per plan)
 * @param {number}  stride   - execution stride (steps before re-planning)
 * @param {boolean} ensemble - whether to use temporal ensembling
 * @returns {(number|undefined)[]} array of length T; committed[i] is the executed value at step i,
 *                                 or undefined if not yet reached
 */
export function buildCommitted(t, T, chunk, stride, ensemble) {
  var committed = new Array(T);
  var acc = new Array(T).fill(0);
  var cnt = new Array(T).fill(0);
  for (var s = 0; s <= t; s += stride) {
    for (var k = 0; k < chunk; k++) {
      var idx = s + k;
      if (idx >= T) break;
      var p = predict(s, k);
      var wgt = ensemble ? Math.exp(-0.25 * k) : (k < stride ? 1 : 0);
      if (wgt <= 0) continue;
      acc[idx] += p * wgt;
      cnt[idx] += wgt;
    }
  }
  for (var i = 0; i < T; i++) {
    if (cnt[i]) committed[i] = acc[i] / cnt[i];
  }
  return committed;
}

/**
 * Compute the last planning point s at time t with given stride.
 *
 * Original: var s=Math.min(t-(t%stride),T-1); if(s<0)s=0;
 *
 * @param {number} t      - current time step
 * @param {number} stride - execution stride
 * @param {number} T      - total trajectory length
 * @returns {number} latest planning step s <= t that is a multiple of stride
 */
export function lastPlanStep(t, stride, T) {
  var s = Math.min(t - (t % stride), T - 1);
  if (s < 0) s = 0;
  return s;
}
