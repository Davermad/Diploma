<script setup>
import { computed } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
})
const selectedIds = defineModel('selectedIds', { type: Array, default: () => [] })

const set = computed(() => new Set(selectedIds.value))

function toggle(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = [...s]
}
</script>

<template>
  <p v-if="!categories.length" class="hint">Сначала создайте категории на вкладке «Категории».</p>
  <div v-else class="cat-grid">
    <button
      v-for="cat in categories"
      :key="cat.id"
      type="button"
      class="cat-chip"
      :class="{ selected: set.has(cat.id) }"
      @click="toggle(cat.id)"
    >
      <span class="dot" :style="{ background: cat.color }" />
      <span class="name">{{ cat.name }}</span>
    </button>
  </div>
</template>

<style scoped>
.hint {
  margin: 0;
  font-size: 13px;
  color: var(--vue-text-muted);
  line-height: 1.4;
}
.cat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--vue-border);
  background: var(--vue-surface);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
}
.cat-chip:hover {
  border-color: var(--vue-primary);
}
.cat-chip.selected {
  border-color: var(--vue-primary);
  background: color-mix(in srgb, var(--vue-primary) 10%, var(--vue-surface));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--vue-primary) 22%, transparent);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.name {
  font-weight: 500;
}
</style>
