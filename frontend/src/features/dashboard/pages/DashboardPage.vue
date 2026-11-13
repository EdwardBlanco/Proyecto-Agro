<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/services/permissions'
import { harvestKilograms } from '@/services/production'
import { getRecords } from '@/services/storage'
import lotPlaceholder from '@/assets/lote-placeholder.svg'

const auth = useAuthStore()
const router = useRouter()
const todayLabel = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  .format(new Date())
  .toLocaleUpperCase('es-CO')
const farmIds = computed(() => auth.currentUser?.farms ?? [])
function farmFor(entity, item) {
  if (entity === 'farms') return item.id
  if (item.farmId) return item.farmId
  if (item.lotId) return getRecords('lots').find((lot) => lot.id === item.lotId)?.farmId
  if (item.cycleId) return getRecords('cycles').find((cycle) => cycle.id === item.cycleId)?.farmId
  return null
}
const scoped = (entity) => {
  const items = getRecords(entity)
  return auth.currentUser?.role === 'SuperAdmin' || auth.currentUser?.role === 'Admin'
    ? items
    : items.filter((item) => !farmFor(entity, item) || farmIds.value.includes(farmFor(entity, item)))
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
  (['SuperAdmin', 'Admin'].includes(auth.currentUser?.role) ||
    user.farms?.some((farmId) => farmIds.value.includes(farmId)))))
const notifications = computed(() => scoped('notifications').filter((item) => item.status === 'Pendiente' && !item.deletedAt))
const totalHarvest = computed(() => harvests.value.reduce((total, item) => total + harvestKilograms(item), 0))
const weightedHarvests = computed(() => harvests.value.filter((item) => harvestKilograms(item) > 0))
const quickLinks = [
  { title: 'Registrar labor', icon: 'add_task', route: 'activities', color: 'green' },
  { title: 'Nuevo ciclo', icon: 'autorenew', route: 'cycles', color: 'blue' },
  { title: 'Registrar cosecha', icon: 'agriculture', route: 'harvests', color: 'orange' },
  { title: 'Ver monitoreo', icon: 'sensors', route: 'telemetry', color: 'purple' }
]
const metrics = computed(() => [
  { title: 'Clima', value: latestTemperature.value ? `${latestTemperature.value.value} ${latestTemperature.value.unit}` : 'Sin dato', detail: latestTemperature.value ? `Última lectura · ${latestTemperature.value.date.replace('T', ' ')}` : 'No hay lecturas de temperatura', icon: 'wb_sunny', tint: 'amber', route: 'telemetry' },
  { title: 'Humedad del suelo', value: latestSoilMoisture.value ? `${latestSoilMoisture.value.value} ${latestSoilMoisture.value.unit}` : 'Sin dato', detail: latestSoilMoisture.value ? `Última lectura · ${latestSoilMoisture.value.date.replace('T', ' ')}` : 'No hay lecturas de humedad', icon: 'water_drop', tint: 'blue', route: 'telemetry' },
  { title: 'Cosecha de la semana', value: `${weeklyHarvestKilograms.value.toLocaleString('es-CO')} kg`, detail: `${weeklyHarvests.value.length} registros en los últimos 7 días`, icon: 'agriculture', tint: 'mint', route: 'harvests' },
  { title: 'Usuarios activos', value: activeUsers.value.length, detail: 'Cuentas activas asociadas a tus predios', icon: 'groups', tint: 'violet', route: 'users' }
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

function openMetric(metric) {
  if (canAccess(auth.currentUser, metric.route)) router.push({ name: metric.route })
}
</script>

<template>
  <q-page class="page-content dashboard-page">
    <div class="welcome-row">
      <div><div class="section-eyebrow">{{ todayLabel }}</div><h1>Buenos días, {{ auth.currentUser?.name?.split(' ')[0] }} <span>🌱</span></h1><p>Aquí tienes el resumen de la actividad en tus predios.</p></div>
      <q-btn color="primary" unelevated no-caps icon="add" label="Nuevo registro" :to="{ name: 'activities' }" />
    </div>

    <div class="metric-grid">
      <q-card v-for="metric in metrics" :key="metric.title" flat bordered class="metric-card" :class="{ 'metric-card-static': !canAccess(auth.currentUser, metric.route) }" :aria-disabled="!canAccess(auth.currentUser, metric.route)" @click="openMetric(metric)">
        <q-card-section>
          <div class="metric-top"><span>{{ metric.title }}</span><div class="metric-icon" :class="`tint-${metric.tint}`"><q-icon :name="metric.icon" /></div></div>
          <div class="metric-value">{{ metric.value }}</div><div class="metric-detail">{{ metric.detail }}</div>
        </q-card-section>
      </q-card>
    </div>
    <section class="field-overview">
      <div class="field-overview-heading">
        <div><div class="section-eyebrow">PREDIOS Y PARCELAS</div><h2>Mis lotes</h2><p>Consulta superficie y lecturas disponibles de tus áreas productivas.</p></div>
        <q-btn flat no-caps color="primary" icon="arrow_forward" label="Ver todos los lotes" :to="{ name: 'lots' }" />
      </div>
      <div v-if="featuredLots.length" class="field-overview-grid">
        <q-card v-for="lot in featuredLots" :key="lot.id" flat bordered class="field-overview-card">
          <div class="field-overview-photo"><img :src="lot.image || lotPlaceholder" :alt="`Imagen de ${lot.name}`" /><span class="field-overview-photo-label">Lote agrícola</span></div>
          <q-card-section class="field-overview-content">
            <div class="field-overview-title"><div><span>{{ lot.farmName }}</span><h3>{{ lot.name }}</h3></div><div class="field-overview-area"><strong>{{ lot.area }} ha</strong><q-badge :class="lot.status === 'Activo' ? 'status-active' : lot.status === 'Inactivo' ? 'status-inactive' : 'status-preparing'">{{ lot.status }}</q-badge></div></div>
            <p>{{ lot.cropName }}</p>
            <div class="lot-condition-grid">
              <div><q-icon name="water_drop" /><span>Humedad</span><strong>{{ lot.humidity }}</strong></div>
              <div><q-icon name="health_and_safety" /><span>Sanidad</span><strong>Sin registro</strong></div>
              <div><q-icon name="schedule" /><span>Tiempo al corte</span><strong>Sin registro</strong></div>
            </div>
            <q-btn flat no-caps color="primary" icon="visibility" label="Ver lote" :to="{ name: 'lots', query: { farm: lot.farmId } }" />
          </q-card-section>
        </q-card>
      </div>
      <div v-else class="field-overview-empty"><q-icon name="landscape" /><span>No hay lotes registrados para mostrar.</span><q-btn flat no-caps color="primary" icon="add" label="Crear lote" :to="{ name: 'lots' }" /></div>
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
            <q-item-section avatar><q-avatar :color="item.kind === 'Incidencia' ? 'orange-1' : 'green-1'" :text-color="item.kind === 'Incidencia' ? 'orange-9' : 'primary'"><q-icon :name="item.kind === 'Incidencia' ? 'warning_amber' : 'eco'" /></q-avatar></q-item-section>
            <q-item-section><q-item-label class="activity-title">{{ item.type }}</q-item-label><q-item-label caption>{{ item.description }} · {{ relatedName('cycles', item.cycleId) }}</q-item-label></q-item-section>
            <q-item-section side><span class="activity-date">{{ item.date }}</span><q-badge :color="item.status === 'Completada' ? 'green-1' : 'orange-1'" :text-color="item.status === 'Completada' ? 'green-9' : 'orange-9'">{{ item.status }}</q-badge></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="empty-state"><q-icon name="event_note" /><strong>Aún no hay actividad registrada</strong><span>Registra la primera labor para ver el seguimiento aquí.</span><q-btn flat no-caps color="primary" label="Registrar actividad" :to="{ name: 'activities' }" /></div>
      </q-card>
      <div class="dashboard-side">
        <q-card flat bordered class="panel-card">
          <q-card-section class="panel-heading"><div><h2>Alertas y avisos</h2><p>{{ notifications.length }} pendientes</p></div><q-icon name="notifications_active" color="primary" size="22px" /></q-card-section>
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
        <q-card-section class="panel-heading"><div><h2>Producción de la temporada</h2><p>Volumen acumulado a partir de cosechas registradas</p></div><q-icon name="trending_up" color="primary" size="24px" /></q-card-section>
        <q-card-section v-if="harvests.length" class="harvest-summary"><div class="harvest-total">{{ totalHarvest.toLocaleString('es-CO') }} <small>kg registrados</small></div><div v-if="weightedHarvests.length" class="harvest-bars" role="img" aria-label="Producción por cosecha; pasa el cursor o enfoca cada barra para ver el detalle"><div v-for="item in weightedHarvests.slice(0, 6)" :key="item.id" class="harvest-bar-wrap"><div class="harvest-bar" :style="{ height: `${Math.max(14, (harvestKilograms(item) / Math.max(...weightedHarvests.map(harvestKilograms))) * 100)}%` }" tabindex="0" role="img" :aria-label="`${harvestKilograms(item).toLocaleString('es-CO')} kg el ${item.date}`"><q-tooltip>{{ harvestKilograms(item).toLocaleString('es-CO') }} kg · {{ item.date }} · {{ relatedName('cycles', item.cycleId) }}</q-tooltip></div><small>{{ item.date.slice(5) }}</small></div></div><div v-else class="small-empty">Las cosechas registradas usan unidades que no se convierten a kg (cajas o unidades).</div></q-card-section>
        <div v-else class="empty-state dashboard-panel-empty"><q-icon name="agriculture" /><strong>Sin producción registrada</strong><span>Registra una cosecha para consultar el comportamiento de la producción.</span><q-btn flat no-caps color="primary" icon="add" label="Registrar cosecha" :to="{ name: 'harvests' }" /></div>
      </q-card>
      <q-card flat bordered class="panel-card nursery-card">
        <q-card-section class="panel-heading"><div><h2>Semilleros en seguimiento</h2><p>Estado actual de germinación y trasplante</p></div><q-btn flat round dense icon="arrow_forward" :to="{ name: 'nurseries' }" /></q-card-section>
        <q-list v-if="nurseries.length"><q-item v-for="item in nurseries.slice(0, 2)" :key="item.id"><q-item-section avatar><q-avatar color="green-1" text-color="primary" icon="spa" /></q-item-section><q-item-section><q-item-label>{{ item.name }}</q-item-label><q-item-label caption>{{ relatedName('crops', item.cropId) }} · {{ item.status }}</q-item-label><q-linear-progress :value="Number(item.germination || 0) / 100" color="primary" rounded class="q-mt-sm" /></q-item-section><q-item-section side>{{ item.germination }}%</q-item-section></q-item></q-list>
        <div v-else class="small-empty">No hay semilleros activos.</div>
      </q-card>
    </div>

    <div class="telemetry-strip"><div class="telemetry-title"><q-icon name="sensors" /><div><strong>Monitoreo del predio</strong><small>Lecturas locales de demostración · no son sensores reales</small></div></div><div v-if="telemetry.length" class="telemetry-reading" v-for="reading in telemetry.slice(0, 3)" :key="reading.id"><span>{{ reading.variable }}</span><strong>{{ reading.value }} {{ reading.unit }}</strong><q-tooltip>{{ reading.variable }} · {{ reading.value }} {{ reading.unit }} · {{ reading.date }}</q-tooltip></div><div v-else class="telemetry-reading telemetry-empty">No hay lecturas registradas</div><q-btn flat no-caps color="primary" :icon="telemetry.length ? undefined : 'add'" :label="telemetry.length ? 'Ver historial' : 'Registrar lectura'" :to="{ name: 'telemetry' }" /></div>
  </q-page>
</template>
