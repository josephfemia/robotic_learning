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

    <!-- Nav — exact structure from reference lines ~298–319 -->
    <nav class="nav" id="nav">
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
import ProgressBar from './ProgressBar.vue';
import { NAV_GROUPS } from '../data/nav.js';
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
</script>
