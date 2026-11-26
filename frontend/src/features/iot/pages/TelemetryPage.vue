<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <q-card flat bordered class="telemetry-filter-card">
        <q-card-section class="row items-center justify-between q-col-gutter-md">
          <div class="col-12 col-md-6">
            <div class="text-h6 text-weight-bold" style="color: var(--green-dark)">Monitoreo Agrotrónico en Tiempo Real</div>
            <div class="text-caption" style="color: var(--green-muted)">
              Supervisión automática de sensores de campo y actuadores IoT por línea productiva.
            </div>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="selectedUnidad"
              :options="unidadesProductivas"
              label="Unidad Productiva"
              outlined
              dense
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="selectedCiclo"
              :options="ciclosProductivos"
              label="Ciclo Productivo"
              outlined
              dense
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Hortalizas / Pimentón -->
      <q-card flat bordered class="telemetry-sector-card">
        <q-card-section class="row items-center justify-between q-pb-xs">
          <div>
            <div class="text-subtitle1 text-weight-bold" style="color: var(--green-dark)">Hortalizas / Pimentón · Riego Automatizado</div>
            <div class="text-caption" style="color: var(--green-muted)">Regla IoT: si la humedad del suelo baja del 40 %, se activa automáticamente la electroválvula de riego.</div>
          </div>
          <StatusBadge :status="electrovalvulaRiegoHortalizas ? 'Electroválvula activa (Regando)' : 'Electroválvula en espera'" />
        </q-card-section>
        <q-card-section>
          <div class="telemetry-kpi-grid">
            <KpiCard
              title="Humedad de Suelo"
              icon="water_drop"
              :value="humedadSueloHortalizas"
              unit="%"
              :status="humedadSueloHortalizas < 40 ? 'Alerta crítica (< 40%)' : 'Nivel óptimo'"
              caption="Sensor capacitivo radicular · Umbral mínimo: 40 %"
            />
            <KpiCard
              title="Estado Electroválvula"
              icon="valve"
              :value="electrovalvulaRiegoHortalizas ? 'ABIERTA' : 'CERRADA'"
              :status="electrovalvulaRiegoHortalizas ? 'En curso' : 'Disponible'"
              caption="Control automático de lámina de riego por goteo"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Hongos / Orellanas -->
      <q-card flat bordered class="telemetry-sector-card">
        <q-card-section class="row items-center justify-between q-pb-xs">
          <div>
            <div class="text-subtitle1 text-weight-bold" style="color: var(--green-dark)">Hongos / Orellanas · Control Microclimático</div>
            <div class="text-caption" style="color: var(--green-muted)">Regla IoT: mantiene temperatura ≤ 25 °C y humedad relativa ≥ 60 % mediante nebulización de sustrato.</div>
          </div>
          <StatusBadge :status="nebulizadorSustratoHongos ? 'Nebulizador activo' : 'Microclima estable'" />
        </q-card-section>
        <q-card-section>
          <div class="telemetry-kpi-grid">
            <KpiCard
              title="Temperatura del Sustrato"
              icon="thermostat"
              :value="temperaturaHongos"
              unit="°C"
              :status="temperaturaHongos > 25 ? 'Alerta alta (> 25°C)' : 'Nivel óptimo'"
              caption="Rango ideal de fructificación: 18 °C – 25 °C"
            />
            <KpiCard
              title="Humedad Relativa"
              icon="cloud"
              :value="humedadRelativaHongos"
              unit="%"
              :status="humedadRelativaHongos < 60 ? 'Alerta baja (< 60%)' : 'Nivel óptimo'"
              caption="Umbral mínimo ambiental: 60 % HR"
            />
            <KpiCard
              title="Nebulizador de Sustrato"
              icon="air"
              :value="nebulizadorSustratoHongos ? 'ACTIVO' : 'EN ESPERA'"
              :status="nebulizadorSustratoHongos ? 'En curso' : 'Disponible'"
              caption="Aspersión fina automatizada en módulo de cultivo"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Apicultura -->
      <q-card flat bordered class="telemetry-sector-card">
        <q-card-section class="row items-center justify-between q-pb-xs">
          <div>
            <div class="text-subtitle1 text-weight-bold" style="color: var(--green-dark)">Apicultura · Monitoreo Acústico de Colmenas</div>
            <div class="text-caption" style="color: var(--green-muted)">Regla IoT: frecuencias superiores a 200 Hz alertan estrés térmico o riesgo temprano de enjambrazón/abandono.</div>
          </div>
          <StatusBadge :status="frecuenciaAcusticaApicultura > 200 ? 'Alerta acústica activa' : 'Colmena estable'" />
        </q-card-section>
        <q-card-section>
          <div class="telemetry-kpi-grid">
            <KpiCard
              title="Frecuencia Acústica"
              icon="graphic_eq"
              :value="frecuenciaAcusticaApicultura"
              unit="Hz"
              :status="frecuenciaAcusticaApicultura > 200 ? 'Alerta crítica (> 200 Hz)' : 'Nivel óptimo'"
              caption="Sensor piezoeléctrico interno · Umbral alerta: 200 Hz"
            />
            <KpiCard
              title="Diagnóstico de Colmena"
              icon="hive"
              :value="frecuenciaAcusticaApicultura > 200 ? 'REVISIÓN REQUERIDA' : 'OPERACIÓN NORMAL'"
              :status="frecuenciaAcusticaApicultura > 200 ? 'Alerta alta' : 'Activo'"
              caption="Prevención temprana de evasión o pérdida de reina"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import KpiCard from '@/components/KpiCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { fetchTelemetryData } from '@/services/api';

const unidadesProductivas = ref([
  { label: 'El Robledal · San Gil', value: 1 },
  { label: 'La Esperanza · Barichara', value: 2 }
]);
const ciclosProductivos = ref([
  { label: 'Ciclo Pimentón / Orellanas 2026-B', value: 1 },
  { label: 'Ciclo Apiario Norte 2026-B', value: 2 }
]);

const selectedUnidad = ref(unidadesProductivas.value[0]);
const selectedCiclo = ref(ciclosProductivos.value[0]);

// Lecturas iniciales realistas (se actualizan desde API/Supabase si está disponible)
const humedadSueloHortalizas = ref(37.5);
const electrovalvulaRiegoHortalizas = ref(true);
const temperaturaHongos = ref(21.8);
const humedadRelativaHongos = ref(84);
const nebulizadorSustratoHongos = ref(false);
const frecuenciaAcusticaApicultura = ref(215);

const loadData = async () => {
  try {
    const data = await fetchTelemetryData(selectedUnidad.value?.value, selectedCiclo.value?.value);
    if (data && typeof data.humedadSueloHortalizas === 'number') {
      humedadSueloHortalizas.value = data.humedadSueloHortalizas;
      electrovalvulaRiegoHortalizas.value = Boolean(data.electrovalvulaRiegoHortalizas);
      temperaturaHongos.value = data.temperaturaHongos;
      humedadRelativaHongos.value = data.humedadRelativaHongos;
      nebulizadorSustratoHongos.value = Boolean(data.nebulizadorSustratoHongos);
      frecuenciaAcusticaApicultura.value = data.frecuenciaAcusticaApicultura;
    }
  } catch {
    // Mantiene lecturas de demostración offline-first sin romper la vista
    if (selectedCiclo.value?.value === 2) {
      humedadSueloHortalizas.value = 54.0;
      electrovalvulaRiegoHortalizas.value = false;
      temperaturaHongos.value = 22.4;
      humedadRelativaHongos.value = 78;
      nebulizadorSustratoHongos.value = false;
      frecuenciaAcusticaApicultura.value = 176;
    } else {
      humedadSueloHortalizas.value = 37.5;
      electrovalvulaRiegoHortalizas.value = true;
      temperaturaHongos.value = 21.8;
      humedadRelativaHongos.value = 84;
      nebulizadorSustratoHongos.value = false;
      frecuenciaAcusticaApicultura.value = 215;
    }
  }
};

onMounted(async () => {
  await loadData();
});

watch([selectedUnidad, selectedCiclo], async () => {
  await loadData();
});
</script>

<style scoped>
.telemetry-filter-card,
.telemetry-sector-card {
  border-color: var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.telemetry-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  grid-auto-rows: 1fr;
  gap: 16px;
  align-items: stretch;
}
</style>
