<template>
  <!-- App shell — matches .app flex layout from reference lines ~287–323 -->
  <!-- TopBar + scrim are outside .app (match reference lines ~281–285) -->
  <TopBar
    :whereLabel="whereLabel"
    :mobileOpen="mobileOpen"
    @menu-toggle="mobileOpen = !mobileOpen"
    @scrim-click="closeDrawer"
  />

  <div class="app">
    <Sidebar
      :activeId="navActiveId"
      :mobileOpen="mobileOpen"
      @navigate="show"
    />

    <main class="main">
      <div class="content">
        <!--
          Section registry: ported sections render their real component;
          unported sections render a stub. All sections stay in the DOM —
          visibility is controlled by the .visible class (mirrors original
          .lecture{display:none} / .lecture.visible{display:block}).
        -->
        <template v-for="item in ALL_NAV_ITEMS" :key="item.id">
          <!-- Ported section: use the real component -->
          <component
            v-if="sectionRegistry[item.id]"
            :is="sectionRegistry[item.id]"
            :class="{ visible: visibleId === item.id }"
            @navigate="show"
          />
          <!-- Stub section: placeholder until ported -->
          <section
            v-else
            class="lecture"
            :class="{ visible: visibleId === item.id }"
            :id="item.id"
          >
            <div class="lecture-head">
              <h2>{{ TITLES[item.id] || item.label }}</h2>
            </div>
            <p>Section content arrives in a later task.</p>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import TopBar from './components/TopBar.vue';
import Sidebar from './components/Sidebar.vue';
import { ALL_NAV_ITEMS, TITLES } from './data/nav.js';

// ── Section registry ─────────────────────────────────────────────────────────
// Add entries here as sections are ported. The key is the nav id; the value is
// the imported component. Unregistered ids fall through to the stub template.
import StartSection from './sections/StartSection.vue';
import PrimerSection from './sections/PrimerSection.vue';
import L1Section from './sections/L1Section.vue';
import L2Section from './sections/L2Section.vue';
import L3Section from './sections/L3Section.vue';
import L4Section from './sections/L4Section.vue';
import L5Section from './sections/L5Section.vue';
import L6Section from './sections/L6Section.vue';
import L7Section from './sections/L7Section.vue';
import L8Section from './sections/L8Section.vue';
import L9Section from './sections/L9Section.vue';
import L10Section from './sections/L10Section.vue';
import L11Section from './sections/L11Section.vue';
import L12Section from './sections/L12Section.vue';
import ReviewSection from './sections/ReviewSection.vue';

const sectionRegistry = {
  start: StartSection,
  primer: PrimerSection,
  l1: L1Section,
  l2: L2Section,
  l3: L3Section,
  l4: L4Section,
  l5: L5Section,
  l6: L6Section,
  l7: L7Section,
  l8: L8Section,
  l9: L9Section,
  l10: L10Section,
  l11: L11Section,
  l12: L12Section,
  review: ReviewSection,
};

// ── Reactive state ────────────────────────────────────────────────────────────
// Faithful to the original: the start *content* is statically visible on load,
// but NO nav button is highlighted until the user navigates. So we decouple the
// visible section (defaults to 'start') from the nav-active highlight (empty on
// load). See DRIFT_FIXME.md — the original never initializes the active nav state.
const visibleId = ref('start');
const navActiveId = ref('');
const mobileOpen = ref(false);

// Derived topbar label — original's #whereLabel is statically "Start here" on load
// and set to TITLES[id] on navigation; both map to the visible section.
const whereLabel = computed(() => TITLES[visibleId.value] || visibleId.value);

// Matches show(id) from original IIFE (lines ~2261–2273):
// shows target section, toggles .active on its nav btn, sets whereLabel, closes drawer, scrolls top
function show(id) {
  visibleId.value = id;
  navActiveId.value = id;
  closeDrawer();
  window.scrollTo(0, 0);
}

function closeDrawer() {
  mobileOpen.value = false;
}

// ── Global data-go click delegation ──────────────────────────────────────────
// Mirrors the original's document-level click handler for [data-go] elements
// (lines ~2352–2353). Handles xref anchors inserted by applyXref, plus any
// other [data-go] elements in the DOM.
function handleDataGo(ev) {
  const target = ev.target.closest('[data-go]');
  if (target) {
    ev.preventDefault();
    show(target.getAttribute('data-go'));
  }
}

onMounted(() => {
  document.addEventListener('click', handleDataGo);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDataGo);
});
</script>
