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
        : props.field.type === 'date' || props.field.type === 'datetime-local' || props.field.type === 'time'
          ? 'Selecciona fecha u hora'
          : `Ingresa ${props.field.label.toLocaleLowerCase()}`))
const inputType = computed(() => props.field.type === 'password'
  ? passwordVisible.value ? 'text' : 'password'
  : props.field.type === 'textarea' ? 'textarea'
    : props.field.type === 'date' ? 'date'
      : props.field.type === 'datetime-local' ? 'datetime-local'
        : props.field.type === 'time' ? 'time'
          : props.field.type === 'url' ? 'url' : 'text')

// Reglas de validación en tiempo real para Quasar según los metadatos del campo
const inputRules = computed(() => [
  ...props.extraRules,
  ...(props.field.required ? [value => (value !== '' && value !== null && value !== undefined) || 'Este campo es obligatorio'] : []),
  ...(props.field.maxLength ? [value => !value || String(value).length <= props.field.maxLength || `Usa máximo ${props.field.maxLength} caracteres`] : []),
  ...(props.field.textOnly ? [value => !value || /^[\p{L}\p{M}\s.'-]+$/u.test(value) || 'Ingresa solo texto, sin números ni símbolos'] : []),
  ...(props.field.type === 'email' ? [value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Ingresa un correo electrónico válido'] : []),
  ...(props.field.type === 'url' ? [value => {
    if (!value) return true
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol) || 'Ingresa una URL HTTP o HTTPS válida'
    } catch {
      return 'Ingresa una URL HTTP o HTTPS válida'
    }
  }] : []),
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
  const precision = Math.min(String(numberStep.value).split('.')[1]?.length ?? 0, 8)
  model.value = Number(nextValue.toFixed(precision))
}

function updateArrayItem(index, key, value) {
  const next = Array.isArray(model.value) ? [...model.value] : []
  next[index] = { ...(next[index] ?? {}), [key]: value }
  model.value = next
}

function addApplication() {
  const next = Array.isArray(model.value) ? [...model.value] : []
  next.push({
    inputId: '',
    batchNumber: '',
    expirationDate: '',
    quantity: '',
    quantityUnit: '',
    dose: '',
    doseUnit: '',
    method: '',
    equipment: '',
    preharvestIntervalDays: '',
    reentryIntervalDays: '',
    technicalRecommendation: ''
  })
  model.value = next
}

function addTraining() {
  const next = Array.isArray(model.value) ? [...model.value] : []
  next.push({ title: '', date: '', provider: '' })
  model.value = next
}

function removeArrayItem(index) {
  const next = Array.isArray(model.value) ? [...model.value] : []
  next.splice(index, 1)
  model.value = next
}
</script>

<template>
  <div v-if="field.type === 'application-products'" class="repeatable-field">
    <article v-for="(application, index) in model || []" :key="index" class="repeatable-card">
      <div class="repeatable-card-heading">
        <strong>Producto aplicado {{ index + 1 }}</strong>
        <q-btn flat round dense icon="delete_outline" color="negative" :disable="disabled" :aria-label="`Quitar producto aplicado ${index + 1}`" @click="removeArrayItem(index)" />
      </div>
      <div class="repeatable-grid">
        <label class="repeatable-control repeatable-control-wide">Producto
          <q-select :model-value="application.inputId" outlined dense emit-value map-options :options="options" placeholder="Selecciona el producto" :disable="disabled" @update:model-value="updateArrayItem(index, 'inputId', $event)" />
        </label>
        <label class="repeatable-control">Lote del producto
          <q-input :model-value="application.batchNumber" outlined dense maxlength="80" placeholder="Si está disponible" :disable="disabled" @update:model-value="updateArrayItem(index, 'batchNumber', $event)" />
        </label>
        <label class="repeatable-control">Vencimiento
          <q-input :model-value="application.expirationDate" type="date" outlined dense :disable="disabled" @update:model-value="updateArrayItem(index, 'expirationDate', $event)" />
        </label>
        <label class="repeatable-control">Cantidad aplicada
          <q-input :model-value="application.quantity" type="number" min="0.01" step="0.01" outlined dense inputmode="decimal" :disable="disabled" @update:model-value="updateArrayItem(index, 'quantity', $event)" />
        </label>
        <label class="repeatable-control">Unidad de cantidad
          <q-select :model-value="application.quantityUnit" outlined dense emit-value map-options :options="['kg', 'g', 'L', 'mL', 'unidades']" placeholder="Selecciona" :disable="disabled" @update:model-value="updateArrayItem(index, 'quantityUnit', $event)" />
        </label>
        <label class="repeatable-control">Dosis
          <q-input :model-value="application.dose" type="number" min="0.01" step="0.01" outlined dense inputmode="decimal" :disable="disabled" @update:model-value="updateArrayItem(index, 'dose', $event)" />
        </label>
        <label class="repeatable-control">Unidad de dosis
          <q-select :model-value="application.doseUnit" outlined dense emit-value map-options :options="['kg/ha', 'g/ha', 'L/ha', 'mL/ha', 'g/L', 'mL/L', 'otra']" placeholder="Selecciona" :disable="disabled" @update:model-value="updateArrayItem(index, 'doseUnit', $event)" />
        </label>
        <label class="repeatable-control repeatable-control-wide">Método de aplicación
          <q-select :model-value="application.method" outlined dense emit-value map-options :options="['Foliar', 'Al suelo', 'Fertirriego', 'Drench', 'Otro']" placeholder="Selecciona el método" :disable="disabled" @update:model-value="updateArrayItem(index, 'method', $event)" />
        </label>
        <label class="repeatable-control repeatable-control-wide">Equipo utilizado
          <q-input :model-value="application.equipment" outlined dense maxlength="120" placeholder="Equipo empleado, si aplica" :disable="disabled" @update:model-value="updateArrayItem(index, 'equipment', $event)" />
        </label>
        <label class="repeatable-control">Período de carencia (días, si aplica)
          <q-input :model-value="application.preharvestIntervalDays" type="number" min="0" step="1" outlined dense inputmode="numeric" :disable="disabled" @update:model-value="updateArrayItem(index, 'preharvestIntervalDays', $event)" />
        </label>
        <label class="repeatable-control">Período de reentrada (días, si aplica)
          <q-input :model-value="application.reentryIntervalDays" type="number" min="0" step="1" outlined dense inputmode="numeric" :disable="disabled" @update:model-value="updateArrayItem(index, 'reentryIntervalDays', $event)" />
        </label>
        <label class="repeatable-control repeatable-control-wide">Referencia de recomendación técnica (si aplica)
          <q-input :model-value="application.technicalRecommendation" type="textarea" outlined dense maxlength="300" :disable="disabled" @update:model-value="updateArrayItem(index, 'technicalRecommendation', $event)" />
        </label>
      </div>
    </article>
    <q-btn outline no-caps icon="add" label="Agregar producto aplicado" :disable="disabled" @click="addApplication" />
  </div>
  <div v-else-if="field.type === 'training-records'" class="repeatable-field">
    <article v-for="(training, index) in model || []" :key="index" class="repeatable-card">
      <div class="repeatable-card-heading">
        <strong>Capacitación {{ index + 1 }}</strong>
        <q-btn flat round dense icon="delete_outline" color="negative" :disable="disabled" :aria-label="`Quitar capacitación ${index + 1}`" @click="removeArrayItem(index)" />
      </div>
      <div class="repeatable-grid">
        <label class="repeatable-control">Tema de capacitación
          <q-input :model-value="training.title" outlined dense maxlength="120" :disable="disabled" @update:model-value="updateArrayItem(index, 'title', $event)" />
        </label>
        <label class="repeatable-control">Fecha
          <q-input :model-value="training.date" type="date" outlined dense :disable="disabled" @update:model-value="updateArrayItem(index, 'date', $event)" />
        </label>
        <label class="repeatable-control repeatable-control-wide">Capacitador o institución (si se conoce)
          <q-input :model-value="training.provider" outlined dense maxlength="120" :disable="disabled" @update:model-value="updateArrayItem(index, 'provider', $event)" />
        </label>
      </div>
    </article>
    <q-btn outline no-caps icon="add" label="Agregar capacitación" :disable="disabled" @click="addTraining" />
  </div>
  <div v-else-if="field.type === 'emoji'" class="emoji-picker-control">
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
