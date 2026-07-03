// useProgress.js — reactive progress state via the window.storage shim (src/storage.js; localStorage-backed)
// Verbatim logic from reference/robot-learning-companion.html lines ~2300–2333

import { reactive, computed } from 'vue';
import { LECTURES } from '../data/nav.js';

const KEY = 'rlc-progress-v1';

// Module-level singleton so all components share the same reactive state
const completed = reactive(new Set());
let loaded = false;

function save() {
  if (window.storage && typeof window.storage.set === 'function') {
    try {
      const p = window.storage.set(KEY, JSON.stringify([...completed]));
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  }
  // No localStorage fallback — in-memory state remains as the fallback
}

function load() {
  if (loaded) return;
  loaded = true;

  if (window.storage && typeof window.storage.get === 'function') {
    try {
      window.storage.get(KEY).then(function (res) {
        if (res && res.value) {
          try {
            const arr = JSON.parse(res.value);
            for (const id of arr) completed.add(id);
          } catch (e) {}
        }
      }).catch(function () {});
    } catch (e) {}
  }
  // If window.storage is absent the in-memory set stays empty — that is the fallback
}

function toggleComplete(id) {
  if (!id) return;
  if (completed.has(id)) {
    completed.delete(id);
  } else {
    completed.add(id);
  }
  save();
}

// Trigger load once on first composable use
load();

export function useProgress() {
  const completedCount = computed(() =>
    LECTURES.filter(id => completed.has(id)).length
  );

  return {
    completed,
    completedCount,
    toggleComplete,
    load,
    save,
  };
}
