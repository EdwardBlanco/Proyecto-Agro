<script setup>
import { computed } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  options: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const model = defineModel()
const numberStep = computed(() => {
  const configuredStep = Number(props.field.step)
  if (Number.isFinite(configuredStep) && configuredStep > 0) return configuredStep
  if (props.field.integer) return 1
  return props.field.key === 'area' ? 0.1 : 1
})

function adjustNumber(direction) {
  const currentValue = Number(model.value)
  const startingValue = Number.isFinite(currentValue) ? currentValue : Number(props.field.min ?? 0)
  const minimum = props.field.min ?? Number.NEGATIVE_INFINITY
  const maximum = props.field.max ?? Number.POSITIVE_INFINITY
  const nextValue = Math.min(maximum, Math.max(minimum, startingValue + direction * numberStep.value))
  model.value = Number(nextValue.toFixed(3))
}
</script>

<template>
  <q-select v-if="['ref', 'users', 'farms', 'select', 'select-value'].includes(field.type)"
    :id="`field-${field.key}`" v-model="model" outlined dense emit-value map-options
    :multiple="field.multiple" :options="options" :use-chips="field.multiple"
    :rules="field.required ? [value => (Array.isArray(value) ? value.length : Boolean(value)) || 'Este campo es obligatorio'] : []"
    :disable="disabled" />
  <q-input v-else :id="`field-${field.key}`" v-model="model" outlined dense
    :type="field.type === 'textarea' ? 'textarea' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime-local' ? 'datetime-local' : field.type === 'email' ? 'email' : 'text'"
    :min="field.min" :max="field.max" :step="field.type === 'number' ? numberStep : undefined"
    :rules="[
      ...(field.required ? [value => (value !== '' && value !== null && value !== undefined) || 'Este campo es obligatorio'] : []),
      ...(field.integer ? [value => value === '' || value === null || Number.isInteger(Number(value)) || 'Ingresa un número entero'] : [])
    ]"
    :input-style="field.type === 'textarea' ? 'min-height: 76px' : undefined">
    <template v-if="field.type === 'number'" #prepend>
      <q-btn flat round dense icon="remove" class="numeric-adjust-button" :disable="disabled" :aria-label="`Disminuir ${field.label}`" @click="adjustNumber(-1)" />
    </template>
    <template v-if="field.type === 'number'" #append>
      <q-btn flat round dense icon="add" class="numeric-adjust-button" :disable="disabled" :aria-label="`Aumentar ${field.label}`" @click="adjustNumber(1)" />
    </template>
  </q-input>
</template>
