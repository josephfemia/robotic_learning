/**
 * useXref — cross-reference autolinker
 *
 * Reproduces the IIFE in robot-learning-companion.html ~lines 3388–3421
 * but scoped to a rootEl (a section element) instead of document.
 *
 * Export: applyXref(rootEl)
 */

import { idFor, makeXrefRe } from '../data/xrefs.js';

/**
 * Wraps the matched text in an <a class="xref" data-go="id"> anchor.
 * @param {string} id   - target section id
 * @param {string} text - display text (the matched string)
 * @returns {HTMLAnchorElement}
 */
function wrap(id, text) {
  const a = document.createElement('a');
  a.className = 'xref';
  a.setAttribute('data-go', id);
  a.textContent = text;
  return a;
}

/**
 * Applies cross-reference linking inside rootEl, scoped to
 * p, li, and td descendants (mirroring '.lecture p, .lecture li, .lecture td').
 *
 * Skip rules (identical to original):
 *   - host element is inside a .bridge  → skip entire host
 *   - text node's parent is inside an <a>  → skip (idempotency / existing anchors)
 *   - text node's parent is inside .katex, code, .recap-box, .callout,
 *     .lab-note, script, style → skip
 *
 * Safe to run after KaTeX render: the .katex skip prevents reprocessing.
 * Idempotent: existing <a> parents are skipped.
 *
 * @param {Element} rootEl - the section root element
 */
export function applyXref(rootEl) {
  const hosts = rootEl.querySelectorAll('p, li, td');

  for (const host of hosts) {
    // Skip hosts inside a bridge
    if (host.closest('.bridge')) continue;

    // Collect all text nodes first (walker is invalidated by DOM mutation)
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (const node of textNodes) {
      if (!node.nodeValue) continue;
      // Skip if inside an existing anchor (idempotency guard)
      if (node.parentNode.closest('a')) continue;
      // Skip if inside katex, code, or other excluded containers
      if (node.parentNode.closest('.katex, code, .recap-box, .callout, .lab-note, script, style')) continue;

      const s = node.nodeValue;
      const re = makeXrefRe();

      // Quick test before allocating a fragment
      re.lastIndex = 0;
      if (!re.test(s)) continue;
      re.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      let m;

      while ((m = re.exec(s)) !== null) {
        const whole = m[0];
        const startIdx = m.index;
        let primary = null;

        if (m[6]) {
          primary = 'primer';          // "the Primer"
        } else if (m[2]) {
          primary = idFor[m[2]];       // "Lecture N" / "Lectures N–M"
        } else if (m[5]) {
          primary = idFor[m[5]];       // bare "LN" followed by ) ] . , ; :
        }

        if (!primary) continue;

        if (startIdx > last) {
          frag.appendChild(document.createTextNode(s.slice(last, startIdx)));
        }
        frag.appendChild(wrap(primary, whole));
        last = startIdx + whole.length;
      }

      if (last > 0) {
        if (last < s.length) {
          frag.appendChild(document.createTextNode(s.slice(last)));
        }
        node.parentNode.replaceChild(frag, node);
      }
    }
  }
}
