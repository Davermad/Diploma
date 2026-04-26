<script setup>
/**
 * Обертка над a-card с именованными слотами (ТЗ Vue: slots).
 */
defineProps({
  title: { type: String, default: '' },
})
</script>

<template>
  <a-card class="page-card" :bordered="true">
    <template v-if="$slots.title || title" #title>
      <slot name="title">{{ title }}</slot>
    </template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <slot />
  </a-card>
</template>

<style scoped>
.page-card {
  border-radius: 8px !important;
  border-color: var(--vue-border) !important;
}
</style>
