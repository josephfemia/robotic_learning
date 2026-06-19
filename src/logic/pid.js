/**
 * pid.js — pure numeric core for the PID control widget (W: pid, L2).
 *
 * Ported VERBATIM from the pid IIFE in reference/robot-learning-companion.html
 * lines 3237–3264. The simulation runs a discrete mass-damper plant driven
 * by a PID controller.
 *
 * Exact constants from the IIFE:
 *   dt=0.02, T=300, m=1, target=1, initial x=0, v=0, ei=0, eprev=target
 *   plant: a = (F - 0.6*v) / m; v += a*dt; x += v*dt
 *   controller: F = Kp*e + Ki*ei + Kd*ed
 *   integral: ei += e*dt
 *   derivative: ed = (e - eprev)/dt; eprev = e
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Simulate the PID-controlled mass-damper system.
 *
 * Original:
 *   function sim(){var dt=0.02,T=300,m=1,target=1,x=0,v=0,ei=0,eprev=target;var xs=[];
 *     for(var i=0;i<T;i++){var e=target-x;ei+=e*dt;var ed=(e-eprev)/dt;eprev=e;
 *       var F=Kp*e+Ki*ei+Kd*ed;
 *       var a=(F-0.6*v)/m;v+=a*dt;x+=v*dt;xs.push(x);}
 *     return xs;}
 *
 * NOTE: eprev is initialized to `target` (=1), so the first derivative term is
 * ed = (e - eprev)/dt = ((target - x) - target)/dt = (-x)/dt = 0/dt = 0 (since x starts at 0).
 * This matches the original verbatim.
 *
 * @param {number} Kp - proportional gain
 * @param {number} Ki - integral gain
 * @param {number} Kd - derivative gain
 * @returns {number[]} array of T=300 position values x(t)
 */
export function sim(Kp, Ki, Kd) {
  var dt = 0.02, T = 300, m = 1, target = 1;
  var x = 0, v = 0, ei = 0, eprev = target;
  var xs = [];
  for (var i = 0; i < T; i++) {
    var e = target - x;
    ei += e * dt;
    var ed = (e - eprev) / dt;
    eprev = e;
    var F = Kp * e + Ki * ei + Kd * ed;
    // mass-damper plant with light natural damping
    var a = (F - 0.6 * v) / m;
    v += a * dt;
    x += v * dt;
    xs.push(x);
  }
  return xs;
}

/**
 * Compute derived metrics from a simulation trace.
 *
 * Original (inline in draw()):
 *   var last=xs[xs.length-1], peak=Math.max.apply(null,xs);
 *   var unstable=(peak>1.9||Math.abs(last-1)>0.25);
 *   var overshoot=Math.max(0,(peak-1)*100);
 *
 * @param {number[]} xs - simulation trace from sim()
 * @returns {{ last: number, peak: number, overshoot: number, unstable: boolean }}
 */
export function metrics(xs) {
  var last = xs[xs.length - 1];
  var peak = Math.max.apply(null, xs);
  var unstable = (peak > 1.9 || Math.abs(last - 1) > 0.25);
  var overshoot = Math.max(0, (peak - 1) * 100);
  return { last, peak, overshoot, unstable };
}
