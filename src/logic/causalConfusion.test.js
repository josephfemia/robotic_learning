import { describe, it, expect } from 'vitest';
import {
  CUES,
  availableCues,
  learnedCue,
  trainingAccuracy,
  deploymentSuccess,
  DEPLOY_SCHEDULE,
  deployStep,
  deployTimeline,
} from './causalConfusion.js';

describe('trainingAccuracy', () => {
  it('is 1.0 when brake-light is included (verbatim from original: incl?1.0:0.92)', () => {
    expect(trainingAccuracy(true)).toBe(1.0);
  });

  it('is 0.92 when brake-light is excluded', () => {
    expect(trainingAccuracy(false)).toBe(0.92);
  });

  it('is higher with the brake-light (spurious shortcut boosts train accuracy)', () => {
    expect(trainingAccuracy(true)).toBeGreaterThan(trainingAccuracy(false));
  });

  it('is exactly the correlation of the learned cue (mechanism, not a separate constant)', () => {
    expect(trainingAccuracy(true)).toBe(CUES[learnedCue(true)].corr);
    expect(trainingAccuracy(false)).toBe(CUES[learnedCue(false)].corr);
  });
});

describe('deploymentSuccess', () => {
  it('is 0.06 when brake-light is included (verbatim from original: incl?0.06:0.86)', () => {
    expect(deploymentSuccess(true)).toBe(0.06);
  });

  it('is 0.86 when brake-light is excluded', () => {
    expect(deploymentSuccess(false)).toBe(0.86);
  });

  it('is much lower with the brake-light than without (the core causal confusion claim)', () => {
    expect(deploymentSuccess(false)).toBeGreaterThan(deploymentSuccess(true));
  });

  it('the paradox holds: high train accuracy coexists with catastrophic deployment', () => {
    // The entire point of the widget: train↑ while deploy↓
    expect(trainingAccuracy(true)).toBeGreaterThan(trainingAccuracy(false));
    expect(deploymentSuccess(true)).toBeLessThan(deploymentSuccess(false));
  });
});

describe('learnedCue — which arrow the cloned policy attaches to', () => {
  it('the brake-light is a strictly stronger correlate than the true cause', () => {
    // Why the shortcut wins: it is an effect of the action itself.
    expect(CUES.brakeLight.corr).toBeGreaterThan(CUES.pedestrian.corr);
  });

  it('with the brake-light observable, the policy attaches to it (the shortcut)', () => {
    expect(availableCues(true)).toContain('brakeLight');
    expect(learnedCue(true)).toBe('brakeLight');
  });

  it('with the brake-light hidden, the policy is forced onto the real cause', () => {
    expect(availableCues(false)).toEqual(['pedestrian']);
    expect(learnedCue(false)).toBe('pedestrian');
  });
});

describe('deployStep — one closed-loop decision with no expert in the loop', () => {
  it('the lamp is never lit at decision time (nobody is braking to light it)', () => {
    expect(deployStep('brakeLight', true).lightOn).toBe(false);
    expect(deployStep('pedestrian', true).lightOn).toBe(false);
  });

  it('a light-reading policy never brakes → pedestrian step is a crash', () => {
    const s = deployStep('brakeLight', true);
    expect(s.brakes).toBe(false);
    expect(s.outcome).toBe('crash');
  });

  it('a pedestrian-reading policy brakes when it matters', () => {
    const s = deployStep('pedestrian', true);
    expect(s.brakes).toBe(true);
    expect(s.outcome).toBe('braked');
  });

  it('empty road is a cruise for both policies', () => {
    expect(deployStep('brakeLight', false).outcome).toBe('cruise');
    expect(deployStep('pedestrian', false).outcome).toBe('cruise');
  });
});

describe('deployTimeline — the deterministic strip the widget replays', () => {
  it('the schedule is 8 steps with pedestrians at t3 and t6', () => {
    expect(DEPLOY_SCHEDULE).toHaveLength(8);
    expect(DEPLOY_SCHEDULE.filter(Boolean)).toHaveLength(2);
    expect(DEPLOY_SCHEDULE[2]).toBe(true);
    expect(DEPLOY_SCHEDULE[5]).toBe(true);
  });

  it('with the shortcut: the light never illuminates, the car never brakes, every pedestrian is hit', () => {
    const strip = deployTimeline(true);
    expect(strip.every((s) => !s.lightOn)).toBe(true);
    expect(strip.every((s) => !s.brakes)).toBe(true);
    expect(strip.filter((s) => s.outcome === 'crash')).toHaveLength(2);
    expect(strip.some((s) => s.outcome === 'braked')).toBe(false);
  });

  it('with the shortcut hidden: brakes exactly at pedestrian steps, zero crashes', () => {
    const strip = deployTimeline(false);
    strip.forEach((s) => expect(s.brakes).toBe(s.pedestrian));
    expect(strip.filter((s) => s.outcome === 'braked')).toHaveLength(2);
    expect(strip.some((s) => s.outcome === 'crash')).toBe(false);
  });

  it('respects a custom schedule', () => {
    const strip = deployTimeline(false, [true, false]);
    expect(strip).toHaveLength(2);
    expect(strip[0].outcome).toBe('braked');
    expect(strip[1].outcome).toBe('cruise');
  });
});
