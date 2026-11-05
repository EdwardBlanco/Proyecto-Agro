<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { canWrite, visibleFarmIds } from '@/services/permissions'
import { getRecord, getRecords, removeRecord, saveRecord } from '@/services/storage'
import { entityConfig } from '@/features/records/config'
import RecordFormField from '@/features/records/components/RecordFormField.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const config = computed(() => entityConfig[String(route.name)])
const useVisualCards = computed(() => ['farms', 'lots', 'crops', 'inputs'].includes(config.value.entity))
const activeFarmId = computed(() => config.value.entity === 'lots' && typeof route.query.farm === 'string' ? route.query.farm : '')
const activeFarm = computed(() => activeFarmId.value ? getRecord('farms', activeFarmId.value) : null)
const search = ref('')
const farmView = ref('farms')
const globalLotSearch = ref('')
const enumFilter = ref('')
const telemetryFilters = ref({ farmId: '', lotId: '', variable: '', from: '', to: '' })
const dialog = ref(false)
const detailDialog = ref(false)
const deleteDialog = ref(false)
const deleteConfirmationText = ref('')
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
  if (config.value.entity === 'telemetry') {
    row.valueWithUnit = `${item.value} ${item.unit}`
    row.simulatedLabel = 'Simulada'
  }
  return row
}

const rows = computed(() => allRecords.value.filter(isVisible).map(displayRow))
const globalLotRows = computed(() => {
  const query = globalLotSearch.value.trim().toLocaleLowerCase()
  return getRecords('lots')
    .filter((lot) => !allowedFarmIds.value || allowedFarmIds.value.includes(lot.farmId))
    .map((lot) => {
      const activeCycle = getRecords('cycles').find((cycle) => cycle.lotId === lot.id && cycle.status === 'En curso')
      const humidity = getRecords('telemetry')
        .filter((reading) => reading.lotId === lot.id && reading.variable === 'Humedad del suelo')
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]?.value
      return {
        ...lot,
        farmName: nameOf('farms', lot.farmId),
        cropName: activeCycle ? nameOf('crops', activeCycle.cropId) : 'Sin cultivo activo',
        latestHumidity: humidity
      }
    })
    .filter((lot) => !query || `${lot.name} ${lot.cropName}`.toLocaleLowerCase().includes(query))
})
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
  if (field.type === 'users') return getRecords('users').map((user) => ({ label: user.name, value: user.id }))
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
  const enteredArea = Number(form.value.area)
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
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value)
}

function openFarmLots(farm) {
  router.push({ name: 'lots', query: { farm: farm.id } })
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
  if (config.value.entity === 'farms') initial.owner = auth.currentUser?.name ?? ''
  if (config.value.entity === 'lots' && activeFarmId.value) initial.farmId = activeFarmId.value
  form.value = initial
  dialog.value = true
}

function openEdit(row) {
  editing.value = row.id
  activityStep.value = 1
  form.value = JSON.parse(JSON.stringify(getRecord(config.value.entity, row.id)))
  dialog.value = true
}

function openDetail(row) {
  selected.value = row
  detailDialog.value = true
}

function validateRelations() {
  const value = form.value
  for (const field of config.value.fields.filter((item) => item.type === 'number' && value[item.key] !== '' && value[item.key] !== null && value[item.key] !== undefined)) {
    const number = Number(value[field.key])
    if (!Number.isFinite(number)) throw new Error(`${field.label} debe ser un número válido.`)
    if (field.min !== undefined && number < field.min) throw new Error(`${field.label} no puede ser menor que ${field.min}.`)
    if (field.max !== undefined && number > field.max) throw new Error(`${field.label} no puede ser mayor que ${field.max}.`)
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
    if (Number(value.area) <= 0 || Number(value.area) > available) throw new Error(`El área sembrada debe ser mayor que cero y no superar las ${available} ha disponibles del lote.`)
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
    if (Number(value.area) <= 0 || used + Number(value.area) > Number(farm.area)) throw new Error(`El área del lote debe ser positiva y el área total de lotes no puede superar ${farm.area} ha.`)
    if (editing.value && value.farmId !== getRecord('lots', editing.value)?.farmId && getRecords('cycles').some((cycle) => cycle.lotId === editing.value)) throw new Error('No se puede cambiar de predio un lote que ya tiene ciclos productivos.')
    const planted = getRecords('cycles').filter((cycle) => cycle.lotId === editing.value).reduce((sum, cycle) => sum + Number(cycle.area || 0), 0)
    if (planted > Number(value.area)) throw new Error(`El área del lote no puede reducirse por debajo de las ${planted} ha ya sembradas.`)
  }
  if (config.value.entity === 'farms') {
    const occupied = getRecords('lots').filter((lot) => lot.farmId === editing.value).reduce((sum, lot) => sum + Number(lot.area || 0), 0)
    if (Number(value.area) <= 0 || occupied > Number(value.area)) throw new Error(`El área del predio debe ser positiva y no menor que las ${occupied} ha asignadas a lotes.`)
  }
}

async function submitForm() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  try {
    validateRelations()
    const value = { ...form.value }
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
  deleteDialog.value = true
}

function deleteRecord() {
  const expectedName = rowName(pendingDelete.value)
  if (!pendingDelete.value || deleteConfirmationText.value.trim() !== expectedName) {
    $q.notify({ type: 'negative', message: `Escribe exactamente "${expectedName}" para confirmar.` })
    return
  }
  try {
    removeRecord(config.value.entity, pendingDelete.value.id)
    deleteDialog.value = false
    pendingDelete.value = null
    $q.notify({ type: 'positive', message: 'Registro eliminado.' })
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
      ['Municipio', row.municipality], ['Departamento', row.department], ['Área total', `${row.area} ha`],
      ['Responsable', row.owner], ['Usuarios autorizados', getRecords('users').filter((user) => user.farms?.includes(row.id)).map((user) => user.name).join(', ') || 'Sin asignación']
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

watch(() => [route.name, route.query.farm, route.query.cycle], () => {
  search.value = ''
  enumFilter.value = ''
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
    <div class="page-intro-row">
      <div><div class="section-eyebrow">GESTIÓN DE INFORMACIÓN</div><h1>{{ activeFarm ? `Lotes · ${activeFarm.name}` : config.title }}</h1><p>{{ activeFarm ? `Consulta y administra los lotes de este predio (${activeFarm.area} ha en total).` : config.description }}</p></div>
      <q-btn v-if="canEdit" color="primary" unelevated no-caps icon="add" :label="`Nuevo ${config.singular}`" @click="openCreate" />
    </div>
    <q-tabs
      v-if="config.entity === 'farms'"
      v-model="farmView"
      dense
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="farm-view-tabs"
      aria-label="Vistas de predios y lotes"
    >
      <q-tab name="farms" label="Mis Fincas" icon="landscape" />
      <q-tab name="lots" label="Todos los Lotes Globales" icon="grid_view" />
    </q-tabs>
    <q-card flat bordered class="records-card">
      <div class="records-toolbar">
        <div class="records-count">
          <strong>{{ config.entity === 'farms' && farmView === 'lots' ? globalLotRows.length : filteredRows.length }}</strong>
          {{ config.entity === 'farms' && farmView === 'lots' ? 'lotes' : 'registros' }}
        </div>
        <q-space />
        <q-input
          v-if="config.entity === 'farms' && farmView === 'lots'"
          v-model="globalLotSearch"
          dense
          outlined
          clearable
          placeholder="Buscar lote o cultivo..."
          aria-label="Buscar por nombre de lote o cultivo"
          class="records-search"
        ><template #prepend><q-icon name="search" /></template></q-input>
        <q-input
          v-else
          v-model="search"
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
        <q-select v-model="telemetryFilters.farmId" dense outlined clearable emit-value map-options :options="telemetryFarmOptions" placeholder="Todos los predios" aria-label="Filtrar por predio" @update:model-value="telemetryFilters.lotId = ''" />
        <q-select v-model="telemetryFilters.lotId" dense outlined clearable emit-value map-options :options="telemetryLotOptions" placeholder="Todos los lotes" aria-label="Filtrar por lote" />
        <q-select v-model="telemetryFilters.variable" dense outlined clearable emit-value map-options :options="['Humedad del suelo', 'Temperatura', 'Precipitación', 'Humedad ambiental', 'pH'].map(value => ({ label: value, value }))" placeholder="Todas las variables" aria-label="Filtrar por variable" />
        <q-input v-model="telemetryFilters.from" type="date" dense outlined aria-label="Fecha desde" />
        <q-input v-model="telemetryFilters.to" type="date" dense outlined aria-label="Fecha hasta" />
      </div>
      <q-banner v-if="invalidTelemetryRange" dense class="bg-orange-1 text-orange-10">La fecha inicial no puede ser posterior a la fecha final.</q-banner>
      <q-table v-if="!useVisualCards" :rows="filteredRows" :columns="columns" row-key="id" flat :rows-per-page-options="[10, 25, 50]" no-data-label="No hay registros para mostrar">
        <template #body-cell-actions="props">
          <q-td :props="props" class="action-cell">
            <q-btn v-if="config.entity === 'cycles'" flat round dense icon="open_in_new" color="primary" aria-label="Ver detalle" :to="{ name: 'cycle-detail', params: { id: props.row.id } }"><q-tooltip>Ver seguimiento</q-tooltip></q-btn>
            <q-btn v-else flat round dense icon="visibility" color="grey-7" aria-label="Ver detalle" @click="openDetail(props.row)"><q-tooltip>Ver detalle</q-tooltip></q-btn>
            <q-btn v-if="canEdit && config.entity === 'notifications' && props.row.status === 'Pendiente'" flat round dense icon="done" color="positive" aria-label="Marcar atendida" @click="markAttended(props.row)"><q-tooltip>Marcar atendida</q-tooltip></q-btn>
            <q-btn v-if="canEdit" flat round dense icon="edit" color="primary" aria-label="Editar registro" @click="openEdit(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
            <q-separator v-if="canEdit" vertical class="action-delete-separator" />
            <q-btn v-if="canEdit" flat round dense icon="delete_outline" color="negative" aria-label="Eliminar registro" @click="confirmDelete(props.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width empty-state table-empty"><q-icon name="inventory_2" /><strong>{{ hasFilters ? 'No encontramos resultados' : 'Todavía no hay registros' }}</strong><span>{{ hasFilters ? 'Prueba con otros términos de búsqueda o filtros.' : 'Cuando agregues información, aparecerá aquí.' }}</span><q-btn v-if="canEdit && !hasFilters" flat no-caps color="primary" :label="`Crear ${config.singular}`" @click="openCreate" /></div>
        </template>
      </q-table>
      <div v-if="config.entity === 'farms' && farmView === 'lots'" class="row q-col-gutter-md global-lot-grid" aria-label="Todos los lotes">
        <div v-for="lot in globalLotRows" :key="lot.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
          <q-card flat bordered class="global-lot-card">
            <div class="global-lot-card-heading">
              <q-icon name="agriculture" color="primary" />
              <div><h2>{{ lot.name }}</h2><span>{{ lot.farmName }}</span></div>
            </div>
            <div class="global-lot-card-area"><strong>{{ lot.area }}</strong><span>ha</span><q-badge color="green-1" text-color="green-10">{{ lot.status }}</q-badge></div>
            <div class="global-lot-card-details">
              <div><span>Cultivo</span><strong>{{ lot.cropName }}</strong></div>
              <div><span>Humedad del suelo</span><strong>{{ lot.latestHumidity !== undefined ? `${lot.latestHumidity} %` : 'Sin lectura' }}</strong></div>
              <div><span>Sanidad</span><strong>Sin registro</strong></div>
            </div>
            <q-card-actions>
              <q-btn flat no-caps color="primary" icon="arrow_forward" label="Ver predio" class="arrow-action" :to="{ name: 'lots', query: { farm: lot.farmId } }" />
            </q-card-actions>
          </q-card>
        </div>
        <div v-if="!globalLotRows.length" class="col-12">
          <div class="empty-state">
            <q-icon name="agriculture" />
            <strong>{{ globalLotSearch ? 'No encontramos lotes' : 'Todavía no hay lotes registrados' }}</strong>
            <span>{{ globalLotSearch ? 'Prueba con otro nombre de lote o cultivo.' : 'Registra un lote desde la ficha de uno de tus predios.' }}</span>
            <q-btn v-if="!globalLotSearch" flat no-caps color="primary" icon="landscape" label="Ir a Mis Fincas" @click="farmView = 'farms'" />
          </div>
        </div>
      </div>
      <div v-else-if="filteredRows.length" class="row q-col-gutter-md record-card-grid" :class="{ 'record-card-grid-always': useVisualCards }" aria-label="Registros">
        <div v-for="row in filteredRows" :key="row.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
          <q-card flat bordered class="record-mobile-card"
            :clickable="config.entity === 'farms'" :aria-label="config.entity === 'farms' ? `Ver lotes del predio ${row.name}` : undefined"
            :role="config.entity === 'farms' ? 'button' : undefined" :tabindex="config.entity === 'farms' ? 0 : undefined"
            @click="config.entity === 'farms' && openFarmLots(row)"
            @keyup.enter.self="config.entity === 'farms' && openFarmLots(row)"
            @keyup.space.self.prevent="config.entity === 'farms' && openFarmLots(row)"
            @keydown.space.self.prevent>
            <template v-if="config.entity === 'farms'">
              <div class="field-card-visual">
                <div class="field-card-illustration">
                  <q-icon name="landscape" />
                  <span>{{ row.municipality }}, {{ row.department }}</span>
                </div>
                <div class="field-card-area"><strong>{{ row.area }}</strong><span>hectáreas</span></div>
              </div>
              <q-card-section class="farm-card-summary">
                <div>
                  <h2>{{ row.name }}</h2>
                  <p>{{ row.lotsCount }} {{ row.lotsCount === 1 ? 'lote asociado' : 'lotes asociados' }}</p>
                </div>
                <q-icon name="arrow_forward" color="primary" />
              </q-card-section>
              <q-card-actions class="record-mobile-actions">
                <q-btn flat no-caps color="primary" icon="landscape" :label="`Ver ${row.lotsCount} ${row.lotsCount === 1 ? 'lote' : 'lotes'}`" @click.stop="openFarmLots(row)" />
                <div class="record-safe-actions">
                  <q-btn flat round icon="visibility" color="grey-8" aria-label="Ver detalle" @click.stop="openDetail(row)" />
                  <q-btn v-if="canEdit" flat round icon="edit" color="primary" aria-label="Editar predio" @click.stop="openEdit(row)" />
                  <q-btn v-if="canEdit" flat round icon="delete_outline" color="negative" aria-label="Eliminar predio" @click.stop="confirmDelete(row)" />
                </div>
              </q-card-actions>
            </template>
            <template v-else>
              <div v-if="config.entity === 'lots'" class="field-card-visual">
                <div class="field-card-illustration" aria-label="Fotografía del cultivo no disponible">
                  <q-icon name="agriculture" />
                  <span>Fotografía no disponible</span>
                </div>
                <div class="field-card-area"><strong>{{ row.area }}</strong><span>hectáreas</span></div>
              </div>
              <q-expansion-item expand-separator class="record-card-expansion" @click.stop>
                <template #header>
                  <q-item-section>
                    <q-item-label class="record-card-title">{{ rowName(row) }}</q-item-label>
                    <q-item-label caption>{{ config.title }}</q-item-label>
                  </q-item-section>
                  <q-item-section v-if="row.status" side><q-badge color="green-1" text-color="green-10">{{ row.status }}</q-badge></q-item-section>
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
                    <q-btn v-else flat round icon="visibility" color="grey-8" aria-label="Ver detalle" @click="openDetail(row)" />
                    <q-btn v-if="canEdit && config.entity === 'notifications' && row.status === 'Pendiente'" flat round icon="done" color="positive" aria-label="Marcar atendida" @click="markAttended(row)" />
                    <q-btn v-if="canEdit" flat round icon="edit" color="primary" aria-label="Editar registro" @click="openEdit(row)" />
                  </div>
                  <q-separator v-if="canEdit" vertical />
                  <q-btn v-if="canEdit" flat round icon="delete_outline" color="negative" aria-label="Eliminar registro" class="delete-action" @click="confirmDelete(row)" />
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
          <q-form ref="formRef" class="record-form" @submit.prevent="submitForm">
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
                    <span>{{ formatArea(form.area || 0) }} ha del predio</span>
                    <strong>{{ formatArea(lotAreaGuidance.percentage) }}%</strong>
                  </div>
                  <q-linear-progress rounded size="8px" :value="lotAreaGuidance.progress" color="primary" track-color="green-1" />
                  <span>Disponible para nuevos lotes: {{ formatArea(lotAreaGuidance.availableArea) }} ha</span>
                  <span v-if="lotAreaGuidance.exceedsAvailable" class="area-guidance-warning">El área ingresada supera el área disponible de este predio.</span>
                </div>
              </div>
              <div class="dialog-actions"><q-btn v-close-popup flat no-caps label="Cancelar" /><q-btn type="submit" color="primary" unelevated no-caps label="Guardar registro" /></div>
            </template>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog" persistent>
      <q-card class="record-dialog delete-dialog">
        <q-card-section class="dialog-heading">
          <div><div class="section-eyebrow">ACCIÓN IRREVERSIBLE</div><h2>Eliminar {{ config.singular }}</h2><p>Para evitar errores, confirma escribiendo el nombre exacto:</p></div>
          <q-btn flat round icon="close" aria-label="Cerrar" @click="deleteDialog = false" />
        </q-card-section>
        <q-card-section class="delete-confirmation-content">
          <strong>{{ rowName(pendingDelete) }}</strong>
          <q-input v-model="deleteConfirmationText" outlined autofocus :placeholder="rowName(pendingDelete)" aria-label="Escribe el nombre del registro para confirmar" />
        </q-card-section>
        <q-card-actions align="right" class="delete-dialog-actions">
          <q-btn flat no-caps label="Cancelar" @click="deleteDialog = false" />
          <q-btn unelevated no-caps color="negative" icon="delete_outline" label="Eliminar definitivamente" :disable="deleteConfirmationText.trim() !== rowName(pendingDelete)" @click="deleteRecord" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailDialog">
      <q-card class="record-dialog detail-dialog">
        <q-card-section class="dialog-heading"><div><div class="section-eyebrow">DETALLE</div><h2>{{ selected?.name || selected?.title || selected?.type || config.singular }}</h2></div><q-btn v-close-popup flat round dense icon="close" /></q-card-section>
        <q-separator />
        <q-list separator><q-item v-for="[label, value] in rowDetails(selected || {})" :key="label"><q-item-section><q-item-label caption>{{ label }}</q-item-label><q-item-label>{{ value }}</q-item-label></q-item-section></q-item></q-list>
        <q-card-section v-if="config.entity === 'farms'" class="farm-detail-lots"><strong>Lotes asociados</strong><q-list v-if="getRecords('lots').filter(lot => lot.farmId === selected?.id).length"><q-item v-for="lot in getRecords('lots').filter(lot => lot.farmId === selected?.id)" :key="lot.id"><q-item-section avatar><q-icon name="landscape" color="primary" /></q-item-section><q-item-section>{{ lot.name }}<q-item-label caption>{{ lot.area }} ha · {{ lot.soilType }}</q-item-label></q-item-section></q-item></q-list><p v-else class="small-empty">Este predio aún no tiene lotes.</p><q-btn flat no-caps color="primary" label="Gestionar lotes" :to="{ name: 'lots', query: { farm: selected?.id } }" @click="detailDialog = false" /></q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>
