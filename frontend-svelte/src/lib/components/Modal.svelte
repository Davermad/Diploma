<script>
  import { fade } from 'svelte/transition';
  import { fly } from 'svelte/transition';
  export let open = false;
  export let title = '';
  export let onClose = () => {};

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }
</script>

{#if open}
  <div
    class="modal-overlay"
    transition:fade={{ duration: 180 }}
    on:click={handleBackdropClick}
    role="presentation"
  >
    <div
      class="modal"
      transition:fly={{ y: 14, duration: 220 }}
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h3 id="modal-title">{title}</h3>
        <button type="button" class="modal-close" on:click={onClose} aria-label="Закрыть">×</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay-scrim);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  .modal {
    background: var(--surface, #fff);
    border-radius: var(--radius, 14px);
    max-width: min(440px, 100%);
    width: 100%;
    max-height: min(88vh, 720px);
    overflow: auto;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
  }
  .modal-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%);
  }
  .modal-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-muted);
    background: transparent;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }
  .modal-close:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .modal-close:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .modal-body {
    padding: 22px;
  }
</style>
