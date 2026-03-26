<script setup>
/** Teleport + v-model (defineModel) */
const open = defineModel('open', { type: Boolean, default: false })

function close() {
  open.value = false
}
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="open" class="help-overlay" role="dialog" aria-modal="true" @click.self="close">
        <div class="help-panel">
          <div class="help-header">
            <h3>Справка</h3>
            <a-button type="text" @click="close">×</a-button>
          </div>
          <p class="help-text">
            Проекты, задачи, категории и чаты работают через общий API. Исполнитель задачи — только из участников
            проекта (владелец добавляет по email).
          </p>
          <a-button type="primary" block @click="close">Понятно</a-button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.help-panel {
  max-width: 420px;
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 20px 22px;
  border: 1px solid var(--vue-border);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}
.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.help-header h3 {
  margin: 0;
  font-size: 1.05rem;
}
.help-text {
  margin: 0 0 16px;
  color: var(--vue-text-muted);
  line-height: 1.5;
  font-size: 0.9rem;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
