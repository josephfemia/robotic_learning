<template>
  <section class="lecture" id="review" ref="rootEl">
    <div class="lecture-head"><span class="ltag">PRACTICE</span><h2>Review mode</h2><p class="dek">Every self-check question from all twelve lectures, gathered in one place for spaced review. Answers reveal on tap, exactly as in the lectures. Use this before an exam or to find the topics that have gone stale.</p></div>
    <div class="meta-strip"><span class="chip"><b>Source</b> all lecture quizzes</span><span class="chip"><b>Tip</b> shuffle, then revisit what you miss</span></div>

    <!-- ReviewDeck renders both #reviewBar (toggles + score + notice) and #reviewDeck (questions) -->
    <ReviewDeck />

    <div class="complete-bar">
      <Pager prev="start" next="l1" prevLabel="← Start" nextLabel="Go to L01 →" @navigate="$emit('navigate', $event)" />
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { renderMath } from '../composables/useKaTeX.js';
import { applyXref } from '../composables/useXref.js';
import ReviewDeck from '../components/ReviewDeck.vue';
import Pager from '../components/Pager.vue';

defineEmits(['navigate']);

const rootEl = ref(null);

onMounted(async () => {
  await nextTick();
  if (rootEl.value) {
    renderMath(rootEl.value);
    applyXref(rootEl.value);
  }
});
</script>
