<template>
  <!-- Matches .sidebar / aside#sidebar markup from reference lines ~288–320 -->
  <aside class="sidebar" :class="{ open: mobileOpen }" id="sidebar">
    <!-- Brand block — exact text from reference lines ~289–293 -->
    <div class="brand">
      <div class="eyebrow" style="color:#8A93A3">ETH Zürich · 263-5911-00L · Spring 2026</div>
      <h1>Robot Learning<br>Study Companion</h1>
      <div class="sub">
        From Fundamentals to Foundation Models<br>
        Lectures by Oier Mees · Notes built for an ML + actuarial background
      </div>
    </div>

    <!-- Progress bar component -->
    <ProgressBar />

    <!-- Jump to next unfinished lecture (keyboard a11y affordance) -->
    <div class="next-unfinished-wrap">
      <button
        class="toggle-btn next-unfinished-btn"
        :disabled="!nextUnfinishedId"
        @click="$emit('navigate', nextUnfinishedId)"
      >
        {{ nextUnfinishedId ? 'Jump to next unfinished →' : 'All lectures complete ✓' }}
      </button>
    </div>

    <!-- Nav — exact structure from reference lines ~298–319 -->
    <nav class="nav" id="nav" @keydown="onNavKeydown">
      <template v-for="group in NAV_GROUPS" :key="group.header">
        <div class="nav-group">{{ group.header }}</div>
        <button
          v-for="item in group.items"
          :key="item.id"
          :data-target="item.id"
          :class="{ active: activeId === item.id, 'is-done': completed.has(item.id) }"
          @click="$emit('navigate', item.id)"
        >
<span class="idx">{{ item.idx }}</span>{{ item.label }}<span v-if="item.id !== 'review'" class="done-mark">✓</span>
        </button>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import ProgressBar from './ProgressBar.vue';
import { NAV_GROUPS, LECTURES } from '../data/nav.js';
import { useProgress } from '../composables/useProgress.js';

const { completed } = useProgress();

defineProps({
  activeId: {
    type: String,
    required: true,
  },
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['navigate']);

// First lecture not yet completed; falls back to 'review' when all are done,
// and to '' (button disabled) when review would have nothing left to offer.
const nextUnfinishedId = computed(() => {
  const next = LECTURES.find(id => !completed.has(id));
  return next || (completed.has('review') ? '' : 'review');
});

// Roving arrow-key navigation: ArrowUp/Down move focus between nav buttons
// (wrapping at the ends), Home/End jump to first/last. Enter/Space activation
// stays native. The tab order is otherwise unchanged.
function onNavKeydown(ev) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(ev.key)) return;

  const buttons = Array.from(ev.currentTarget.querySelectorAll('button'));
  if (!buttons.length) return;

  const current = buttons.indexOf(document.activeElement);
  let next;
  if (ev.key === 'Home') {
    next = 0;
  } else if (ev.key === 'End') {
    next = buttons.length - 1;
  } else if (ev.key === 'ArrowDown') {
    next = current < 0 ? 0 : (current + 1) % buttons.length;
  } else {
    next = current < 0 ? buttons.length - 1 : (current - 1 + buttons.length) % buttons.length;
  }

  ev.preventDefault();
  buttons[next].focus();
}
</script>

<style scoped>
/* Spacing for the next-unfinished affordance; matches .progress-wrap padding
   and the sidebar divider tone. Button visuals reuse the global .toggle-btn. */
.next-unfinished-wrap {
  padding: 14px 24px;
  border-bottom: 1px solid #2A3140;
}
.next-unfinished-btn {
  margin-top: 0;
  width: 100%;
}
.next-unfinished-btn:disabled {
  cursor: default;
  opacity: 0.6;
}
</style>
