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
const inputRules = computed(() => [
  ...(props.field.required ? [value => (value !== '' && value !== null && value !== undefined) || 'Este campo es obligatorio'] : []),
  ...(props.field.maxLength ? [value => !value || String(value).length <= props.field.maxLength || `Usa máximo ${props.field.maxLength} caracteres`] : []),
  ...(props.field.textOnly ? [value => !value || /^[\p{L}\p{M}\s.'-]+$/u.test(value) || 'Ingresa solo texto, sin números ni símbolos'] : []),
  ...(props.field.type === 'number' ? [
    value => value === '' || value === null || Number.isFinite(Number(String(value).replace(',', '.'))) || 'Ingresa un número válido',
    ...(props.field.integer ? [value => value === '' || value === null || Number.isInteger(Number(String(value).replace(',', '.'))) || 'Ingresa un número entero'] : []),
    ...(props.field.min !== undefined ? [value => value === '' || value === null || Number(String(value).replace(',', '.')) >= props.field.min || `El valor mínimo es ${props.field.min}`] : []),
    ...(props.field.max !== undefined ? [value => value === '' || value === null || Number(String(value).replace(',', '.')) <= props.field.max || `El valor máximo es ${props.field.max}`] : [])
  ] : [])
])

function updateValue(value) {
  let nextValue = value
  if (props.field.textOnly) nextValue = String(value ?? '').replace(/[^\p{L}\p{M}\s.'-]/gu, '')
  if (props.field.type === 'number') {
    nextValue = String(value ?? '').replace(/[^\d.,-]/g, '')
    const separatorIndex = nextValue.search(/[.,]/)
    if (separatorIndex !== -1) {
      nextValue = `${nextValue.slice(0, separatorIndex + 1)}${nextValue.slice(separatorIndex + 1).replace(/[.,]/g, '')}`
    }
  }
  if (props.field.maxLength) nextValue = String(nextValue).slice(0, props.field.maxLength)
  model.value = nextValue
}

function adjustNumber(direction) {
  const currentValue = Number(String(model.value ?? '').replace(',', '.'))
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
  <q-input v-else :id="`field-${field.key}`" :model-value="model" outlined dense
    :type="field.type === 'textarea' ? 'textarea' : field.type === 'date' ? 'date' : field.type === 'datetime-local' ? 'datetime-local' : 'text'"
    :inputmode="field.type === 'number' ? (field.integer ? 'numeric' : 'decimal') : undefined"
    :maxlength="field.maxLength"
    :min="field.min" :max="field.max" :step="field.type === 'number' ? numberStep : undefined"
    :rules="inputRules"
    @update:model-value="updateValue"
    :input-style="field.type === 'textarea' ? 'min-height: 76px' : undefined">
    <template v-if="field.type === 'number'" #prepend>
      <q-btn flat round dense icon="remove" class="numeric-adjust-button" :disable="disabled" :aria-label="`Disminuir ${field.label}`" @click="adjustNumber(-1)" />
    </template>
    <template v-if="field.type === 'number'" #append>
      <q-btn flat round dense icon="add" class="numeric-adjust-button" :disable="disabled" :aria-label="`Aumentar ${field.label}`" @click="adjustNumber(1)" />
    </template>
  </q-input>
</template>
