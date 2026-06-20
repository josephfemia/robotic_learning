<template>
  <!-- Matches topbar + scrim markup from reference lines ~281–285 -->
  <div class="topbar">
    <button id="menuBtn" aria-label="Open lecture menu" @click="$emit('menu-toggle')">MENU</button>
    <div class="where" id="whereLabel">{{ whereLabel }}</div>
  </div>
  <div class="scrim" id="scrim" :class="{ show: mobileOpen }" @click="$emit('scrim-click')"></div>
</template>

<script setup>
defineProps({
  whereLabel: {
    type: String,
    default: 'Start here',
  },
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['menu-toggle', 'scrim-click']);
</script>
