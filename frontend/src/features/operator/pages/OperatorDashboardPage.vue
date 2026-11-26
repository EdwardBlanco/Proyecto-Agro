<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getRecord, getRecords } from '@/services/storage'
import { formatDateTime } from '@/services/dates'
import StatusBadge from '@/components/StatusBadge.vue'

const auth = useAuthStore()
const today = ref(new Date())
let dateRefreshTimer

const todayKey = computed(() => dateKey(today.value))
const todayLabel = computed(() => new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(today.value))
const farmIds = computed(() => auth.currentUser?.farms ?? [])
const farms = computed(() => getRecords('farms').filter((farm) => farmIds.value.includes(farm.id)))
const telemetryReadings = computed(() => {
  const latestByVariable = new Map()
  for (const reading of getRecords('telemetry')
    .filter((item) => farmIds.value.includes(item.farmId))
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))) {
    if (!latestByVariable.has(reading.variable)) latestByVariable.set(reading.variable, reading)
  }
  return [...latestByVariable.values()]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
})
const assignedTasks = computed(() => getRecords('activities')
  .filter(isAssignedToCurrentOperator)
  .map((activity) => {
    const cycle = getRecord('cycles', activity.cycleId)
    if (!cycle || dateKey(activity.date) !== todayKey.value || !farmIds.value.includes(cycle.farmId)) return null
    const farm = getRecord('farms', cycle.farmId)
    const lot = getRecord('lots', cycle.lotId)
    const crop = getRecord('crops', cycle.cropId)
    return {
      ...activity,
      cycle,
      farm,
      lot,
      crop,
      time: activityTime(activity)
    }
  })
  .filter(Boolean)
  .sort((left, right) => String(left.time).localeCompare(String(right.time)) ||
    String(left.type).localeCompare(String(right.type), 'es')))
const pendingTasks = computed(() => assignedTasks.value.filter((task) => task.status === 'Pendiente'))
const inProgressTasks = computed(() => assignedTasks.value.filter((task) => ['En seguimiento', 'En proceso'].includes(task.status)))
const completedTasks = computed(() => assignedTasks.value.filter((task) => task.status === 'Completada'))
const pendingNotices = computed(() => getRecords('notifications')
  .filter((notice) => {
    if (notice.deletedAt || notice.status !== 'Pendiente') return false
    const lot = getRecord('lots', notice.lotId)
    return Boolean(lot && farmIds.value.includes(lot.farmId))
  }))

function isAssignedToCurrentOperator(activity) {
  const identity = auth.currentUser
  const identifiers = [identity?.id, identity?.name].filter(hasValue).map(String)
  return identifiers.includes(String(activity.responsible ?? '').trim())
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function activityTime(activity) {
  const explicitTime = activity.time || activity.scheduledTime
  if (explicitTime) return explicitTime
  return /(?:T|\s)(\d{2}:\d{2})/.exec(String(activity.date ?? ''))?.[1] ?? ''
}

function dateKey(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  return String(value ?? '').slice(0, 10)
}

function formatTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''))
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value
}

function refreshDate() {
  today.value = new Date()
}

onMounted(() => {
  dateRefreshTimer = window.setInterval(refreshDate, 60_000)
})

onBeforeUnmount(() => {
  window.clearInterval(dateRefreshTimer)
})
</script>

<template>
  <q-page class="page-content operator-dashboard-page">
    <section class="operator-welcome">
      <div>
        <div class="operator-eyebrow"><q-icon name="today" /> MI JORNADA</div>
        <h1>Hola, {{ auth.currentUser?.name || 'Operario' }}</h1>
        <p>{{ todayLabel }}</p>
      </div>
      <div class="operator-welcome-actions">
        <q-btn outline no-caps color="primary" icon="calendar_month" label="Calendario agrícola" :to="{ name: 'calendar' }" />
        <q-btn unelevated no-caps color="primary" icon="sensors" label="Telemetría" :to="{ name: 'telemetry' }" />
      </div>
    </section>

    <section class="operator-summary-grid">
      <q-card flat bordered class="operator-summary-card">
        <q-card-section><span>Actividades de hoy</span><strong>{{ assignedTasks.length }}</strong><small>Asignadas a tu responsabilidad</small></q-card-section>
      </q-card>
      <q-card flat bordered class="operator-summary-card operator-summary-pending">
        <q-card-section><span>Pendientes</span><strong>{{ pendingTasks.length }}</strong><small>Por realizar</small></q-card-section>
      </q-card>
      <q-card flat bordered class="operator-summary-card operator-summary-progress">
        <q-card-section><span>En proceso</span><strong>{{ inProgressTasks.length }}</strong><small>En seguimiento</small></q-card-section>
      </q-card>
      <q-card flat bordered class="operator-summary-card operator-summary-complete">
        <q-card-section><span>Completadas</span><strong>{{ completedTasks.length }}</strong><small>Finalizadas hoy</small></q-card-section>
      </q-card>
    </section>

    <section class="operator-overview-grid">
      <q-card flat bordered class="operator-panel">
        <q-card-section class="operator-panel-heading">
          <div><h2><q-icon name="landscape" />Mis predios</h2><p>Predios asociados a tu sesión</p></div>
        </q-card-section>
        <q-separator />
        <q-list v-if="farms.length" separator>
          <q-item v-for="farm in farms" :key="farm.id">
            <q-item-section><q-item-label><q-icon class="decorative-inline-icon" name="landscape" />{{ farm.name }}</q-item-label><q-item-label caption>{{ farm.municipality }}<template v-if="farm.department">, {{ farm.department }}</template></q-item-label></q-item-section>
            <q-item-section side><q-btn flat round dense icon="arrow_forward" aria-label="Consultar predio" :to="{ name: 'farms' }" /></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="operator-empty-inline">No tienes predios asociados a tu cuenta.</div>
      </q-card>

      <q-card flat bordered class="operator-panel operator-telemetry-summary">
        <q-card-section class="operator-panel-heading">
          <div><h2><q-icon name="sensors" />Condiciones de telemetría</h2><p>Consulta de sensores en tus predios</p></div>
        </q-card-section>
        <q-separator />
        <div v-if="telemetryReadings.length" class="operator-telemetry-readings">
          <div v-for="reading in telemetryReadings.slice(0, 3)" :key="reading.variable" class="operator-telemetry-reading">
            <span><q-icon :name="reading.variable === 'Temperatura' ? 'thermostat' : reading.variable === 'Humedad del suelo' || reading.variable === 'Humedad ambiental' ? 'water_drop' : 'sensors'" />{{ reading.variable }}</span>
            <strong>{{ reading.value }} {{ reading.unit }}</strong>
            <small>Última lectura · {{ formatDateTime(reading.date) }}</small>
          </div>
        </div>
        <div v-else class="operator-data-unavailable">
          <strong><q-icon name="sensors_off" />Sin lecturas registradas</strong>
          <span>No hay mediciones disponibles para los predios asociados a tu sesión.</span>
        </div>
        <div class="operator-telemetry-summary-action">
          <q-btn flat no-caps color="primary" label="Abrir telemetría" :to="{ name: 'telemetry' }" />
        </div>
      </q-card>
    </section>

    <section class="operator-work-grid">
      <q-card flat bordered class="operator-panel operator-tasks-panel">
        <q-card-section class="operator-panel-heading">
          <div><h2>Actividades asignadas para hoy</h2><p>Ordenadas por hora cuando el registro la incluye</p></div>
          <q-badge color="primary" rounded>{{ assignedTasks.length }}</q-badge>
        </q-card-section>
        <q-separator />
        <div v-if="assignedTasks.length" class="operator-task-groups">
          <section v-for="group in [
            { key: 'pending', title: 'Pendientes', icon: 'schedule', tasks: pendingTasks, className: 'operator-task-pending' },
            { key: 'progress', title: 'En proceso', icon: 'pending_actions', tasks: inProgressTasks, className: 'operator-task-progress' },
            { key: 'completed', title: 'Completadas', icon: 'task_alt', tasks: completedTasks, className: 'operator-task-complete' }
          ]" :key="group.key" v-show="group.tasks.length" class="operator-task-group">
            <h3><q-icon :name="group.icon" />{{ group.title }}<span>{{ group.tasks.length }}</span></h3>
            <div class="operator-task-card-grid">
              <article v-for="task in group.tasks" :key="task.id" class="operator-task-card" :class="group.className">
                <div class="operator-task-title">
                  <div><small>{{ task.kind }}<template v-if="task.crop?.name"> · {{ task.crop.name }}</template></small><h4>{{ task.type }}</h4></div>
                  <StatusBadge :status="task.status" />
                </div>
                <p v-if="task.description" class="operator-task-description">{{ task.description }}</p>
                <div class="operator-task-meta">
                  <span v-if="task.farm?.name"><q-icon name="landscape" />{{ task.farm.name }}</span>
                  <span v-if="task.lot?.name"><q-icon name="grid_view" />{{ task.lot.name }}</span>
                  <span v-if="task.date"><q-icon name="event" />{{ task.date }}</span>
                  <span v-if="task.time"><q-icon name="schedule" />{{ formatTime(task.time) }}</span>
                  <span v-if="task.responsible"><q-icon name="person" />Responsable: {{ task.responsible }}</span>
                </div>
                <div v-if="task.notes" class="operator-task-notes"><strong>Observaciones:</strong> {{ task.notes }}</div>
              </article>
            </div>
          </section>
        </div>
        <div v-else class="operator-empty-state">
          <strong><q-icon name="event_available" />No tienes actividades programadas para hoy</strong>
          <span>Cuando se asigne una actividad con tu usuario y la fecha de hoy, aparecerá aquí.</span>
        </div>
      </q-card>

      <q-card flat bordered class="operator-panel operator-notices-panel">
        <q-card-section class="operator-panel-heading">
          <div><h2><q-icon name="notifications_active" />Avisos de mis predios</h2><p>Avisos pendientes relacionados con tus lotes</p></div>
        </q-card-section>
        <q-separator />
        <q-list v-if="pendingNotices.length" separator>
          <q-item v-for="notice in pendingNotices" :key="notice.id">
            <q-item-section><q-item-label><q-icon class="decorative-inline-icon" name="warning_amber" />{{ notice.title }}</q-item-label><q-item-label caption>{{ notice.message }}</q-item-label></q-item>
          </q-item>
        </q-list>
        <div v-else class="operator-empty-inline">No hay avisos pendientes asociados a tus predios.</div>
        <div class="operator-notice-footnote">El sistema actual no almacena un nivel de severidad para clasificar alertas.</div>
      </q-card>
    </section>
  </q-page>
</template>

<style scoped>
.operator-dashboard-page { max-width: 1500px; margin: 0 auto; padding: 28px 32px 48px; }
.operator-welcome { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.operator-eyebrow { display: flex; align-items: center; gap: 7px; color: var(--green-primary); font-size: 10px; font-weight: 700; letter-spacing: 1.1px; }
.operator-eyebrow .q-icon { color: var(--green-muted); }
.operator-welcome h1 { margin: 5px 0 2px; color: var(--green-dark); font-size: 27px; font-weight: 700; }
.operator-welcome p { margin: 0; color: #647168; font-size: 13px; text-transform: capitalize; }
.operator-welcome-actions { display: flex; flex-wrap: wrap; gap: 9px; }
.operator-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 13px; margin-bottom: 16px; }
.operator-summary-card { border-color: #e4e9e5; border-radius: 11px; box-shadow: 0 3px 12px rgb(18 61 41 / 5%); }
.operator-summary-card .q-card__section { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px 10px; padding: 15px 17px; }
.operator-summary-card span { color: #5a685f; font-size: 11px; font-weight: 600; }
.operator-summary-card strong { grid-column: 2; grid-row: 1 / span 2; color: var(--green-dark); font-size: 27px; }
.operator-summary-card small { color: #7d8880; font-size: 10px; }
.operator-summary-pending strong { color: #a36314; }
.operator-summary-progress strong { color: #2e6e9c; }
.operator-summary-complete strong { color: #2e7d32; }
.operator-overview-grid, .operator-work-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .75fr); gap: 15px; margin-bottom: 16px; }
.operator-panel { overflow: hidden; border-color: #e4e9e5; border-radius: 12px; box-shadow: 0 3px 12px rgb(18 61 41 / 5%); }
.operator-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 17px 19px; }
.operator-panel-heading h2 { display: flex; align-items: center; gap: 8px; margin: 0; color: #26372d; font-size: 15px; font-weight: 700; }
.operator-panel-heading p { margin: 3px 0 0; color: #79857d; font-size: 11px; }
.operator-panel-heading h2 .q-icon { color: var(--green-muted); font-size: 19px; }
.operator-empty-inline { padding: 22px 19px; color: #68756c; font-size: 12px; }
.operator-data-unavailable { display: flex; min-height: 146px; flex-direction: column; align-items: flex-start; justify-content: center; gap: 6px; padding: 18px 22px; }
.operator-data-unavailable > .q-icon { margin-bottom: 2px; color: #88958b; font-size: 26px; }
.operator-data-unavailable strong { color: #34443a; font-size: 13px; }
.operator-data-unavailable span { color: #738078; font-size: 11px; line-height: 1.45; }
.operator-telemetry-readings { display: grid; gap: 0; padding: 0 18px; }
.operator-telemetry-reading { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 12px; padding: 10px 0; border-bottom: 1px solid #edf0ed; }
.operator-telemetry-reading:last-child { border-bottom: 0; }
.operator-telemetry-reading span { display: flex; align-items: center; gap: 6px; color: #637067; font-size: 11px; }
.operator-telemetry-reading span .q-icon { color: var(--green-muted); font-size: 15px; }
.operator-telemetry-reading strong { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: #2e6339; font-size: 15px; }
.operator-telemetry-reading small { color: #89948c; font-size: 9px; }
.operator-telemetry-summary-action { padding: 0 18px 10px; }
.operator-telemetry-summary-action .q-btn { margin-left: -8px; }
.operator-work-grid { grid-template-columns: minmax(0, 1.35fr) minmax(290px, .65fr); align-items: start; }
.operator-task-groups { padding: 0 18px 17px; }
.operator-task-group + .operator-task-group { margin-top: 12px; }
.operator-task-group h3 { display: flex; align-items: center; gap: 7px; margin: 15px 0 9px; color: #46564b; font-size: 12px; }
.operator-task-group h3 .q-icon { color: var(--green-muted); font-size: 17px; }
.operator-task-group h3 span { display: inline-flex; min-width: 20px; height: 20px; align-items: center; justify-content: center; border-radius: 50%; background: #eef3ef; color: #526056; font-size: 10px; }
.operator-task-card-grid { display: grid; grid-auto-rows: 1fr; gap: 8px; }
.operator-task-card { padding: 13px 14px; border: 1px solid #e7ece8; border-left: 3px solid #96a39a; border-radius: 8px; background: #fff; }
.operator-task-pending { border-left-color: #d3923e; }
.operator-task-progress { border-left-color: #4687b7; }
.operator-task-complete { border-left-color: #3b8c4a; }
.operator-task-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.operator-task-title small { color: #758178; font-size: 10px; }
.operator-task-title h4 { margin: 2px 0 0; color: #29382f; font-size: 13px; font-weight: 700; }
.operator-task-description { margin: 10px 0; color: #536158; font-size: 11px; line-height: 1.5; }
.operator-task-meta { display: flex; flex-wrap: wrap; gap: 7px 14px; color: #68756c; font-size: 10px; }
.operator-task-meta span { display: inline-flex; align-items: center; gap: 4px; }
.operator-task-meta .q-icon { color: var(--green-muted); font-size: 14px; }
.operator-task-notes { margin-top: 9px; color: #657269; font-size: 10px; }
.operator-empty-state { display: flex; min-height: 230px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; color: #6c7970; text-align: center; }
.operator-empty-state strong { display: flex; align-items: center; gap: 8px; color: #34443a; font-size: 14px; }
.operator-empty-state strong .q-icon { color: var(--green-muted); font-size: 20px; }
.operator-empty-state span { max-width: 360px; font-size: 11px; line-height: 1.5; }
.operator-notice-footnote { padding: 10px 17px; border-top: 1px solid #edf0ed; color: #79857d; font-size: 10px; line-height: 1.4; }
@media (max-width: 900px) {
  .operator-dashboard-page { padding: 23px 18px 36px; }
  .operator-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .operator-overview-grid, .operator-work-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .operator-dashboard-page { padding: 18px 10px 28px; }
  .operator-welcome { align-items: flex-start; flex-direction: column; }
  .operator-welcome h1 { font-size: 23px; }
  .operator-welcome-actions { width: 100%; }
  .operator-welcome-actions .q-btn { flex: 1; }
  .operator-summary-grid { gap: 8px; }
  .operator-summary-card .q-card__section { padding: 12px; }
  .operator-summary-card strong { font-size: 23px; }
  .operator-panel-heading { padding: 14px; }
  .operator-task-groups { padding: 0 11px 12px; }
}
</style>
