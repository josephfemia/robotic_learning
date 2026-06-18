<template>
  <!--
    Pager — renders the original .pager prev/next buttons.
    Original: <div class="pager"><button data-go="<id>">LABEL</button>…</div>
    Here: emits 'navigate' with the target id instead of calling global show().
  -->
  <div class="pager">
    <button
      v-if="prev !== null"
      :disabled="prev === null"
      @click="$emit('navigate', prev)"
    >{{ prevLabel }}</button>
    <button
      v-if="next !== null"
      :disabled="next === null"
      @click="$emit('navigate', next)"
    >{{ nextLabel }}</button>
  </div>
</template>

<script setup>
defineProps({
  /** Target section id for the prev button, or null to hide it */
  prev: {
    type: String,
    default: null,
  },
  /** Target section id for the next button, or null to hide it */
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
</script>
