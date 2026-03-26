<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  empty: { type: String, default: '—' },
})
</script>

<template>
  <div v-if="items && items.length" class="badges">
    <a-tag v-for="c in items" :key="c.id || c.name" :color="c.color || 'green'" class="badge">
      {{ c.name }}
    </a-tag>
  </div>
  <span v-else class="empty">{{ empty }}</span>
</template>

<style scoped>
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.empty {
  font-size: 12px;
  color: var(--vue-text-muted);
}
</style>
