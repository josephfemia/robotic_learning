/**
 * flowMatching.js — pure numeric core for the flow-matching ODE widget (W: flowode, L6).
 *
 * Ported VERBATIM from the flowode IIFE in reference/robot-learning-companion.html
 * lines 2748–2769. Extracts the velocity field and Euler integration step into
 * pure functions so they can be unit-tested independent of the DOM.
 *
 * No DOM dependencies — pure ES module.
 */

// Fixed target modes from the original IIFE
var M1 = -1.3;
var M2 = 1.3;
var SG = 0.32;

/**
 * Velocity field for the two-mode flow-matching distribution.
 *
 * Original (inline in the IIFE):
 *   function vel(x,t){
 *     var tt=Math.min(t,0.985);
 *     function w(m){var mean=tt*m;var d=x-mean;return Math.exp(-d*d/(2*(sg*sg*(1-tt)*(1-tt)+0.02)));}
 *     var w1=w(m1),w2=w(m2),Z=w1+w2+1e-9,x1=(w1*m1+w2*m2)/Z;
 *     return (x1-x)/(1-tt);
 *   }
 *
 * The velocity at position x and time t is the weighted average of the two target
 * modes minus the current position, scaled by 1/(1-t). The weights reflect how
 * close x is to the interpolated position of each mode at time t.
 *
 * @param {number} x - current position
 * @param {number} t - integration time in [0, 1)
 * @returns {number} velocity at (x, t)
 */
export function velocityField(x, t) {
  var tt = Math.min(t, 0.985);
  function w(m) { var mean = tt * m; var d = x - mean; return Math.exp(-d * d / (2 * (SG * SG * (1 - tt) * (1 - tt) + 0.02))); }
  var w1 = w(M1), w2 = w(M2), Z = w1 + w2 + 1e-9, x1 = (w1 * M1 + w2 * M2) / Z;
  return (x1 - x) / (1 - tt);
}

/**
 * One Euler integration step.
 *
 * Original (inside build() loop):
 *   var v=vel(x,t); x=x+dt*v;
 *
 * @param {number} x  - current position
 * @param {number} t  - current time
 * @param {number} dt - time step size
 * @returns {number} new position after one Euler step
 */
export function eulerStep(x, t, dt) {
  return x + dt * velocityField(x, t);
}

/**
 * Integrate the flow ODE from t=0 to t=1 for a single starting position.
 *
 * Original (inside build() loop):
 *   var x=..., pts=[{x,t:0}], dt=1/steps;
 *   for(var s=0;s<steps;s++){var t=s*dt, v=vel(x,t); x=x+dt*v; pts.push({x,t:(s+1)*dt});}
 *
 * @param {number} x0    - starting position at t=0
 * @param {number} steps - number of Euler steps (NFE)
 * @returns {{ x: number, t: number }[]} trajectory points including start and end
 */
export function integratePath(x0, steps) {
  var x = x0;
  var dt = 1 / steps;
  var pts = [{ x: x, t: 0 }];
  for (var s = 0; s < steps; s++) {
    var t = s * dt;
    x = eulerStep(x, t, dt);
    pts.push({ x: x, t: (s + 1) * dt });
  }
  return pts;
}
