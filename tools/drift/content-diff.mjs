#!/usr/bin/env node
/**
 * tools/drift/content-diff.mjs
 *
 * Compare the visible text content of two HTML files after whitespace
 * normalisation. Used in the drift workflow to verify that the new Vue app
 * renders the same prose as the frozen reference.
 *
 * Usage:
 *   node tools/drift/content-diff.mjs <reference.html> <new-app.html>
 *
 * Output:
 *   - Reports character-identical match → exits 0
 *   - Prints first divergence with ±3-word context → exits 1
 *
 * Extraction strategy:
 *   1. Parse with jsdom (no script execution)
 *   2. Remove <script>, <style>, <noscript> subtrees
 *   3. Walk text nodes, join, collapse all whitespace to single spaces
 *   4. Compare the resulting strings
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract normalised visible text from an HTML string.
 * Drops script/style/noscript content, collapses whitespace.
 *
 * @param {string} html
 * @returns {string}
 */
function extractText(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Remove invisible subtrees
  for (const tag of ['script', 'style', 'noscript', 'template']) {
    for (const el of [...doc.querySelectorAll(tag)]) {
      el.remove();
    }
  }

  // Walk all text nodes under body (fall back to documentElement if no body)
  const root = doc.body || doc.documentElement;
  const parts = [];

  function walk(node) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      const t = node.textContent;
      if (t.trim()) parts.push(t);
    } else {
      for (const child of node.childNodes) walk(child);
    }
  }

  walk(root);

  // Join and collapse runs of whitespace (spaces, tabs, newlines)
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Return a short snippet (±contextChars chars) around position pos in str.
 */
function snippet(str, pos, contextChars = 120) {
  const start = Math.max(0, pos - contextChars);
  const end = Math.min(str.length, pos + contextChars);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < str.length ? '…' : '';
  return prefix + str.slice(start, end) + suffix;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const [, , refPath, newPath] = process.argv;

if (!refPath || !newPath) {
  console.error('Usage: node tools/drift/content-diff.mjs <reference.html> <new-app.html>');
  process.exit(2);
}

for (const p of [refPath, newPath]) {
  if (!fs.existsSync(path.resolve(p))) {
    console.error(`File not found: ${p}`);
    process.exit(1);
  }
}

const refHtml = fs.readFileSync(path.resolve(refPath), 'utf8');
const newHtml = fs.readFileSync(path.resolve(newPath), 'utf8');

const refText = extractText(refHtml);
const newText = extractText(newHtml);

console.log();
console.log(`Reference : ${refPath}  (${refText.length} chars after normalisation)`);
console.log(`New app   : ${newPath}  (${newText.length} chars after normalisation)`);
console.log();

if (refText === newText) {
  console.log('MATCH — visible text is character-identical after whitespace normalisation.');
  process.exit(0);
}

// Find first divergence
let divPos = 0;
const minLen = Math.min(refText.length, newText.length);
while (divPos < minLen && refText[divPos] === newText[divPos]) divPos++;

console.log(`MISMATCH — first divergence at character position ${divPos}.`);
console.log();
console.log('--- Reference (around divergence):');
console.log(snippet(refText, divPos));
console.log();
console.log('+++ New app  (around divergence):');
console.log(snippet(newText, divPos));
console.log();

if (refText.length !== newText.length) {
  console.log(`Length difference: reference=${refText.length}, new-app=${newText.length} (Δ=${newText.length - refText.length})`);
}

process.exit(1);
