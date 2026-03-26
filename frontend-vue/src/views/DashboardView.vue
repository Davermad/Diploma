<script setup>
import { ref, computed, onMounted } from 'vue'
import { stats } from '../api/client'
import PageCard from '../components/PageCard.vue'

const data = ref(null)
const loading = ref(true)
const statusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Выполнено' }

const statusEntries = computed(() => Object.entries(data.value?.by_status || {}))

onMounted(async () => {
  try {
    data.value = await stats.dashboard()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page-shell">
    <h1>Дашборд</h1>
    <p class="page-lead">Сводка по задачам: статусы, просроченные и недавно завершённые.</p>
    <a-spin v-if="loading" />
    <template v-else-if="data">
      <a-row :gutter="[20, 20]">
        <a-col :xs="24" :sm="12" :lg="6">
          <PageCard title="По статусам">
            <div v-for="[status, count] in statusEntries" :key="status" class="stat-row">
              <span>{{ statusLabels[status] || status }}</span>
              <strong>{{ count }}</strong>
            </div>
          </PageCard>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <PageCard title="Просрочено">
            <div class="stat-overdue-wrap">
              <span class="stat-big">{{ data.overdue_count || 0 }}</span>
            </div>
          </PageCard>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <PageCard title="Топ просроченных">
            <div v-for="task in (data.top_overdue || []).slice(0, 5)" :key="task.id" class="task-row">
              <router-link :to="'/tasks/' + task.id">{{ task.title }}</router-link>
            </div>
            <p v-if="!(data.top_overdue || []).length" class="muted">Нет просроченных</p>
          </PageCard>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <PageCard title="Последние выполненные">
            <div v-for="task in (data.last_completed || []).slice(0, 5)" :key="task.id" class="task-row">
              <router-link :to="'/tasks/' + task.id">{{ task.title }}</router-link>
            </div>
            <p v-if="!(data.last_completed || []).length" class="muted">Нет выполненных</p>
          </PageCard>
        </a-col>
      </a-row>
    </template>
    <p v-else class="muted">Нет данных</p>
  </div>
</template>

<style scoped>
.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--vue-border);
  font-size: 0.9rem;
}
.stat-row:last-child {
  border-bottom: none;
}
.stat-overdue-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
}
.stat-big {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 4.25rem;
  min-width: 4.25rem;
  padding: 0 1.1rem;
  font-size: clamp(1.5rem, 4vw, 1.85rem);
  font-weight: 700;
  color: #178a5c;
  background: linear-gradient(145deg, rgba(23, 138, 92, 0.12) 0%, rgba(23, 138, 92, 0.06) 100%);
  border-radius: 999px;
  border: 2px solid rgba(23, 138, 92, 0.28);
  box-shadow: 0 4px 16px rgba(23, 138, 92, 0.12);
}
.task-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--vue-border);
  font-size: 0.9rem;
}
.task-row:last-child {
  border-bottom: none;
}
</style>
