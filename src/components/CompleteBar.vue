<template>
  <!--
    CompleteBar — renders the original .complete-bar:
      <div class="complete-bar">
        <button class="complete-btn" data-id="<id>">…</button>
        <div class="pager">…</div>
      </div>

    Button label/class mirrors the original applyProgress() logic:
      done  → '✓ ' + LABELS[id] + ' completed — tap to undo'  + class .done
      !done → 'Mark ' + LABELS[id] + ' complete'
  -->
  <div class="complete-bar">
    <button
      class="complete-btn"
      :class="{ done: isDone }"
      @click="toggleComplete(id)"
    >{{ btnLabel }}</button>
    <Pager
      :prev="prev"
      :next="next"
      :prevLabel="prevLabel"
      :nextLabel="nextLabel"
      @navigate="$emit('navigate', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Pager from './Pager.vue';
import { useProgress } from '../composables/useProgress.js';
import { LABELS } from '../data/nav.js';

const props = defineProps({
  /** This section's id */
  id: {
    type: String,
    required: true,
  },
  /** Prev section id for Pager (null to hide) */
  prev: {
    type: String,
    default: null,
  },
  /** Next section id for Pager (null to hide) */
  next: {
    type: String,
    default: null,
  },
  /** Label for the prev button */
  prevLabel: {
    type: String,
    default: '← BACK',
  },
  /** Label for the next button */
  nextLabel: {
    type: String,
    default: 'NEXT →',
  },
});

defineEmits(['navigate']);

const { completed, toggleComplete } = useProgress();

const isDone = computed(() => completed.has(props.id));

/**
 * Mirrors original applyProgress() button text logic:
 *   done  → '✓ ' + LABELS[id] + ' completed — tap to undo'
 *   !done → 'Mark ' + LABELS[id] + ' complete'
 */
const btnLabel = computed(() => {
  const label = LABELS[props.id] || props.id;
  return isDone.value
    ? `✓ ${label} completed — tap to undo`
    : `Mark ${label} complete`;
});
</script>
