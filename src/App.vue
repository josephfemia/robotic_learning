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
      :activeId="activeId"
      :mobileOpen="mobileOpen"
      @navigate="show"
    />

    <main class="main">
      <div class="content">
        <!--
          TASK 6 STUB SECTIONS — replace with real section components in Task 6.
          Each section uses .lecture + .visible toggle to prove nav show/hide + fadein animation.
        -->
        <section
          v-for="item in ALL_NAV_ITEMS"
          :key="item.id"
          class="lecture"
          :class="{ visible: activeId === item.id }"
          :id="item.id"
        >
          <div class="lecture-head">
            <h2>{{ TITLES[item.id] || item.label }}</h2>
          </div>
          <p>Section content arrives in Task 6.</p>
        </section>
        <!-- END TASK 6 STUB SECTIONS -->
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import TopBar from './components/TopBar.vue';
import Sidebar from './components/Sidebar.vue';
import { ALL_NAV_ITEMS, TITLES } from './data/nav.js';

// Reactive state
const activeId = ref('start');
const mobileOpen = ref(false);

// Derived topbar label — matches TITLES[id] lookup from original show()
const whereLabel = computed(() => TITLES[activeId.value] || activeId.value);

// Matches show(id) from original IIFE (lines ~2261–2273):
// hides all .lecture, shows target, toggles .active on nav btn, sets whereLabel, closes drawer, scrolls top
function show(id) {
  activeId.value = id;
  closeDrawer();
  window.scrollTo(0, 0);
}

function closeDrawer() {
  mobileOpen.value = false;
}
</script>
