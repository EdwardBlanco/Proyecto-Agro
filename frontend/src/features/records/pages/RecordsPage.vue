<script setup>
/**
 * Página CRUD genérica para todos los módulos de gestión (predios, lotes, cultivos,
 * insumos, ciclos, labores, semilleros, cosechas, telemetría, notificaciones y usuarios).
 * Se configura dinámicamente a partir de entityConfig (config.js) según route.name,
 * delega Predios y Usuarios al backend mediante farms.service.js / users.service.js
 * y persiste las demás entidades en storage.js.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { canAccess, canManageNotificationActions, canWrite, visibleFarmIds } from '@/services/permissions'
import { getRecord, getRecords, removeRecord, saveRecord } from '@/services/storage'
import {
  deleteNotification,
  isNotificationUnread,
  markNotificationRead
} from '@/services/notifications'
import { getAuthToken } from '@/services/api'
import { changeFarmStatus, createFarm, fetchFarms, updateFarm } from '@/services/farms.service'
import { changeUserStatus, createUser, fetchUsers, updateUser } from '@/services/users.service'
import { entityConfig } from '@/features/records/config'
import RecordFormField from '@/features/records/components/RecordFormField.vue'
import BackButton from '@/components/BackButton.vue'
import EmptyState from '@/components/EmptyState.vue'
import KpiCard from '@/components/KpiCard.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import farmPlaceholder from '@/assets/farm-placeholder.svg'
import lotPlaceholder from '@/assets/lot-placeholder.svg'
import RecordDetailDialog from '@/features/records/components/RecordDetailDialog.vue'
import { getResponsibleUsers } from '@/services/mock/users'
import { formatDateTime } from '@/services/dates'
import { harvestKilograms } from '@/services/production'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const config = computed(() => entityConfig[String(route.name)])
const useVisualCards = computed(() => ['farms', 'lots', 'crops', 'inputs'].includes(config.value.entity))
const activeFarmId = computed(() => config.value.entity === 'lots' && typeof route.params.farmId === 'string' ? route.params.farmId : '')
const activeFarm = computed(() => activeFarmId.value ? getRecord('farms', activeFarmId.value) : null)
const localUserManagement = computed(() => config.value.entity === 'users' && auth.currentUser?.role === 'Admin')
const formFields = computed(() => {
  if (config.value.entity !== 'users') return config.value.fields
  const isAdmin = auth.currentUser?.role === 'Admin'
  return config.value.fields
    .filter((field) => isAdmin ? field.key !== 'farms' : field.key !== 'farmId')
    .filter((field) => isAdmin || field.key !== 'eppStatus')
    .filter((field) => !(field.key === 'password' && editing.value && !isAdmin))
    .map((field) => {
      if (field.key === 'role' && isAdmin) {
        return { ...field, options: field.options.filter((role) => role !== 'SuperAdmin') }
      }
      if (field.key === 'password' && isAdmin) {
        return {
          ...field,
          required: !editing.value,
          label: editing.value ? 'Contraseña (vacío = no cambiar)' : 'Contraseña'
        }
      }
      return field
    })
})
const enumFilter = ref('')
const telemetryFilters = ref({ farmId: '', lotId: '', variable: '', from: '', to: '' })
const dialog = ref(false)
const detailDialog = ref(false)
const detailRecord = ref(null)
const deleteDialog = ref(false)
const deleteStep = ref(1)
const deleteReady = ref(false)
const deleteTimer = ref(null)
const deleteConfirmationText = ref('')
const pendingDelete = ref(null)
const editing = ref(null)
const form = ref({})
const formRef = ref(null)
const activityStep = ref(1)
const activityFieldGroups = [
  { name: 1, title: 'Seleccionar ciclo', caption: 'El ciclo productivo define el lote de trabajo.', fields: ['cycleId'] },
  { name: 2, title: 'Labor o incidencia', caption: 'Describe el tipo de actividad y el trabajo realizado.', fields: ['kind', 'type', 'description', 'notes'] },
  { name: 3, title: 'Responsable y seguimiento', caption: 'Asigna quién realizó el registro y su estado.', fields: ['responsible', 'date', 'status'] }
]
const canEdit = computed(() => config.value.entity !== 'notifications' && canWrite(auth.currentUser, config.value.entity))
const canAdd = computed(() => canEdit.value && config.value.entity !== 'telemetry')
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

/**
 * Resuelve el ID del predio padre de un registro para aplicar el filtrado por alcance del usuario.
 */
function relatedFarmId(entity, item) {
  if (entity === 'farms') return item.id
  if (entity === 'users') return (item.farms ?? []).find((farmId) => allowedFarmIds.value?.includes(farmId))
  if (entity === 'lots' || entity === 'cycles' || entity === 'telemetry') return item.farmId
  if (entity === 'activities' || entity === 'harvests') return getRecord('cycles', item.cycleId)?.farmId
  if (entity === 'nurseries') return getRecord('cycles', item.cycleId)?.farmId
  if (entity === 'notifications') return getRecord('lots', item.lotId)?.farmId
  return null
}

/**
 * Determina si un registro es visible para el usuario actual según visibleFarmIds().
 */
function isVisible(item) {
  if (!allowedFarmIds.value) return true
  const farmId = relatedFarmId(config.value.entity, item)
  if (farmId) return allowedFarmIds.value.includes(farmId)
  return ['crops', 'inputs'].includes(config.value.entity)
}

function nameOf(entity, id) {
  return getRecord(entity, id)?.name ?? getRecord(entity, id)?.title ?? '—'
}

const missingData = 'Sin datos registrados'

function formatMetric(value) {
  return Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

function formatDateLabel(value) {
  const date = String(value ?? '').slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : missingData
}

function getHarvestKilograms(harvest) {
  if (!['kg', 'toneladas'].includes(harvest.unit) || harvest.quantity === null || harvest.quantity === undefined || harvest.quantity === '') return null
  return Number.isFinite(Number(harvest.quantity)) ? harvestKilograms(harvest) : null
}

function mostRecentRecord(records) {
  return records
    .filter((item) => Number.isFinite(Date.parse(item.date)))
    .reduce((latest, item) => !latest || Date.parse(item.date) > Date.parse(latest.date) ? item : latest, null)
}

function getInputAvailability(stock) {
  if (stock === null || stock === undefined || stock === '') return missingData
  const quantity = Number(stock)
  if (!Number.isFinite(quantity)) return missingData
  return quantity === 0 ? 'Agotado' : missingData
}

function userEmailRule(value) {
  if (!value) return true
  const email = String(value).trim().toLowerCase()
  return !getRecords('users').some((user) =>
    String(user.email ?? '').trim().toLowerCase() === email && user.id !== editing.value
  ) || 'Ya existe una cuenta con ese correo.'
}

/**
 * Enriquece cada fila con etiquetas legibles y métricas derivadas para la tabla y tarjetas.
 */
function displayRow(item) {
  const row = { ...item }
  if (item.area !== null && item.area !== undefined && item.area !== '') row.areaLabel = `${formatArea(item.area)} HA`
  if (item.farmId) row.farmName = nameOf('farms', item.farmId)
  if (item.lotId) row.lotName = nameOf('lots', item.lotId)
  if (item.cropId) row.cropName = nameOf('crops', item.cropId)
  if (item.cycleId) row.cycleName = nameOf('cycles', item.cycleId)
  if (config.value.entity === 'lots') {
    const cycles = getRecords('cycles').filter((entry) => entry.lotId === item.id)
    const cropIds = [...new Set(cycles.map((cycle) => cycle.cropId).filter(Boolean))]
    row.cropName = cropIds.map((id) => getRecord('crops', id)?.name).filter(Boolean).join(', ') || missingData
    row.cycleName = cycles.map((cycle) => cycle.name).filter(Boolean).join(', ') || missingData
  }
  if (config.value.entity === 'crops') row.inputsLabel = (item.inputs ?? []).map((id) => nameOf('inputs', id)).join(', ') || 'Sin insumos'
  if (config.value.entity === 'inputs') {
    row.crops = (Array.isArray(item.crops) ? item.crops : []).map((id) => nameOf('crops', id)).join(', ') || 'Sin cultivos asociados'
    const stock = Number(item.stock)
    row.stockLabel = item.stock === null || item.stock === undefined || item.stock === '' || !Number.isFinite(stock)
      ? missingData
      : `${formatMetric(stock)}${item.unit ? ` ${item.unit}` : ''}`
    row.availabilityStatus = getInputAvailability(item.stock)
  }
  if (config.value.entity === 'activities' && getRecord('users', item.responsible)) {
    row.responsible = getRecord('users', item.responsible).name
  }
  if (config.value.entity === 'farms') {
    row.lotsCount = getRecords('lots').filter((lot) => lot.farmId === item.id).length
    row.activeCropsCount = new Set(getRecords('cycles')
      .filter((cycle) => cycle.farmId === item.id && cycle.status === 'En curso')
      .map((cycle) => cycle.cropId)
      .filter(Boolean)).size
  }
  if (config.value.entity === 'users') {
    delete row.password
    const assignedFarmIds = [...new Set([...(Array.isArray(item.farms) ? item.farms : []), item.farmId].filter(Boolean))]
    row.assignedFarmNames = assignedFarmIds.map((id) => getRecord('farms', id)?.name).filter(Boolean)
    row.farmsLabel = row.assignedFarmNames.join(', ') || missingData
    row.activeLabel = item.active === true ? 'Activo' : item.active === false ? 'Inactivo' : missingData
  }
  if (config.value.entity === 'inputs') row.emoji = item.emoji || '🧪'
  if (config.value.entity === 'farms') {
    const owner = getRecord('users', item.owner)
    row.ownerName = owner?.name ?? item.owner ?? '—'
  }
  if (config.value.entity === 'telemetry') {
    row.valueWithUnit = `${item.value} ${item.unit}`
    row.simulatedLabel = 'Simulada'
    row.dateLabel = formatDateTime(item.date)
  }
  if (config.value.entity === 'cycles') {
    row.startDateLabel = item.startDate ? formatDateLabel(item.startDate) : missingData
    row.progress = item.progress ?? null
  }
  if (config.value.entity === 'activities') {
    const cycle = getRecord('cycles', item.cycleId)
    row.cycleName = cycle?.name ?? missingData
    row.cropName = getRecord('crops', cycle?.cropId)?.name ?? missingData
    row.lotName = getRecord('lots', cycle?.lotId)?.name ?? missingData
    row.dateLabel = item.date ? formatDateLabel(item.date) : missingData
    row.responsible = getRecord('users', item.responsible)?.name ?? item.responsible ?? missingData
    row.status = item.status ?? missingData
  }
  if (config.value.entity === 'harvests') {
    const cycle = getRecord('cycles', item.cycleId)
    const cycleArea = Number(cycle?.area)
    const kilograms = getHarvestKilograms(item)
    row.cycleName = cycle?.name ?? missingData
    row.cropId = cycle?.cropId
    row.cropName = getRecord('crops', cycle?.cropId)?.name ?? missingData
    row.farmName = getRecord('farms', cycle?.farmId)?.name ?? missingData
    row.lotName = getRecord('lots', cycle?.lotId)?.name ?? missingData
    row.dateLabel = item.date ? formatDateLabel(item.date) : missingData
    row.quantity = item.quantity ?? missingData
    row.unit = item.unit || missingData
    row.quality = item.quality ?? missingData
    row.harvestKilograms = kilograms
    row.cycleArea = Number.isFinite(cycleArea) && cycleArea > 0 ? cycleArea : null
    row.yieldLabel = kilograms !== null && row.cycleArea
      ? `${formatMetric(kilograms / row.cycleArea)} kg/ha`
      : missingData
  }
  if (config.value.entity === 'nurseries') {
    row.cropName = getRecord('crops', item.cropId)?.name ?? missingData
    row.cycleName = item.cycleId ? getRecord('cycles', item.cycleId)?.name ?? missingData : missingData
    row.sowingDateLabel = item.sowingDate ? formatDateLabel(item.sowingDate) : missingData
    row.germinationDateLabel = item.germinationDate ? formatDateLabel(item.germinationDate) : missingData
    row.transplantDateLabel = item.transplantDate ? formatDateLabel(item.transplantDate) : missingData
    row.status = item.status ?? missingData
  }
  return row
}

const rows = computed(() => {
  const visibleRows = allRecords.value
    .filter((item) => config.value.entity !== 'notifications' || !item.deletedAt)
    .filter((item) => !localUserManagement.value || item.role !== 'SuperAdmin')
    .filter(isVisible)
    .map(displayRow)
  return config.value.entity === 'notifications'
    ? visibleRows.sort((left, right) => String(right.date ?? '').localeCompare(String(left.date ?? '')))
    : visibleRows
})
const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    if (activeFarmId.value && row.farmId !== activeFarmId.value) return false
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
const hasFilters = computed(() => Boolean(activeFarmId.value || enumFilter.value || Object.values(telemetryFilters.value).some(Boolean)))
const hasExplicitFilters = computed(() => Boolean(enumFilter.value || Object.values(telemetryFilters.value).some(Boolean)))
const invalidTelemetryRange = computed(() => telemetryFilters.value.from && telemetryFilters.value.to && telemetryFilters.value.from > telemetryFilters.value.to)
const userColumns = computed(() => {
  const definitions = [
    ['name', 'Usuario'],
    ['email', 'Correo'],
    ['role', 'Rol'],
    ['farmsLabel', 'Predios asignados']
  ]
  if (rows.value.some((row) => row.eppStatus !== undefined && row.eppStatus !== null && row.eppStatus !== '')) {
    definitions.push(['eppStatus', 'Estado EPP'])
  }
  definitions.push(['activeLabel', 'Estado de cuenta'])
  return definitions
})
const userKpis = computed(() => [
  { title: 'Total de usuarios', icon: 'groups', value: rows.value.length, caption: 'Usuarios visibles según el alcance actual.' },
  { title: 'Administradores', icon: 'admin_panel_settings', value: rows.value.filter((row) => row.role === 'Admin').length },
  { title: 'Operarios', icon: 'engineering', value: rows.value.filter((row) => row.role === 'Operario').length },
  { title: 'Cuentas activas', icon: 'check_circle', value: rows.value.filter((row) => row.active === true).length },
  { title: 'Cuentas inactivas', icon: 'block', value: rows.value.filter((row) => row.active === false).length }
])
const emptyStateInfo = computed(() => ({
  cycles: { emoji: '🌱', message: 'Todavía no hay ciclos productivos registrados.', subtext: 'Registra un ciclo para hacer seguimiento a la producción.', createLabel: 'Nuevo ciclo productivo' },
  telemetry: { emoji: '📡', message: 'Todavía no hay lecturas registradas.', subtext: 'Las lecturas simuladas aparecerán aquí cuando estén disponibles.', createLabel: 'Nueva lectura' },
  notifications: { emoji: '🔔', message: 'No hay notificaciones registradas.', subtext: 'Aquí aparecerá el historial de notificaciones.' },
  users: { emoji: '👥', message: 'Todavía no hay usuarios registrados.', subtext: 'Crea usuarios para asignarles acceso y predios.', createLabel: 'Nuevo usuario' }
}[config.value.entity] ?? null))
const harvestColumns = [
  ['cropName', 'Cultivo'],
  ['cycleName', 'Ciclo'],
  ['farmName', 'Predio'],
  ['lotName', 'Lote'],
  ['dateLabel', 'Fecha'],
  ['quantity', 'Cantidad'],
  ['unit', 'Unidad'],
  ['quality', 'Calidad'],
  ['yieldLabel', 'Rendimiento/ha']
]
const nurseryColumns = [
  ['name', 'Semillero'],
  ['cropName', 'Cultivo'],
  ['cycleName', 'Ciclo'],
  ['sowingDateLabel', 'Fecha de siembra'],
  ['germinationDateLabel', 'Fecha de germinación'],
  ['germination', 'Germinación (%)'],
  ['transplantDateLabel', 'Fecha de trasplante'],
  ['status', 'Estado']
]
const cycleColumns = [
  ['name', 'Ciclo'],
  ['farmName', 'Predio'],
  ['lotName', 'Lote'],
  ['cropName', 'Cultivo'],
  ['startDateLabel', 'Fecha de inicio'],
  ['areaLabel', 'Área cultivada (HA)'],
  ['progress', 'Progreso'],
  ['status', 'Estado']
]
const activityColumns = computed(() => {
  const definitions = [
    ['kind', 'Registro'],
    ['type', 'Tipo'],
    ['cycleName', 'Ciclo productivo'],
    ['cropName', 'Cultivo'],
    ['lotName', 'Lote'],
    ['dateLabel', 'Fecha'],
    ['responsible', 'Responsable']
  ]
  if (allRecords.value.some((item) => item.kind === 'Incidencia' && item.priority !== undefined && item.priority !== null && item.priority !== '')) {
    definitions.push(['priority', 'Prioridad'])
  }
  definitions.push(['status', 'Estado'])
  return definitions
})
const mobileColumns = computed(() => {
  if (config.value.entity === 'harvests') return harvestColumns
  if (config.value.entity === 'nurseries') return nurseryColumns
  if (config.value.entity === 'cycles') return cycleColumns
  if (config.value.entity === 'activities') return activityColumns.value
  if (config.value.entity === 'users') return userColumns.value
  return config.value.columns
})
const columns = computed(() => {
  let definitions = config.value.columns
  if (config.value.entity === 'harvests') definitions = harvestColumns
  else if (config.value.entity === 'nurseries') definitions = nurseryColumns
  else if (config.value.entity === 'cycles') definitions = cycleColumns
  else if (config.value.entity === 'activities') definitions = activityColumns.value
  else if (config.value.entity === 'users') definitions = userColumns.value
  return [
    ...definitions.map(([name, label]) => ({ name, label, field: name, align: 'left', sortable: name !== 'farmsLabel' })),
    { name: 'actions', label: 'Acciones', field: 'actions', align: 'center' }
  ]
})

function activityRowClass(row) {
  return row.kind === 'Incidencia' ? 'activity-incidence-row' : 'activity-labor-row'
}
const filterField = computed(() => {
  const fields = config.value.fields
  return fields.find((field) => field.key === 'status' && field.type === 'select') ??
    fields.find((field) => ['category', 'kind', 'role'].includes(field.key) && field.type === 'select') ?? null
})
const filterOptions = computed(() => (filterField.value?.options ?? [])
  .filter((option) => (typeof option === 'string' ? option : option?.value ?? option?.label) !== 'Otro')
  .map((option) => typeof option === 'string' ? ({ label: option, value: option }) : option))
const telemetryKpis = computed(() => {
  const readings = filteredRows.value
  const latest = mostRecentRecord(readings)
  const readingKpi = (title, icon, variable) => {
    const reading = mostRecentRecord(readings.filter((item) =>
      item.variable === variable &&
      item.value !== null &&
      item.value !== undefined &&
      item.value !== '' &&
      Number.isFinite(Number(item.value))
    ))
    return {
      title,
      icon,
      value: reading ? formatMetric(reading.value) : missingData,
      unit: reading?.unit ?? '',
      status: reading ? 'Con lectura' : missingData,
      caption: reading
        ? `${reading.unit ? '' : `Unidad: ${missingData} · `}Última lectura: ${formatDateTime(reading.date)}`
        : missingData
    }
  }
  const latestCaption = latest ? formatDateTime(latest.date) : missingData
  const metrics = [
    readingKpi('Humedad del suelo', 'water_drop', 'Humedad del suelo'),
    readingKpi('Temperatura', 'thermostat', 'Temperatura')
  ]
  if (readings.some((item) => item.variable === 'Precipitación')) {
    metrics.push(readingKpi('Precipitación', 'rainy', 'Precipitación'))
  }
  metrics.push(
    {
      title: 'Cantidad de lecturas',
      icon: 'sensors',
      value: readings.length,
      unit: 'lecturas',
      status: readings.length ? 'Con datos' : missingData,
      caption: `Última lectura: ${latestCaption}`
    },
    {
      title: 'Última actualización',
      icon: 'update',
      value: latestCaption,
      status: latest ? 'Con lectura' : missingData,
      caption: 'Fecha de la lectura más reciente con los filtros actuales.'
    }
  )
  return metrics
})
const telemetryCharts = computed(() => {
  const groups = new Map()
  for (const reading of filteredRows.value) {
    if (reading.value === null || reading.value === undefined || reading.value === '' ||
        !Number.isFinite(Number(reading.value)) || formatDateLabel(reading.date) === missingData) continue
    const key = `${reading.variable ?? missingData}\u0000${reading.unit ?? missingData}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(reading)
  }
  return [...groups.entries()]
    .map(([key, readings]) => {
      if (readings.length < 2) return null
      const sorted = readings.slice().sort((left, right) => (Date.parse(left.date) || 0) - (Date.parse(right.date) || 0))
      const values = sorted.map((reading) => Number(reading.value))
      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)
      return {
        key,
        title: `Historial de ${sorted[0].variable ?? missingData}`,
        unit: sorted[0].unit ?? missingData,
        minValue,
        maxValue,
        middleValue: (minValue + maxValue) / 2,
        readings: sorted.map((reading) => ({
          value: Number(reading.value),
          date: formatDateLabel(reading.date),
          tooltip: `${reading.variable}: ${formatMetric(reading.value)} ${reading.unit ?? ''} · ${formatDateTime(reading.date)}`
        }))
      }
    })
    .filter(Boolean)
})
const telemetryLotsWithoutReadings = computed(() => {
  const filters = telemetryFilters.value
  const lots = getRecords('lots')
    .filter((lot) => !allowedFarmIds.value || allowedFarmIds.value.includes(lot.farmId))
    .filter((lot) => !filters.farmId || lot.farmId === filters.farmId)
    .filter((lot) => !filters.lotId || lot.id === filters.lotId)
  const lotsWithReadings = new Set(filteredRows.value.map((reading) => reading.lotId).filter(Boolean))
  return lots.filter((lot) => !lotsWithReadings.has(lot.id))
})
const harvestKpis = computed(() => {
  const harvests = filteredRows.value
  const compatible = harvests.filter((item) => Number.isFinite(item.harvestKilograms))
  const totalKilograms = compatible.reduce((total, item) => total + item.harvestKilograms, 0)
  const cycleTotals = new Map()
  for (const item of compatible) {
    if (!item.cycleId || !item.cycleArea) continue
    const cycle = cycleTotals.get(item.cycleId) ?? { kilograms: 0, area: item.cycleArea }
    cycle.kilograms += item.harvestKilograms
    cycleTotals.set(item.cycleId, cycle)
  }
  const cycleYields = [...cycleTotals.values()].map((cycle) => cycle.kilograms / cycle.area)
  const averageYield = cycleYields.length
    ? cycleYields.reduce((total, value) => total + value, 0) / cycleYields.length
    : null
  return [
    {
      title: 'Producción total',
      icon: 'agriculture',
      value: compatible.length ? formatMetric(totalKilograms) : missingData,
      unit: compatible.length ? 'kg' : '',
      status: compatible.length ? 'Con datos' : missingData,
      caption: `${compatible.length} cosechas con unidad convertible.`
    },
    {
      title: 'Cantidad de cosechas',
      icon: 'inventory_2',
      value: harvests.length,
      unit: 'cosechas',
      status: harvests.length ? 'Con datos' : missingData,
      caption: 'Registros dentro del alcance visible.'
    },
    {
      title: 'Rendimiento promedio por hectárea',
      icon: 'monitoring',
      value: averageYield === null ? missingData : formatMetric(averageYield),
      unit: averageYield === null ? '' : 'kg/ha',
      status: averageYield === null ? missingData : 'Con datos',
      caption: 'Promedio de producción por ciclo con área y unidad compatibles.'
    }
  ]
})
const harvestProductionCharts = computed(() => {
  const compatible = filteredRows.value.filter((item) => Number.isFinite(item.harvestKilograms))
  const monthly = new Map()
  const byCrop = new Map()
  for (const item of compatible) {
    if (/^\d{4}-\d{2}/.test(String(item.date ?? ''))) {
      const month = String(item.date).slice(0, 7)
      monthly.set(month, (monthly.get(month) ?? 0) + item.harvestKilograms)
    }
    if (item.cropId && item.cropName !== missingData) {
      const crop = byCrop.get(item.cropId) ?? { label: item.cropName, value: 0 }
      crop.value += item.harvestKilograms
      byCrop.set(item.cropId, crop)
    }
  }
  const monthItems = [...monthly.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, value]) => ({
      label: `01/${month.slice(5, 7)}/${month.slice(0, 4)}`,
      value,
      tooltip: `${new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00`))}: ${formatMetric(value)} kg`
    }))
  const cropItems = [...byCrop.values()]
    .sort((left, right) => right.value - left.value)
    .map((item) => ({ ...item, tooltip: `${item.label}: ${formatMetric(item.value)} kg` }))
  return [
    { title: 'Producción por mes', xAxis: 'Fecha', items: monthItems },
    { title: 'Producción por cultivo', xAxis: 'Cultivo', items: cropItems }
  ]
    .filter((chart) => chart.items.length)
    .map((chart) => ({ ...chart, maxValue: Math.max(0, ...chart.items.map((item) => item.value)) }))
})
const harvestQualityDistribution = computed(() => {
  const counts = new Map()
  for (const item of filteredRows.value) {
    if (typeof item.quality !== 'string' || !item.quality.trim() || item.quality === missingData) continue
    counts.set(item.quality, (counts.get(item.quality) ?? 0) + 1)
  }
  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
  return {
    maxCount: Math.max(0, ...items.map((item) => item.count)),
    items
  }
})
const isUnreadNotification = isNotificationUnread
const notificationRowClass = (row) => isUnreadNotification(row) ? 'notification-unread-row' : 'notification-read-row'
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
  if (field.type === 'users') return getResponsibleUsers(field.role, field.valueField)
  if (field.type === 'farms') return getRecords('farms').map((farm) => ({ label: farm.name, value: farm.id }))
  if (field.key === 'role' && auth.currentUser?.role === 'Admin') {
    return (field.options || []).filter((role) => role !== 'SuperAdmin').map((role) => ({ label: role, value: role }))
  }
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

function telemetryBarHeight(reading, chart) {
  const range = chart.maxValue - chart.minValue
  if (!range) return '100%'
  return `${Math.max(8, ((reading.value - chart.minValue) / range) * 100)}%`
}

function productionBarHeight(item, chart) {
  return `${Math.max(8, chart.maxValue ? (item.value / chart.maxValue) * 100 : 0)}%`
}

function numericValue(value) {
  return Number(String(value ?? '').replace(',', '.'))
}

function statusClass(status) {
  return {
    Activo: 'status-active',
    Inactivo: 'status-inactive',
    'En preparación': 'status-preparing'
  }[status] ?? 'status-neutral'
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
  const initial = Object.fromEntries(formFields.value.map((field) => [field.key, field.multiple ? [] : field.default ?? '']))
  if (config.value.entity === 'users') {
    initial.active = true
    if (auth.currentUser?.role === 'Admin') {
      initial.role = 'Operario'
      initial.farmId = auth.currentUser.farms?.[0] ?? ''
      initial.eppStatus = 'Pendiente'
    }
  }
  if (config.value.entity === 'activities') {
    initial.kind = 'Labor'
    initial.responsible = auth.currentUser?.role === 'Operario'
      ? auth.currentUser.name
      : getResponsibleUsers('Operario', 'name')[0]?.value ?? ''
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
  if (config.value.entity === 'lots') {
    initial.status = 'Activo'
    initial.responsible = auth.currentUser?.id ?? getResponsibleUsers()[0]?.value ?? ''
  }
  if (config.value.entity === 'lots' && activeFarmId.value) initial.farmId = activeFarmId.value
  form.value = initial
  dialog.value = true
}

function openDetail(row) {
  detailRecord.value = getRecord(config.value.entity, row.id)
  detailDialog.value = Boolean(detailRecord.value)
}

function openEdit(row) {
  editing.value = row.id
  activityStep.value = 1
  form.value = JSON.parse(JSON.stringify(getRecord(config.value.entity, row.id)))
  if (config.value.entity === 'inputs' && !form.value.emoji) form.value.emoji = '🧪'
  if (config.value.entity === 'users') {
    if (auth.currentUser?.role === 'Admin') {
      form.value.farmId = form.value.farms?.[0] ?? ''
      form.value.password = ''
    } else {
      delete form.value.password
    }
  }
  if (config.value.entity === 'crops' && !entityConfig.crops.fields.find((field) => field.key === 'category').options.includes(form.value.category)) {
    form.value.otherCategory = form.value.category
    form.value.category = 'Otro'
  }
  dialog.value = true
}

/**
 * Valida reglas de negocio, formatos y coherencia relacional entre entidades antes de guardar.
 */
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
  for (const field of formFields.value) {
    const fieldValue = value[field.key]
    if (field.key === 'otherCategory' && value.category !== 'Otro') continue
    if (field.required && (fieldValue === '' || fieldValue === null || fieldValue === undefined)) throw new Error(`${field.label} es obligatorio.`)
    if (field.maxLength && fieldValue && String(fieldValue).length > field.maxLength) throw new Error(`${field.label} no puede superar ${field.maxLength} caracteres.`)
    if (field.textOnly && fieldValue && !/^[\p{L}\p{M}\s.'-]+$/u.test(fieldValue)) throw new Error(`${field.label} solo puede contener texto.`)
  }
  if (config.value.entity === 'lots' && !getRecord('farms', value.farmId)) throw new Error('Selecciona un predio existente.')
  if (config.value.entity === 'lots') assertFarmAccess(value.farmId)
  if (config.value.entity === 'lots' && !getRecord('users', value.responsible)?.active) throw new Error('Selecciona un responsable activo para el lote.')
  if (config.value.entity === 'inputs' && value.crops.some((cropId) => !getRecord('crops', cropId))) {
    throw new Error('Selecciona cultivos existentes.')
  }
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
  if (config.value.entity === 'users' && value.password && String(value.password).trim().length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
  if (config.value.entity === 'users' && localUserManagement.value) {
    if (value.role === 'SuperAdmin') throw new Error('El Administrador no puede asignar el rol Superadministrador.')
    if (editing.value && getRecord('users', editing.value)?.role === 'SuperAdmin') {
      throw new Error('El Administrador no puede modificar cuentas de Superadministrador.')
    }
    if (!getRecord('farms', value.farmId)) throw new Error('Selecciona un predio existente.')
    assertFarmAccess(value.farmId)
    if (editing.value === auth.currentUser?.id && value.active === false) {
      throw new Error('No puedes desactivar tu propia cuenta.')
    }
  }
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

/**
 * Envía el formulario hacia la API (para users y farms con sesión activa) o hacia storage.js.
 */
async function submitForm() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  try {
    validateRelations()
    const value = { ...form.value }
    for (const field of config.value.fields.filter((item) => item.type === 'number')) {
      if (value[field.key] !== '' && value[field.key] !== null && value[field.key] !== undefined) value[field.key] = Number(String(value[field.key]).replace(',', '.'))
    }
    if (config.value.entity === 'telemetry') value.simulated = true
    if (config.value.entity === 'crops') {
      if (value.category === 'Otro') value.category = value.otherCategory.trim()
      delete value.otherCategory
    }
    let saved
    if (config.value.entity === 'users' && localUserManagement.value) {
      const existingUser = editing.value ? getRecord('users', editing.value) : null
      value.farms = editing.value === auth.currentUser?.id
        ? existingUser?.farms ?? [value.farmId]
        : [value.farmId]
      delete value.farmId
      if (editing.value && !value.password) {
        if (existingUser?.password) value.password = existingUser.password
        else delete value.password
      }
      saved = saveRecord('users', { ...value, id: editing.value })
    } else if (config.value.entity === 'users') {
      saved = editing.value
        ? await updateUser(editing.value, value)
        : await createUser(value)
    } else if (config.value.entity === 'farms' && getAuthToken()) {
      saved = editing.value
        ? await updateFarm(editing.value, value)
        : await createFarm(value)
    } else {
      saved = saveRecord(config.value.entity, { ...value, id: editing.value })
    }
    if (config.value.entity === 'farms' && auth.currentUser?.role === 'Admin' && !auth.currentUser.farms?.includes(saved.id)) {
      auth.currentUser = { ...auth.currentUser, farms: [...(auth.currentUser.farms ?? []), saved.id] }
      saveRecord('users', auth.currentUser)
    }
    if (config.value.entity === 'users' && saved.id === auth.currentUser?.id) {
      if (!saved.active) {
        auth.logout()
        await router.replace({ name: 'login' })
        return
      }
      auth.currentUser = { ...saved }
      delete auth.currentUser.password
      if (!canAccess(saved, 'users')) await router.replace({ name: 'dashboard' })
    }
    dialog.value = false
    $q.notify({ type: 'positive', message: `${config.value.singular} guardado correctamente.` })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function confirmDelete(row) {
  if (config.value.entity === 'notifications' && !canManageNotificationActions(auth.currentUser)) return
  if (localUserManagement.value && row.role === 'SuperAdmin') {
    $q.notify({ type: 'negative', message: 'El Administrador no puede eliminar cuentas de Superadministrador.' })
    return
  }
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

function markNotificationReadInList(notification) {
  if (!canManageNotificationActions(auth.currentUser)) return
  try {
    const storedNotification = getRecord('notifications', notification.id)
    if (!storedNotification) throw new Error('La notificación ya no está disponible.')
    markNotificationRead(storedNotification)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
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

/**
 * Ejecuta la eliminación lógica/remota (users, farms, notifications) o borrado local tras confirmar.
 */
async function deleteRecord() {
  const expectedName = rowName(pendingDelete.value)
  const requiresName = !['farms', 'lots'].includes(config.value.entity) || deleteStep.value === 2
  if (!pendingDelete.value || (requiresName && deleteConfirmationText.value.trim() !== expectedName) ||
      (['farms', 'lots'].includes(config.value.entity) && !deleteReady.value)) {
    $q.notify({ type: 'negative', message: `Escribe exactamente "${expectedName}" para confirmar.` })
    return
  }
  try {
    let message = 'Registro eliminado.'
    if (config.value.entity === 'users') {
      const targetId = pendingDelete.value.id
      if (localUserManagement.value || (/^user-/.test(String(targetId)) && !getAuthToken())) {
        removeRecord('users', targetId)
      } else {
        await changeUserStatus(targetId, false)
        message = 'Usuario desactivado correctamente.'
      }
    } else if (config.value.entity === 'farms') {
      const targetId = pendingDelete.value.id
      if (/^farm-/.test(String(targetId)) && !getAuthToken()) {
        removeRecord('farms', targetId)
      } else {
        for (const [relatedEntity, field] of [['lots', 'farmId'], ['cycles', 'farmId'], ['telemetry', 'farmId']]) {
          if (getRecords(relatedEntity).some((item) => item[field] === targetId)) {
            throw new Error(`No se puede eliminar: todavía existen registros relacionados en ${relatedEntity}.`)
          }
        }
        await changeFarmStatus(targetId, false)
        message = 'Predio desactivado correctamente.'
      }
    } else if (config.value.entity === 'notifications') {
      deleteNotification(pendingDelete.value)
    } else {
      removeRecord(config.value.entity, pendingDelete.value.id)
    }
    closeDeleteDialog()
    pendingDelete.value = null
    $q.notify({ type: 'positive', message })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function rowName(row) {
  return row?.name ?? row?.title ?? row?.type ?? row?.email ?? row?.id ?? ''
}

function userInitials(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('es-CO')
}

function tablePaginationLabel(firstRow, lastRow, totalRows) {
  return totalRows ? `${firstRow}-${lastRow} de ${totalRows}` : '0 de 0'
}

onBeforeUnmount(() => {
  if (deleteTimer.value) clearTimeout(deleteTimer.value)
})

/**
 * Sincroniza silenciosamente usuarios y predios desde el backend al entrar en módulos dependientes.
 */
async function syncRemoteUsersIfNeeded() {
  if (!getAuthToken()) return
  const entity = config.value?.entity
  if ((entity === 'users' && auth.currentUser?.role === 'SuperAdmin') ||
      (entity === 'farms' && auth.currentUser?.role !== 'Operario')) {
    try {
      await fetchUsers()
    } catch {
      // Conservar registros en caché local si falla la sincronización remota
    }
  }
  if (['farms', 'lots', 'cycles', 'telemetry', 'users'].includes(entity)) {
    try {
      await fetchFarms()
    } catch {
      // Conservar predios en caché local si falla la sincronización remota
    }
  }
}

watch(() => [route.name, route.params.farmId, route.query.cycle], () => {
  enumFilter.value = ''
  syncRemoteUsersIfNeeded()
}, { immediate: true })
</script>

<template>
  <q-page class="page-content records-page">
    <div v-if="activeFarmId" class="records-breadcrumb-row">
      <BackButton :to="{ name: 'farms' }" />
      <q-breadcrumbs separator="chevron_right" class="records-breadcrumbs">
        <q-breadcrumbs-el label="Predios" :to="{ name: 'farms' }" />
        <q-breadcrumbs-el :label="activeFarm?.name ?? 'Predio'" />
      </q-breadcrumbs>
    </div>
    <q-card flat bordered class="records-card" :class="{ 'telemetry-records-card': config.entity === 'telemetry' }">
      <div class="records-toolbar">
        <q-btn v-if="canAdd" color="primary" unelevated rounded no-caps icon="add" class="records-add-button" :label="`Nuevo ${config.singular}`" @click="openCreate" />
        <div class="records-filter-controls" :class="{ 'records-filter-controls-telemetry': config.entity === 'telemetry' }">
          <label v-if="filterField && config.entity !== 'telemetry'" class="records-filter-control"><span>Filtra por {{ filterField.label.toLocaleLowerCase() }}.</span><q-select v-model="enumFilter" dense outlined clearable hide-bottom-space emit-value map-options :options="filterOptions" :placeholder="`Todos · ${filterField.label.toLocaleLowerCase()}`" :aria-label="`Filtrar por ${filterField.label.toLocaleLowerCase()}`" /></label>
          <template v-if="config.entity === 'telemetry'">
            <label class="records-filter-control"><span>Filtra por predio.</span><q-select v-model="telemetryFilters.farmId" dense outlined clearable hide-bottom-space emit-value map-options :options="telemetryFarmOptions" placeholder="Todos los predios" aria-label="Filtrar por predio" @update:model-value="telemetryFilters.lotId = ''" /></label>
            <label class="records-filter-control"><span>Filtra por lote.</span><q-select v-model="telemetryFilters.lotId" dense outlined clearable hide-bottom-space emit-value map-options :options="telemetryLotOptions" placeholder="Todos los lotes" aria-label="Filtrar por lote" /></label>
            <label class="records-filter-control"><span>Filtra por tipo de medición.</span><q-select v-model="telemetryFilters.variable" dense outlined clearable hide-bottom-space emit-value map-options :options="['Humedad del suelo', 'Temperatura', 'Precipitación', 'Humedad ambiental', 'pH'].map(value => ({ label: value, value }))" placeholder="Todas las variables" aria-label="Filtrar por variable" /></label>
            <label class="records-filter-control"><span>Lecturas desde esta fecha.</span><q-input v-model="telemetryFilters.from" type="date" dense outlined hide-bottom-space placeholder="Fecha inicial" aria-label="Fecha desde" /></label>
            <label class="records-filter-control"><span>Lecturas hasta esta fecha.</span><q-input v-model="telemetryFilters.to" type="date" dense outlined hide-bottom-space placeholder="Fecha final" aria-label="Fecha hasta" /></label>
          </template>
        </div>
      </div>
      <q-banner v-if="invalidTelemetryRange" dense class="bg-orange-1 text-orange-10">La fecha inicial no puede ser posterior a la fecha final.</q-banner>
      <div v-if="config.entity === 'telemetry'" class="simulation-note"><q-icon name="info" /> Todas las lecturas de esta pantalla son simuladas para demostración.</div>
      <section v-if="config.entity === 'telemetry'" class="records-analytics-section">
        <div class="records-kpi-grid">
          <KpiCard v-for="metric in telemetryKpis" :key="metric.title" v-bind="metric" />
        </div>
        <div class="records-analytics-grid">
          <q-card flat bordered class="records-analytics-panel">
            <q-card-section class="records-analytics-heading">
              <div><h2>Tendencias por período</h2><p>Se comparan lecturas con la misma unidad y los filtros actuales.</p></div>
            </q-card-section>
            <div v-if="telemetryCharts.length" class="records-analytics-chart-list">
              <div v-for="chart in telemetryCharts" :key="chart.key" class="records-data-chart">
                <h3>{{ chart.title }}</h3>
                <div class="production-chart">
                  <div class="chart-y-axis"><strong>Valor ({{ chart.unit }})</strong><div><span>{{ formatMetric(chart.maxValue) }}</span><span>{{ formatMetric(chart.middleValue) }}</span><span>{{ formatMetric(chart.minValue) }}</span></div></div>
                  <div>
                    <div class="chart-plot">
                      <div class="chart-gridlines"><i></i><i></i><i></i></div>
                      <div class="harvest-bars">
                        <div v-for="(reading, index) in chart.readings" :key="`${reading.date}-${index}`" class="harvest-bar-wrap">
                          <div class="harvest-bar telemetry-chart-bar" :style="{ height: telemetryBarHeight(reading, chart) }" tabindex="0" role="img" :aria-label="reading.tooltip"><q-tooltip>{{ reading.tooltip }}</q-tooltip></div>
                          <small>{{ reading.date }}</small>
                        </div>
                      </div>
                    </div>
                    <div class="chart-x-axis">Fecha (DD/MM/YYYY)</div>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="records-analytics-empty">Sin datos registrados suficientes para graficar tendencias en el período filtrado.</p>
          </q-card>
          <q-card flat bordered class="records-analytics-panel">
            <q-card-section class="records-analytics-heading">
              <div><h2>Lotes sin lecturas</h2><p>Se consideran los filtros de predio, lote, variable y período.</p></div>
            </q-card-section>
            <ul v-if="telemetryLotsWithoutReadings.length" class="records-alert-list">
              <li v-for="lot in telemetryLotsWithoutReadings" :key="lot.id"><strong>{{ lot.name }}</strong><span>{{ getRecord('farms', lot.farmId)?.name ?? missingData }} · Sin lecturas coincidentes con los filtros actuales.</span></li>
            </ul>
            <p v-else class="records-analytics-empty">No hay lotes sin lecturas coincidentes con los filtros actuales.</p>
            <p class="records-analytics-note">No se determinan lecturas desactualizadas ni alertas por rangos: los registros no incluyen intervalos de actualización o umbrales configurados.</p>
          </q-card>
        </div>
      </section>
      <section v-if="config.entity === 'harvests'" class="records-analytics-section">
        <div class="records-kpi-grid">
          <KpiCard v-for="metric in harvestKpis" :key="metric.title" v-bind="metric" />
        </div>
        <div class="records-analytics-grid harvest-analytics-grid">
          <q-card v-for="chart in harvestProductionCharts" :key="chart.title" flat bordered class="records-analytics-panel">
            <q-card-section class="records-analytics-heading"><div><h2>{{ chart.title }}</h2><p>Producción expresada en kilogramos.</p></div></q-card-section>
            <div class="production-chart">
              <div class="chart-y-axis"><strong>Kilos</strong><div><span>{{ formatMetric(chart.maxValue) }}</span><span>{{ formatMetric(chart.maxValue / 2) }}</span><span>0</span></div></div>
              <div>
                <div class="chart-plot">
                  <div class="chart-gridlines"><i></i><i></i><i></i></div>
                  <div class="harvest-bars">
                    <div v-for="item in chart.items" :key="item.label" class="harvest-bar-wrap">
                      <div class="harvest-bar" :style="{ height: productionBarHeight(item, chart) }" tabindex="0" role="img" :aria-label="item.tooltip"><q-tooltip>{{ item.tooltip }}</q-tooltip></div>
                      <small>{{ item.label }}</small>
                    </div>
                  </div>
                </div>
                <div class="chart-x-axis">{{ chart.xAxis }}</div>
              </div>
            </div>
          </q-card>
          <q-card flat bordered class="records-analytics-panel">
            <q-card-section class="records-analytics-heading"><div><h2>Distribución por calidad</h2><p>Cantidad de cosechas por clasificación.</p></div></q-card-section>
            <div v-if="harvestQualityDistribution.items.length" class="quality-distribution">
              <div v-for="item in harvestQualityDistribution.items" :key="item.label" class="quality-distribution-item">
                <div class="quality-distribution-heading"><StatusBadge :status="item.label" /><strong>{{ item.count }} {{ item.count === 1 ? 'cosecha' : 'cosechas' }}</strong></div>
                <q-linear-progress rounded size="9px" color="primary" track-color="grey-3" :value="item.count / harvestQualityDistribution.maxCount" :aria-label="`${item.label}: ${item.count} cosechas`" />
              </div>
              <div class="quality-chart-axis"><span>Cosechas</span><span>Calidad</span></div>
            </div>
            <p v-else class="records-analytics-empty">Sin datos registrados para la calidad de las cosechas.</p>
          </q-card>
        </div>
      </section>
      <section v-if="config.entity === 'users'" class="records-analytics-section user-kpi-section">
        <div class="records-kpi-grid">
          <KpiCard v-for="metric in userKpis" :key="metric.title" v-bind="metric" />
        </div>
      </section>
      <q-table
        v-if="!useVisualCards"
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        :rows-per-page-options="[10, 25, 50]"
        rows-per-page-label="Registros por página"
        :pagination-label="tablePaginationLabel"
        no-data-label="No hay registros para mostrar"
        :row-class="config.entity === 'notifications' ? notificationRowClass : config.entity === 'activities' ? activityRowClass : undefined"
      >
        <template #body-cell-name="props">
          <q-td v-if="config.entity === 'users'" :props="props">
            <div class="user-name-cell">
              <q-avatar class="user-avatar" aria-hidden="true">{{ userInitials(props.row.name) || '—' }}</q-avatar>
              <strong>{{ props.row.name || missingData }}</strong>
            </div>
          </q-td>
          <q-td v-else :props="props">{{ props.value }}</q-td>
        </template>
        <template #body-cell-role="props">
          <q-td :props="props"><StatusBadge :status="props.value" /></q-td>
        </template>
        <template #body-cell-farmsLabel="props">
          <q-td :props="props">
            <div v-if="config.entity === 'users' && props.row.assignedFarmNames.length" class="user-farm-chips">
              <q-chip v-for="(farmName, index) in props.row.assignedFarmNames" :key="`${farmName}-${index}`" dense square class="user-farm-chip">{{ farmName }}</q-chip>
            </div>
            <span v-else>{{ props.value || missingData }}</span>
          </q-td>
        </template>
        <template #body-cell-eppStatus="props">
          <q-td :props="props"><StatusBadge :status="props.value" /></q-td>
        </template>
        <template #body-cell-activeLabel="props">
          <q-td :props="props"><StatusBadge :status="props.value" /></q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><StatusBadge v-if="['nurseries', 'cycles', 'activities'].includes(config.entity)" :status="props.value" /><q-badge v-else :class="statusClass(props.value)">{{ props.value }}</q-badge></q-td>
        </template>
        <template #body-cell-quality="props">
          <q-td :props="props"><StatusBadge :status="props.value" /></q-td>
        </template>
        <template #body-cell-germination="props">
          <q-td :props="props"><ProgressBar :value="props.value" /></q-td>
        </template>
        <template #body-cell-progress="props">
          <q-td :props="props"><ProgressBar :value="props.value" /></q-td>
        </template>
        <template #body-cell-kind="props">
          <q-td :props="props">
            <div class="activity-kind-cell" :class="props.value === 'Incidencia' ? 'activity-kind-cell--incident' : 'activity-kind-cell--labor'">
              <q-icon :name="props.value === 'Incidencia' ? 'warning_amber' : 'task_alt'" />
              <span>{{ props.value }}</span>
            </div>
          </q-td>
        </template>
        <template #body-cell-priority="props">
          <q-td :props="props"><StatusBadge :status="props.value" /></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="action-cell">
            <template v-if="config.entity === 'notifications'">
              <q-btn v-if="isUnreadNotification(props.row)" flat round dense icon="done" color="primary" aria-label="Marcar como leída" @click="markNotificationReadInList(props.row)"><q-tooltip>Marcar como leída</q-tooltip></q-btn>
              <q-btn flat round dense icon="delete_outline" color="negative" aria-label="Eliminar notificación" @click="confirmDelete(props.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
            </template>
            <template v-else>
              <q-btn v-if="config.entity === 'cycles'" flat round dense icon="open_in_new" color="primary" aria-label="Ver seguimiento" :to="{ name: 'cycle-detail', params: { id: props.row.id } }"><q-tooltip>Ver seguimiento</q-tooltip></q-btn>
              <q-btn v-if="canEdit && !props.row.deletedAt" flat round dense icon="edit" color="primary" aria-label="Editar registro" @click="openEdit(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
              <q-separator v-if="canEdit && !props.row.deletedAt" vertical class="action-delete-separator" />
              <q-btn v-if="canEdit && !props.row.deletedAt" flat round dense icon="delete_outline" color="negative" aria-label="Eliminar registro" @click="confirmDelete(props.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
            </template>
          </q-td>
        </template>
        <template #no-data>
          <EmptyState
            v-if="config.entity === 'nurseries' && !hasFilters"
            class="full-width"
            emoji="🌱"
            message="Todavía no tienes semilleros registrados."
            subtext="Comienza registrando tu primer semillero para realizar seguimiento a su germinación."
            :can-create="canAdd"
            create-label="Nuevo semillero"
            @create="openCreate"
          />
          <EmptyState
            v-else-if="config.entity === 'harvests' && !hasFilters"
            class="full-width"
            emoji="🌾"
            message="Todavía no tienes cosechas registradas."
            subtext="Cuando registres cosechas, aquí encontrarás su producción y calidad."
            :can-create="canAdd"
            create-label="Nueva cosecha"
            @create="openCreate"
          />
          <EmptyState
            v-else-if="config.entity === 'activities' && !hasExplicitFilters"
            class="full-width"
            emoji="🌿"
            message="Todavía no hay labores o incidencias registradas."
            subtext="Cuando registres una actividad, aquí podrás consultar su seguimiento."
            :can-create="canAdd"
            create-label="Nuevo registro"
            @create="openCreate"
          />
          <EmptyState
            v-else-if="emptyStateInfo && !hasFilters"
            class="full-width"
            :emoji="emptyStateInfo.emoji"
            :message="emptyStateInfo.message"
            :subtext="emptyStateInfo.subtext"
            :can-create="canAdd"
            :create-label="emptyStateInfo.createLabel || 'Crear registro'"
            @create="openCreate"
          />
          <div v-else class="full-width empty-state table-empty"><strong><q-icon name="inventory_2" />{{ hasFilters ? 'No encontramos resultados' : 'Todavía no hay registros' }}</strong><span>{{ hasFilters ? 'Prueba con otros filtros.' : 'Cuando agregues información, aparecerá aquí.' }}</span></div>
        </template>
      </q-table>
      <div v-if="filteredRows.length" class="record-card-grid" :class="[!useVisualCards && 'row q-col-gutter-md', { 'record-card-grid-always': useVisualCards, 'record-card-grid--lots': config.entity === 'lots' }]" aria-label="Registros">
        <div v-for="row in filteredRows" :key="row.id" :class="useVisualCards ? '' : config.entity === 'lots' ? 'col-12 col-sm-6 col-md-4 col-lg-4' : 'col-12 col-sm-6 col-md-4 col-lg-3'">
          <q-card flat bordered class="record-mobile-card" :class="{ 'farm-compact-card': config.entity === 'farms', 'lot-compact-card': config.entity === 'lots' }">
            <template v-if="config.entity === 'farms'">
              <img class="record-card-cover" :src="farmPlaceholder" alt="" />
              <q-card-section class="compact-card-heading">
                <div class="compact-card-title">
                  <h2>{{ row.name || missingData }}</h2>
                  <p><q-icon name="place" />{{ row.municipality || missingData }}, {{ row.department || missingData }}</p>
                </div>
                <StatusBadge :status="row.status" />
              </q-card-section>
              <div class="compact-card-metrics farm-compact-metrics">
                <div><span>Área</span><strong>{{ row.area !== null && row.area !== undefined && row.area !== '' ? `${formatArea(row.area)} HA` : missingData }}</strong></div>
                <div><span>Lotes asociados</span><strong>{{ row.lotsCount }}</strong></div>
                <div><span>Cultivos activos</span><strong>{{ row.activeCropsCount }}</strong></div>
              </div>
              <q-card-actions class="compact-card-actions">
                <q-btn flat no-caps icon="visibility" label="Ver detalle" class="detail-card-button" @click="openDetail(row)" />
                <q-btn flat round dense icon="grid_view" color="primary" aria-label="Gestionar lotes" :to="{ name: 'lots', params: { farmId: row.id } }"><q-tooltip>Gestionar lotes</q-tooltip></q-btn>
                <q-btn v-if="canEdit" flat round dense icon="edit" color="primary" aria-label="Editar predio" @click="openEdit(row)"><q-tooltip>Editar</q-tooltip></q-btn>
                <q-btn v-if="canEdit" flat round dense icon="delete_outline" color="negative" aria-label="Eliminar predio" @click="confirmDelete(row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
              </q-card-actions>
            </template>
            <template v-else-if="config.entity === 'lots'">
              <img class="record-card-cover" :src="lotPlaceholder" alt="" />
              <q-card-section class="compact-card-heading">
                <div class="compact-card-title">
                  <h2>{{ row.name || missingData }}</h2>
                  <p><q-icon name="landscape" />{{ row.farmName && row.farmName !== '—' ? row.farmName : missingData }}</p>
                </div>
                <StatusBadge :status="row.status" />
              </q-card-section>
              <div class="compact-card-metrics lot-compact-metrics">
                <div><span>Área</span><strong>{{ row.area !== null && row.area !== undefined && row.area !== '' ? `${formatArea(row.area)} HA` : missingData }}</strong></div>
                <div><span>Cultivo</span><strong>{{ row.cropName || missingData }}</strong></div>
                <div class="compact-metric-wide"><span>Ciclo productivo</span><strong>{{ row.cycleName || missingData }}</strong></div>
              </div>
              <q-card-actions class="compact-card-actions">
                <q-btn flat no-caps icon="visibility" label="Ver detalle" class="detail-card-button" @click="openDetail(row)" />
                <q-btn v-if="canEdit" flat round dense icon="edit" color="primary" aria-label="Editar lote" @click="openEdit(row)"><q-tooltip>Editar</q-tooltip></q-btn>
                <q-btn v-if="canEdit" flat round dense icon="delete_outline" color="negative" aria-label="Eliminar lote" @click="confirmDelete(row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
              </q-card-actions>
            </template>
            <template v-else-if="config.entity === 'crops'">
              <img class="record-card-cover" :src="row.image || lotPlaceholder" :alt="`Cultivo ${row.name}`" />
              <q-card-section class="crop-card-content">
                <h2>{{ row.name || missingData }}</h2>
                <div class="crop-card-detail"><span>Variedad</span><strong>{{ row.variety || missingData }}</strong></div>
                <div class="crop-card-detail"><span>Etapas fenológicas</span><strong>{{ row.stages || missingData }}</strong></div>
                <div class="crop-card-detail"><span>Categoría</span><strong>{{ row.category || missingData }}</strong></div>
                <div class="crop-card-detail"><span>Insumos asociados</span><strong>{{ row.inputsLabel || 'Sin insumos' }}</strong></div>
              </q-card-section>
              <q-card-actions class="compact-card-actions">
                <q-btn flat no-caps icon="visibility" label="Ver detalle" class="detail-card-button" @click="openDetail(row)" />
                <q-btn v-if="canEdit" flat round dense icon="edit" color="primary" aria-label="Editar cultivo" @click="openEdit(row)"><q-tooltip>Editar</q-tooltip></q-btn>
                <q-btn v-if="canEdit" flat round dense icon="delete_outline" color="negative" aria-label="Eliminar cultivo" @click="confirmDelete(row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
              </q-card-actions>
            </template>
            <template v-else>
              <q-expansion-item expand-separator class="record-card-expansion" @click.stop>
                <template #header>
                  <q-item-section v-if="config.entity === 'users'" avatar>
                    <q-avatar class="user-avatar" aria-hidden="true">{{ userInitials(row.name) || '—' }}</q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="record-card-title"><q-icon v-if="config.entity === 'activities'" class="decorative-inline-icon" :name="row.kind === 'Incidencia' ? 'warning_amber' : 'task_alt'" /><span v-if="config.entity === 'inputs'" class="record-card-inline-emoji" aria-hidden="true">{{ row.emoji }}</span>{{ config.entity === 'users' ? row.name || missingData : config.entity === 'activities' ? row.type || missingData : config.entity === 'harvests' ? row.cropName : rowName(row) }}</q-item-label>
                    <q-item-label caption>{{ config.entity === 'users' ? row.email || missingData : config.entity === 'activities' ? `${row.kind || missingData} · ${row.cycleName} · ${row.responsible} · ${row.dateLabel}` : config.entity === 'harvests' ? `${row.cycleName} · ${row.dateLabel}` : config.entity === 'nurseries' ? `${row.cropName} · ${row.cycleName}` : config.entity === 'inputs' ? `${row.category || missingData} · ${row.stockLabel}` : config.title }}</q-item-label>
                  </q-item-section>
                  <q-item-section v-if="config.entity === 'users'" side><div class="user-card-statuses"><StatusBadge :status="row.role" /><StatusBadge :status="row.activeLabel" /></div></q-item-section>
                  <q-item-section v-if="config.entity === 'nurseries'" side><StatusBadge :status="row.status" /></q-item-section>
                  <q-item-section v-else-if="config.entity === 'harvests'" side><StatusBadge :status="row.quality" /></q-item-section>
                  <q-item-section v-else-if="config.entity === 'inputs' && row.availabilityStatus !== missingData" side><StatusBadge :status="row.availabilityStatus" /></q-item-section>
                  <q-item-section v-else-if="['cycles', 'activities'].includes(config.entity)" side><StatusBadge :status="row.status" /></q-item-section>
                  <q-item-section v-else-if="row.status" side><q-badge :class="statusClass(row.status)">{{ row.status }}</q-badge></q-item-section>
                </template>
                <q-card-section class="record-mobile-card-fields">
                  <div
                    v-for="[key, label] in mobileColumns.filter(([key]) =>
                      key !== 'name' &&
                      !(config.entity === 'users' && ['name', 'email', 'role', 'activeLabel'].includes(key)) &&
                      !(config.entity === 'activities' && ['kind', 'type', 'status'].includes(key)) &&
                      !(config.entity === 'nurseries' && key === 'status') &&
                      !(config.entity === 'harvests' && key === 'quality') &&
                      !(config.entity === 'cycles' && key === 'status') &&
                      !(config.entity === 'activities' && key === 'status')
                    )"
                    :key="key"
                    class="record-mobile-field"
                  >
                    <span>{{ label }}</span>
                    <template v-if="config.entity === 'users'">
                      <div v-if="key === 'farmsLabel'" class="user-farm-chips">
                        <q-chip v-for="(farmName, index) in row.assignedFarmNames" :key="`${farmName}-${index}`" dense square class="user-farm-chip">{{ farmName }}</q-chip>
                        <span v-if="!row.assignedFarmNames.length">{{ missingData }}</span>
                      </div>
                      <StatusBadge v-else-if="key === 'eppStatus'" :status="row.eppStatus" />
                      <strong v-else>{{ row[key] ?? missingData }}</strong>
                    </template>
                    <ProgressBar v-else-if="config.entity === 'nurseries' && key === 'germination'" :value="row.germination" />
                    <ProgressBar v-else-if="config.entity === 'cycles' && key === 'progress'" :value="row.progress" />
                    <StatusBadge v-else-if="config.entity === 'activities' && key === 'priority'" :status="row.priority" />
                    <strong v-else>{{ row[key] ?? missingData }}</strong>
                  </div>
                </q-card-section>
                <q-card-actions class="record-mobile-actions">
                  <div class="record-safe-actions">
                    <q-btn v-if="config.entity === 'cycles'" flat round icon="open_in_new" color="primary" aria-label="Ver seguimiento" :to="{ name: 'cycle-detail', params: { id: row.id } }" />
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
        <EmptyState
          v-if="config.entity === 'farms' && !hasExplicitFilters"
          class="full-width"
          emoji="🌱"
          message="Todavía no tienes predios registrados."
          subtext="Registra un predio para comenzar a gestionar sus lotes y cultivos."
          :can-create="canAdd"
          create-label="Nuevo predio"
          @create="openCreate"
        />
        <EmptyState
          v-else-if="config.entity === 'lots' && !hasExplicitFilters"
          class="full-width"
          emoji="🌾"
          :message="activeFarm ? `Todavía no hay lotes registrados para ${activeFarm.name}.` : 'Todavía no tienes lotes registrados.'"
          subtext="Registra un lote para organizar la producción de este predio."
          :can-create="canAdd"
          create-label="Nuevo lote"
          @create="openCreate"
        />
        <EmptyState
          v-else-if="config.entity === 'inputs' && !hasExplicitFilters"
          class="full-width"
          emoji="🧪"
          message="Todavía no tienes insumos registrados."
          subtext="Registra insumos para consultar su disponibilidad y cultivos asociados."
          :can-create="canAdd"
          create-label="Nuevo insumo"
          @create="openCreate"
        />
        <EmptyState
          v-else-if="config.entity === 'crops' && !hasExplicitFilters"
          class="full-width"
          emoji="🌱"
          message="Todavía no tienes cultivos registrados."
          subtext="Registra un cultivo para organizar su variedad, etapas e insumos asociados."
          :can-create="canAdd"
          create-label="Nuevo cultivo"
          @create="openCreate"
        />
        <EmptyState
          v-if="config.entity === 'nurseries' && !hasFilters"
          class="full-width"
          emoji="🌱"
          message="Todavía no tienes semilleros registrados."
          subtext="Comienza registrando tu primer semillero para realizar seguimiento a su germinación."
          :can-create="canAdd"
          create-label="Nuevo semillero"
          @create="openCreate"
        />
        <EmptyState
          v-else-if="config.entity === 'harvests' && !hasFilters"
          class="full-width"
          emoji="🌾"
          message="Todavía no tienes cosechas registradas."
          subtext="Cuando registres cosechas, aquí encontrarás su producción y calidad."
          :can-create="canAdd"
          create-label="Nueva cosecha"
          @create="openCreate"
        />
        <EmptyState
          v-else-if="config.entity === 'activities' && !hasExplicitFilters"
          class="full-width"
          emoji="🌿"
          message="Todavía no hay labores o incidencias registradas."
          subtext="Cuando registres una actividad, aquí podrás consultar su seguimiento."
          :can-create="canAdd"
          create-label="Nuevo registro"
          @create="openCreate"
        />
        <EmptyState
          v-else-if="emptyStateInfo && !hasFilters"
          class="full-width"
          :emoji="emptyStateInfo.emoji"
          :message="emptyStateInfo.message"
          :subtext="emptyStateInfo.subtext"
          :can-create="canAdd"
          :create-label="emptyStateInfo.createLabel || 'Crear registro'"
          @create="openCreate"
        />
        <div v-else class="empty-state">
          <strong><q-icon name="inventory_2" />{{ hasFilters ? 'No encontramos resultados' : 'Todavía no hay registros' }}</strong>
          <span>{{ activeFarm ? `Este predio aún no tiene lotes registrados.` : hasFilters ? 'Prueba con otros filtros.' : 'Cuando agregues información, aparecerá aquí.' }}</span>
        </div>
      </div>
      <div v-if="config.entity === 'users'" class="simulation-note"><q-icon name="info" /> <span v-if="localUserManagement">Las cuentas se guardan en este navegador; la contraseña se almacena localmente para esta demostración.</span><span v-else>Los cambios de usuarios se sincronizan con el servidor. Si no defines una contraseña al crear la cuenta, se asignará <strong>Agro2026!</strong> por defecto.</span></div>
    </q-card>

    <RecordDetailDialog v-model="detailDialog" :entity="config.entity" :record="detailRecord" />

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
                    <RecordFormField v-model="form[field.key]" :field="field" :options="fieldOptions(field)" :extra-rules="field.key === 'email' ? [userEmailRule] : []" :disabled="field.key === 'lotId' && !form.farmId" />
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
              <div v-for="field in formFields.filter(f => f.key !== 'otherCategory' || form.category === 'Otro')" :key="field.key" class="form-field">
                <label :for="`field-${field.key}`">{{ field.label }}<span v-if="field.required"> *</span></label>
                <RecordFormField v-model="form[field.key]" :field="field" :options="fieldOptions(field)" :extra-rules="field.key === 'email' ? [userEmailRule] : []" :disabled="(field.key === 'lotId' && !form.farmId) || (field.key === 'farmId' && localUserManagement && editing === auth.currentUser?.id)" />
                <div v-if="field.key === 'area' && lotAreaGuidance" class="area-guidance" :class="{ 'area-guidance-over': lotAreaGuidance.exceedsAvailable }">
                  <div class="area-guidance-heading">
                    <span>{{ formatArea(form.area || 0) }} HA del predio</span>
                    <strong>{{ formatArea(lotAreaGuidance.percentage) }}%</strong>
                  </div>
                  <q-linear-progress rounded size="8px" :value="lotAreaGuidance.progress" color="primary" track-color="white" />
                  <span>Disponible para nuevos lotes: {{ formatArea(lotAreaGuidance.availableArea) }} HA</span>
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
      <q-card class="record-dialog delete-dialog" :class="{ 'notification-delete-dialog': config.entity === 'notifications' }">
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
          <q-input v-model="deleteConfirmationText" outlined autofocus :maxlength="rowName(pendingDelete).length" :placeholder="`Escribe ${rowName(pendingDelete)} para confirmar`" aria-label="Escribe el nombre del registro para confirmar" />
          <small v-if="['farms', 'lots'].includes(config.entity) && !deleteReady">El botón se habilitará en un momento.</small>
        </q-card-section>
        <q-card-actions align="right" class="delete-dialog-actions">
          <q-btn flat no-caps label="Cancelar" class="delete-cancel-button" @click="closeDeleteDialog" />
          <q-btn v-if="['farms', 'lots'].includes(config.entity) && deleteStep === 1" unelevated no-caps color="primary" icon-right="arrow_forward" label="Continuar" @click="continueDelete" />
          <q-btn v-else unelevated no-caps color="negative" icon="delete_outline" label="Sí, eliminar" :disable="deleteConfirmationText.trim() !== rowName(pendingDelete) || (['farms', 'lots'].includes(config.entity) && !deleteReady)" @click="deleteRecord" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>
