<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { canWrite, visibleFarmIds } from '@/services/permissions'
import { getRecord, getRecords } from '@/services/storage'
import StatusBadge from '@/components/StatusBadge.vue'

const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const now = new Date()
const selectedMonth = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const viewMode = ref('calendar')
const filters = ref({ type: '', cropId: '', farmId: '', lotId: '', status: '' })
const selectedEvent = ref(null)
const selectedDay = ref('')
const detailDialog = ref(false)
const dayDialog = ref(false)
const missingData = 'Sin datos registrados'
const allowedFarmIds = computed(() => visibleFarmIds(auth.currentUser))
const isOperator = computed(() => auth.currentUser?.role === 'Operario')
const canRegisterActivity = computed(() => canWrite(auth.currentUser, 'activities'))

const monthLabel = computed(() => new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric'
}).format(selectedMonth.value))

const farmOptions = computed(() => getRecords('farms')
  .filter((farm) => !allowedFarmIds.value || allowedFarmIds.value.includes(farm.id))
  .map((farm) => ({ label: farm.name, value: farm.id })))

const accessibleCycles = computed(() => getRecords('cycles')
  .filter((cycle) => !allowedFarmIds.value || allowedFarmIds.value.includes(cycle.farmId)))

const lotOptions = computed(() => getRecords('lots')
  .filter((lot) => (!filters.value.farmId || lot.farmId === filters.value.farmId) &&
    (!allowedFarmIds.value || allowedFarmIds.value.includes(lot.farmId)))
  .map((lot) => ({ label: lot.name, value: lot.id })))

const cropOptions = computed(() => {
  const cropIds = new Set(accessibleCycles.value.map((cycle) => cycle.cropId).filter(Boolean))
  return getRecords('crops')
    .filter((crop) => cropIds.has(crop.id))
    .map((crop) => ({ label: crop.name, value: crop.id }))
})

const allEvents = computed(() => {
  const cycles = accessibleCycles.value
    .filter((cycle) => hasValue(cycle.startDate))
    .map((cycle) => {
      const farm = getRecord('farms', cycle.farmId)
      const lot = getRecord('lots', cycle.lotId)
      const crop = getRecord('crops', cycle.cropId)
      return {
        id: cycle.id,
        key: `cycle-${cycle.id}`,
        kind: 'cycle',
        typeLabel: 'Ciclo productivo',
        title: cycle.name || crop?.name || 'Inicio de ciclo',
        date: dateKey(cycle.startDate),
        crop,
        farm,
        lot,
        record: cycle,
        status: cycle.status
      }
    })

  const activities = getRecords('activities')
    .filter(isAssignedToCurrentOperator)
    .map((activity) => {
      const cycle = accessibleCycles.value.find((item) => item.id === activity.cycleId)
      if (!cycle || !hasValue(activity.date)) return null
      const farm = getRecord('farms', cycle.farmId)
      const lot = getRecord('lots', cycle.lotId)
      const crop = getRecord('crops', cycle.cropId)
      const responsible = getRecord('users', activity.responsible)?.name ?? activity.responsible
      return {
        id: activity.id,
        key: `activity-${activity.id}`,
        kind: activity.kind === 'Incidencia' ? 'incident' : 'labor',
        typeLabel: activity.kind,
        title: activity.type || activity.kind,
        date: dateKey(activity.date),
        crop,
        farm,
        lot,
        cycle,
        responsible,
        record: activity,
        status: activity.status
      }
    })
    .filter(Boolean)

  return [...cycles, ...activities]
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title, 'es'))
})

const filteredEvents = computed(() => allEvents.value.filter((event) => {
  if (filters.value.type && event.kind !== filters.value.type) return false
  if (filters.value.cropId && event.crop?.id !== filters.value.cropId) return false
  if (filters.value.farmId && event.farm?.id !== filters.value.farmId) return false
  if (filters.value.lotId && event.lot?.id !== filters.value.lotId) return false
  if (filters.value.status && event.status !== filters.value.status) return false
  return true
}))

const statusOptions = computed(() => [...new Set(filteredEvents.value
  .map((event) => event.status)
  .filter(hasValue))]
  .sort((left, right) => left.localeCompare(right, 'es'))
  .map((status) => ({ label: status, value: status })))

const calendarDays = computed(() => {
  const year = selectedMonth.value.getFullYear()
  const month = selectedMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const count = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const key = dateKey(date)
    return {
      key,
      date,
      inMonth: date.getMonth() === month,
      isToday: key === dateKey(now),
      events: filteredEvents.value.filter((event) => event.date === key)
    }
  })
})

const selectedDayEvents = computed(() => filteredEvents.value.filter((event) => event.date === selectedDay.value))

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function isAssignedToCurrentOperator(activity) {
  if (!isOperator.value) return true
  const identity = auth.currentUser
  return [identity?.id, identity?.name]
    .filter(hasValue)
    .some((value) => String(activity.responsible).trim() === String(value).trim())
}

function dateKey(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  return String(value ?? '').slice(0, 10)
}

function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const key = dateKey(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return value
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Intl.DateTimeFormat('es-CO', options).format(date)
}

function formatArea(value) {
  return `${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ha`
}

function relatedNames(entity, ids) {
  if (!Array.isArray(ids)) return ''
  return ids.map((id) => {
    const record = getRecord(entity, id)
    if (record?.name) return record.name
    return entity === 'users'
      ? getRecords('users').find((user) => user.name === id)?.name ?? id
      : ''
  }).filter(Boolean).join(', ')
}

function applicationSummary(application) {
  const details = [getRecord('inputs', application.inputId)?.name ?? missingData]
  if (hasValue(application.batchNumber)) details.push(`Lote: ${application.batchNumber}`)
  if (hasValue(application.quantity)) details.push(`Cantidad: ${application.quantity} ${application.quantityUnit ?? ''}`.trim())
  if (hasValue(application.dose)) details.push(`Dosis: ${application.dose} ${application.doseUnit ?? ''}`.trim())
  if (hasValue(application.method)) details.push(`Método: ${application.method}`)
  if (hasValue(application.expirationDate)) details.push(`Vencimiento: ${formatDate(application.expirationDate)}`)
  if (hasValue(application.preharvestIntervalDays)) details.push(`Carencia: ${application.preharvestIntervalDays} días`)
  if (hasValue(application.reentryIntervalDays)) details.push(`Reentrada: ${application.reentryIntervalDays} días`)
  if (hasValue(application.technicalRecommendation)) details.push(`Recomendación: ${application.technicalRecommendation}`)
  return details.join(' · ')
}

function openEvent(event) {
  selectedEvent.value = event
  dayDialog.value = false
  detailDialog.value = true
}

function openDay(day) {
  selectedDay.value = day.key
  dayDialog.value = true
}

function shiftMonth(amount) {
  selectedMonth.value = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + amount, 1)
}

function goToToday() {
  selectedMonth.value = new Date(now.getFullYear(), now.getMonth(), 1)
}

function clearFilters() {
  filters.value = { type: '', cropId: '', farmId: '', lotId: '', status: '' }
}

function manageEvent() {
  if (!selectedEvent.value) return
  const route = selectedEvent.value.kind === 'cycle' ? 'cycles' : 'activities'
  detailDialog.value = false
  router.push({ name: route })
}

function registerActivity() {
  if (!canRegisterActivity.value) {
    $q.notify({ type: 'warning', message: 'No tienes permiso para registrar actividades.' })
    return
  }
  router.push({ name: 'activities' })
}
</script>

<template>
  <q-page class="page-content agricultural-calendar-page">
    <section class="calendar-heading">
      <div>
        <div class="calendar-eyebrow"><q-icon name="eco" /> PLANIFICACIÓN PRODUCTIVA</div>
        <h1>Calendario agrícola</h1>
        <p>Consulta ciclos, labores e incidencias de tus predios en un solo lugar.</p>
      </div>
      <q-btn v-if="!isOperator" color="primary" unelevated no-caps icon="add" label="Registrar actividad" :disable="!canRegisterActivity" @click="registerActivity" />
    </section>

    <q-card flat bordered class="calendar-toolbar-card">
      <div class="calendar-toolbar">
        <div class="month-navigation">
          <q-btn flat round dense icon="chevron_left" aria-label="Mes anterior" @click="shiftMonth(-1)" />
          <h2>{{ monthLabel }}</h2>
          <q-btn flat round dense icon="chevron_right" aria-label="Mes siguiente" @click="shiftMonth(1)" />
          <q-btn outline dense no-caps color="primary" label="Hoy" class="today-button" @click="goToToday" />
        </div>
        <q-btn-toggle
          v-model="viewMode"
          unelevated
          toggle-color="primary"
          color="white"
          text-color="grey-8"
          :options="[{ label: 'Calendario', value: 'calendar', icon: 'calendar_month' }, { label: 'Agenda', value: 'agenda', icon: 'view_agenda' }]"
          class="calendar-view-toggle"
        />
      </div>
      <q-separator />
      <div class="calendar-filters">
        <q-select v-model="filters.type" dense outlined clearable emit-value map-options label="Tipo de evento" :options="[{ label: 'Ciclos productivos', value: 'cycle' }, { label: 'Labores', value: 'labor' }, { label: 'Incidencias', value: 'incident' }]" />
        <q-select v-model="filters.cropId" dense outlined clearable emit-value map-options label="Cultivo" :options="cropOptions" />
        <q-select v-model="filters.farmId" dense outlined clearable emit-value map-options label="Predio" :options="farmOptions" @update:model-value="filters.lotId = ''" />
        <q-select v-model="filters.lotId" dense outlined clearable emit-value map-options label="Lote" :options="lotOptions" />
        <q-select v-model="filters.status" dense outlined clearable emit-value map-options label="Estado" :options="statusOptions" />
        <q-btn flat no-caps color="primary" icon="restart_alt" label="Limpiar" @click="clearFilters" />
      </div>
    </q-card>

    <section class="calendar-legend" aria-label="Tipos de evento">
      <span><i class="legend-dot legend-cycle"></i>Ciclos productivos</span>
      <span><i class="legend-dot legend-labor"></i>Labores agrícolas</span>
      <span><i class="legend-dot legend-incident"></i>Incidencias</span>
      <span class="calendar-event-count">{{ filteredEvents.length }} registros</span>
    </section>

    <q-card v-if="viewMode === 'calendar'" flat bordered class="calendar-grid-card">
      <div class="calendar-grid calendar-weekdays">
        <div v-for="weekday in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="weekday">{{ weekday }}</div>
      </div>
      <div class="calendar-grid calendar-days">
        <article
          v-for="day in calendarDays"
          :key="day.key"
          class="calendar-day"
          :class="{ 'calendar-day-outside': !day.inMonth, 'calendar-day-today': day.isToday }"
        >
          <div class="calendar-day-heading">
            <span class="calendar-day-number" :class="{ 'calendar-today-number': day.isToday }">{{ day.date.getDate() }}</span>
            <span v-if="day.events.length" class="calendar-day-count">{{ day.events.length }}</span>
          </div>
          <button
            v-for="event in day.events.slice(0, 3)"
            :key="event.key"
            type="button"
            class="calendar-event"
            :class="`calendar-event-${event.kind}`"
            :aria-label="`${event.typeLabel}: ${event.title}, ${formatDate(event.date)}`"
            @click="openEvent(event)"
          >
            <span class="calendar-event-title">{{ event.title }}</span>
            <span class="calendar-event-meta">{{ event.crop?.name || event.typeLabel }}<template v-if="event.lot?.name"> · {{ event.lot.name }}</template></span>
          </button>
          <button v-if="day.events.length > 3" type="button" class="calendar-more-events" @click="openDay(day)">
            +{{ day.events.length - 3 }} más
          </button>
          <button v-if="!day.events.length && day.inMonth" type="button" class="calendar-empty-hit-area" :aria-label="`Sin eventos el ${formatDate(day.key)}`" disabled />
        </article>
      </div>
    </q-card>

    <q-card v-else flat bordered class="agenda-card">
      <div v-if="filteredEvents.length" class="agenda-list">
        <button
          v-for="event in filteredEvents"
          :key="event.key"
          type="button"
          class="agenda-event"
          :class="`agenda-event-${event.kind}`"
          @click="openEvent(event)"
        >
          <span class="agenda-date"><strong>{{ formatDate(event.date, { day: '2-digit' }) }}</strong><small>{{ formatDate(event.date, { month: 'short' }) }}</small></span>
          <span class="agenda-event-icon"><q-icon :name="event.kind === 'cycle' ? 'spa' : event.kind === 'labor' ? 'task_alt' : 'warning_amber'" /></span>
          <span class="agenda-event-copy">
            <strong>{{ event.title }}</strong>
            <small>{{ event.typeLabel }}<template v-if="event.crop?.name"> · {{ event.crop.name }}</template><template v-if="event.farm?.name"> · {{ event.farm.name }}</template><template v-if="event.lot?.name"> · {{ event.lot.name }}</template></small>
          </span>
          <StatusBadge v-if="event.status" :status="event.status" />
          <q-icon name="chevron_right" class="agenda-chevron" />
        </button>
      </div>
      <div v-else class="calendar-empty-state">
        <q-icon name="event_busy" />
        <strong>No hay registros con estos filtros</strong>
        <span>{{ isOperator ? 'No tienes actividades asignadas para mostrar.' : 'Ajusta los filtros o registra una nueva actividad.' }}</span>
      </div>
    </q-card>

    <q-dialog v-model="dayDialog">
      <q-card class="calendar-day-dialog">
        <q-card-section class="calendar-dialog-heading">
          <div><small>AGENDA DEL DÍA</small><h2>{{ formatDate(selectedDay) }}</h2></div>
          <q-btn flat round dense icon="close" v-close-popup aria-label="Cerrar" />
        </q-card-section>
        <q-separator />
        <q-list v-if="selectedDayEvents.length" separator>
          <q-item v-for="event in selectedDayEvents" :key="event.key" clickable @click="openEvent(event)">
            <q-item-section avatar><q-icon :name="event.kind === 'cycle' ? 'spa' : event.kind === 'labor' ? 'task_alt' : 'warning_amber'" :class="`event-icon-${event.kind}`" /></q-item-section>
            <q-item-section><q-item-label>{{ event.title }}</q-item-label><q-item-label caption>{{ event.typeLabel }} · {{ event.crop?.name || missingData }} · {{ event.lot?.name || missingData }}</q-item-label></q-item-section>
            <q-item-section side><StatusBadge v-if="event.status" :status="event.status" /></q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-else class="calendar-empty-state"><strong>No hay registros para este día.</strong></q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailDialog">
      <q-card v-if="selectedEvent" class="calendar-detail-dialog">
        <q-card-section class="calendar-detail-banner" :class="`calendar-detail-${selectedEvent.kind}`">
          <div class="calendar-detail-title">
            <span class="calendar-detail-icon"><q-icon :name="selectedEvent.kind === 'cycle' ? 'spa' : selectedEvent.kind === 'labor' ? 'task_alt' : 'warning_amber'" /></span>
            <div><small>{{ selectedEvent.typeLabel }}</small><h2>{{ selectedEvent.title }}</h2></div>
          </div>
          <q-btn flat round dense icon="close" v-close-popup aria-label="Cerrar detalle" />
        </q-card-section>
        <q-card-section class="calendar-detail-content">
          <div class="calendar-detail-location">
            <span v-if="selectedEvent.farm?.name"><q-icon name="landscape" />{{ selectedEvent.farm.name }}</span>
            <span v-if="selectedEvent.lot?.name"><q-icon name="grid_view" />{{ selectedEvent.lot.name }}</span>
            <span v-if="selectedEvent.crop?.name"><q-icon name="eco" />{{ selectedEvent.crop.name }}</span>
          </div>
          <div class="calendar-detail-fields">
            <template v-if="selectedEvent.kind === 'cycle'">
              <div v-if="hasValue(selectedEvent.record.name)"><small>Nombre del ciclo</small><strong>{{ selectedEvent.record.name }}</strong></div>
              <div v-if="selectedEvent.crop?.name"><small>Cultivo</small><strong>{{ selectedEvent.crop.name }}</strong></div>
              <div v-if="selectedEvent.farm?.name"><small>Predio</small><strong>{{ selectedEvent.farm.name }}</strong></div>
              <div v-if="selectedEvent.lot?.name"><small>Lote</small><strong>{{ selectedEvent.lot.name }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.startDate)"><small>Fecha de inicio</small><strong>{{ formatDate(selectedEvent.record.startDate) }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.endDate)"><small>Fecha de finalización</small><strong>{{ formatDate(selectedEvent.record.endDate) }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.estimatedEndDate)"><small>Fecha estimada de finalización</small><strong>{{ formatDate(selectedEvent.record.estimatedEndDate) }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.area)"><small>Área cultivada</small><strong>{{ formatArea(selectedEvent.record.area) }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.responsible)"><small>Responsable</small><strong>{{ getRecord('users', selectedEvent.record.responsible)?.name ?? selectedEvent.record.responsible }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.plantingMethod)"><small>Método de siembra</small><strong>{{ selectedEvent.record.plantingMethod }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.plantingDensity)"><small>Densidad de siembra</small><strong>{{ selectedEvent.record.plantingDensity }} plantas/ha</strong></div>
              <div v-if="hasValue(selectedEvent.record.propagationMaterial)"><small>Material de propagación</small><strong>{{ selectedEvent.record.propagationMaterial }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.target)"><small>Meta de producción</small><strong>{{ Number(selectedEvent.record.target).toLocaleString('es-CO') }} kg</strong></div>
              <div v-if="hasValue(selectedEvent.record.progress)"><small>Progreso</small><strong>{{ selectedEvent.record.progress }}%</strong></div>
              <div v-if="hasValue(selectedEvent.record.status)"><small>Estado</small><StatusBadge :status="selectedEvent.record.status" /></div>
              <div v-if="hasValue(selectedEvent.record.notes)" class="calendar-detail-wide"><small>Observaciones</small><p>{{ selectedEvent.record.notes }}</p></div>
            </template>
            <template v-else>
              <div v-if="hasValue(selectedEvent.record.kind)"><small>Tipo de registro</small><strong>{{ selectedEvent.record.kind }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.type)"><small>Actividad</small><strong>{{ selectedEvent.record.type }}</strong></div>
              <div v-if="selectedEvent.cycle?.name"><small>Ciclo productivo</small><strong>{{ selectedEvent.cycle.name }}</strong></div>
              <div v-if="selectedEvent.crop?.name"><small>Cultivo</small><strong>{{ selectedEvent.crop.name }}</strong></div>
              <div v-if="selectedEvent.farm?.name"><small>Predio</small><strong>{{ selectedEvent.farm.name }}</strong></div>
              <div v-if="selectedEvent.lot?.name"><small>Lote</small><strong>{{ selectedEvent.lot.name }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.date)"><small>Fecha</small><strong>{{ formatDate(selectedEvent.record.date) }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.time)"><small>Hora</small><strong>{{ selectedEvent.record.time }}</strong></div>
              <div v-if="hasValue(selectedEvent.responsible)"><small>Responsable</small><strong>{{ selectedEvent.responsible }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.priority)"><small>Prioridad</small><strong>{{ selectedEvent.record.priority }}</strong></div>
              <div v-if="relatedNames('users', selectedEvent.record.participants)"><small>Personal participante</small><strong>{{ relatedNames('users', selectedEvent.record.participants) }}</strong></div>
              <div v-if="relatedNames('inputs', selectedEvent.record.inputIds)" class="calendar-detail-wide"><small>Insumos utilizados</small><p>{{ relatedNames('inputs', selectedEvent.record.inputIds) }}</p></div>
              <div v-if="hasValue(selectedEvent.record.status)"><small>Estado</small><StatusBadge :status="selectedEvent.record.status" /></div>
              <div v-if="hasValue(selectedEvent.record.description)" class="calendar-detail-wide"><small>Descripción</small><p>{{ selectedEvent.record.description }}</p></div>
              <div v-if="selectedEvent.record.applications?.length" class="calendar-detail-wide"><small>Productos aplicados</small><p v-for="(application, index) in selectedEvent.record.applications" :key="index">{{ applicationSummary(application) }}</p></div>
              <div v-if="hasValue(selectedEvent.record.equipmentUsed)" class="calendar-detail-wide"><small>Equipos o herramientas utilizados</small><p>{{ selectedEvent.record.equipmentUsed }}</p></div>
              <div v-if="hasValue(selectedEvent.record.correctiveAction)" class="calendar-detail-wide"><small>Acciones correctivas o seguimiento</small><p>{{ selectedEvent.record.correctiveAction }}</p></div>
              <div v-if="hasValue(selectedEvent.record.followUpDate)"><small>Fecha de seguimiento</small><strong>{{ formatDate(selectedEvent.record.followUpDate) }}</strong></div>
              <div v-if="hasValue(selectedEvent.record.evidenceReferences)" class="calendar-detail-wide"><small>Referencias de evidencia</small><p>{{ selectedEvent.record.evidenceReferences }}</p></div>
              <div v-if="hasValue(selectedEvent.record.notes)" class="calendar-detail-wide"><small>Observaciones</small><p>{{ selectedEvent.record.notes }}</p></div>
            </template>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="calendar-detail-actions">
          <q-btn flat no-caps label="Cerrar" v-close-popup />
          <q-btn v-if="!isOperator" unelevated color="primary" no-caps icon="open_in_new" label="Gestionar registro" @click="manageEvent" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.agricultural-calendar-page { max-width: 1540px; margin: 0 auto; padding: 28px 32px 48px; }
.calendar-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.calendar-eyebrow { display: flex; align-items: center; gap: 7px; color: var(--green-primary); font-size: 10px; font-weight: 700; letter-spacing: 1.15px; }
.calendar-heading h1 { margin: 5px 0 2px; color: var(--green-dark); font-size: 27px; font-weight: 700; }
.calendar-heading p { margin: 0; color: var(--muted); font-size: 13px; }
.calendar-toolbar-card, .calendar-grid-card, .agenda-card { overflow: hidden; border-color: #e4e9e5; border-radius: 12px; box-shadow: 0 3px 14px rgb(18 61 41 / 5%); }
.calendar-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 15px 20px; }
.month-navigation { display: flex; align-items: center; gap: 5px; }
.month-navigation h2 { min-width: 190px; margin: 0; color: var(--green-dark); font-size: 19px; font-weight: 700; text-align: center; text-transform: capitalize; }
.today-button { margin-left: 9px; }
.calendar-view-toggle { border: 1px solid #e3e9e4; border-radius: 8px; }
.calendar-filters { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)) auto; align-items: center; gap: 11px; padding: 15px 20px; }
.calendar-filters :deep(.q-field__control) { border-radius: 8px; }
.calendar-legend { display: flex; align-items: center; gap: 22px; padding: 16px 3px 12px; color: #526058; font-size: 12px; }
.calendar-legend > span:not(.calendar-event-count) { display: flex; align-items: center; gap: 7px; }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; }
.legend-cycle { background: #36834b; }
.legend-labor { background: #4384bd; }
.legend-incident { background: #de8a33; }
.calendar-event-count { margin-left: auto; color: #65716a; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.calendar-weekdays { min-height: 39px; align-items: center; border-bottom: 1px solid #e7ece8; background: #f8faf8; color: #66746b; font-size: 11px; font-weight: 700; text-align: center; text-transform: uppercase; }
.calendar-days { grid-auto-rows: minmax(118px, auto); }
.calendar-day { position: relative; min-width: 0; padding: 9px 8px 7px; border-right: 1px solid #edf0ed; border-bottom: 1px solid #edf0ed; background: #fff; }
.calendar-day:nth-child(7n) { border-right: 0; }
.calendar-day-outside { background: #fbfcfb; }
.calendar-day-today { background: #f5faf5; }
.calendar-day-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.calendar-day-number { display: inline-flex; width: 25px; height: 25px; align-items: center; justify-content: center; border-radius: 50%; color: #45534a; font-size: 12px; }
.calendar-day-outside .calendar-day-number { color: #a4aca6; }
.calendar-today-number { background: var(--green-primary); color: #fff !important; font-weight: 700; }
.calendar-day-count { color: #738078; font-size: 10px; }
.calendar-event { display: flex; width: 100%; min-width: 0; flex-direction: column; gap: 1px; margin: 3px 0; padding: 5px 6px; overflow: hidden; border: 0; border-left: 3px solid transparent; border-radius: 4px; cursor: pointer; text-align: left; }
.calendar-event:hover { filter: brightness(.97); }
.calendar-event-title { overflow: hidden; width: 100%; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.calendar-event-meta { overflow: hidden; width: 100%; font-size: 9px; opacity: .84; text-overflow: ellipsis; white-space: nowrap; }
.calendar-event-cycle { border-left-color: #36834b; background: #eaf5ec; color: #245c32; }
.calendar-event-labor { border-left-color: #4384bd; background: #eaf3fb; color: #245d8c; }
.calendar-event-incident { border-left-color: #de8a33; background: #fff3e5; color: #955311; }
.calendar-more-events { margin: 2px 3px; padding: 2px 3px; border: 0; background: transparent; color: var(--green-primary); cursor: pointer; font-size: 10px; font-weight: 700; }
.calendar-empty-hit-area { display: block; width: 100%; height: 34px; border: 0; background: transparent; }
.agenda-list { padding: 0 18px; }
.agenda-event { display: flex; width: 100%; align-items: center; gap: 15px; padding: 15px 4px; border: 0; border-bottom: 1px solid #edf0ed; background: #fff; cursor: pointer; text-align: left; }
.agenda-event:last-child { border-bottom: 0; }
.agenda-event:hover { background: #fafcfb; }
.agenda-date { display: flex; width: 42px; flex: 0 0 42px; flex-direction: column; align-items: center; color: #435149; line-height: 1.15; }
.agenda-date strong { font-size: 18px; }
.agenda-date small { margin-top: 3px; color: #77837b; font-size: 10px; text-transform: uppercase; }
.agenda-event-icon { display: flex; width: 35px; height: 35px; flex: 0 0 35px; align-items: center; justify-content: center; border-radius: 50%; }
.agenda-event-cycle .agenda-event-icon { background: #eaf5ec; color: #36834b; }
.agenda-event-labor .agenda-event-icon { background: #eaf3fb; color: #4384bd; }
.agenda-event-incident .agenda-event-icon { background: #fff3e5; color: #de8a33; }
.agenda-event-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.agenda-event-copy strong { overflow: hidden; color: #26342b; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.agenda-event-copy small { overflow: hidden; color: #6a776e; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.agenda-chevron { color: #8c9890; }
.calendar-empty-state { display: flex; min-height: 185px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; color: #67746b; text-align: center; }
.calendar-empty-state .q-icon { color: #9baa9e; font-size: 32px; }
.calendar-empty-state strong { color: #334138; font-size: 14px; }
.calendar-empty-state span { font-size: 12px; }
.calendar-day-dialog, .calendar-detail-dialog { width: min(580px, calc(100vw - 32px)); max-width: 580px; border-radius: 14px; }
.calendar-dialog-heading, .calendar-detail-banner { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.calendar-dialog-heading small, .calendar-detail-title small { color: #6a786e; font-size: 10px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; }
.calendar-dialog-heading h2 { margin: 4px 0 0; color: var(--green-dark); font-size: 20px; text-transform: capitalize; }
.calendar-detail-banner { align-items: center; padding: 20px 22px; }
.calendar-detail-cycle { background: #eaf5ec; color: #245c32; }
.calendar-detail-labor { background: #eaf3fb; color: #245d8c; }
.calendar-detail-incident { background: #fff3e5; color: #955311; }
.calendar-detail-title { display: flex; min-width: 0; align-items: center; gap: 13px; }
.calendar-detail-icon { display: flex; width: 42px; height: 42px; flex: 0 0 42px; align-items: center; justify-content: center; border-radius: 50%; background: rgb(255 255 255 / 70%); font-size: 21px; }
.calendar-detail-title h2 { margin: 3px 0 0; overflow-wrap: anywhere; font-size: 20px; line-height: 1.2; }
.calendar-detail-content { padding: 20px 22px 24px; }
.calendar-detail-location { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 18px; color: #4a5b50; font-size: 12px; }
.calendar-detail-location span { display: inline-flex; align-items: center; gap: 5px; }
.calendar-detail-location .q-icon { color: var(--green-primary); font-size: 16px; }
.calendar-detail-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 20px; }
.calendar-detail-fields > div { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 4px; }
.calendar-detail-fields small { color: #768178; font-size: 10px; }
.calendar-detail-fields strong { overflow-wrap: anywhere; color: #26342b; font-size: 12px; }
.calendar-detail-wide { grid-column: 1 / -1; }
.calendar-detail-wide p { margin: 0; color: #34433a; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
.calendar-detail-actions { padding: 12px 20px; }
.event-icon-cycle { color: #36834b; }
.event-icon-labor { color: #4384bd; }
.event-icon-incident { color: #de8a33; }

@media (max-width: 900px) {
  .agricultural-calendar-page { padding: 22px 18px 36px; }
  .calendar-filters { grid-template-columns: repeat(3, minmax(120px, 1fr)); }
  .calendar-days { grid-auto-rows: minmax(105px, auto); }
}
@media (max-width: 600px) {
  .agricultural-calendar-page { padding: 18px 10px 28px; }
  .calendar-heading { align-items: flex-start; flex-direction: column; }
  .calendar-heading h1 { font-size: 23px; }
  .calendar-toolbar { align-items: flex-start; flex-direction: column; padding: 13px; }
  .month-navigation { width: 100%; justify-content: center; }
  .month-navigation h2 { min-width: 145px; font-size: 16px; }
  .calendar-view-toggle { align-self: stretch; }
  .calendar-view-toggle :deep(.q-btn) { flex: 1; }
  .calendar-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 12px; }
  .calendar-filters :deep(.q-field) { min-width: 0; }
  .calendar-legend { flex-wrap: wrap; gap: 9px 14px; font-size: 10px; }
  .calendar-event-count { width: 100%; margin: 0; }
  .calendar-weekdays { font-size: 9px; }
  .calendar-days { grid-auto-rows: minmax(83px, auto); }
  .calendar-day { padding: 5px 3px; }
  .calendar-day-heading { margin-bottom: 4px; }
  .calendar-day-number { width: 21px; height: 21px; font-size: 10px; }
  .calendar-event { padding: 4px 3px; border-left-width: 2px; }
  .calendar-event-title { font-size: 8px; }
  .calendar-event-meta { font-size: 7px; }
  .calendar-more-events { margin: 1px; padding: 1px; font-size: 8px; }
  .agenda-list { padding: 0 10px; }
  .agenda-event { gap: 9px; padding: 12px 1px; }
  .agenda-event-icon { width: 30px; height: 30px; flex-basis: 30px; }
  .agenda-event-copy strong { font-size: 12px; }
  .agenda-event-copy small { font-size: 10px; }
  .calendar-detail-fields { gap: 13px 10px; }
  .calendar-detail-banner { padding: 16px; }
  .calendar-detail-content { padding: 16px; }
}
</style>
