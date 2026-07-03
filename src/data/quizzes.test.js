import { describe, it, expect } from 'vitest';
import quizzes, { SOURCE_LABELS, REVIEW_ORDER } from './quizzes.js';

const VALID_SRC_IDS = ['primer', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12'];

describe('quizzes data', () => {
  it('exports exactly 42 questions', () => {
    expect(quizzes.length).toBe(42);
  });

  it('every question has a correct key matching one of its options', () => {
    for (const q of quizzes) {
      const keys = q.options.map(o => o.k);
      expect(keys, `question ${q.id} correct="${q.correct}" not in options [${keys}]`).toContain(q.correct);
    }
  });

  it('every question has between 2 and 5 options', () => {
    for (const q of quizzes) {
      expect(q.options.length, `question ${q.id} has ${q.options.length} options`).toBeGreaterThanOrEqual(2);
      expect(q.options.length, `question ${q.id} has ${q.options.length} options`).toBeLessThanOrEqual(5);
    }
  });

  it('every question src is a valid lecture id', () => {
    for (const q of quizzes) {
      expect(VALID_SRC_IDS, `question ${q.id} has invalid src="${q.src}"`).toContain(q.src);
    }
  });

  it('no duplicate question ids', () => {
    const ids = quizzes.map(q => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every question has required fields: id, src, correct, question, options, expl', () => {
    for (const q of quizzes) {
      expect(q.id, `missing id`).toBeTruthy();
      expect(q.src, `missing src on ${q.id}`).toBeTruthy();
      expect(q.correct, `missing correct on ${q.id}`).toBeTruthy();
      expect(q.question, `missing question on ${q.id}`).toBeTruthy();
      expect(Array.isArray(q.options), `options not array on ${q.id}`).toBe(true);
      expect(q.expl, `missing expl on ${q.id}`).toBeTruthy();
    }
  });

  it('every option has k and html fields', () => {
    for (const q of quizzes) {
      for (const opt of q.options) {
        expect(opt.k, `missing k on option of ${q.id}`).toBeTruthy();
        expect(typeof opt.html, `html not string on option of ${q.id}`).toBe('string');
      }
    }
  });

  it('question counts per lecture match expected distribution', () => {
    const counts = {};
    for (const q of quizzes) {
      counts[q.src] = (counts[q.src] || 0) + 1;
    }
    expect(counts.primer).toBe(4);
    expect(counts.l1).toBe(3);
    expect(counts.l2).toBe(3);
    expect(counts.l3).toBe(3);
    expect(counts.l4).toBe(4);
    expect(counts.l5).toBe(4);
    expect(counts.l6).toBe(3);
    expect(counts.l7).toBe(3);
    expect(counts.l8).toBe(3);
    expect(counts.l9).toBe(3);
    expect(counts.l10).toBe(3);
    expect(counts.l11).toBe(3);
    expect(counts.l12).toBe(3);
  });

  it('SOURCE_LABELS exports all 13 source ids', () => {
    for (const id of VALID_SRC_IDS) {
      expect(SOURCE_LABELS[id], `SOURCE_LABELS missing key "${id}"`).toBeTruthy();
    }
  });

  it('REVIEW_ORDER contains all 13 src ids in the correct lecture order', () => {
    expect(REVIEW_ORDER).toEqual([
      'primer', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6',
      'l7', 'l8', 'l9', 'l10', 'l11', 'l12',
    ]);
  });
});
