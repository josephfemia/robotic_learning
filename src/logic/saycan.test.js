import { describe, it, expect } from 'vitest';
import { skillTable, score, scoredSkills } from './saycan.js';

// ----------------------------------------------------------------
// skillTable
// ----------------------------------------------------------------
describe('skillTable', () => {
  it('returns 6 skills', () => {
    expect(skillTable(true)).toHaveLength(6);
    expect(skillTable(false)).toHaveLength(6);
  });

  it('sponge=true: pick-up-sponge has high affordance (0.90)', () => {
    const S = skillTable(true);
    const spongeSkill = S.find(s => s.n === 'pick up the sponge');
    expect(spongeSkill.aff).toBeCloseTo(0.90, 10);
  });

  it('sponge=false: pick-up-sponge affordance collapses to 0.04', () => {
    const S = skillTable(false);
    const spongeSkill = S.find(s => s.n === 'pick up the sponge');
    expect(spongeSkill.aff).toBeCloseTo(0.04, 10);
  });

  it('sponge=true: wipe-the-spill affordance is 0.80', () => {
    const S = skillTable(true);
    const wipe = S.find(s => s.n === 'wipe the spill');
    expect(wipe.aff).toBeCloseTo(0.80, 10);
  });

  it('sponge=false: wipe-the-spill affordance is 0.10', () => {
    const S = skillTable(false);
    const wipe = S.find(s => s.n === 'wipe the spill');
    expect(wipe.aff).toBeCloseTo(0.10, 10);
  });

  it('sponge flag does not affect skills that do not need a sponge', () => {
    const St = skillTable(true);
    const Sf = skillTable(false);
    const towelTrue = St.find(s => s.n === 'pick up the towel');
    const towelFalse = Sf.find(s => s.n === 'pick up the towel');
    expect(towelTrue.aff).toBeCloseTo(towelFalse.aff, 10);
    const tableTrue = St.find(s => s.n === 'go to the table');
    const tableFalse = Sf.find(s => s.n === 'go to the table');
    expect(tableTrue.aff).toBeCloseTo(tableFalse.aff, 10);
  });
});

// ----------------------------------------------------------------
// score (individual skill scorer)
// ----------------------------------------------------------------
describe('score', () => {
  it('returns llm × aff', () => {
    expect(score({ llm: 0.95, aff: 0.90 })).toBeCloseTo(0.855, 10);
    expect(score({ llm: 0.92, aff: 0.80 })).toBeCloseTo(0.736, 10);
    expect(score({ llm: 0.70, aff: 0.85 })).toBeCloseTo(0.595, 10);
  });

  it('high LLM + infeasible affordance → near-zero score', () => {
    // "pick up the sponge" with sponge absent: llm=0.95, aff=0.04
    expect(score({ llm: 0.95, aff: 0.04 })).toBeCloseTo(0.038, 10);
  });

  it('low LLM + high affordance → still low score', () => {
    // "pour a drink": llm=0.05, aff=0.60
    expect(score({ llm: 0.05, aff: 0.60 })).toBeCloseTo(0.030, 10);
  });
});

// ----------------------------------------------------------------
// scoredSkills — pinned product values from the original IIFE
// ----------------------------------------------------------------
describe('scoredSkills — sponge present (default scenario)', () => {
  it('pick up the sponge scores 0.95 × 0.90 = 0.855', () => {
    const S = scoredSkills(true);
    const s = S.find(sk => sk.n === 'pick up the sponge');
    expect(s.score).toBeCloseTo(0.855, 10);
  });

  it('wipe the spill scores 0.92 × 0.80 = 0.736', () => {
    const S = scoredSkills(true);
    const s = S.find(sk => sk.n === 'wipe the spill');
    expect(s.score).toBeCloseTo(0.736, 10);
  });

  it('pick up the towel scores 0.70 × 0.85 = 0.595', () => {
    const S = scoredSkills(true);
    const s = S.find(sk => sk.n === 'pick up the towel');
    expect(s.score).toBeCloseTo(0.595, 10);
  });

  it('find a cleaning tool scores 0.55 × 0.88 = 0.484', () => {
    const S = scoredSkills(true);
    const s = S.find(sk => sk.n === 'find a cleaning tool');
    expect(s.score).toBeCloseTo(0.484, 10);
  });

  it('go to the table scores 0.30 × 0.95 = 0.285', () => {
    const S = scoredSkills(true);
    const s = S.find(sk => sk.n === 'go to the table');
    expect(s.score).toBeCloseTo(0.285, 10);
  });

  it('pour a drink scores 0.05 × 0.60 = 0.030', () => {
    const S = scoredSkills(true);
    const s = S.find(sk => sk.n === 'pour a drink');
    expect(s.score).toBeCloseTo(0.030, 10);
  });

  it('pick-up-sponge is the top-ranked skill when sponge is present', () => {
    const S = scoredSkills(true);
    const sorted = S.slice().sort((a, b) => b.score - a.score);
    expect(sorted[0].n).toBe('pick up the sponge');
  });
});

describe('scoredSkills — sponge absent', () => {
  it('pick up the sponge collapses to 0.95 × 0.04 = 0.038', () => {
    const S = scoredSkills(false);
    const s = S.find(sk => sk.n === 'pick up the sponge');
    expect(s.score).toBeCloseTo(0.038, 10);
  });

  it('wipe the spill collapses to 0.92 × 0.10 = 0.092', () => {
    const S = scoredSkills(false);
    const s = S.find(sk => sk.n === 'wipe the spill');
    expect(s.score).toBeCloseTo(0.092, 10);
  });

  it('pick up the towel is now the top-ranked skill (sponge absent)', () => {
    // Without sponge: towel=0.595, cleaning tool=0.484, sponge=0.038, wipe=0.092
    const S = scoredSkills(false);
    const sorted = S.slice().sort((a, b) => b.score - a.score);
    expect(sorted[0].n).toBe('pick up the towel');
  });

  it('sponge-requiring skills drop well below towel when sponge absent', () => {
    const S = scoredSkills(false);
    const spongeScore = S.find(sk => sk.n === 'pick up the sponge').score;
    const towelScore = S.find(sk => sk.n === 'pick up the towel').score;
    expect(spongeScore).toBeLessThan(towelScore);
  });
});
