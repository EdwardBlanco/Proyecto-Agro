<script setup>
/**
 * Panel principal de resumen operativo (/), con métricas climáticas/productivas,
 * lotes destacados, actividad reciente, alertas, gráfica de cosechas y franja de telemetría.
 * Filtra toda la información de storage.js según los predios visibles del usuario en auth.js.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/services/permissions'
import { harvestKilograms } from '@/services/production'
import { getRecords } from '@/services/storage'
import { formatDateTime } from '@/services/dates'
import StatusBadge from '@/components/StatusBadge.vue'
import lotPlaceholder from '@/assets/lot-placeholder.svg'

const auth = useAuthStore()
const router = useRouter()
const todayLabel = computed(() => {
  const today = new Date()
  const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(today).toLocaleLowerCase('es-CO')
  const day = new Intl.DateTimeFormat('es-CO', { day: 'numeric' }).format(today)
  const month = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(today)
  const year = new Intl.DateTimeFormat('es-CO', { year: 'numeric' }).format(today)
  return `Hoy es ${weekday} ${day} de ${month}, del año ${year}`
})
const farmIds = computed(() => auth.currentUser?.farms ?? [])

/**
 * Resuelve el predio asociado a un registro de cualquier entidad para aplicar control de alcance.
 */
function farmFor(entity, item) {
  if (entity === 'farms') return item.id
  if (item.farmId) return item.farmId
  if (item.lotId) return getRecords('lots').find((lot) => lot.id === item.lotId)?.farmId
  if (item.cycleId) return getRecords('cycles').find((cycle) => cycle.id === item.cycleId)?.farmId
  return null
}

// Filtra las colecciones locales para mostrar solo registros de predios permitidos al usuario
const scoped = (entity) => {
  const items = getRecords(entity)
  return auth.currentUser?.role === 'SuperAdmin'
    ? items
    : items.filter((item) => {
      const farmId = farmFor(entity, item)
      return farmId ? farmIds.value.includes(farmId) : false
    })
}
const lots = computed(() => scoped('lots'))
const cycles = computed(() => scoped('cycles'))
const activities = computed(() => scoped('activities'))
const nurseries = computed(() => scoped('nurseries'))
const harvests = computed(() => scoped('harvests'))
const telemetry = computed(() => scoped('telemetry'))
const latestTemperature = computed(() => telemetry.value
  .filter((reading) => reading.variable === 'Temperatura')
  .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0])
const latestSoilMoisture = computed(() => telemetry.value
  .filter((reading) => reading.variable === 'Humedad del suelo')
  .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0])
const weeklyHarvests = computed(() => {
  const start = new Date()
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return harvests.value.filter((harvest) => new Date(`${harvest.date}T00:00:00`) >= start)
})
const weeklyHarvestKilograms = computed(() => weeklyHarvests.value.reduce((sum, item) => sum + harvestKilograms(item), 0))
const activeUsers = computed(() => getRecords('users').filter((user) => user.active &&
  (auth.currentUser?.role === 'SuperAdmin' ||
    user.farms?.some((farmId) => farmIds.value.includes(farmId)))))
const notifications = computed(() => scoped('notifications').filter((item) => item.status === 'Pendiente' && !item.deletedAt))
const totalHarvest = computed(() => harvests.value.reduce((total, item) => total + harvestKilograms(item), 0))
const weightedHarvests = computed(() => harvests.value.filter((item) => harvestKilograms(item) > 0))
const chartHarvests = computed(() => [...weightedHarvests.value]
  .sort((left, right) => left.date.localeCompare(right.date))
  .slice(-6))
const chartMaximum = computed(() => Math.max(1, ...chartHarvests.value.map(harvestKilograms)))
const quickLinks = [
  { title: 'Registrar labor', icon: 'add_task', route: 'activities', color: 'green' },
  { title: 'Nuevo ciclo productivo', icon: 'autorenew', route: 'cycles', color: 'blue' },
  { title: 'Registrar cosecha', icon: 'agriculture', route: 'harvests', color: 'orange' },
  { title: 'Ver monitoreo', icon: 'sensors', route: 'telemetry', color: 'purple' }
]
const metrics = computed(() => [
  { title: 'Clima', value: latestTemperature.value ? `${latestTemperature.value.value} ${latestTemperature.value.unit}` : 'Sin dato', detail: latestTemperature.value ? `Última lectura · ${formatDateTime(latestTemperature.value.date)}` : 'No hay lecturas de temperatura', icon: 'wb_sunny', route: 'telemetry' },
  { title: 'Humedad del suelo', value: latestSoilMoisture.value ? `${latestSoilMoisture.value.value} ${latestSoilMoisture.value.unit}` : 'Sin dato', detail: latestSoilMoisture.value ? `Última lectura · ${formatDateTime(latestSoilMoisture.value.date)}` : 'No hay lecturas de humedad', icon: 'water_drop', route: 'telemetry' },
  { title: 'Cosecha de la semana', value: `${weeklyHarvestKilograms.value.toLocaleString('es-CO')} kg`, detail: `${weeklyHarvests.value.length} registros en los últimos 7 días`, icon: 'agriculture', route: 'harvests' },
  { title: 'Usuarios activos', value: activeUsers.value.length, detail: 'Cuentas activas asociadas a tus predios', icon: 'groups', route: 'users' }
])
const recentActivities = computed(() => [...activities.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4))
const featuredLots = computed(() => lots.value.slice(0, 3).map((lot) => {
  const activeCycle = cycles.value.find((cycle) => cycle.lotId === lot.id && cycle.status === 'En curso')
  const humidity = telemetry.value
    .filter((reading) => reading.lotId === lot.id && reading.variable === 'Humedad del suelo')
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]
  return {
    ...lot,
    farmName: getRecords('farms').find((farm) => farm.id === lot.farmId)?.name ?? 'Predio',
    cropName: activeCycle ? relatedName('crops', activeCycle.cropId) : 'Sin cultivo activo',
    humidity: humidity ? `${humidity.value} ${humidity.unit}` : 'Sin lectura'
  }
}))

function relatedName(entity, id) {
  const item = getRecords(entity).find((record) => record.id === id)
  return item?.name ?? 'Registro'
}

function formatArea(value) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function formatChartDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(date)
    : value
}

/**
 * Navega al módulo correspondiente cuando el usuario tiene acceso en permissions.js.
 */
function openMetric(metric) {
  if (canAccess(auth.currentUser, metric.route)) router.push({ name: metric.route })
}
</script>

<template>
  <q-page class="page-content dashboard-page">
    <div class="welcome-row">
      <div><h1>Buenos días, {{ auth.currentUser?.name?.split(' ')[0] }}</h1><p class="dashboard-date">{{ todayLabel }}</p><p>Aquí tienes el resumen de la actividad en tus predios.</p></div>
    </div>

    <div class="metric-grid">
      <q-card v-for="metric in metrics" :key="metric.title" flat bordered class="metric-card" :class="{ 'metric-card-static': !canAccess(auth.currentUser, metric.route), 'card-clickable': canAccess(auth.currentUser, metric.route) }" :aria-disabled="!canAccess(auth.currentUser, metric.route)" @click="openMetric(metric)">
        <q-card-section>
          <div class="metric-top"><span><q-icon class="metric-icon" :name="metric.icon" />{{ metric.title }}</span></div>
          <div class="metric-value">{{ metric.value }}</div><div class="metric-detail">{{ metric.detail }}</div>
        </q-card-section>
      </q-card>
    </div>
    <section class="field-overview">
      <div class="field-overview-heading">
        <div><div class="section-eyebrow">PREDIOS Y LOTES</div><h2>Mis lotes</h2><p>Consulta superficie y lecturas disponibles de tus áreas productivas.</p></div>
        <q-btn flat no-caps color="primary" icon="arrow_forward" label="Ver predios" :to="{ name: 'farms' }" />
      </div>
      <div v-if="featuredLots.length" class="field-overview-grid">
        <q-card v-for="lot in featuredLots" :key="lot.id" flat bordered class="field-overview-card">
          <div class="field-overview-photo"><img :src="lotPlaceholder" alt="" /><span class="field-overview-photo-label">Lote agrícola</span></div>
          <q-card-section class="field-overview-content">
            <div class="field-overview-title"><div><span>{{ lot.farmName }}</span><h3>{{ lot.name }}</h3></div><div class="field-overview-area"><strong>{{ formatArea(lot.area) }} HA</strong><StatusBadge :status="lot.status" /></div></div>
            <p>{{ lot.cropName }}</p>
            <div class="lot-condition-grid">
              <div><q-icon name="water_drop" /><span>Humedad</span><strong>{{ lot.humidity }}</strong></div>
              <div><q-icon name="health_and_safety" /><span>Sanidad</span><strong>Sin registro</strong></div>
              <div><q-icon name="schedule" /><span>Tiempo al corte</span><strong>Sin registro</strong></div>
            </div>
            <q-btn flat no-caps color="primary" icon="landscape" label="Ver predios" :to="{ name: 'farms' }" />
          </q-card-section>
        </q-card>
      </div>
      <div v-else class="field-overview-empty"><q-icon name="landscape" /><span>No hay lotes registrados para mostrar.</span><q-btn flat no-caps color="primary" icon="landscape" label="Administrar predios" :to="{ name: 'farms' }" /></div>
    </section>
    <q-banner v-if="!cycles.length" rounded class="dashboard-empty-banner">
      <template #avatar><q-icon name="autorenew" /></template>
      No hay ciclos productivos registrados.
      <template #action><q-btn flat no-caps color="primary" icon="add" label="Crear ciclo" :to="{ name: 'cycles' }" /></template>
    </q-banner>

    <div class="dashboard-columns">
      <q-card flat bordered class="panel-card production-panel">
        <q-card-section class="panel-heading"><div><h2>Actividad reciente</h2><p>Últimos registros de tus ciclos productivos</p></div><q-btn flat no-caps color="primary" label="Ver todas" :to="{ name: 'activities' }" /></q-card-section>
        <q-separator />
        <q-list v-if="recentActivities.length">
          <q-item v-for="item in recentActivities" :key="item.id" class="activity-row">
            <q-item-section><q-item-label class="activity-title"><q-icon class="decorative-inline-icon" :name="item.kind === 'Incidencia' ? 'warning_amber' : 'eco'" />{{ item.type }}</q-item-label><q-item-label caption>{{ item.description }} · {{ relatedName('cycles', item.cycleId) }}</q-item-label></q-item-section>
            <q-item-section side><span class="activity-date">{{ item.date }}</span><q-badge :class="item.status === 'Completada' ? 'status-active' : 'status-neutral'">{{ item.status }}</q-badge></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="empty-state"><strong><q-icon name="event_note" />Aún no hay actividad registrada</strong><span>Registra la primera labor para ver el seguimiento aquí.</span><q-btn flat no-caps color="primary" label="Registrar actividad" :to="{ name: 'activities' }" /></div>
      </q-card>
      <div class="dashboard-side">
        <q-card flat bordered class="panel-card">
          <q-card-section class="panel-heading"><div><h2><q-icon name="notifications_active" />Alertas y avisos</h2><p>{{ notifications.length }} pendientes</p></div></q-card-section>
          <q-separator />
          <q-list v-if="notifications.length">
            <q-item v-for="notice in notifications.slice(0, 3)" :key="notice.id" class="notice-row"><q-item-section avatar><q-icon name="circle" size="9px" color="orange" /></q-item-section><q-item-section><q-item-label class="notice-title">{{ notice.title }}</q-item-label><q-item-label caption>{{ notice.message }}</q-item-label></q-item-section></q-item>
          </q-list>
          <div v-else class="small-empty">No tienes alertas pendientes.</div>
          <q-card-actions align="right"><q-btn flat no-caps color="primary" label="Ver notificaciones" :to="{ name: 'notifications' }" /></q-card-actions>
        </q-card>
        <q-card flat bordered class="panel-card quick-panel">
          <q-card-section class="panel-heading"><div><h2>Accesos rápidos</h2><p>Continúa con tu trabajo</p></div></q-card-section>
          <div class="quick-grid"><q-btn v-for="item in quickLinks.filter(item => canAccess(auth.currentUser, item.route))" :key="item.route" flat no-caps class="quick-link" :to="{ name: item.route }"><q-icon :name="item.icon" /><span>{{ item.title }}</span></q-btn></div>
        </q-card>
      </div>
    </div>

    <div class="dashboard-columns lower-dashboard">
      <q-card flat bordered class="panel-card">
        <q-card-section class="panel-heading"><div><h2><q-icon name="trending_up" />Producción de la temporada</h2><p>Volumen acumulado a partir de cosechas registradas</p></div></q-card-section>
        <q-card-section v-if="harvests.length" class="harvest-summary"><div class="harvest-total">{{ totalHarvest.toLocaleString('es-CO') }} <small>kg registrados</small></div><div v-if="chartHarvests.length" class="production-chart" role="img" aria-label="Gráfica de kilos cosechados por fecha">
          <div class="chart-y-axis"><strong>Kilos</strong><div><span>{{ chartMaximum.toLocaleString('es-CO') }}</span><span>{{ (chartMaximum / 2).toLocaleString('es-CO', { maximumFractionDigits: 1 }) }}</span><span>0</span></div></div>
          <div><div class="chart-plot"><div class="chart-gridlines"><i></i><i></i><i></i></div><div class="harvest-bars"><div v-for="item in chartHarvests" :key="item.id" class="harvest-bar-wrap"><div class="harvest-bar" :style="{ height: `${Math.max(8, (harvestKilograms(item) / chartMaximum) * 100)}%` }" tabindex="0" role="img" :aria-label="`Cosecha de ${relatedName('cycles', item.cycleId)}: ${harvestKilograms(item).toLocaleString('es-CO')} kilos el ${formatChartDate(item.date)}`"><q-tooltip>Cosecha de {{ relatedName('cycles', item.cycleId) }}: {{ harvestKilograms(item).toLocaleString('es-CO') }} kilos · {{ formatChartDate(item.date) }}</q-tooltip></div><small>{{ formatChartDate(item.date) }}</small></div></div></div><div class="chart-x-axis">Fecha</div></div>
        </div><div v-else class="small-empty">Las cosechas registradas usan unidades que no se convierten a kg (cajas o unidades).</div></q-card-section>
        <div v-else class="empty-state dashboard-panel-empty"><strong><q-icon name="agriculture" />Sin producción registrada</strong><span>Registra una cosecha para consultar el comportamiento de la producción.</span><q-btn flat no-caps color="primary" icon="add" label="Registrar cosecha" :to="{ name: 'harvests' }" /></div>
      </q-card>
      <q-card flat bordered class="panel-card nursery-card">
        <q-card-section class="panel-heading"><div><h2>Semilleros en seguimiento</h2><p>Estado actual de germinación y trasplante</p></div><q-btn flat round dense icon="arrow_forward" :to="{ name: 'nurseries' }" /></q-card-section>
        <q-list v-if="nurseries.length"><q-item v-for="item in nurseries.slice(0, 2)" :key="item.id"><q-item-section><q-item-label><q-icon class="decorative-inline-icon" name="spa" />{{ item.name }}</q-item-label><q-item-label caption>{{ relatedName('crops', item.cropId) }} · {{ item.status }}</q-item-label><q-linear-progress :value="Number(item.germination || 0) / 100" color="primary" rounded class="q-mt-sm" /></q-item-section><q-item-section side>{{ item.germination }}%</q-item-section></q-item></q-list>
        <div v-else class="small-empty">No hay semilleros activos.</div>
      </q-card>
    </div>

    <div class="telemetry-strip"><div class="telemetry-title"><q-icon name="sensors" /><div><strong>Monitoreo del predio</strong><small>Lecturas locales de demostración · no son sensores reales</small></div></div><div v-if="telemetry.length" class="telemetry-reading" v-for="reading in telemetry.slice(0, 3)" :key="reading.id"><span>{{ reading.variable }}</span><strong>{{ reading.value }} {{ reading.unit }}</strong><q-tooltip>{{ reading.variable }} · {{ reading.value }} {{ reading.unit }} · {{ formatDateTime(reading.date) }}</q-tooltip></div><div v-else class="telemetry-reading telemetry-empty">No hay lecturas registradas</div><q-btn flat no-caps color="primary" :icon="telemetry.length ? undefined : 'add'" :label="telemetry.length ? 'Ver historial' : 'Registrar lectura'" :to="{ name: 'telemetry' }" /></div>
  </q-page>
</template>
