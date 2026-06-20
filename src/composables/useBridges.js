/**
 * useBridges — bridge panel visibility toggle
 *
 * Reproduces the bridgeToggle logic in robot-learning-companion.html ~lines 3352–3353.
 * The original:
 *   bt.addEventListener('click', function(){
 *     var hidden = document.body.classList.toggle('hide-bridges');
 *     bt.textContent = hidden ? 'Show the finance / actuarial bridges'
 *                             : 'Hide the finance / actuarial bridges';
 *   });
 *
 * CSS rule (already in styles.css, DO NOT modify):
 *   body.hide-bridges .bridge { display: none }
 *
 * Module-level singleton so all consumers (Start-section toggle button,
 * any status indicator, etc.) share the same reactive state.
 *
 * Export: useBridges() → { bridgesHidden, toggleBridges, bridgeButtonLabel }
 */

import { ref, computed } from 'vue';

// ── Singleton state ──────────────────────────────────────────────────────────
const bridgesHidden = ref(false);

function toggleBridges() {
  // Toggle the body class exactly as the original does, then sync reactive state
  const hidden = document.body.classList.toggle('hide-bridges');
  bridgesHidden.value = hidden;
}

// ── Exported composable ──────────────────────────────────────────────────────
export function useBridges() {
  /**
   * Computed label mirrors the original's dynamic textContent:
   *   hidden  → "Show the finance / actuarial bridges"
   *   visible → "Hide the finance / actuarial bridges"
   */
  const bridgeButtonLabel = computed(() =>
    bridgesHidden.value
      ? 'Show the finance / actuarial bridges'
      : 'Hide the finance / actuarial bridges'
  );

  return {
    bridgesHidden,
    toggleBridges,
    bridgeButtonLabel,
  };
}
