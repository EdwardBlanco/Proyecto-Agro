<script setup>
defineProps({
  emoji: { type: String, default: '📋' },
  message: { type: String, required: true },
  subtext: { type: String, default: '' },
  canCreate: { type: Boolean, default: false },
  createLabel: { type: String, default: 'Crear registro' }
})

defineEmits(['create'])
</script>

<template>
  <q-card flat bordered class="shared-empty-state">
    <div class="shared-empty-state-heading">
      <span class="shared-empty-state-emoji" aria-hidden="true">{{ emoji }}</span>
      <strong>{{ message }}</strong>
    </div>
    <p v-if="subtext">{{ subtext }}</p>
    <q-btn v-if="canCreate" rounded color="primary" unelevated no-caps icon="add" :label="createLabel" @click="$emit('create')" />
  </q-card>
</template>

<style scoped>
.shared-empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border-color: var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
}

.shared-empty-state-emoji {
  flex: 0 0 auto;
  color: var(--green-muted);
  font-size: 20px;
  line-height: 1;
  filter: grayscale(1);
  opacity: .7;
}

.shared-empty-state-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

.shared-empty-state strong {
  color: var(--green-dark);
  font-size: 16px;
  font-weight: 600;
}

.shared-empty-state p {
  max-width: 520px;
  margin: 0;
  color: var(--green-muted);
  font-size: 14px;
  line-height: 1.45;
}
</style>
