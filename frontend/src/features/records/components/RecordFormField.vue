<script setup>
/**
 * Campo dinámico de formulario reutilizado por RecordsPage.vue según la definición de config.js.
 * Renderiza selectores relacionales/enumerados o inputs con saneamiento y botones +/- numéricos.
 */
import { computed, ref } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  options: { type: Array, default: () => [] },
  extraRules: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const model = defineModel()
const passwordVisible = ref(false)
const emojiOptions = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍅', '🥕', '🥬', '🥦', '🌽', '🌾', '🌱', '🌿', '🍃', '🪴', '🧪', '💧', '🪣', '🛠️', '🚜']

// Paso de incremento para controles numéricos (0.1 por defecto en áreas en hectáreas)
const numberStep = computed(() => {
  const configuredStep = Number(props.field.step)
  if (Number.isFinite(configuredStep) && configuredStep > 0) return configuredStep
  if (props.field.integer) return 1
  return props.field.key === 'area' ? 0.1 : 1
})
const placeholder = computed(() => props.field.placeholder ??
  (props.field.type === 'email' ? 'nombre@dominio.com' :
    ['ref', 'users', 'farms', 'select', 'select-value'].includes(props.field.type)
      ? `Selecciona ${props.field.label.toLocaleLowerCase()}`
      : props.field.type === 'textarea'
        ? `Describe ${props.field.label.toLocaleLowerCase()}`
        : props.field.type === 'date' || props.field.type === 'datetime-local'
          ? 'Selecciona fecha y hora'
          : `Ingresa ${props.field.label.toLocaleLowerCase()}`))
const inputType = computed(() => props.field.type === 'password'
  ? passwordVisible.value ? 'text' : 'password'
  : props.field.type === 'textarea' ? 'textarea'
    : props.field.type === 'date' ? 'date'
      : props.field.type === 'datetime-local' ? 'datetime-local' : 'text')

// Reglas de validación en tiempo real para Quasar según los metadatos del campo
const inputRules = computed(() => [
  ...props.extraRules,
  ...(props.field.required ? [value => (value !== '' && value !== null && value !== undefined) || 'Este campo es obligatorio'] : []),
  ...(props.field.maxLength ? [value => !value || String(value).length <= props.field.maxLength || `Usa máximo ${props.field.maxLength} caracteres`] : []),
  ...(props.field.textOnly ? [value => !value || /^[\p{L}\p{M}\s.'-]+$/u.test(value) || 'Ingresa solo texto, sin números ni símbolos'] : []),
  ...(props.field.type === 'email' ? [value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Ingresa un correo electrónico válido'] : []),
  ...(props.field.type === 'password' ? [value => !value || String(value).length >= 6 || 'La contraseña debe tener al menos 6 caracteres'] : []),
  ...(props.field.type === 'number' ? [
    value => value === '' || value === null || Number.isFinite(Number(String(value).replace(',', '.'))) || 'Ingresa un número válido',
    ...(props.field.integer ? [value => value === '' || value === null || Number.isInteger(Number(String(value).replace(',', '.'))) || 'Ingresa un número entero'] : []),
    ...(props.field.maxLength ? [value => value === '' || value === null || String(value).length <= props.field.maxLength || `Usa máximo ${props.field.maxLength} caracteres`] : []),
    ...(props.field.min !== undefined ? [value => value === '' || value === null || Number(String(value).replace(',', '.')) >= props.field.min || `El valor mínimo es ${props.field.min}`] : []),
    ...(props.field.max !== undefined ? [value => value === '' || value === null || Number(String(value).replace(',', '.')) <= props.field.max || `El valor máximo es ${props.field.max}`] : [])
  ] : [])
])

/**
 * Normaliza y sanea la entrada del usuario antes de actualizar v-model (texto puro o decimal único).
 */
function updateValue(value) {
  let nextValue = value
  if (props.field.textOnly) nextValue = String(value ?? '').replace(/[^\p{L}\p{M}\s.'-]/gu, '')
  if (props.field.type === 'number') {
    nextValue = props.field.integer
      ? String(value ?? '').replace(/\D/g, '')
      : String(value ?? '').replace(/[^\d.,-]/g, '')
  }
  if (props.field.type === 'number' && !props.field.integer) {
    const separatorIndex = nextValue.search(/[.,]/)
    if (separatorIndex !== -1) {
      nextValue = `${nextValue.slice(0, separatorIndex + 1)}${nextValue.slice(separatorIndex + 1).replace(/[.,]/g, '')}`
    }
  }
  if (props.field.maxLength) nextValue = String(nextValue).slice(0, props.field.maxLength)
  model.value = nextValue
}

/**
 * Incrementa o decrementa el valor numérico respetando los límites min/max del campo.
 */
function adjustNumber(direction) {
  const currentValue = Number(String(model.value ?? '').replace(',', '.'))
  const startingValue = Number.isFinite(currentValue) ? currentValue : Number(props.field.min ?? 0)
  const minimum = props.field.min ?? Number.NEGATIVE_INFINITY
  const lengthLimit = props.field.integer && props.field.maxLength
    ? Number('9'.repeat(props.field.maxLength))
    : Number.POSITIVE_INFINITY
  const maximum = Math.min(props.field.max ?? Number.POSITIVE_INFINITY, lengthLimit)
  const nextValue = Math.min(maximum, Math.max(minimum, startingValue + direction * numberStep.value))
  model.value = Number(nextValue.toFixed(3))
}
</script>

<template>
  <div v-if="field.type === 'emoji'" class="emoji-picker-control">
    <span class="emoji-picker-preview">{{ model || field.default }}</span>
    <q-btn :id="`field-${field.key}`" type="button" outline no-caps class="emoji-picker-trigger">
      <span>Elegir emoji</span>
      <q-icon name="expand_more" />
      <q-menu anchor="bottom left" self="top left">
        <div class="emoji-picker-grid">
          <q-btn v-for="emoji in emojiOptions" :key="emoji" type="button" flat dense class="emoji-choice" :label="emoji" :aria-label="`Seleccionar ${emoji}`" v-close-popup @click="model = emoji" />
        </div>
      </q-menu>
    </q-btn>
  </div>
  <q-select v-else-if="['ref', 'users', 'farms', 'select', 'select-value'].includes(field.type)"
    :id="`field-${field.key}`" v-model="model" outlined dense emit-value map-options
    :multiple="field.multiple" :options="options" :use-chips="field.multiple"
    :placeholder="placeholder"
    :rules="field.required ? [value => (Array.isArray(value) ? value.length : Boolean(value)) || 'Este campo es obligatorio'] : []"
    :disable="disabled" />
  <q-input v-else :id="`field-${field.key}`" :model-value="model" outlined dense
    :type="inputType"
    :inputmode="field.type === 'number' ? (field.integer ? 'numeric' : 'decimal') : field.type === 'email' ? 'email' : undefined"
    :placeholder="placeholder"
    :maxlength="field.maxLength"
    :rules="inputRules"
    @update:model-value="updateValue"
    :input-style="field.type === 'textarea' ? 'min-height: 76px' : undefined">
    <template v-if="field.type === 'number'" #prepend>
      <q-btn flat round dense icon="remove" class="numeric-adjust-button" :disable="disabled" :aria-label="`Disminuir ${field.label}`" @click="adjustNumber(-1)" />
    </template>
    <template v-if="field.type === 'number'" #append>
      <q-btn flat round dense icon="add" class="numeric-adjust-button" :disable="disabled" :aria-label="`Aumentar ${field.label}`" @click="adjustNumber(1)" />
    </template>
    <template v-if="field.type === 'password'" #append>
      <q-btn flat round dense type="button" :icon="passwordVisible ? 'visibility_off' : 'visibility'" :aria-label="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="passwordVisible = !passwordVisible" />
    </template>
  </q-input>
</template>
