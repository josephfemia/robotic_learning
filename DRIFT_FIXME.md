# Phase 1 Drift / FIXME log — original bugs to address in Phase 2

Entries are logged here as they are discovered during Phase 1 migration; none are fixed until Phase 2.

---

## 1. No nav item highlighted on initial load (Task 2)

**Original behavior:** On first paint the original highlights *no* sidebar nav button. The `start` section content is shown via a static `class="lecture visible"` (ref line 326), but the `start` nav button has no static `active` class (ref line 300) and `show()` is never called on load — so the active highlight only appears after the first user click.

**Likely a bug/oversight:** the active highlight should track the currently visible section (start) from the beginning.

**Phase 1 decision:** reproduced faithfully — `App.vue` decouples `visibleId` (default `start`) from `navActiveId` (empty until first navigation). Do **not** "fix" in Phase 1.

**Phase 2 fix:** initialize `navActiveId` to `visibleId` ('start') on load so the current section is highlighted immediately.

---

## 2. L4 section numbering skips 4.5 (Task 6)

**Original:** L4 (Reinforcement Learning I) section headings jump from `4.4` directly to `4.6` — there is no `4.5` heading (ref ~lines 976–1143).

**Phase 1 decision:** reproduced faithfully (heading text/knums copied verbatim).

**Phase 2 fix:** renumber 4.6→4.5 (and any later) or add the missing 4.5, as appropriate.

---

## 3. Widget quirks reproduced verbatim (Task 7)

All preserved faithfully in the port; none fixed in Phase 1. Each is behaviorally identical to the original IIFE.

- **`drift` widget** uses raw `Math.random()` in its draw routine, so rollouts re-roll on every redraw (no seed). Matches original "Resample rollouts" behavior; a Phase-2 cleanup could seed it for stable visuals.
- **`grid` value-iteration**: when a neighbor is a wall, the Bellman backup falls back to the current cell's own value (`V[r][c]`) rather than a true stay-in-place. Quirk of the original Russell–Norvig-style setup; reproduced in `logic/gridValueIteration.js`.
- **`bandit` widget**: the original's `run(m)` duplicates the body of `step()` rather than calling it. Harmless duplication, preserved.
- **`reparam` widget**: dot vertical jitter `(Math.random()-0.5)*32` is applied at draw time (not sample time), so dots shift on every redraw. Preserved.
- **`bon` widget**: `Nmax=64` is declared but never used (vestigial). Preserved.
- **`xembod` widget**: `pooledRate` lower clamp to 0.05 is unreachable through the UI (slider min keeps it well above). Dead path, preserved.
- **L8 / L11 numbering & callouts**: minor heading-numbering quirks and one plain `.callout` where a `.callout.miscon` might be expected (L11). Preserved verbatim.

**Phase 2:** address as part of the widget/content polish pass if desired.
