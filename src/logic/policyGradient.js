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

/**
 * Numerically verify the log-derivative (REINFORCE) identity on a tiny discrete toy:
 *
 *   ∇_θ 𝔼_{a~π_θ}[R(a)]  =  𝔼_{a~π_θ}[ ∇_θ log π_θ(a) · R(a) ]
 *
 * Toy setup: K-action discrete softmax policy.
 *   π_θ(a) = softmax(θ)[a] = exp(θ_a) / Σ_j exp(θ_j)
 *   R — fixed reward vector, one scalar per action.
 *
 * Left-hand side (analytic gradient of 𝔼[R] w.r.t. θ):
 *   d/dθ_i 𝔼[R] = Σ_a R(a) · dπ(a)/dθ_i
 *   Softmax Jacobian: dπ(a)/dθ_i = π(a)(δ_{a=i} - π(i))
 *   → analyticGrad[i] = π(i) · (R(i) - 𝔼[R])
 *
 * Right-hand side (score-function / REINFORCE estimator):
 *   ∇_θ_i log π_θ(a) = δ_{a=i} - π(i)   (score function of softmax)
 *   estimatorGrad[i] = Σ_a π(a) · (δ_{a=i} - π(i)) · R(a)
 *                    = π(i)R(i) - π(i)·𝔼[R]
 *                    = π(i)·(R(i) - 𝔼[R])      ← identical to LHS ✓
 *
 * Both sides agree analytically; this function makes that verifiable
 * by computing them independently so a test can assert closeness.
 *
 * @param {number[]} theta   - logit parameters (length K)
 * @param {number[]} rewards - fixed reward per action (length K)
 * @returns {{ analyticGrad: number[], estimatorGrad: number[], probs: number[], expectedReward: number }}
 */
export function logDerivativeIdentity(theta, rewards) {
  var K = theta.length;

  // Softmax — numerically stable via max subtraction
  var maxTheta = -Infinity;
  for (var j = 0; j < K; j++) if (theta[j] > maxTheta) maxTheta = theta[j];
  var ex = theta.map(function(t) { return Math.exp(t - maxTheta); });
  var Z = ex.reduce(function(s, v) { return s + v; }, 0);
  var probs = ex.map(function(v) { return v / Z; });

  // 𝔼[R] = Σ_a π(a) R(a)
  var expectedReward = 0;
  for (var a = 0; a < K; a++) expectedReward += probs[a] * rewards[a];

  // Analytic gradient of 𝔼[R] w.r.t. θ
  // analyticGrad[i] = Σ_a R(a) · π(a) · (δ_{a=i} - π(i))
  //                 = R(i)·π(i) - π(i)·𝔼[R]
  //                 = π(i)·(R(i) - 𝔼[R])
  var analyticGrad = probs.map(function(pi, i) {
    return pi * (rewards[i] - expectedReward);
  });

  // Score-function / REINFORCE estimator gradient
  // estimatorGrad[i] = Σ_a π(a) · score(a, i) · R(a)
  //                  where score(a, i) = δ_{a=i} - π(i)
  var estimatorGrad = new Array(K).fill(0);
  for (var i = 0; i < K; i++) {
    for (var aa = 0; aa < K; aa++) {
      var score = (aa === i ? 1 : 0) - probs[i];
      estimatorGrad[i] += probs[aa] * score * rewards[aa];
    }
  }

  return { analyticGrad: analyticGrad, estimatorGrad: estimatorGrad, probs: probs, expectedReward: expectedReward };
}
