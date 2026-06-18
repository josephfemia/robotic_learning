<template>
  <figure class="lab" :id="'lab-' + id">
    <figcaption class="lab-cap">
      <span class="lab-kicker">INTERACTIVE</span> {{ title }}
    </figcaption>
    <div class="lab-stage" :id="id + '-stage'" ref="stage"></div>
    <div class="lab-controls" :id="id + '-ctrl'" ref="ctrl"></div>
    <p class="lab-note" v-if="note" v-html="note"></p>
  </figure>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({
  /** Widget id — the figure gets id="lab-{id}", stage gets id="{id}-stage", etc. */
  id: {
    type: String,
    required: true,
  },
  /** Caption text (without "INTERACTIVE" prefix — that is added by the template). */
  title: {
    type: String,
    required: true,
  },
  /**
   * Optional HTML string for the .lab-note paragraph.
   * Rendered with v-html; caller is responsible for sanitisation.
   */
  note: {
    type: String,
    default: null,
  },
});

const stage = ref(null);
const ctrl = ref(null);

/**
 * Apply ARIA attributes to any svg/canvas inside .lab-stage.
 *
 * Mirrors the aria pass in the original (lines 3423–3427):
 *   role="img" + aria-label="Interactive: <caption minus INTERACTIVE>"
 *
 * Call this from a widget's onMounted after drawing into the stage element,
 * or let Lab.vue's MutationObserver pick it up automatically.
 */
function applyAria() {
  if (!stage.value) return;
  const label = 'Interactive: ' + props.title;
  const visuals = stage.value.querySelectorAll('svg, canvas');
  for (let i = 0; i < visuals.length; i++) {
    visuals[i].setAttribute('role', 'img');
    visuals[i].setAttribute('aria-label', label);
  }
}

// MutationObserver: watch for svg/canvas being added to the stage and aria-stamp
// them automatically, so widget components don't have to call applyAria() manually.
let _observer = null;

import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  if (!stage.value) return;

  // Apply once in case the widget drew synchronously before we mounted
  nextTick(applyAria);

  _observer = new MutationObserver(() => {
    applyAria();
  });
  _observer.observe(stage.value, { childList: true, subtree: true });
});

onUnmounted(() => {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
});

// Expose refs + helper so parent widget components can:
//   const lab = ref(null);  // <Lab ref="lab" .../>
//   lab.value.stage   — the stage div
//   lab.value.ctrl    — the controls div
//   lab.value.applyAria() — manual trigger
defineExpose({ stage, ctrl, applyAria });
</script>
