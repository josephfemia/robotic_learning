# Drift Verification Tools

These scripts verify that the new Vue app stays faithful to the frozen reference
(`reference/robot-learning-companion.html`) throughout the migration.

---

## Scripts

### `inventory.mjs` — Structural inventory checker

Parses an HTML file with jsdom and asserts the expected structural counts:

| Selector | Expected |
|---|---|
| `nav button[data-target]` | 15 |
| distinct `[data-go]` targets | 14 |
| `[id^="lab-"]` figures | 29 |
| `.q[data-correct]` blocks | 38 |
| `$$` delimiters | even count |
| `\(` === `\)` | equal counts |

```
node tools/drift/inventory.mjs [path/to/file.html]
# Default: reference/robot-learning-companion.html
npm run drift                   # same, via package.json
```

Exits 0 on full pass, non-zero if any assertion fails.

### `content-diff.mjs` — Visible-text comparison

Extracts normalised visible text (strips script/style, collapses whitespace)
from two HTML files and reports whether they are character-identical. On
mismatch, prints the first divergence with surrounding context.

```
node tools/drift/content-diff.mjs <reference.html> <new-app.html>
```

Exits 0 on match, 1 on mismatch, 2 on usage error.

---

## Drift Workflow (per section / lecture)

The workflow uses the Playwright MCP server to drive a real browser for
rendering, then the two scripts above for structural and textual verification,
and finally a manual pixel-diff step.

### 1. Serve both versions

Start the frozen reference on a static server (e.g. port 4000) and the dev
app on its default Vite dev server (port 5173):

```bash
# Terminal A — reference (static)
npx serve reference/ --listen 4000

# Terminal B — dev app
npm run dev          # http://localhost:5173
```

### 2. Navigate to a section and save DOM dumps

Use the Playwright MCP tool to open each URL, navigate to the target section
(click the sidebar nav button or append `#sectionId`), wait for all widgets
to render, then save the outer HTML:

```
playwright navigate http://localhost:4000/robot-learning-companion.html
playwright evaluate document.documentElement.outerHTML → save to /tmp/ref-l4.html
playwright navigate http://localhost:5173/#l4
playwright evaluate document.documentElement.outerHTML → save to /tmp/new-l4.html
```

### 3. Run structural inventory on each dump

```bash
node tools/drift/inventory.mjs /tmp/ref-l4.html
node tools/drift/inventory.mjs /tmp/new-l4.html
```

Both must print "All assertions PASSED."

### 4. Run content diff

```bash
node tools/drift/content-diff.mjs /tmp/ref-l4.html /tmp/new-l4.html
```

Target: MATCH. Any divergence must be reviewed and either accepted (intentional
rewording) or fixed.

### 5. Visual pixel diff (manual, harsh-critic step)

Take full-page screenshots of both at 1280 × 900 px (or the target viewport):

```
playwright screenshot http://localhost:4000/... → /tmp/ref-l4.png
playwright screenshot http://localhost:5173/#l4  → /tmp/new-l4.png
```

Compare with an image diff tool (e.g. `pixelmatch`, `ImageMagick compare`, or
the browser's built-in DevTools pixel inspector). Tolerance target: near-zero
— every font, spacing, and colour must match the reference exactly. Any visible
difference is a regression and must be fixed before the section is considered
done.

---

## Running on CI

The inventory check runs automatically via `npm run drift` (checks the reference
file). To integrate the full workflow into CI, save rendered HTML dumps as
artefacts from a Playwright test run and then call both scripts in a post-step.
