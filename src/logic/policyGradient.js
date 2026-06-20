/**
 * policyGradient.js — pure numeric core for the REINFORCE policy-gradient widget (W: pg, L5).
 *
 * Ported VERBATIM from the pg IIFE in reference/robot-learning-companion.html
 * lines 2540–2568. The reward landscape and gradient-ascent update rule are
 * identical to the original.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Reward landscape: a Gaussian bump centred at a*=1.2.
 *
 * Original: function Rwd(a){ return Math.exp(-Math.pow(a-1.2,2)/(2*0.45)); }
 *
 * @param {number} a - action
 * @returns {number} reward in (0, 1]
 */
export function reward(a) {
  return Math.exp(-Math.pow(a - 1.2, 2) / (2 * 0.45));
}

/**
 * One REINFORCE gradient-ascent step on (mu, logsig) given K samples.
 *
 * Original (lines 2558–2561):
 *   var sig=Math.exp(logsig), K=14; samples=[]; var rs=[];
 *   for(var i=0;i<K;i++){var a=mu+sig*R.randn(), r=Rwd(a); ...}
 *   var mean=0; ... mean/=K; var gmu=0,gls=0;
 *   for(var k=0;k<K;k++){var adv=samples[k].r-mean; ...
 *     gmu+=adv*d/(sig*sig); gls+=adv*((d*d)/(sig*sig)-1);}
 *   gmu/=K; gls/=K;
 *   mu = R.clamp(mu+lr*gmu,-3,3);
 *   logsig = R.clamp(logsig+0.5*lr*gls, Math.log(0.18), Math.log(1.2));
 *
 * @param {number}   mu      - current policy mean
 * @param {number}   logsig  - log of current policy std
 * @param {number}   lr      - learning rate (default 0.12)
 * @param {number[]} actions - K sampled actions (mu + sig * randn)
 * @returns {{ mu: number, logsig: number, advantages: number[] }}
 *          Updated parameters and per-sample advantages (r - mean_r).
 */
export function policyGradientStep(mu, logsig, lr, actions) {
  var sig = Math.exp(logsig);
  var K = actions.length;
  var rs = actions.map(function(a) { return reward(a); });
  var mean = 0;
  for (var m = 0; m < K; m++) mean += rs[m];
  mean /= K;
  var gmu = 0, gls = 0;
  var advantages = [];
  for (var k = 0; k < K; k++) {
    var adv = rs[k] - mean;
    advantages.push(adv);
    var d = actions[k] - mu;
    gmu += adv * d / (sig * sig);
    gls += adv * ((d * d) / (sig * sig) - 1);
  }
  gmu /= K;
  gls /= K;
  var newMu = clamp(mu + lr * gmu, -3, 3);
  var newLogsig = clamp(logsig + 0.5 * lr * gls, Math.log(0.18), Math.log(1.2));
  return { mu: newMu, logsig: newLogsig, advantages: advantages };
}

/**
 * Clamp v to [a, b] — mirrors R.clamp from rllab.js.
 *
 * @param {number} v
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function clamp(v, a, b) {
  return v < a ? a : (v > b ? b : v);
}
