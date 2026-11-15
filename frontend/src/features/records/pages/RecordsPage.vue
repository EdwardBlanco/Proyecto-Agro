<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { canWrite, visibleFarmIds } from '@/services/permissions'
import { getRecord, getRecords, removeRecord, saveRecord } from '@/services/storage'
import { entityConfig } from '@/features/records/config'
import RecordFormField from '@/features/records/components/RecordFormField.vue'
import farmPlaceholder from '@/assets/predio-placeholder.svg'
import lotPlaceholder from '@/assets/lote-placeholder.svg'
import { getResponsibleUsers } from '@/services/mock/users'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const config = computed(() => entityConfig[String(route.name)])
const useVisualCards = computed(() => ['farms', 'lots', 'crops', 'inputs'].includes(config.value.entity))
const activeFarmId = computed(() => config.value.entity === 'lots' && typeof route.query.farm === 'string' ? route.query.farm : '')
const activeFarm = computed(() => activeFarmId.value ? getRecord('farms', activeFarmId.value) : null)
const farmPanelFarm = ref(null)
const farmLotsPanel = ref(false)
const farmPanelLots = computed(() => getRecords('lots').filter((lot) => lot.farmId === farmPanelFarm.value?.id))
const search = ref('')
const enumFilter = ref('')
const notificationView = ref('active')
const telemetryFilters = ref({ farmId: '', lotId: '', variable: '', from: '', to: '' })
const dialog = ref(false)
const detailDialog = ref(false)
const deleteDialog = ref(false)
const deleteStep = ref(1)
const deleteReady = ref(false)
const deleteTimer = ref(null)
const deleteConfirmationText = ref('')
const bulkDeleteDialog = ref(false)
const imageFile = ref(null)
const imageData = ref('')
const imageLoading = ref(false)
const pendingDelete = ref(null)
const editing = ref(null)
const selected = ref(null)
const form = ref({})
const formRef = ref(null)
const activityStep = ref(1)
const activityFieldGroups = [
  { name: 1, title: 'Seleccionar ciclo', caption: 'El ciclo productivo define el lote de trabajo.', fields: ['cycleId'] },
  { name: 2, title: 'Labor o incidencia', caption: 'Describe el tipo de actividad y el trabajo realizado.', fields: ['kind', 'type', 'description', 'notes'] },
  { name: 3, title: 'Responsable y seguimiento', caption: 'Asigna quién realizó el registro y su estado.', fields: ['responsible', 'date', 'status'] }
]
const canEdit = computed(() => canWrite(auth.currentUser, config.value.entity))
const activityFieldsForStep = (step) => config.value.fields.filter((field) => activityFieldGroups[step - 1].fields.includes(field.key))

const allRecords = computed(() => getRecords(config.value.entity))
const allowedFarmIds = computed(() => visibleFarmIds(auth.currentUser))
const telemetryFarmOptions = computed(() => getRecords('farms')
  .filter((farm) => !allowedFarmIds.value || allowedFarmIds.value.includes(farm.id))
  .map((farm) => ({ label: farm.name, value: farm.id })))
const telemetryLotOptions = computed(() => getRecords('lots')
  .filter((lot) => (!telemetryFilters.value.farmId || lot.farmId === telemetryFilters.value.farmId) &&
    (!allowedFarmIds.value || allowedFarmIds.value.includes(lot.farmId)))
  .map((lot) => ({ label: lot.name, value: lot.id })))

function relatedFarmId(entity, item) {
  if (entity === 'farms') return item.id
  if (entity === 'lots' || entity === 'cycles' || entity === 'telemetry') return item.farmId
  if (entity === 'activities' || entity === 'harvests') return getRecord('cycles', item.cycleId)?.farmId
  if (entity === 'nurseries') return getRecord('cycles', item.cycleId)?.farmId
  if (entity === 'notifications') return getRecord('lots', item.lotId)?.farmId
  return null
}
function isVisible(item) {
  if (!allowedFarmIds.value) return true
  const farmId = relatedFarmId(config.value.entity, item)
  return !farmId || allowedFarmIds.value.includes(farmId)
}

function nameOf(entity, id) {
  return getRecord(entity, id)?.name ?? getRecord(entity, id)?.title ?? '—'
}

function displayRow(item) {
  const row = { ...item }
  if (item.area !== undefined) row.areaLabel = `${formatArea(item.area)} HA`
  if (item.farmId) row.farmName = nameOf('farms', item.farmId)
  if (item.lotId) row.lotName = nameOf('lots', item.lotId)
  if (item.cropId) row.cropName = nameOf('crops', item.cropId)
  if (item.cycleId) row.cycleName = nameOf('cycles', item.cycleId)
  if (config.value.entity === 'lots') {
    const cycle = getRecords('cycles').find((entry) => entry.lotId === item.id && entry.status === 'En curso')
    row.cropName = cycle ? nameOf('crops', cycle.cropId) : 'Sin cultivo activo'
    row.latestHumidity = getRecords('telemetry')
      .filter((reading) => reading.lotId === item.id && reading.variable === 'Humedad del suelo')
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]?.value
  }
  if (config.value.entity === 'crops') row.inputsLabel = (item.inputs ?? []).map((id) => nameOf('inputs', id)).join(', ') || 'Sin insumos'
  if (config.value.entity === 'farms') row.lotsCount = getRecords('lots').filter((lot) => lot.farmId === item.id).length
  if (config.value.entity === 'users') {
    row.farmsLabel = (item.farms ?? []).map((id) => nameOf('farms', id)).join(', ') || 'Sin asignación'
    row.activeLabel = item.active ? 'Activo' : 'Inactivo'
  }
  if (config.value.entity === 'farms') {
    const owner = getRecord('users', item.owner)
    row.ownerName = owner?.name ?? item.owner ?? '—'
  }
  if (config.value.entity === 'telemetry') {
    row.valueWithUnit = `${item.value} ${item.unit}`
    row.simulatedLabel = 'Simulada'
    row.dateLabel = formatDateTime(item.date)
  }
  return row
}

const rows = computed(() => allRecords.value
  .filter((item) => config.value.entity !== 'notifications' || (notificationView.value === 'history' ? Boolean(item.deletedAt) : !item.deletedAt))
  .filter(isVisible)
  .map(displayRow))
const activeNotificationCount = computed(() => config.value.entity === 'notifications'
  ? allRecords.value.filter((item) => !item.deletedAt && isVisible(item)).length
  : 0)
const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return rows.value.filter((row) => {
    if (activeFarmId.value && row.farmId !== activeFarmId.value) return false
    if (query && !JSON.stringify(row).toLocaleLowerCase().includes(query)) return false
    if (enumFilter.value && filterField.value && row[filterField.value.key] !== enumFilter.value) return false
    if (config.value.entity !== 'telemetry') return true
    const filters = telemetryFilters.value
    const date = String(row.date).slice(0, 10)
    return (!filters.farmId || row.farmId === filters.farmId) &&
      (!filters.lotId || row.lotId === filters.lotId) &&
      (!filters.variable || row.variable === filters.variable) &&
      (!filters.from || date >= filters.from) &&
      (!filters.to || date <= filters.to)
  })
})
const hasFilters = computed(() => Boolean(activeFarmId.value || search.value.trim() || enumFilter.value || Object.values(telemetryFilters.value).some(Boolean)))
const invalidTelemetryRange = computed(() => telemetryFilters.value.from && telemetryFilters.value.to && telemetryFilters.value.from > telemetryFilters.value.to)
const columns = computed(() => [
  ...config.value.columns.map(([name, label]) => ({ name, label, field: name, align: 'left', sortable: true })),
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'right' }
])
const filterField = computed(() => {
  const fields = config.value.fields
  return fields.find((field) => field.key === 'status' && field.type === 'select') ??
    fields.find((field) => ['category', 'kind', 'role'].includes(field.key) && field.type === 'select') ?? null
})
const relationOptions = (field) => {
  let records = getRecords(field.entity)
  const allowed = allowedFarmIds.value
  if (allowed && field.entity === 'farms') records = records.filter((farm) => allowed.includes(farm.id))
  if (field.entity === 'lots' && form.value.farmId) records = records.filter((lot) => lot.farmId === form.value.farmId)
  if (field.entity === 'lots' && allowed && !form.value.farmId) records = records.filter((lot) => allowed.includes(lot.farmId))
  if (field.entity === 'cycles' && form.value.cropId) records = records.filter((cycle) => cycle.cropId === form.value.cropId)
  if (field.entity === 'cycles' && allowed) records = records.filter((cycle) => allowed.includes(cycle.farmId))
  if (field.entity === 'notifications' && allowed) records = records.filter((item) => allowed.includes(getRecord('lots', item.lotId)?.farmId))
  return records.map((item) => ({ ...item, label: item.name ?? item.title, value: item.id }))
}
const fieldOptions = (field) => {
  if (field.type === 'ref') return relationOptions(field)
  if (field.type === 'users') return getResponsibleUsers()
  if (field.type === 'farms') return getRecords('farms').map((farm) => ({ label: farm.name, value: farm.id }))
  return (field.options || []).map((option) => typeof option === 'string' ? ({ label: option, value: option }) : option)
}

const lotAreaGuidance = computed(() => {
  if (config.value.entity !== 'lots' || !form.value.farmId) return null
  const farm = getRecord('farms', form.value.farmId)
  if (!farm) return null
  const assignedArea = getRecords('lots')
    .filter((lot) => lot.farmId === farm.id && lot.id !== editing.value)
    .reduce((total, lot) => total + Number(lot.area || 0), 0)
  const totalArea = Number(farm.area)
  const availableArea = Math.max(0, totalArea - assignedArea)
  const enteredArea = numericValue(form.value.area)
  const hasEnteredArea = form.value.area !== '' && Number.isFinite(enteredArea) && enteredArea > 0
  const percentage = hasEnteredArea && totalArea > 0 ? (enteredArea / totalArea) * 100 : 0
  return {
    availableArea,
    percentage,
    progress: Math.min(1, percentage / 100),
    exceedsAvailable: hasEnteredArea && enteredArea > availableArea
  }
})

function formatArea(value) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(numericValue(value) || 0)
}

function numericValue(value) {
  return Number(String(value ?? '').replace(',', '.'))
}

function formatDateTime(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value || '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function goBack() {
  const previous = window.history.state?.back
  if (typeof previous === 'string' && previous.startsWith('/')) router.back()
  else router.push({ name: 'dashboard' })
}

function useImageFallback(event, entity) {
  const placeholder = entity === 'farms' ? farmPlaceholder : lotPlaceholder
  if (event.target.dataset.fallbackApplied) return
  event.target.dataset.fallbackApplied = 'true'
  event.target.src = placeholder
}

function statusClass(status) {
  return {
    Activo: 'status-active',
    Inactivo: 'status-inactive',
    'En preparación': 'status-preparing'
  }[status] ?? 'status-neutral'
}

function openFarmLotsPanel(farm) {
  farmPanelFarm.value = farm
  detailDialog.value = false
  farmLotsPanel.value = true
}

async function advanceActivityStep() {
  const valid = await formRef.value?.validate()
  if (valid) activityStep.value += 1
}

function assertFarmAccess(farmId) {
  if (allowedFarmIds.value && !allowedFarmIds.value.includes(farmId)) {
    throw new Error('No tienes acceso al predio seleccionado.')
  }
}

watch(() => form.value.farmId, (farmId) => {
  if (form.value.lotId && getRecord('lots', form.value.lotId)?.farmId !== farmId) form.value.lotId = ''
})

function openCreate() {
  editing.value = null
  activityStep.value = 1
  imageFile.value = null
  imageData.value = ''
  const initial = Object.fromEntries(config.value.fields.map((field) => [field.key, field.multiple ? [] : '']))
  if (config.value.entity === 'users') initial.active = true
  if (config.value.entity === 'activities') {
    initial.kind = 'Labor'
    initial.responsible = auth.currentUser?.name ?? ''
    initial.status = 'Pendiente'
    initial.date = new Date().toISOString().slice(0, 10)
  }
  if (config.value.entity === 'cycles') initial.status = 'Planeado'
  if (config.value.entity === 'nurseries') initial.status = 'En seguimiento'
  if (config.value.entity === 'harvests') initial.quality = 'Sin clasificar'
  if (config.value.entity === 'notifications') initial.status = 'Pendiente'
  if (config.value.entity === 'harvests' || config.value.entity === 'notifications') initial.date = new Date().toISOString().slice(0, 10)
  if (route.query.cycle && ['activities', 'nurseries', 'harvests'].includes(config.value.entity)) {
    initial.cycleId = String(route.query.cycle)
    if (config.value.entity === 'nurseries') initial.cropId = getRecord('cycles', route.query.cycle)?.cropId ?? ''
  }
  if (config.value.entity === 'telemetry') initial.date = new Date().toISOString().slice(0, 16)
  if (config.value.entity === 'farms') {
    initial.owner = auth.currentUser?.id ?? ''
    initial.status = 'Activo'
  }
  if (config.value.entity === 'lots') initial.status = 'Activo'
  if (config.value.entity === 'lots' && activeFarmId.value) initial.farmId = activeFarmId.value
  form.value = initial
  dialog.value = true
}

function openEdit(row) {
  editing.value = row.id
  activityStep.value = 1
  form.value = JSON.parse(JSON.stringify(getRecord(config.value.entity, row.id)))
  imageFile.value = null
  imageData.value = form.value.image ?? ''
  dialog.value = true
}

function openDetail(row) {
  selected.value = row
  detailDialog.value = true
}

function loadImage(file) {
  if (!file) {
    imageData.value = ''
    form.value.image = ''
    return
  }
  if (!file.type.startsWith('image/')) {
    imageFile.value = null
    $q.notify({ type: 'negative', message: 'Selecciona un archivo de imagen válido.' })
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    imageFile.value = null
    $q.notify({ type: 'negative', message: 'La imagen no puede superar 2 MB.' })
    return
  }
  imageLoading.value = true
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      imageLoading.value = false
      $q.notify({ type: 'negative', message: 'No fue posible leer la imagen seleccionada.' })
      return
    }
    imageData.value = reader.result
    imageLoading.value = false
  }
  reader.onerror = () => {
    imageLoading.value = false
    $q.notify({ type: 'negative', message: 'No fue posible leer la imagen seleccionada.' })
  }
  reader.readAsDataURL(file)
}

function rejectImage() {
  imageLoading.value = false
  $q.notify({ type: 'negative', message: 'La imagen supera el tamaño máximo de 2 MB.' })
}

function validateRelations() {
  const value = form.value
  for (const field of config.value.fields.filter((item) => item.type === 'number' && value[item.key] !== '' && value[item.key] !== null && value[item.key] !== undefined)) {
    const number = Number(String(value[field.key]).replace(',', '.'))
    if (!Number.isFinite(number)) throw new Error(`${field.label} debe ser un número válido.`)
    if (field.integer && !Number.isInteger(number)) throw new Error(`${field.label} debe ser un número entero.`)
    if (field.maxLength && String(value[field.key]).length > field.maxLength) throw new Error(`${field.label} no puede superar ${field.maxLength} caracteres.`)
    if (field.min !== undefined && number < field.min) throw new Error(`${field.label} no puede ser menor que ${field.min}.`)
    if (field.max !== undefined && number > field.max) throw new Error(`${field.label} no puede ser mayor que ${field.max}.`)
  }
  for (const field of config.value.fields) {
    const fieldValue = value[field.key]
    if (field.required && (fieldValue === '' || fieldValue === null || fieldValue === undefined)) throw new Error(`${field.label} es obligatorio.`)
    if (field.maxLength && fieldValue && String(fieldValue).length > field.maxLength) throw new Error(`${field.label} no puede superar ${field.maxLength} caracteres.`)
    if (field.textOnly && fieldValue && /\d/.test(fieldValue)) throw new Error(`${field.label} solo puede contener texto.`)
  }
  if (config.value.entity === 'lots' && !getRecord('farms', value.farmId)) throw new Error('Selecciona un predio existente.')
  if (config.value.entity === 'lots') assertFarmAccess(value.farmId)
  if (config.value.entity === 'cycles') {
    const lot = getRecord('lots', value.lotId)
    if (!lot || lot.farmId !== value.farmId) throw new Error('El lote debe pertenecer al predio seleccionado.')
    if (!getRecord('crops', value.cropId)) throw new Error('Selecciona un cultivo existente.')
    assertFarmAccess(lot.farmId)
    const alreadyUsed = getRecords('cycles').filter((cycle) => cycle.lotId === lot.id && cycle.id !== editing.value).reduce((sum, cycle) => sum + Number(cycle.area || 0), 0)
    const available = Number(lot.area) - alreadyUsed
    if (numericValue(value.area) <= 0 || numericValue(value.area) > available) throw new Error(`El área sembrada debe ser mayor que cero y no superar las ${formatArea(available)} HA disponibles del lote.`)
  }
  if (config.value.entity === 'activities') {
    const cycle = getRecord('cycles', value.cycleId)
    if (!cycle) throw new Error('Selecciona un ciclo productivo existente.')
    assertFarmAccess(cycle.farmId)
  }
  if (config.value.entity === 'nurseries') {
    if (!getRecord('crops', value.cropId)) throw new Error('Selecciona un cultivo existente.')
    if (value.cycleId) assertFarmAccess(getRecord('cycles', value.cycleId)?.farmId)
    if (value.sowingDate > new Date().toISOString().slice(0, 10)) throw new Error('La fecha de siembra no puede estar en el futuro.')
    if (value.cycleId && getRecord('cycles', value.cycleId)?.cropId !== value.cropId) throw new Error('El cultivo debe coincidir con el cultivo del ciclo asociado.')
    if (value.germinationDate && value.sowingDate && value.germinationDate < value.sowingDate) throw new Error('La germinación no puede ser anterior a la siembra.')
    if (value.transplantDate && value.sowingDate && value.transplantDate < value.sowingDate) throw new Error('El trasplante no puede ser anterior a la siembra.')
    if (value.transplantDate && value.germinationDate && value.transplantDate < value.germinationDate) throw new Error('El trasplante no puede ser anterior a la germinación.')
    if (Number(value.germination) < 0 || Number(value.germination) > 100) throw new Error('La germinación debe estar entre 0 y 100 %.')
  }
  if (config.value.entity === 'harvests' && !getRecord('cycles', value.cycleId)) throw new Error('Selecciona un ciclo productivo existente.')
  if (config.value.entity === 'harvests') {
    const cycle = getRecord('cycles', value.cycleId)
    assertFarmAccess(cycle.farmId)
    if (Number(value.quantity) <= 0) throw new Error('La cantidad cosechada debe ser mayor que cero.')
    if (value.date < cycle.startDate) throw new Error('La fecha de cosecha no puede ser anterior al inicio del ciclo.')
  }
  if (config.value.entity === 'telemetry') {
    const lot = getRecord('lots', value.lotId)
    if (!lot || lot.farmId !== value.farmId) throw new Error('El lote debe pertenecer al predio seleccionado.')
    assertFarmAccess(lot.farmId)
  }
  if (config.value.entity === 'notifications' && value.lotId) assertFarmAccess(getRecord('lots', value.lotId)?.farmId)
  if (config.value.entity === 'users' && getRecords('users').some((user) => user.email.toLowerCase() === value.email.toLowerCase() && user.id !== editing.value)) throw new Error('Ya existe un usuario con ese correo.')
  if (config.value.entity === 'users' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw new Error('Ingresa un correo electrónico válido.')
  if (config.value.entity === 'lots') {
    const farm = getRecord('farms', value.farmId)
    const used = getRecords('lots').filter((lot) => lot.farmId === value.farmId && lot.id !== editing.value).reduce((sum, lot) => sum + Number(lot.area || 0), 0)
    if (numericValue(value.area) <= 0 || used + numericValue(value.area) > Number(farm.area)) throw new Error(`El área del lote debe ser positiva y el área total de lotes no puede superar ${formatArea(farm.area)} HA.`)
    if (editing.value && value.farmId !== getRecord('lots', editing.value)?.farmId && getRecords('cycles').some((cycle) => cycle.lotId === editing.value)) throw new Error('No se puede cambiar de predio un lote que ya tiene ciclos productivos.')
    const planted = getRecords('cycles').filter((cycle) => cycle.lotId === editing.value).reduce((sum, cycle) => sum + Number(cycle.area || 0), 0)
    if (planted > numericValue(value.area)) throw new Error(`El área del lote no puede reducirse por debajo de las ${formatArea(planted)} HA ya sembradas.`)
  }
  if (config.value.entity === 'farms') {
    if (!getRecord('users', value.owner)?.active) throw new Error('Selecciona un responsable activo.')
    for (const field of config.value.fields.filter((item) => item.textOnly)) {
      if (value[field.key] && !/^[\p{L}\p{M}\s.'-]+$/u.test(value[field.key])) throw new Error(`${field.label} solo puede contener letras y espacios.`)
    }
    const occupied = getRecords('lots').filter((lot) => lot.farmId === editing.value).reduce((sum, lot) => sum + Number(lot.area || 0), 0)
    if (numericValue(value.area) <= 0 || occupied > numericValue(value.area)) throw new Error(`El área del predio debe ser positiva y no menor que las ${formatArea(occupied)} HA asignadas a lotes.`)
  }
}

async function submitForm() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  try {
    validateRelations()
    const value = { ...form.value }
    for (const field of config.value.fields.filter((item) => item.type === 'number')) {
      if (value[field.key] !== '' && value[field.key] !== null && value[field.key] !== undefined) value[field.key] = Number(String(value[field.key]).replace(',', '.'))
    }
    if (['farms', 'lots'].includes(config.value.entity)) value.image = imageData.value
    if (config.value.entity === 'telemetry') value.simulated = true
    const saved = saveRecord(config.value.entity, { ...value, id: editing.value })
    if (config.value.entity === 'users' && saved.id === auth.currentUser?.id) {
      if (!saved.active) {
        auth.logout()
        await router.replace({ name: 'login' })
        return
      }
      auth.currentUser = saved
      if (!canAccess(saved, 'users')) await router.replace({ name: 'dashboard' })
    }
    dialog.value = false
    $q.notify({ type: 'positive', message: `${config.value.singular} guardado correctamente.` })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function confirmDelete(row) {
  if (config.value.entity === 'users' && row.id === auth.currentUser?.id) {
    $q.notify({ type: 'negative', message: 'No puedes eliminar tu propia cuenta mientras la estás usando.' })
    return
  }
  pendingDelete.value = row
  deleteConfirmationText.value = ''
  deleteStep.value = 1
  deleteReady.value = false
  if (deleteTimer.value) clearTimeout(deleteTimer.value)
  deleteDialog.value = true
}

function continueDelete() {
  deleteStep.value = 2
  deleteReady.value = false
  deleteTimer.value = setTimeout(() => {
    deleteReady.value = true
  }, 1400)
}

function closeDeleteDialog() {
  deleteDialog.value = false
  deleteConfirmationText.value = ''
  deleteStep.value = 1
  deleteReady.value = false
  if (deleteTimer.value) clearTimeout(deleteTimer.value)
  deleteTimer.value = null
}

function deleteRecord() {
  const expectedName = rowName(pendingDelete.value)
  const requiresName = !['farms', 'lots'].includes(config.value.entity) || deleteStep.value === 2
  if (!pendingDelete.value || (requiresName && deleteConfirmationText.value.trim() !== expectedName) ||
      (['farms', 'lots'].includes(config.value.entity) && !deleteReady.value)) {
    $q.notify({ type: 'negative', message: `Escribe exactamente "${expectedName}" para confirmar.` })
    return
  }
  try {
    if (config.value.entity === 'notifications') {
      saveRecord('notifications', { ...pendingDelete.value, deletedAt: new Date().toISOString() })
    } else {
      removeRecord(config.value.entity, pendingDelete.value.id)
    }
    closeDeleteDialog()
    pendingDelete.value = null
    $q.notify({ type: 'positive', message: config.value.entity === 'notifications' ? 'Notificación movida al Historial.' : 'Registro eliminado.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function clearAllNotifications() {
  try {
    const active = allRecords.value.filter((item) => !item.deletedAt && isVisible(item))
    const deletedAt = new Date().toISOString()
    active.forEach((notification) => saveRecord('notifications', { ...notification, deletedAt }))
    bulkDeleteDialog.value = false
    $q.notify({ type: 'positive', message: `${active.length} notificaciones movidas al Historial.` })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function rowName(row) {
  return row?.name ?? row?.title ?? row?.type ?? row?.email ?? row?.id ?? ''
}

function markAttended(row) {
  try {
    saveRecord('notifications', { ...getRecord('notifications', row.id), status: 'Atendida' })
    $q.notify({ type: 'positive', message: 'Notificación marcada como atendida.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function rowDetails(row) {
  if (config.value.entity === 'farms') {
    return [
      ['Municipio', row.municipality], ['Departamento', row.department], ['Área total', `${formatArea(row.area)} HA`],
      ['Responsable', getRecord('users', row.owner)?.name ?? row.owner], ['Estado', row.status],
      ['Usuarios autorizados', getRecords('users').filter((user) => user.farms?.includes(row.id)).map((user) => user.name).join(', ') || 'Sin asignación']
    ]
  }
  return config.value.fields.map((field) => {
    let value = row[field.key]
    if (field.type === 'ref') value = nameOf(field.entity, value)
    if (field.type === 'ref' && field.multiple) value = (row[field.key] ?? []).map((id) => nameOf(field.entity, id)).join(', ')
    if (field.key === 'farms') value = (value ?? []).map((id) => nameOf('farms', id)).join(', ')
    return [field.label, value || '—']
  })
}

onBeforeUnmount(() => {
  if (deleteTimer.value) clearTimeout(deleteTimer.value)
})

watch(() => [route.name, route.query.farm, route.query.cycle], () => {
  search.value = ''
  enumFilter.value = ''
  notificationView.value = 'active'
})
</script>

<template>
  <q-page class="page-content records-page">
    <div v-if="activeFarmId" class="records-breadcrumb-row">
      <q-breadcrumbs separator="chevron_right" class="records-breadcrumbs">
        <q-breadcrumbs-el label="Predios" :to="{ name: 'farms' }" />
        <q-breadcrumbs-el :label="activeFarm?.name ?? 'Predio'" />
      </q-breadcrumbs>
      <q-btn flat no-caps color="primary" icon="arrow_back" label="Volver a Predios" :to="{ name: 'farms' }" />
    </div>
    <q-btn v-else flat no-caps color="primary" icon="arrow_back" label="Volver" class="back-link" @click="goBack" />
    <div class="page-intro-row">
      <div><div class="section-eyebrow">GESTIÓN DE INFORMACIÓN</div><h1>{{ activeFarm ? `Lotes · ${activeFarm.name}` : config.title }}</h1><p>{{ activeFarm ? `Consulta y administra los lotes de este predio (${formatArea(activeFarm.area)} HA en total).` : config.entity === 'notifications' && !canEdit ? 'Consulta las notificaciones y su historial.' : config.description }}</p></div>
      <q-btn v-if="canEdit" color="primary" unelevated no-caps icon="add" :label="`${config.entity === 'notifications' ? 'Nueva' : 'Nuevo'} ${config.singular}`" @click="openCreate" />
    </div>
    <q-tabs v-if="config.entity === 'notifications'" v-model="notificationView" dense align="left" active-color="primary" indicator-color="primary" class="farm-view-tabs" aria-label="Secciones de notificaciones">
      <q-tab name="active" label="Notificaciones" icon="notifications_active" />
      <q-tab name="history" label="Historial" icon="history" />
    </q-tabs>
    <q-card flat bordered class="records-card" :class="{ 'telemetry-records-card': config.entity === 'telemetry' }">
      <div class="records-toolbar">
        <div class="records-count">
          <strong>{{ filteredRows.length }}</strong>
          {{ config.entity === 'lots' ? 'lotes' : 'registros' }}
        </div>
        <q-space />
        <q-btn
          v-if="canEdit && config.entity === 'notifications' && notificationView === 'active' && activeNotificationCount"
          flat
          no-caps
          color="negative"
          icon="delete_sweep"
          label="Borrar todas"
          @click="bulkDeleteDialog = true"
        />
        <q-input v-model="search"
          dense
          outlined
          clearable
          placeholder="Buscar registros..."
          class="records-search"
        ><template #prepend><q-icon name="search" /></template></q-input>
      </div>
      <div v-if="filterField && config.entity !== 'telemetry'" class="telemetry-filter-row">
        <q-select v-model="enumFilter" dense outlined clearable emit-value map-options :options="filterField.options.map(option => typeof option === 'string' ? ({ label: option, value: option }) : option)" :placeholder="`Todos · ${filterField.label.toLocaleLowerCase()}`" :aria-label="`Filtrar por ${filterField.label.toLocaleLowerCase()}`" />
      </div>
      <div v-if="config.entity === 'telemetry'" class="telemetry-filter-row">
        <label class="telemetry-filter-item"><span>Limita las lecturas al predio seleccionado.</span><q-select v-model="telemetryFilters.farmId" dense outlined clearable emit-value map-options :options="telemetryFarmOptions" placeholder="Todos los predios" aria-label="Filtrar por predio" @update:model-value="telemetryFilters.lotId = ''" /></label>
        <label class="telemetry-filter-item"><span>Limita las lecturas al lote seleccionado.</span><q-select v-model="telemetryFilters.lotId" dense outlined clearable emit-value map-options :options="telemetryLotOptions" placeholder="Todos los lotes" aria-label="Filtrar por lote" /></label>
        <label class="telemetry-filter-item"><span>Selecciona el tipo de medición.</span><q-select v-model="telemetryFilters.variable" dense outlined clearable emit-value map-options :options="['Humedad del suelo', 'Temperatura', 'Precipitación', 'Humedad ambiental', 'pH'].map(value => ({ label: value, value }))" placeholder="Todas las variables" aria-label="Filtrar por variable" /></label>
        <label class="telemetry-filter-item"><span>Incluye lecturas registradas desde esta fecha.</span><q-input v-model="telemetryFilters.from" type="date" dense outlined aria-label="Fecha desde" /></label>
        <label class="telemetry-filter-item"><span>Incluye lecturas registradas hasta esta fecha.</span><q-input v-model="telemetryFilters.to" type="date" dense outlined aria-label="Fecha hasta" /></label>
      </div>
      <q-banner v-if="invalidTelemetryRange" dense class="bg-orange-1 text-orange-10">La fecha inicial no puede ser posterior a la fecha final.</q-banner>
      <q-table v-if="!useVisualCards" :rows="filteredRows" :columns="columns" row-key="id" flat :rows-per-page-options="[10, 25, 50]" no-data-label="No hay registros para mostrar">
        <template #body-cell-status="props">
          <q-td :props="props"><q-badge :class="statusClass(props.value)">{{ props.value }}</q-badge></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="action-cell">
            <q-btn v-if="config.entity === 'cycles'" flat round dense icon="open_in_new" color="primary" aria-label="Ver seguimiento" :to="{ name: 'cycle-detail', params: { id: props.row.id } }"><q-tooltip>Ver seguimiento</q-tooltip></q-btn>
            <q-btn v-else-if="config.entity !== 'telemetry'" flat round dense icon="visibility" color="grey-7" aria-label="Ver detalle" @click="openDetail(props.row)"><q-tooltip>Ver detalle</q-tooltip></q-btn>
            <q-btn v-if="canEdit && config.entity === 'notifications' && props.row.status === 'Pendiente'" flat round dense icon="done" color="positive" aria-label="Marcar atendida" @click="markAttended(props.row)"><q-tooltip>Marcar atendida</q-tooltip></q-btn>
            <q-btn v-if="canEdit && !props.row.deletedAt" flat round dense icon="edit" color="primary" aria-label="Editar registro" @click="openEdit(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
            <q-separator v-if="canEdit && !props.row.deletedAt" vertical class="action-delete-separator" />
            <q-btn v-if="canEdit && !props.row.deletedAt" flat round dense icon="delete_outline" color="negative" aria-label="Eliminar registro" @click="confirmDelete(props.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width empty-state table-empty"><q-icon name="inventory_2" /><strong>{{ hasFilters ? 'No encontramos resultados' : 'Todavía no hay registros' }}</strong><span>{{ hasFilters ? 'Prueba con otros términos de búsqueda o filtros.' : 'Cuando agregues información, aparecerá aquí.' }}</span><q-btn v-if="canEdit && !hasFilters" flat no-caps color="primary" :label="`Crear ${config.singular}`" @click="openCreate" /></div>
        </template>
      </q-table>
      <div v-if="filteredRows.length" class="row q-col-gutter-md record-card-grid" :class="{ 'record-card-grid-always': useVisualCards }" aria-label="Registros">
        <div v-for="row in filteredRows" :key="row.id" :class="config.entity === 'lots' ? 'col-12 col-sm-6 col-md-4' : 'col-12 col-sm-6 col-md-4 col-lg-3'">
          <q-card flat bordered class="record-mobile-card"
          :clickable="config.entity === 'farms'" :aria-label="config.entity === 'farms' ? `Ver detalle del predio ${row.name}` : undefined"
            :role="config.entity === 'farms' ? 'button' : undefined" :tabindex="config.entity === 'farms' ? 0 : undefined"
            @click="config.entity === 'farms' && openDetail(row)"
            @keyup.enter.self="config.entity === 'farms' && openDetail(row)"
            @keyup.space.self.prevent="config.entity === 'farms' && openDetail(row)"
            @keydown.space.self.prevent>
            <template v-if="config.entity === 'farms'">
              <div class="field-card-visual">
                <img class="field-card-image" :src="row.image || farmPlaceholder" :alt="`Imagen de ${row.name}`" @error="useImageFallback($event, 'farms')" />
                <div class="field-card-location"><q-icon name="place" />{{ row.municipality }}, {{ row.department }}</div>
                <div class="field-card-area"><strong>{{ formatArea(row.area) }}</strong><span>HA</span></div>
              </div>
              <q-card-section class="farm-card-summary">
                <div>
                  <h2>{{ row.name }}</h2>
                  <p>{{ row.lotsCount }} {{ row.lotsCount === 1 ? 'lote asociado' : 'lotes asociados' }}</p>
                </div>
                <q-badge :class="statusClass(row.status)">{{ row.status }}</q-badge>
              </q-card-section>
              <q-card-actions class="record-mobile-actions">
                <div class="record-safe-actions">
                  <q-btn flat round icon="visibility" color="grey-8" aria-label="Ver detalle" @click.stop="openDetail(row)" />
                  <q-btn v-if="canEdit" flat round icon="edit" color="primary" aria-label="Editar predio" @click.stop="openEdit(row)" />
                  <q-btn v-if="canEdit" flat round icon="delete_outline" color="negative" aria-label="Eliminar predio" @click.stop="confirmDelete(row)" />
                </div>
              </q-card-actions>
            </template>
            <template v-else>
              <div v-if="config.entity === 'lots'" class="field-card-visual">
                <img class="field-card-image" :src="row.image || lotPlaceholder" :alt="`Imagen de ${row.name}`" @error="useImageFallback($event, 'lots')" />
                <div class="field-card-area"><strong>{{ formatArea(row.area) }}</strong><span>HA</span></div>
              </div>
              <q-expansion-item expand-separator class="record-card-expansion" @click.stop>
                <template #header>
                  <q-item-section>
                    <q-item-label class="record-card-title">{{ rowName(row) }}</q-item-label>
                    <q-item-label caption>{{ config.title }}</q-item-label>
                  </q-item-section>
                  <q-item-section v-if="row.status" side><q-badge :class="statusClass(row.status)">{{ row.status }}</q-badge></q-item-section>
                </template>
                <q-card-section class="record-mobile-card-fields">
                  <div v-for="[key, label] in config.columns.filter(([key]) => key !== 'name')" :key="key" class="record-mobile-field">
                    <span>{{ label }}</span><strong>{{ row[key] ?? '—' }}</strong>
                  </div>
                </q-card-section>
                <q-card-section v-if="config.entity === 'lots'" class="lot-condition-grid">
                  <div><q-icon name="water_drop" /><span>Humedad</span><strong>{{ row.latestHumidity !== undefined ? `${row.latestHumidity} %` : 'Sin lectura' }}</strong></div>
                  <div><q-icon name="health_and_safety" /><span>Sanidad</span><strong>Sin registro</strong></div>
                  <div><q-icon name="schedule" /><span>Tiempo al corte</span><strong>Sin registro</strong></div>
                </q-card-section>
                <q-card-actions class="record-mobile-actions">
                  <div class="record-safe-actions">
                    <q-btn v-if="config.entity === 'cycles'" flat round icon="open_in_new" color="primary" aria-label="Ver detalle" :to="{ name: 'cycle-detail', params: { id: row.id } }" />
                    <q-btn v-else-if="!['lots', 'crops'].includes(config.entity)" flat round icon="visibility" color="grey-8" aria-label="Ver detalle" @click="openDetail(row)" />
                    <q-btn v-if="canEdit && config.entity === 'notifications' && !row.deletedAt && row.status === 'Pendiente'" flat round icon="done" color="positive" aria-label="Marcar atendida" @click="markAttended(row)" />
                    <q-btn v-if="canEdit && !row.deletedAt" flat round icon="edit" color="primary" aria-label="Editar registro" @click="openEdit(row)" />
                  </div>
                  <q-separator v-if="canEdit && !row.deletedAt" vertical />
                  <q-btn v-if="canEdit && !row.deletedAt" flat round icon="delete_outline" color="negative" aria-label="Eliminar registro" class="delete-action" @click="confirmDelete(row)" />
                </q-card-actions>
              </q-expansion-item>
            </template>
          </q-card>
        </div>
      </div>
      <div v-else class="record-card-grid record-mobile-empty" :class="{ 'record-card-grid-always': useVisualCards }">
        <div class="empty-state">
          <q-icon name="inventory_2" />
          <strong>{{ hasFilters ? 'No encontramos resultados' : 'Todavía no hay registros' }}</strong>
          <span>{{ activeFarm ? `Este predio aún no tiene lotes registrados.` : hasFilters ? 'Prueba con otros términos de búsqueda o filtros.' : 'Cuando agregues información, aparecerá aquí.' }}</span>
          <q-btn v-if="canEdit && !search && !enumFilter" flat no-caps color="primary" :label="`Registrar ${config.singular}`" @click="openCreate" />
        </div>
      </div>
      <div v-if="config.entity === 'telemetry'" class="simulation-note"><q-icon name="info" /> Todas las lecturas de esta pantalla son simuladas para demostración.</div>
      <div v-if="config.entity === 'users'" class="simulation-note"><q-icon name="info" /> Crear un usuario aquí no genera credenciales. El acceso seguro y alta de cuentas requieren el backend.</div>
    </q-card>

    <q-dialog v-model="dialog">
      <q-card class="record-dialog">
        <q-card-section class="dialog-heading"><div><h2>{{ editing ? 'Editar' : 'Nuevo' }} {{ config.singular }}</h2><p>Completa la información del registro.</p></div><q-btn v-close-popup flat round dense icon="close" /></q-card-section>
        <q-separator />
        <q-card-section class="dialog-body">
          <q-form ref="formRef" class="record-form" greedy novalidate @submit.prevent="submitForm">
            <q-stepper v-if="config.entity === 'activities'" v-model="activityStep" flat animated :header-nav="false" class="activity-stepper">
              <q-step v-for="step in activityFieldGroups" :key="step.name" :name="step.name" :title="step.title" :caption="step.caption" :icon="step.name === 1 ? 'landscape' : step.name === 2 ? 'event_note' : 'person'">
                <div class="activity-step-fields">
                  <div v-for="field in activityFieldsForStep(step.name)" :key="field.key" class="form-field">
                    <label :for="`field-${field.key}`">{{ field.label }}<span v-if="field.required"> *</span></label>
                    <RecordFormField v-model="form[field.key]" :field="field" :options="fieldOptions(field)" :disabled="field.key === 'lotId' && !form.farmId" />
                  </div>
                </div>
                <div class="dialog-actions activity-step-actions">
                  <q-btn v-if="step.name > 1" flat no-caps label="Anterior" @click="activityStep -= 1" />
                  <q-space />
                  <q-btn v-if="step.name < activityFieldGroups.length" unelevated color="primary" no-caps label="Continuar" icon-right="arrow_forward" @click="advanceActivityStep" />
                  <q-btn v-else type="submit" color="primary" unelevated no-caps label="Guardar registro" />
                </div>
              </q-step>
            </q-stepper>
            <template v-else>
              <div v-for="field in config.fields" :key="field.key" class="form-field">
                <label :for="`field-${field.key}`">{{ field.label }}<span v-if="field.required"> *</span></label>
                <RecordFormField v-model="form[field.key]" :field="field" :options="fieldOptions(field)" :disabled="field.key === 'lotId' && !form.farmId" />
                <div v-if="field.key === 'area' && lotAreaGuidance" class="area-guidance" :class="{ 'area-guidance-over': lotAreaGuidance.exceedsAvailable }">
                  <div class="area-guidance-heading">
                    <span>{{ formatArea(form.area || 0) }} HA del predio</span>
                    <strong>{{ formatArea(lotAreaGuidance.percentage) }}%</strong>
                  </div>
                  <q-linear-progress rounded size="8px" :value="lotAreaGuidance.progress" color="primary" track-color="green-1" />
                  <span>Disponible para nuevos lotes: {{ formatArea(lotAreaGuidance.availableArea) }} HA</span>
                  <span v-if="lotAreaGuidance.exceedsAvailable" class="area-guidance-warning">El área ingresada supera el área disponible de este predio.</span>
                </div>
              </div>
              <div v-if="['farms', 'lots'].includes(config.entity)" class="form-field image-upload-field">
                <label for="record-image">Imagen (opcional)</label>
                <q-file id="record-image" v-model="imageFile" outlined dense clearable accept="image/*" max-file-size="2097152" label="Selecciona una imagen" @update:model-value="loadImage" @rejected="rejectImage">
                  <template #prepend><q-icon name="image" /></template>
                </q-file>
                <small class="image-upload-help">Máximo 2 MB. Si no subes una imagen, se mostrará la imagen predeterminada.</small>
                <img class="form-image-preview" :src="imageData || (config.entity === 'farms' ? farmPlaceholder : lotPlaceholder)" alt="Vista previa de la imagen" @error="useImageFallback($event, config.entity)" />
              </div>
              <div class="dialog-actions"><q-btn v-close-popup flat no-caps label="Cancelar" /><q-btn type="submit" color="primary" unelevated no-caps :disable="imageLoading" label="Guardar registro" /></div>
            </template>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog" persistent>
      <q-card class="record-dialog delete-dialog">
        <q-card-section class="dialog-heading">
          <div><div class="section-eyebrow">ACCIÓN IRREVERSIBLE</div><h2>{{ ['farms', 'lots'].includes(config.entity) ? deleteStep === 1 ? `¿Seguro que deseas eliminar este ${config.singular}?` : 'Confirma la eliminación' : 'Confirma la eliminación' }}</h2><p v-if="['farms', 'lots'].includes(config.entity)">{{ deleteStep === 1 ? 'Revisa el resumen antes de continuar.' : 'Escribe el nombre exacto para confirmar.' }}</p><p v-else>Para evitar errores, confirma escribiendo el nombre exacto:</p></div>
          <q-btn flat round icon="close" aria-label="Cerrar" @click="closeDeleteDialog" />
        </q-card-section>
        <q-card-section v-if="['farms', 'lots'].includes(config.entity) && deleteStep === 1" class="delete-confirmation-content">
          <q-banner rounded class="delete-summary-banner">
            <template #avatar><q-icon name="warning_amber" color="negative" /></template>
            <strong>{{ rowName(pendingDelete) }}</strong>
            <div>{{ config.entity === 'farms' ? `${pendingDelete?.municipality}, ${pendingDelete?.department} · ${formatArea(pendingDelete?.area)} HA · ${pendingDelete?.lotsCount ?? getRecords('lots').filter(lot => lot.farmId === pendingDelete?.id).length} lotes` : `${nameOf('farms', pendingDelete?.farmId)} · ${formatArea(pendingDelete?.area)} HA · ${pendingDelete?.soilType}` }}</div>
            <div>Esta acción no se puede deshacer y puede estar bloqueada si hay registros relacionados.</div>
          </q-banner>
        </q-card-section>
        <q-card-section v-else class="delete-confirmation-content">
          <strong>{{ rowName(pendingDelete) }}</strong>
          <p v-if="['farms', 'lots'].includes(config.entity)">Confirma que deseas eliminar este {{ config.singular }} escribiendo su nombre.</p>
          <q-input v-model="deleteConfirmationText" outlined autofocus :placeholder="rowName(pendingDelete)" aria-label="Escribe el nombre del registro para confirmar" />
          <small v-if="['farms', 'lots'].includes(config.entity) && !deleteReady">El botón se habilitará en un momento.</small>
        </q-card-section>
        <q-card-actions align="right" class="delete-dialog-actions">
          <q-btn flat no-caps label="Cancelar" class="delete-cancel-button" @click="closeDeleteDialog" />
          <q-btn v-if="['farms', 'lots'].includes(config.entity) && deleteStep === 1" unelevated no-caps color="primary" icon-right="arrow_forward" label="Continuar" @click="continueDelete" />
          <q-btn v-else unelevated no-caps color="negative" icon="delete_outline" label="Sí, eliminar" :disable="deleteConfirmationText.trim() !== rowName(pendingDelete) || (['farms', 'lots'].includes(config.entity) && !deleteReady)" @click="deleteRecord" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="bulkDeleteDialog">
      <q-card class="notification-confirm-dialog">
        <q-card-section>
          <div class="section-eyebrow">CONFIRMAR ACCIÓN</div>
          <h2>Borrar todas las notificaciones</h2>
          <p>{{ activeNotificationCount }} notificaciones se moverán al Historial. No se eliminarán definitivamente.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" @click="bulkDeleteDialog = false" />
          <q-btn unelevated no-caps color="negative" label="Borrar todas" @click="clearAllNotifications" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailDialog">
      <q-card class="record-dialog detail-dialog">
        <q-card-section class="dialog-heading"><div><div class="section-eyebrow">DETALLE</div><h2>{{ selected?.name || selected?.title || selected?.type || config.singular }}</h2></div><q-btn v-close-popup flat round dense icon="close" /></q-card-section>
        <q-separator />
        <template v-if="['farms', 'lots'].includes(config.entity)">
          <img class="detail-cover-image" :src="selected?.image || (config.entity === 'farms' ? farmPlaceholder : lotPlaceholder)" :alt="`Imagen de ${selected?.name}`" @error="useImageFallback($event, config.entity)" />
          <q-card-section class="detail-content">
            <div class="detail-status-row">
              <q-badge :class="statusClass(selected?.status)">{{ selected?.status }}</q-badge>
              <span v-if="config.entity === 'lots'">{{ nameOf('farms', selected?.farmId) }}</span>
            </div>
            <div class="detail-info-grid">
              <div v-for="[label, value] in rowDetails(selected || {})" :key="label">
                <span>{{ label }}</span><strong>{{ value || '—' }}</strong>
              </div>
            </div>
            <q-btn v-if="config.entity === 'farms'" unelevated no-caps color="primary" icon="grid_view" label="Lotes asociados" @click="openFarmLotsPanel(selected)" />
          </q-card-section>
        </template>
        <q-list v-else separator><q-item v-for="[label, value] in rowDetails(selected || {})" :key="label"><q-item-section><q-item-label caption>{{ label }}</q-item-label><q-item-label>{{ value }}</q-item-label></q-item-section></q-item></q-list>
      </q-card>
    </q-dialog>

    <q-dialog v-model="farmLotsPanel" position="right" full-height>
      <q-card class="farm-lots-panel">
        <q-card-section class="dialog-heading">
          <div><div class="section-eyebrow">LOTES DEL PREDIO</div><h2>{{ farmPanelFarm?.name }}</h2><p>{{ farmPanelLots.length }} lotes asociados</p></div>
          <q-btn flat round dense icon="close" aria-label="Cerrar panel" @click="farmLotsPanel = false" />
        </q-card-section>
        <q-separator />
        <q-scroll-area class="farm-lots-panel-scroll">
          <q-card v-for="lot in farmPanelLots" :key="lot.id" flat bordered class="farm-lot-panel-card">
            <img :src="lot.image || lotPlaceholder" :alt="`Imagen de ${lot.name}`" @error="useImageFallback($event, 'lots')" />
            <div class="farm-lot-panel-copy">
              <div><strong>{{ lot.name }}</strong><q-badge :class="statusClass(lot.status)">{{ lot.status }}</q-badge></div>
              <span>{{ formatArea(lot.area) }} HA · {{ lot.soilType }}</span>
            </div>
          </q-card>
          <div v-if="!farmPanelLots.length" class="empty-state"><q-icon name="agriculture" /><strong>Sin lotes registrados</strong><span>Este predio todavía no tiene lotes asociados.</span></div>
        </q-scroll-area>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cerrar" @click="farmLotsPanel = false" />
          <q-btn unelevated no-caps color="primary" label="Gestionar lotes" :to="{ name: 'lots', query: { farm: farmPanelFarm?.id } }" @click="farmLotsPanel = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
