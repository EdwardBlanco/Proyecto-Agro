<script setup>
import { computed } from 'vue'
import { entityConfig } from '@/features/records/config'
import { getRecord, getRecords } from '@/services/storage'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  entity: { type: String, required: true },
  record: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])
const missingData = 'Sin datos registrados'

const configuredFields = computed(() => entityConfig[props.entity]?.fields ?? [])
const relatedDetails = computed(() => {
  const record = props.record
  if (!record) return []

  if (props.entity === 'farms') {
    const lots = getRecords('lots').filter((lot) => lot.farmId === record.id)
    const lotIds = new Set(lots.map((lot) => lot.id))
    const cycles = getRecords('cycles').filter((cycle) => cycle.farmId === record.id || lotIds.has(cycle.lotId))
    return [
      { key: 'related-lots', label: 'Lotes asociados', value: namesOf(lots) },
      { key: 'related-cycles', label: 'Ciclos productivos asociados', value: namesOf(cycles) }
    ]
  }

  if (props.entity === 'lots') {
    const cycles = getRecords('cycles').filter((cycle) => cycle.lotId === record.id)
    const cropIds = [...new Set(cycles.map((cycle) => cycle.cropId).filter(Boolean))]
    const crops = cropIds.map((id) => getRecord('crops', id)).filter(Boolean)
    return [
      { key: 'related-crops', label: 'Cultivos asociados', value: namesOf(crops) },
      { key: 'related-cycles', label: 'Ciclos productivos asociados', value: namesOf(cycles) }
    ]
  }

  if (props.entity === 'crops') {
    const cycles = getRecords('cycles').filter((cycle) => cycle.cropId === record.id)
    const cycleIds = new Set(cycles.map((cycle) => cycle.id))
    const nurseries = getRecords('nurseries').filter((nursery) =>
      nursery.cropId === record.id || cycleIds.has(nursery.cycleId))
    return [
      { key: 'related-cycles', label: 'Ciclos productivos asociados', value: namesOf(cycles) },
      { key: 'related-nurseries', label: 'Semilleros asociados', value: namesOf(nurseries) }
    ]
  }

  return []
})

const details = computed(() => {
  if (!props.record) return []
  const knownFields = new Set(configuredFields.value.map((field) => field.key))
  const configured = configuredFields.value.map((field) => ({
    key: field.key,
    label: field.label,
    value: formatValue(props.record[field.key], field)
  }))
  const additional = Object.entries(props.record)
    .filter(([key]) => !knownFields.has(key))
    .map(([key, value]) => ({
      key,
      label: key === 'id' ? 'Identificador' : key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()),
      value: formatValue(value)
    }))
  return [...configured, ...additional, ...relatedDetails.value]
})

function formatValue(value, field) {
  if (value === undefined || value === null || value === '') return missingData
  if (field?.entity || field?.type === 'users') {
    const relation = field.entity ?? 'users'
    const ids = Array.isArray(value) ? value : [value]
    return ids.map((id) => {
      const relatedRecord = getRecord(relation, id)
      return relatedRecord?.name ?? relatedRecord?.title ?? String(id)
    }).join(', ') || missingData
  }
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === 'object' && item !== null
      ? JSON.stringify(item)
      : String(item)).join(', ') || missingData
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}

function namesOf(records) {
  return records.map((record) => record.name ?? record.title ?? record.id).join(', ') || 'Sin vínculos registrados'
}
</script>

<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="record-dialog detail-dialog reusable-detail-dialog">
      <q-card-section class="dialog-heading">
        <div>
          <h2>Detalle de {{ entityConfig[entity]?.singular ?? 'registro' }}</h2>
          <p>{{ record?.name ?? record?.title ?? 'Información registrada' }}</p>
        </div>
        <q-btn flat round icon="close" aria-label="Cerrar detalle" @click="emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section v-if="record" class="dialog-body record-detail-body">
        <div class="record-detail-list">
          <div v-for="detail in details" :key="detail.key" class="record-detail-field">
            <span>{{ detail.label }}</span>
            <strong>{{ detail.value }}</strong>
          </div>
        </div>
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn unelevated color="primary" no-caps label="Cerrar" @click="emit('update:modelValue', false)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.record-detail-list {
  display: grid;
  gap: 10px;
}

.record-detail-field {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #f8faf8;
}

.record-detail-field span {
  color: var(--green-muted);
  font-size: 14px;
  font-weight: 600;
}

.record-detail-field strong {
  color: var(--green-dark);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
