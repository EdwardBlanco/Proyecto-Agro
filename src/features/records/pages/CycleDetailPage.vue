<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecord, getRecords } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import { canWrite } from '@/services/permissions'
import { harvestKilograms } from '@/services/production'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cycle = computed(() => {
  const found = getRecord('cycles', route.params.id)
  if (!found || ['Administrador', 'Supervisor'].includes(auth.currentUser?.role)) return found
  return auth.currentUser?.farms?.includes(found.farmId) ? found : null
})
const crop = computed(() => getRecord('crops', cycle.value?.cropId))
const farm = computed(() => getRecord('farms', cycle.value?.farmId))
const lot = computed(() => getRecord('lots', cycle.value?.lotId))
const activities = computed(() => getRecords('activities').filter((item) => item.cycleId === cycle.value?.id))
const harvests = computed(() => getRecords('harvests').filter((item) => item.cycleId === cycle.value?.id))
const nurseries = computed(() => getRecords('nurseries').filter((item) => item.cycleId === cycle.value?.id))
const canAddRecords = computed(() => canWrite(auth.currentUser, 'activities'))
const total = computed(() => harvests.value.reduce((sum, item) => sum + harvestKilograms(item), 0))
</script>

<template>
  <q-page v-if="cycle" class="page-content cycle-detail-page">
    <q-btn flat no-caps color="primary" icon="arrow_back" label="Volver a ciclos" class="back-link" :to="{ name: 'cycles' }" />
    <div class="page-intro-row cycle-title-row"><div><div class="section-eyebrow">SEGUIMIENTO PRODUCTIVO</div><h1>{{ cycle.name }}</h1><p>{{ crop?.name }} · {{ farm?.name }} / {{ lot?.name }}</p></div><q-badge color="green-1" text-color="green-9" class="status-badge">{{ cycle.status }}</q-badge></div>
    <div class="cycle-metric-grid"><q-card flat bordered><small>Área sembrada</small><strong>{{ cycle.area }} ha</strong></q-card><q-card flat bordered><small>Meta de producción</small><strong>{{ Number(cycle.target || 0).toLocaleString('es-CO') }} kg</strong></q-card><q-card flat bordered><small>Cosecha acumulada</small><strong>{{ total.toLocaleString('es-CO') }} kg</strong></q-card><q-card flat bordered><small>Fecha de inicio</small><strong>{{ cycle.startDate }}</strong></q-card></div>
    <div class="dashboard-columns cycle-panels">
      <q-card flat bordered class="panel-card">
        <q-card-section class="panel-heading">
          <div><h2>Historial de labores e incidencias</h2><p>Registros asociados a este ciclo</p></div>
          <q-btn v-if="canAddRecords" color="primary" unelevated no-caps label="Registrar actividad" :to="{ name: 'activities', query: { cycle: cycle.id } }" />
        </q-card-section>
        <q-separator />
        <q-list v-if="activities.length">
          <q-item v-for="item in activities" :key="item.id" class="activity-row">
            <q-item-section avatar><q-avatar color="green-1" text-color="primary" :icon="item.kind === 'Labor' ? 'eco' : 'warning_amber'" /></q-item-section>
            <q-item-section><q-item-label>{{ item.type }} · {{ item.kind }}</q-item-label><q-item-label caption>{{ item.description }} · {{ item.responsible }}</q-item-label></q-item-section>
            <q-item-section side>{{ item.date }}</q-item-section>
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
            <q-item-section avatar><q-icon name="agriculture" color="primary" /></q-item-section>
            <q-item-section><q-item-label>{{ Number(item.quantity).toLocaleString('es-CO') }} {{ item.unit }} · {{ item.quality }}</q-item-label><q-item-label caption>{{ item.date }}</q-item-label></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="small-empty">No se han registrado cosechas.</div>
        <q-card-actions v-if="canAddRecords" align="right"><q-btn flat no-caps color="primary" label="Registrar cosecha" :to="{ name: 'harvests', query: { cycle: cycle.id } }" /></q-card-actions>
        <q-separator />
        <q-list v-if="nurseries.length">
          <q-item v-for="item in nurseries" :key="item.id">
            <q-item-section avatar><q-icon name="spa" color="positive" /></q-item-section>
            <q-item-section><q-item-label>{{ item.name }}</q-item-label><q-item-label caption>{{ item.germination }} % de germinación · {{ item.status }}</q-item-label></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="small-empty">No hay semilleros vinculados.</div>
      </q-card>
    </div>
  </q-page>
  <q-page v-else class="page-content"><q-card flat bordered class="not-found"><q-icon name="search_off" /><h2>No encontramos este ciclo</h2><q-btn color="primary" unelevated no-caps label="Volver a ciclos" @click="router.push({ name: 'cycles' })" /></q-card></q-page>
</template>
