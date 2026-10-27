<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { canWrite, visibleFarmIds } from '@/services/permissions'
import { getRecord, getRecords, removeRecord, saveRecord } from '@/services/storage'
import { entityConfig } from '@/features/records/config'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const config = computed(() => entityConfig[String(route.name)])
const search = ref('')
const enumFilter = ref('')
const telemetryFilters = ref({ farmId: '', lotId: '', variable: '', from: '', to: '' })
const dialog = ref(false)
const detailDialog = ref(false)
const editing = ref(null)
const selected = ref(null)
const form = ref({})
const formRef = ref(null)
const canEdit = computed(() => canWrite(auth.currentUser, config.value.entity))

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
const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return rows.value.filter((row) => {
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
const hasFilters = computed(() => Boolean(search.value.trim() || enumFilter.value || Object.values(telemetryFilters.value).some(Boolean)))
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
  form.value = initial
  dialog.value = true
}

function openEdit(row) {
  editing.value = row.id
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
  $q.dialog({ title: 'Eliminar registro', message: `¿Deseas eliminar este ${config.value.singular}? Esta acción no se puede deshacer.`, cancel: { flat: true, label: 'Cancelar' }, ok: { color: 'negative', label: 'Eliminar' }, persistent: true })
    .onOk(() => {
      try {
        removeRecord(config.value.entity, row.id)
        $q.notify({ type: 'positive', message: 'Registro eliminado.' })
      } catch (error) {
        $q.notify({ type: 'negative', message: error.message })
      }
    })
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
  search.value = config.value.entity === 'lots' && route.query.farm ? nameOf('farms', route.query.farm) : ''
  enumFilter.value = ''
})
</script>

<template>
  <q-page class="page-content records-page">
    <div class="page-intro-row">
      <div><div class="section-eyebrow">GESTIÓN DE INFORMACIÓN</div><h1>{{ config.title }}</h1><p>{{ config.description }}</p></div>
      <q-btn v-if="canEdit" color="primary" unelevated no-caps icon="add" :label="`Nuevo ${config.singular}`" @click="openCreate" />
    </div>
    <q-card flat bordered class="records-card">
      <div class="records-toolbar"><div class="records-count"><strong>{{ filteredRows.length }}</strong> registros</div><q-space /><q-input v-model="search" dense outlined clearable placeholder="Buscar registros..." class="records-search"><template #prepend><q-icon name="search" /></template></q-input></div>
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
      <q-table :rows="filteredRows" :columns="columns" row-key="id" flat :rows-per-page-options="[10, 25, 50]" no-data-label="No hay registros para mostrar">
        <template #body-cell-actions="props">
          <q-td :props="props" class="action-cell">
            <q-btn v-if="config.entity === 'cycles'" flat round dense icon="open_in_new" color="primary" aria-label="Ver detalle" :to="{ name: 'cycle-detail', params: { id: props.row.id } }"><q-tooltip>Ver seguimiento</q-tooltip></q-btn>
            <q-btn v-else flat round dense icon="visibility" color="grey-7" aria-label="Ver detalle" @click="openDetail(props.row)"><q-tooltip>Ver detalle</q-tooltip></q-btn>
            <q-btn v-if="canEdit && config.entity === 'notifications' && props.row.status === 'Pendiente'" flat round dense icon="done" color="positive" aria-label="Marcar atendida" @click="markAttended(props.row)"><q-tooltip>Marcar atendida</q-tooltip></q-btn>
            <q-btn v-if="canEdit" flat round dense icon="edit" color="primary" aria-label="Editar registro" @click="openEdit(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
            <q-btn v-if="canEdit" flat round dense icon="delete_outline" color="negative" aria-label="Eliminar registro" @click="confirmDelete(props.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width empty-state table-empty"><q-icon name="inventory_2" /><strong>{{ hasFilters ? 'No encontramos resultados' : 'Todavía no hay registros' }}</strong><span>{{ hasFilters ? 'Prueba con otros términos de búsqueda o filtros.' : 'Cuando agregues información, aparecerá aquí.' }}</span><q-btn v-if="canEdit && !hasFilters" flat no-caps color="primary" :label="`Crear ${config.singular}`" @click="openCreate" /></div>
        </template>
      </q-table>
      <div v-if="config.entity === 'telemetry'" class="simulation-note"><q-icon name="info" /> Todas las lecturas de esta pantalla son simuladas para demostración.</div>
      <div v-if="config.entity === 'users'" class="simulation-note"><q-icon name="info" /> Crear un usuario aquí no genera credenciales. El acceso seguro y alta de cuentas requieren el backend.</div>
    </q-card>

    <q-dialog v-model="dialog">
      <q-card class="record-dialog">
        <q-card-section class="dialog-heading"><div><h2>{{ editing ? 'Editar' : 'Nuevo' }} {{ config.singular }}</h2><p>Completa la información del registro.</p></div><q-btn v-close-popup flat round dense icon="close" /></q-card-section>
        <q-separator />
        <q-card-section class="dialog-body">
          <q-form ref="formRef" class="record-form" @submit.prevent="submitForm">
            <div v-for="field in config.fields" :key="field.key" class="form-field">
              <label :for="`field-${field.key}`">{{ field.label }}<span v-if="field.required"> *</span></label>
              <q-select v-if="field.type === 'ref' || field.type === 'users' || field.type === 'farms' || field.type === 'select' || field.type === 'select-value'"
                :id="`field-${field.key}`" v-model="form[field.key]" outlined dense emit-value map-options
                :multiple="field.multiple" :options="field.type === 'ref' ? relationOptions(field) : field.type === 'users' ? getRecords('users').map(user => ({ label: user.name, value: user.id })) : field.type === 'farms' ? getRecords('farms').map(farm => ({ label: farm.name, value: farm.id })) : (field.options || []).map(option => typeof option === 'string' ? ({ label: option, value: option }) : option)"
                :use-chips="field.multiple" :rules="field.required ? [value => (Array.isArray(value) ? value.length : Boolean(value)) || 'Este campo es obligatorio'] : []"
                :disable="field.key === 'lotId' && !form.farmId" />
              <q-input v-else :id="`field-${field.key}`" v-model="form[field.key]" outlined dense
                :type="field.type === 'textarea' ? 'textarea' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime-local' ? 'datetime-local' : field.type === 'email' ? 'email' : 'text'"
                :min="field.min" :max="field.max" :step="field.type === 'number' ? 'any' : undefined"
                :rules="field.required ? [value => (value !== '' && value !== null && value !== undefined) || 'Este campo es obligatorio'] : []"
                :input-style="field.type === 'textarea' ? 'min-height: 76px' : undefined" />
            </div>
            <div class="dialog-actions"><q-btn v-close-popup flat no-caps label="Cancelar" /><q-btn type="submit" color="primary" unelevated no-caps label="Guardar registro" /></div>
          </q-form>
        </q-card-section>
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
