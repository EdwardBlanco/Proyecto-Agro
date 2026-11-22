<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <q-card>
        <q-card-section>
          <div class="row q-gutter-md">
            <q-select
              v-model="selectedUnidad"
              :options="unidadesProductivas"
              label="Unidad Productiva"
              class="col"
            />
            <q-select
              v-model="selectedCiclo"
              :options="ciclosProductivos"
              label="Ciclo Productivo"
              class="col"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Hortalizas / Pimentón -->
      <q-card>
        <q-card-section>
          <div class="text-h6">Hortalizas / Pimentón</div>
        </q-card-section>
        <q-card-section>
          <div class="row q-gutter-md">
            <KpiCard
              title="Humedad de Suelo"
              :value="humedadSueloHortalizas"
              unit="%"
              :status="humedadSueloHortalizas < 40 ? 'red' : 'green'"
            />
            <StatusBadge
              :status="electrovalvulaRiegoHortalizas ? 'red' : 'green'"
              :label="electrovalvulaRiegoHortalizas ? 'Activada' : 'Desactivada'"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Hongos / Orellanas -->
      <q-card>
        <q-card-section>
          <div class="text-h6">Hongos / Orellanas</div>
        </q-card-section>
        <q-card-section>
          <div class="row q-gutter-md">
            <KpiCard
              title="Temperatura"
              :value="temperaturaHongos"
              unit="°C"
              :status="temperaturaHongos > 25 ? 'red' : 'green'"
            />
            <KpiCard
              title="Humedad Relativa"
              :value="humedadRelativaHongos"
              unit="%"
              :status="humedadRelativaHongos < 60 ? 'red' : 'green'"
            />
            <StatusBadge
              :status="nebulizadorSustratoHongos ? 'blue' : 'green'"
              :label="nebulizadorSustratoHongos ? 'Activado' : 'Desactivado'"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Apicultura -->
      <q-card>
        <q-card-section>
          <div class="text-h6">Apicultura</div>
        </q-card-section>
        <q-card-section>
          <div class="row q-gutter-md">
            <KpiCard
              title="Frecuencia Acústica"
              :value="frecuenciaAcusticaApicultura"
              unit="Hz"
              :status="frecuenciaAcusticaApicultura > 200 ? 'red' : 'green'"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import KpiCard from '@/components/KpiCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { fetchTelemetryData } from '@/services/api';

const $q = useQuasar();

const selectedUnidad = ref(null);
const selectedCiclo = ref(null);
const unidadesProductivas = ref([]);
const ciclosProductivos = ref([]);

// Hortalizas / Pimentón
const humedadSueloHortalizas = ref(0);
const electrovalvulaRiegoHortalizas = ref(false);

// Hongos / Orellanas
const temperaturaHongos = ref(0);
const humedadRelativaHongos = ref(0);
const nebulizadorSustratoHongos = ref(false);

// Apicultura
const frecuenciaAcusticaApicultura = ref(0);

const loadData = async () => {
  try {
    const data = await fetchTelemetryData(selectedUnidad.value?.id, selectedCiclo.value?.id);
    // Actualizar datos según la respuesta de la API
    humedadSueloHortalizas.value = data.humedadSueloHortalizas;
    electrovalvulaRiegoHortalizas.value = data.electrovalvulaRiegoHortalizas;
    temperaturaHongos.value = data.temperaturaHongos;
    humedadRelativaHongos.value = data.humedadRelativaHongos;
    nebulizadorSustratoHongos.value = data.nebulizadorSustratoHongos;
    frecuenciaAcusticaApicultura.value = data.frecuenciaAcusticaApicultura;
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: 'Error al cargar datos de telemetría'
    });
  }
};

onMounted(async () => {
  // Cargar unidades productivas y ciclos productivos
  // Esto debería venir de la API también
  unidadesProductivas.value = [
    { label: 'Unidad 1', value: 1 },
    { label: 'Unidad 2', value: 2 }
  ];
  ciclosProductivos.value = [
    { label: 'Ciclo 1', value: 1 },
    { label: 'Ciclo 2', value: 2 }
  ];

  // Cargar datos iniciales
  if (selectedUnidad.value && selectedCiclo.value) {
    await loadData();
  }
});

watch([selectedUnidad, selectedCiclo], async ([newUnidad, newCiclo]) => {
  if (newUnidad && newCiclo) {
    await loadData();
  }
});
</script>

<style scoped>

</style>
