<template>
  <div
    class="q"
    :class="{ answered }"
    :data-correct="question.correct"
  >
    <!-- review-tag slot: ReviewDeck prepends a .review-tag element via wrapper -->
    <slot name="tag" />

    <p class="q-text" v-html="question.question" />

    <button
      v-for="opt in question.options"
      :key="opt.k"
      class="opt"
      :class="optClass(opt.k)"
      :data-k="opt.k"
      @click="handleClick(opt.k)"
    >
      <span class="ok">{{ opt.k.toUpperCase() }}</span
      ><span v-html="opt.html" />
    </button>

    <div class="expl" v-html="question.expl" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  /** A question object from quizzes.js */
  question: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['graded']);

const answered = ref(false);
const chosenKey = ref(null);

/**
 * Returns the CSS class(es) to add to an option button once answered.
 * - Correct option always gets .right
 * - The chosen option (if wrong) gets .wrong
 */
function optClass(k) {
  if (!answered.value) return {};
  return {
    right: k === props.question.correct,
    wrong: k === chosenKey.value && k !== props.question.correct,
  };
}

function handleClick(k) {
  if (answered.value) return;
  answered.value = true;
  chosenKey.value = k;
  emit('graded', { correct: k === props.question.correct });
}
</script>
