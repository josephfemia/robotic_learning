<template>
  <!-- Score bar and mode toggles -->
  <div id="reviewBar" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:4px 0 14px">
    <button
      class="toggle-btn"
      :class="{ off: !grouped }"
      id="reviewShuffle"
      @click="setShuffle"
    >Shuffle questions</button>
    <button
      class="toggle-btn"
      :class="{ off: grouped }"
      id="reviewGroup"
      @click="setGroup"
    >Group by lecture</button>
    <span
      id="reviewScore"
      style="font-family:var(--mono);font-size:13px;color:var(--cobalt-dark);font-weight:600"
    >{{ scoreText }}</span>
    <span class="notice" style="margin:0">Tap an answer once; the tally updates live.</span>
  </div>

  <!-- Deck -->
  <div id="reviewDeck">
    <template v-if="grouped">
      <template v-for="src in REVIEW_ORDER" :key="src">
        <template v-if="questionsBySrc[src] && questionsBySrc[src].length">
          <p class="review-src">{{ SOURCE_LABELS[src] }}</p>
          <Question
            v-for="q in questionsBySrc[src]"
            :key="'grouped-' + q.id"
            :question="q"
            @graded="onGraded"
          />
        </template>
      </template>
    </template>
    <template v-else>
      <Question
        v-for="item in shuffledDeck"
        :key="'shuffle-' + item.q.id"
        :question="item.q"
        @graded="onGraded"
      >
        <template #tag>
          <span class="review-tag">{{ item.tag }}</span>
        </template>
      </Question>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Question from './Question.vue';
import quizzes, { SOURCE_LABELS, REVIEW_ORDER } from '../data/quizzes.js';

/**
 * Mode tracking.
 *
 * Default: grouped = true  (matches original `var grouped=true`)
 *
 * Toggle button .off class logic (verbatim from original updGroupBtn):
 *   reviewGroup gets .off when grouped === true  (you're already in that mode)
 *   reviewShuffle gets .off when grouped === false (you're already shuffled)
 *
 * Visual: .toggle-btn.off = dark background = the currently active mode.
 */
const grouped = ref(true);

// ── Score tracking ────────────────────────────────────────────────────────────

const totalAnswered = ref(0);
const totalRight = ref(0);

/** Matches original: 'Score: R / A  (of N)' (double-space before "(of") */
const scoreText = computed(() =>
  `Score: ${totalRight.value} / ${totalAnswered.value}  (of ${quizzes.length})`
);

function onGraded({ correct }) {
  totalAnswered.value++;
  if (correct) totalRight.value++;
}

// ── Mode switching ────────────────────────────────────────────────────────────

function setShuffle() {
  if (!grouped.value) return; // already shuffled
  grouped.value = false;
  resetScore();
  buildShuffle();
}

function setGroup() {
  if (grouped.value) return; // already grouped
  grouped.value = true;
  resetScore();
}

function resetScore() {
  totalAnswered.value = 0;
  totalRight.value = 0;
}

// ── Shuffle deck ──────────────────────────────────────────────────────────────

/**
 * Each item: { q: questionObject, tag: string }
 * tag = the part of SOURCE_LABELS before ' · '
 * e.g. 'Primer', 'L01', 'L02' …
 */
const shuffledDeck = ref([]);

function buildShuffle() {
  const items = quizzes.map(q => ({
    q,
    tag: (SOURCE_LABELS[q.src] || q.src).split(' · ')[0],
  }));
  // Fisher–Yates shuffle (verbatim from original)
  for (let a = items.length - 1; a > 0; a--) {
    const b = Math.floor(Math.random() * (a + 1));
    const tmp = items[a];
    items[a] = items[b];
    items[b] = tmp;
  }
  shuffledDeck.value = items;
}

// Pre-build shuffle so it's ready when user switches to that mode
buildShuffle();

// ── Grouped deck helpers ──────────────────────────────────────────────────────

/** Map from src id → questions array, preserving original order */
const questionsBySrc = computed(() => {
  const map = {};
  for (const q of quizzes) {
    if (!map[q.src]) map[q.src] = [];
    map[q.src].push(q);
  }
  return map;
});
</script>
