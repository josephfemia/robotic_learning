<template>
  <div class="quiz">
    <Question
      v-for="q in sectionQuestions"
      :key="q.id"
      :question="q"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Question from './Question.vue';
import quizzes from '../data/quizzes.js';

const props = defineProps({
  /** The lecture section id, e.g. 'primer', 'l1' … 'l12' */
  lecture: {
    type: String,
    required: true,
  },
});

/** Questions for this lecture in original document order */
const sectionQuestions = computed(() =>
  quizzes.filter(q => q.src === props.lecture)
);
</script>
