/**
 * useAnimate.test.js — vitest (jsdom) tests for the motion toolkit additions.
 *
 * Tests cover:
 *   - easings object: linear, quadInOut, cubicInOut
 *   - prefersReducedMotion(): boolean, reflects matchMedia
 *   - tween(): reduced-motion fast-path (synchronous onStep(1) + onDone)
 *
 * The existing `animate` function is tested indirectly by the 443-test suite;
 * these tests only cover the NEW exports.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { easings, prefersReducedMotion, tween } from './useAnimate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stub window.matchMedia to return a fixed `matches` value. */
function stubMatchMedia(matches) {
  vi.stubGlobal('matchMedia', () => ({ matches }));
}

function restoreMatchMedia() {
  vi.unstubAllGlobals();
}

// ---------------------------------------------------------------------------
// easings
// ---------------------------------------------------------------------------

describe('easings', () => {
  it('exports an object', () => {
    expect(typeof easings).toBe('object');
    expect(easings).not.toBeNull();
  });

  it('has at least linear, quadInOut, cubicInOut keys', () => {
    expect(typeof easings.linear).toBe('function');
    expect(typeof easings.quadInOut).toBe('function');
    expect(typeof easings.cubicInOut).toBe('function');
  });

  // For each easing: f(0)===0, f(1)===1, monotonic non-decreasing on grid
  const GRID = Array.from({ length: 21 }, (_, i) => i / 20); // 0, 0.05, … 1.0

  for (const name of ['linear', 'quadInOut', 'cubicInOut']) {
    describe(name, () => {
      it('f(0) === 0', () => {
        expect(easings[name](0)).toBeCloseTo(0, 10);
      });

      it('f(1) === 1', () => {
        expect(easings[name](1)).toBeCloseTo(1, 10);
      });

      it('is monotonic non-decreasing on a 21-point grid', () => {
        const values = GRID.map(t => easings[name](t));
        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - 1e-10);
        }
      });
    });
  }

  it('quadInOut matches the exact original curve from animate()', () => {
    // The original curve: p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2
    const original = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    for (const t of GRID) {
      expect(easings.quadInOut(t)).toBeCloseTo(original(t), 10);
    }
  });
});

// ---------------------------------------------------------------------------
// prefersReducedMotion
// ---------------------------------------------------------------------------

describe('prefersReducedMotion', () => {
  afterEach(restoreMatchMedia);

  it('returns a boolean', () => {
    stubMatchMedia(false);
    expect(typeof prefersReducedMotion()).toBe('boolean');
  });

  it('returns true when matchMedia reports matches:true', () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia reports matches:false', () => {
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns false when window.matchMedia is unavailable (SSR guard)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tween — reduced-motion fast-path
// ---------------------------------------------------------------------------

describe('tween — reduced-motion ON (synchronous fast-path)', () => {
  beforeEach(() => stubMatchMedia(true));
  afterEach(restoreMatchMedia);

  it('calls onStep exactly once with argument 1', () => {
    const onStep = vi.fn();
    const onDone = vi.fn();
    tween(300, { onStep, onDone });
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it('calls onDone exactly once', () => {
    const onStep = vi.fn();
    const onDone = vi.fn();
    tween(300, { onStep, onDone });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('calls onStep before onDone', () => {
    const callOrder = [];
    tween(300, {
      onStep: () => callOrder.push('step'),
      onDone: () => callOrder.push('done'),
    });
    expect(callOrder).toEqual(['step', 'done']);
  });

  it('works when onDone is omitted (no throw)', () => {
    const onStep = vi.fn();
    expect(() => tween(300, { onStep })).not.toThrow();
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it('works when onStep is omitted (no throw)', () => {
    const onDone = vi.fn();
    expect(() => tween(300, { onDone })).not.toThrow();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('works with a custom ease (still calls onStep(1))', () => {
    const customEase = vi.fn(t => t);
    const onStep = vi.fn();
    tween(300, { ease: customEase, onStep });
    // In reduced-motion mode, ease is bypassed — onStep(1) is called directly
    expect(onStep).toHaveBeenCalledWith(1);
  });
});

describe('tween — reduced-motion OFF (rAF path)', () => {
  beforeEach(() => stubMatchMedia(false));
  afterEach(restoreMatchMedia);

  it('does not throw when called', () => {
    expect(() => tween(300, { onStep: () => {}, onDone: () => {} })).not.toThrow();
  });

  it('does not synchronously call onDone', () => {
    const onDone = vi.fn();
    tween(300, { onStep: () => {}, onDone });
    // rAF is not driven in jsdom, so onDone should NOT have been called yet
    expect(onDone).not.toHaveBeenCalled();
  });
});
