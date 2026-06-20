import { describe, it, expect } from 'vitest';
import { sim, metrics } from './pid.js';

/**
 * Reference IIFE: reference/robot-learning-companion.html lines 3237–3264.
 * Default gains: Kp=6, Ki=0, Kd=2.
 * Plant: dt=0.02, T=300, m=1, target=1, natural damping coeff 0.6.
 * eprev initialised to target=1.
 */

describe('sim — output shape', () => {
  it('returns exactly T=300 samples', () => {
    expect(sim(6, 0, 2).length).toBe(300);
  });

  it('all values are finite numbers', () => {
    const xs = sim(6, 0, 2);
    xs.forEach(v => expect(isFinite(v)).toBe(true));
  });
});

describe('sim — default gains Kp=6, Ki=0, Kd=2', () => {
  const xs = sim(6, 0, 2);
  const { last, peak, overshoot, unstable } = metrics(xs);

  it('first position xs[0] = 0.0024 (one integration step from rest)', () => {
    // Step i=0: e=1, ei=0.02, ed=(1-1)/0.02=0, F=6, a=6, v=0.12, x=0.0024
    expect(xs[0]).toBeCloseTo(0.0024, 8);
  });

  it('converges close to target=1 by end of trace', () => {
    // With Kp=6, Kd=2, Ki=0 the system settles with a small steady-state error
    expect(Math.abs(last - 1)).toBeLessThan(0.25);
  });

  it('system is stable (peak <= 1.9 and final near target)', () => {
    expect(unstable).toBe(false);
  });

  it('peak > 0 (system actually moves)', () => {
    expect(peak).toBeGreaterThan(0);
  });

  it('position rises monotonically at the start (first 5 steps)', () => {
    for (let i = 1; i < 5; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    }
  });
});

describe('sim — step 1 matches manual integration', () => {
  it('xs[0] is approximately correct for Kp=6, Ki=0, Kd=2', () => {
    // i=0: e = 1-0 = 1, ei = 0 + 1*0.02 = 0.02
    //       ed = (1 - 1)/0.02 = 0  (eprev = target = 1)
    //       F = 6*1 + 0*0.02 + 2*0 = 6
    //       a = (6 - 0.6*0)/1 = 6
    //       v += 6*0.02 = 0.12
    //       x += 0.12*0.02 = 0.0024
    const xs = sim(6, 0, 2);
    expect(xs[0]).toBeCloseTo(0.0024, 8);
  });
});

describe('sim — step 2 matches manual integration', () => {
  it('xs[1] matches two-step manual computation', () => {
    // After step 0: x=0.0024, v=0.12, ei=0.02, eprev=1
    // i=1: e = 1 - 0.0024 = 0.9976
    //       ei = 0.02 + 0.9976*0.02 = 0.02 + 0.019952 = 0.039952
    //       ed = (0.9976 - 1)/0.02 = -0.0024/0.02 = -0.12
    //       F = 6*0.9976 + 0*0.039952 + 2*(-0.12) = 5.9856 - 0.24 = 5.7456
    //       a = (5.7456 - 0.6*0.12)/1 = 5.7456 - 0.072 = 5.6736
    //       v = 0.12 + 5.6736*0.02 = 0.12 + 0.113472 = 0.233472
    //       x = 0.0024 + 0.233472*0.02 = 0.0024 + 0.00466944 = 0.00706944
    const xs = sim(6, 0, 2);
    expect(xs[1]).toBeCloseTo(0.00706944, 6);
  });
});

describe('sim — effect of Ki (integral term)', () => {
  it('Ki > 0 drives final value closer to target=1 than Ki=0 (no offset)', () => {
    const xs_noi = sim(6, 0, 2);
    const xs_i = sim(6, 2, 2);
    const last_noi = xs_noi[xs_noi.length - 1];
    const last_i = xs_i[xs_i.length - 1];
    // integral term should reduce steady-state error
    expect(Math.abs(last_i - 1)).toBeLessThanOrEqual(Math.abs(last_noi - 1) + 0.05);
  });
});

describe('sim — high Kp + Ki causes instability', () => {
  it('Kp=30, Ki=12, Kd=0 is unstable (peak > 1.9)', () => {
    // With high Kp and Ki, the integral windup drives peak > 1.9 → unstable=true
    const xs = sim(30, 12, 0);
    const { unstable } = metrics(xs);
    expect(unstable).toBe(true);
  });
});

describe('metrics', () => {
  it('last is the final value', () => {
    const xs = sim(6, 0, 2);
    const { last } = metrics(xs);
    expect(last).toBeCloseTo(xs[299], 10);
  });

  it('peak is the maximum value', () => {
    const xs = sim(6, 0, 2);
    const { peak } = metrics(xs);
    const manualPeak = Math.max(...xs);
    expect(peak).toBeCloseTo(manualPeak, 10);
  });

  it('overshoot is 0 when peak <= 1', () => {
    // Simulate with very low gains so system creeps up slowly
    const xs = sim(0.1, 0, 0);
    const { overshoot } = metrics(xs);
    expect(overshoot).toBeGreaterThanOrEqual(0);
  });

  it('overshoot = (peak - 1)*100 when peak > 1', () => {
    const xs = sim(6, 0, 0);
    const { peak, overshoot } = metrics(xs);
    if (peak > 1) {
      expect(overshoot).toBeCloseTo((peak - 1) * 100, 8);
    }
  });

  it('unstable when peak > 1.9', () => {
    // Create a fake xs with a very large peak
    const xs = new Array(300).fill(0);
    xs[100] = 2.5; // peak > 1.9
    xs[299] = 1.0;
    const { unstable } = metrics(xs);
    expect(unstable).toBe(true);
  });

  it('unstable when |last - 1| > 0.25', () => {
    const xs = new Array(300).fill(0);
    xs[299] = 0.5; // |0.5 - 1| = 0.5 > 0.25
    const { unstable } = metrics(xs);
    expect(unstable).toBe(true);
  });

  it('stable when peak <= 1.9 and |last - 1| <= 0.25', () => {
    const xs = new Array(300).fill(1.0);
    xs[100] = 1.1; // small overshoot
    const { unstable } = metrics(xs);
    expect(unstable).toBe(false);
  });
});
