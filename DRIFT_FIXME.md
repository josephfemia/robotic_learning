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
