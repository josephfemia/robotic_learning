#!/usr/bin/env node
/**
 * tools/drift/inventory.mjs
 *
 * Structural inventory checker for the Robot Learning Companion HTML.
 *
 * Usage:
 *   node tools/drift/inventory.mjs [path/to/file.html]
 *
 * Defaults to: reference/robot-learning-companion.html
 *
 * Checks:
 *   - nav button[data-target]  → expect 15
 *   - distinct [data-go] values → expect 14
 *   - [id^="lab-"] figures      → expect 29
 *   - .q[data-correct] blocks   → expect 38
 *   - $$ delimiter balance      → expect even count
 *   - \( === \) counts          → expect equal
 *
 * Exits non-zero if any assertion fails.
 * Passes on the frozen reference file.
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// ── CLI arg ──────────────────────────────────────────────────────────────────
const filePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(ROOT, 'reference', 'robot-learning-companion.html');

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const rawHtml = fs.readFileSync(filePath, 'utf8');
const dom = new JSDOM(rawHtml);
const doc = dom.window.document;

// ── Selectors ────────────────────────────────────────────────────────────────
const navBtnCount = doc.querySelectorAll('nav button[data-target]').length;

const dataGoValues = new Set(
  [...doc.querySelectorAll('[data-go]')].map(el => el.getAttribute('data-go'))
);
const dataGoCount = dataGoValues.size;

const labCount = doc.querySelectorAll('[id^="lab-"]').length;

const quizCount = doc.querySelectorAll('.q[data-correct]').length;

// Math delimiter balance (raw text)
const ddMatches = rawHtml.match(/\$\$/g);
const ddCount = ddMatches ? ddMatches.length : 0;
const ddBalanced = ddCount % 2 === 0;

const openParens = (rawHtml.match(/\\\(/g) || []).length;
const closeParens = (rawHtml.match(/\\\)/g) || []).length;
const parensBalanced = openParens === closeParens;

// ── Expected values (for the reference file; same assertions on new-app dump) ─
const EXPECT = {
  navBtns: 15,
  dataGo: 14,
  labs: 29,
  quiz: 38,
};

// ── Report table ─────────────────────────────────────────────────────────────
const COL = 36;
const pad = (s, n) => String(s).padEnd(n);

function row(label, got, expected, pass) {
  const status = pass ? 'PASS' : `FAIL (expected ${expected})`;
  return `  ${pad(label, COL)}  ${pad(got, 6)}  ${status}`;
}

const lines = [
  '',
  `Inventory: ${filePath}`,
  '─'.repeat(72),
  row('nav button[data-target]',    navBtnCount, EXPECT.navBtns, navBtnCount === EXPECT.navBtns),
  row('distinct [data-go] targets', dataGoCount, EXPECT.dataGo,  dataGoCount  === EXPECT.dataGo),
  row('[id^="lab-"] figures',       labCount,    EXPECT.labs,    labCount     === EXPECT.labs),
  row('.q[data-correct] blocks',    quizCount,   EXPECT.quiz,    quizCount    === EXPECT.quiz),
  row('$$ count (must be even)',     ddCount,    'even',         ddBalanced),
  row('\\( count === \\) count',   `${openParens}/${closeParens}`, 'equal', parensBalanced),
  '─'.repeat(72),
];

console.log(lines.join('\n'));

// ── Exit code ────────────────────────────────────────────────────────────────
const failures = [
  navBtnCount !== EXPECT.navBtns,
  dataGoCount  !== EXPECT.dataGo,
  labCount     !== EXPECT.labs,
  quizCount    !== EXPECT.quiz,
  !ddBalanced,
  !parensBalanced,
].filter(Boolean).length;

if (failures > 0) {
  console.error(`\n  ${failures} assertion(s) FAILED — see table above.\n`);
  process.exit(1);
} else {
  console.log('  All assertions PASSED.\n');
}
