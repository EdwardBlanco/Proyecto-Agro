<script setup>
/**
 * Vista de detalle de un ciclo productivo (/cycles/:id).
 * Consolida predio, lote, cultivo, labores/incidencias, cosechas acumuladas y semilleros vinculados.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecord, getRecords } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import { canWrite } from '@/services/permissions'
import { harvestKilograms } from '@/services/production'
import BackButton from '@/components/BackButton.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Verifica existencia del ciclo y restringe su visibilidad a predios asignados si el usuario es Operario
const cycle = computed(() => {
  const found = getRecord('cycles', route.params.id)
  if (!found || ['SuperAdmin', 'Admin'].includes(auth.currentUser?.role)) return found
  return auth.currentUser?.farms?.includes(found.farmId) ? found : null
})
const crop = computed(() => getRecord('crops', cycle.value?.cropId))
const farm = computed(() => getRecord('farms', cycle.value?.farmId))
const lot = computed(() => getRecord('lots', cycle.value?.lotId))
const activities = computed(() => getRecords('activities').filter((item) => item.cycleId === cycle.value?.id))
const harvests = computed(() => getRecords('harvests').filter((item) => item.cycleId === cycle.value?.id))
const nurseries = computed(() => getRecords('nurseries').filter((item) => item.cycleId === cycle.value?.id))
const laborCount = computed(() => activities.value.filter((item) => item.kind === 'Labor').length)
const incidenceCount = computed(() => activities.value.filter((item) => item.kind === 'Incidencia').length)
const pendingLaborCount = computed(() => activities.value.filter((item) => item.kind === 'Labor' && item.status === 'Pendiente').length)
const hasInputLink = computed(() => Array.isArray(crop.value?.inputs))
const cycleInputs = computed(() => hasInputLink.value
  ? crop.value.inputs.map((id) => getRecord('inputs', id)).filter(Boolean)
  : [])
const canAddRecords = computed(() => canWrite(auth.currentUser, 'activities'))
const total = computed(() => harvests.value.reduce((sum, item) => sum + harvestKilograms(item), 0))

/**
 * Formatea fechas ISO (YYYY-MM-DD) a formato legible en español colombiano.
 */
function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
    : value || 'Sin datos registrados'
}
</script>

<template>
  <q-page v-if="cycle" class="page-content cycle-detail-page">
    <BackButton :to="{ name: 'cycles' }" />
    <div class="cycle-detail-status"><StatusBadge :status="cycle.status" /></div>
    <div class="cycle-metric-grid"><q-card flat bordered><small>Área sembrada</small><strong>{{ cycle.area !== null && cycle.area !== undefined && cycle.area !== '' ? `${Number(cycle.area).toLocaleString('es-CO', { maximumFractionDigits: 2 })} HA` : 'Sin datos registrados' }}</strong><small>HA = Hectáreas</small></q-card><q-card flat bordered><small>Meta de producción</small><strong>{{ cycle.target !== null && cycle.target !== undefined && cycle.target !== '' ? `${Number(cycle.target).toLocaleString('es-CO')} kg` : 'Sin datos registrados' }}</strong></q-card><q-card flat bordered><small>Cosecha acumulada</small><strong>{{ total.toLocaleString('es-CO') }} kg</strong></q-card><q-card flat bordered><small>Fecha de inicio</small><strong>{{ formatDate(cycle.startDate) }}</strong></q-card></div>
    <div class="cycle-related-summary">
      <div><span>Labores asociadas</span><strong>{{ laborCount }}</strong><small>Registros de labor vinculados a este ciclo.</small></div>
      <div><span>Incidencias asociadas</span><strong>{{ incidenceCount }}</strong><small>Registros de incidencia vinculados a este ciclo.</small></div>
      <div v-if="hasInputLink"><span>Insumos del cultivo</span><strong>{{ cycleInputs.length }}</strong><small>{{ cycleInputs.map((item) => item.name).join(', ') || 'Sin datos registrados' }}</small></div>
      <div><span>Cosechas asociadas</span><strong>{{ harvests.length }}</strong><small>Producción total registrada: {{ total.toLocaleString('es-CO') }} kg.</small></div>
    </div>
    <q-banner v-if="pendingLaborCount" class="cycle-pending-alert">
      <template #avatar><q-icon name="schedule" /></template>
      Hay {{ pendingLaborCount }} {{ pendingLaborCount === 1 ? 'labor pendiente' : 'labores pendientes' }} en este ciclo.
    </q-banner>
    <div class="dashboard-columns cycle-panels">
      <q-card flat bordered class="panel-card">
        <q-card-section class="panel-heading">
          <div><h2>Historial de labores e incidencias</h2><p>Registros asociados a este ciclo</p></div>
          <q-btn v-if="canAddRecords" color="primary" unelevated no-caps label="Registrar actividad" :to="{ name: 'activities', query: { cycle: cycle.id } }" />
        </q-card-section>
        <q-separator />
        <q-list v-if="activities.length">
          <q-item v-for="item in activities" :key="item.id" class="activity-row">
            <q-item-section><q-item-label><q-icon class="decorative-inline-icon" :name="item.kind === 'Labor' ? 'task_alt' : 'warning_amber'" />{{ item.type }} · {{ item.kind }}</q-item-label><q-item-label caption>{{ item.description || 'Sin datos registrados' }} · {{ item.responsible || 'Sin datos registrados' }}</q-item-label></q-item-section>
            <q-item-section side><div class="cycle-activity-side"><span>{{ formatDate(item.date) }}</span><StatusBadge v-if="item.status" :status="item.status" /></div></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="small-empty">Este ciclo aún no tiene labores o incidencias.</div>
      </q-card>
      <q-card flat bordered class="panel-card">
        <q-card-section class="panel-heading">
          <div><h2>Producción y semilleros</h2><p>Registros vinculados al ciclo</p></div>
          <q-btn v-if="canAddRecords" flat no-caps color="primary" label="Nuevo semillero" :to="{ name: 'nurseries', query: { cycle: cycle.id } }" />
        </q-card-section>
        <q-list v-if="harvests.length">
          <q-item v-for="item in harvests" :key="item.id">
            <q-item-section><q-item-label><q-icon class="decorative-inline-icon" name="agriculture" />{{ Number(item.quantity).toLocaleString('es-CO') }} {{ item.unit }} · {{ item.quality }}</q-item-label><q-item-label caption>{{ formatDate(item.date) }}</q-item-label></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="small-empty">No se han registrado cosechas.</div>
        <q-card-actions v-if="canAddRecords" align="right"><q-btn flat no-caps color="primary" label="Registrar cosecha" :to="{ name: 'harvests', query: { cycle: cycle.id } }" /></q-card-actions>
        <q-separator />
        <q-list v-if="nurseries.length">
          <q-item v-for="item in nurseries" :key="item.id">
            <q-item-section><q-item-label><q-icon class="decorative-inline-icon" name="spa" />{{ item.name }}</q-item-label><q-item-label caption>{{ item.germination }} % de germinación · {{ item.status }}</q-item-label></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="small-empty">No hay semilleros vinculados.</div>
      </q-card>
    </div>
  </q-page>
  <q-page v-else class="page-content"><BackButton :to="{ name: 'cycles' }" /><q-card flat bordered class="not-found"><h2><q-icon name="search_off" />No encontramos este ciclo</h2></q-card></q-page>
</template>
