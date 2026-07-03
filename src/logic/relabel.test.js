import { describe, it, expect } from 'vitest';
import { N_PLAY, point, trajectory, windowCount, windowEnd, clampStart } from './relabel.js';

// Widget defaults
const N = 300;

describe('point — pinned play trajectory samples', () => {
  it('exposes the widget default stream length', () => {
    expect(N_PLAY).toBe(300);
  });

  it('pins the first sample (i=0)', () => {
    const p = point(0, N);
    expect(p.x).toBeCloseTo(0.8873901125452223, 12);
    expect(p.y).toBeCloseTo(0.8016575469883845, 12);
  });

  it('pins an early sample (i=1)', () => {
    const p = point(1, N);
    expect(p.x).toBeCloseTo(0.8889294083105689, 12);
    expect(p.y).toBeCloseTo(0.7896518279590711, 12);
  });

  it('pins a mid sample (i=150)', () => {
    const p = point(150, N);
    expect(p.x).toBeCloseTo(0.31175501490333074, 12);
    expect(p.y).toBeCloseTo(0.22771232246588044, 12);
  });

  it('pins the last sample (i=299)', () => {
    const p = point(299, N);
    expect(p.x).toBeCloseTo(0.8214781603236088, 12);
    expect(p.y).toBeCloseTo(0.8156877453051421, 12);
  });

  it('stays inside the unit square with margin (blobs/flags never clip)', () => {
    for (let i = 0; i < N; i++) {
      const p = point(i, N);
      expect(p.x).toBeGreaterThan(0.02);
      expect(p.x).toBeLessThan(0.98);
      expect(p.y).toBeGreaterThan(0.02);
      expect(p.y).toBeLessThan(0.98);
    }
  });

  it('is smooth: consecutive samples move less than 0.02 in unit space', () => {
    let prev = point(0, N);
    for (let i = 1; i < N; i++) {
      const p = point(i, N);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(0.02);
      prev = p;
    }
  });

  it('is deterministic', () => {
    const a = point(42, N);
    const b = point(42, N);
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});

describe('trajectory', () => {
  it('returns n samples matching point(i, n)', () => {
    const tr = trajectory(N);
    expect(tr).toHaveLength(N);
    expect(tr[0].x).toBe(point(0, N).x);
    expect(tr[150].y).toBe(point(150, N).y);
    expect(tr[N - 1].x).toBe(point(N - 1, N).x);
  });

  it('defaults to N_PLAY samples', () => {
    expect(trajectory()).toHaveLength(N_PLAY);
  });
});

describe('windowCount — harvest math', () => {
  it('stride 1, len 25 on a 300-sample stream ⇒ 275 demos (the harvest number)', () => {
    expect(windowCount(300, 25, 1)).toBe(275);
  });

  it('stride 1, shortest widget window (len 15) ⇒ 285 demos', () => {
    expect(windowCount(300, 15, 1)).toBe(285);
  });

  it('stride 1, longest widget window (len 75) ⇒ 225 demos', () => {
    expect(windowCount(300, 75, 1)).toBe(225);
  });

  it('window longer than the stream ⇒ 0 demos', () => {
    expect(windowCount(10, 20, 1)).toBe(0);
  });

  it('window spanning the whole stream ⇒ exactly 1 demo', () => {
    expect(windowCount(100, 99, 1)).toBe(1);
  });

  it('larger stride thins the harvest: stride 10, len 25 ⇒ 28', () => {
    expect(windowCount(300, 25, 10)).toBe(28);
  });

  it('matches the closed form floor((n-1-len)/stride)+1 for a sweep of lengths', () => {
    for (let len = 1; len < 300; len += 7) {
      const expected = Math.floor((300 - 1 - len) / 1) + 1;
      expect(windowCount(300, len, 1)).toBe(expected);
    }
  });
});

describe('windowEnd', () => {
  it('endpoint is start+len inside the stream', () => {
    expect(windowEnd(10, 25, 300)).toBe(35);
  });

  it('endpoint is clamped to the last sample', () => {
    expect(windowEnd(290, 25, 300)).toBe(299);
  });
});

describe('clampStart', () => {
  it('passes through valid starts', () => {
    expect(clampStart(100, 25, 300)).toBe(100);
  });

  it('clamps negative starts to 0', () => {
    expect(clampStart(-5, 25, 300)).toBe(0);
  });

  it('clamps starts so the window endpoint stays inside the stream', () => {
    expect(clampStart(280, 25, 300)).toBe(274);
    expect(clampStart(9999, 75, 300)).toBe(224);
  });

  it('degenerate: window longer than stream ⇒ start 0', () => {
    expect(clampStart(3, 20, 10)).toBe(0);
  });
});
