import { describe, it, expect, beforeEach } from 'vitest';
import { applyXref } from './useXref.js';

// Helper: create a minimal .lecture root with a <p> containing the given HTML/text
function makeRoot(innerHtml, { inBridge = false, inKatex = false, inCode = false } = {}) {
  const root = document.createElement('div');
  root.className = 'lecture';

  let p = document.createElement('p');

  if (inBridge) {
    const bridge = document.createElement('div');
    bridge.className = 'bridge';
    bridge.appendChild(p);
    root.appendChild(bridge);
  } else {
    root.appendChild(p);
  }

  if (inKatex) {
    const katex = document.createElement('span');
    katex.className = 'katex';
    katex.textContent = innerHtml;
    p.appendChild(katex);
  } else if (inCode) {
    const code = document.createElement('code');
    code.textContent = innerHtml;
    p.appendChild(code);
  } else {
    p.textContent = innerHtml;
  }

  return root;
}

describe('applyXref', () => {
  it('links "Lecture 4" in prose', () => {
    const root = makeRoot('See Lecture 4 for details');
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).not.toBeNull();
    expect(a.getAttribute('data-go')).toBe('l4');
    expect(a.textContent).toBe('Lecture 4');
  });

  it('does NOT link bare "L2" without trailing punctuation', () => {
    const root = makeRoot('the L2 norm penalty');
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).toBeNull();
  });

  it('links "(see L5)" — bare LN followed by )', () => {
    const root = makeRoot('(see L5)');
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).not.toBeNull();
    expect(a.getAttribute('data-go')).toBe('l5');
    expect(a.textContent).toBe('L5');
  });

  it('links "the Primer" to the primer id', () => {
    const root = makeRoot('covered in the Primer.');
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).not.toBeNull();
    expect(a.getAttribute('data-go')).toBe('primer');
    expect(a.textContent).toBe('the Primer');
  });

  it('links "Lectures 4–5" to l4 (primary group)', () => {
    const root = makeRoot('Lectures 4–5 cover RL');
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).not.toBeNull();
    expect(a.getAttribute('data-go')).toBe('l4');
    expect(a.textContent).toBe('Lectures 4–5');
  });

  it('skips a <p> inside a .bridge element', () => {
    const root = makeRoot('See Lecture 4 for details', { inBridge: true });
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).toBeNull();
  });

  it('skips text inside a .katex element', () => {
    const root = makeRoot('Lecture 4', { inKatex: true });
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).toBeNull();
  });

  it('skips text inside a <code> element', () => {
    const root = makeRoot('Lecture 4', { inCode: true });
    applyXref(root);
    const a = root.querySelector('a.xref');
    expect(a).toBeNull();
  });

  it('is idempotent — running twice does not double-wrap', () => {
    const root = makeRoot('See Lecture 7 for details');
    applyXref(root);
    applyXref(root);
    const anchors = root.querySelectorAll('a.xref');
    expect(anchors.length).toBe(1);
  });

  it('links LN followed by ] . , ; :', () => {
    const cases = [
      { text: 'see L3.', expected: 'l3' },
      { text: 'see L6,', expected: 'l6' },
      { text: 'see L9;', expected: 'l9' },
      { text: 'see L10:', expected: 'l10' },
      { text: 'see L11]', expected: 'l11' },
    ];
    for (const { text, expected } of cases) {
      const root = makeRoot(text);
      applyXref(root);
      const a = root.querySelector('a.xref');
      expect(a).not.toBeNull();
      expect(a.getAttribute('data-go')).toBe(expected);
    }
  });
});
