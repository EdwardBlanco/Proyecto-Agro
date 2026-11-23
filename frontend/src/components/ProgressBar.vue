<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [Number, String], default: null },
  label: { type: String, default: '' },
  unit: { type: String, default: '%' }
})

const numericValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') return null
  const value = Number(props.value)
  return Number.isFinite(value) ? value : null
})

const visibleValue = computed(() => numericValue.value === null
  ? null
  : Math.min(100, Math.max(0, numericValue.value)))
</script>

<template>
  <div class="shared-progress">
    <template v-if="visibleValue !== null">
      <div class="shared-progress-heading">
        <strong>{{ visibleValue }}{{ unit }}</strong>
        <span v-if="label">{{ label }}</span>
      </div>
      <q-linear-progress rounded size="9px" color="primary" track-color="grey-3" :value="visibleValue / 100" :aria-label="`${visibleValue}${unit}`" />
    </template>
    <span v-else class="shared-progress-empty">Sin datos registrados</span>
  </div>
</template>

<style scoped>
.shared-progress {
  display: grid;
  min-width: 120px;
  gap: 7px;
}

.shared-progress-heading {
  display: flex;
  align-items: baseline;
  gap: 7px;
  color: var(--green-dark);
}

.shared-progress-heading strong {
  font-size: 15px;
}

.shared-progress-heading span,
.shared-progress-empty {
  color: var(--green-muted);
  font-size: 13px;
}
</style>
