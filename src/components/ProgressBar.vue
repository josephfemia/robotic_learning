<template>
  <!-- Matches .progress-wrap markup from reference lines ~294–297 -->
  <div class="progress-wrap">
    <div class="progress-label">
      <span>Policy improvement</span>
      <b><span>{{ completedCount }}</span>/12 iterations</b>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: fillWidth }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useProgress } from '../composables/useProgress.js';

const { completedCount } = useProgress();

const fillWidth = computed(() => `${(completedCount.value / 12) * 100}%`);
</script>
