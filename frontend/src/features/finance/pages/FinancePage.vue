<template>
  <q-page class="q-pa-md">
    <div v-if="!isAdminProductor" class="q-pa-md text-center">
      <q-icon name="lock" size="xl" color="negative" />
      <div class="text-h6 q-mt-md">Acceso Restringido</div>
      <div>No tienes permisos para ver información financiera.</div>
    </div>

    <div v-else class="q-gutter-md">
      <q-card>
        <q-card-section>
          <div class="text-h6">Margen de Contribución Neto</div>
        </q-card-section>
        <q-card-section>
          <div class="row q-gutter-md">
            <KpiCard
              title="Ingresos Totales"
              :value="ingresosTotales"
              unit="COP"
              :status="margenNeto > 0 ? 'green' : 'red'"
            />
            <KpiCard
              title="Costo Mano de Obra"
              :value="costoManoObra"
              unit="COP"
              status="red"
            />
            <KpiCard
              title="Costo Insumos Sanitarios"
              :value="costoInsumosSanitarios"
              unit="COP"
              status="red"
            />
            <KpiCard
              title="Costo Hídrico y Energético"
              :value="costoHidricoEnergetico"
              unit="COP"
              status="red"
            />
            <KpiCard
              title="Margen Neto"
              :value="margenNeto"
              unit="COP"
              :status="margenNeto > 0 ? 'green' : 'red'"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import KpiCard from '@/components/KpiCard.vue';
import { useAuthStore } from '@/stores/auth';
import { fetchFinanceData } from '@/services/api';

const $q = useQuasar();
const authStore = useAuthStore();

const isAdminProductor = computed(() => (authStore.currentUser?.role || authStore.user?.role) ?.toUpperCase() === 'ADMIN_PRODUCTOR');

const ingresosTotales = ref(0);
const costoManoObra = ref(0);
const costoInsumosSanitarios = ref(0);
const costoHidricoEnergetico = ref(0);

const margenNeto = computed(() => {
  return ingresosTotales.value - (costoManoObra.value + costoInsumosSanitarios.value + costoHidricoEnergetico.value);
});

const loadData = async () => {
  try {
    const data = await fetchFinanceData();
    ingresosTotales.value = data.ingresosTotales;
    costoManoObra.value = data.costoManoObra;
    costoInsumosSanitarios.value = data.costoInsumosSanitarios;
    costoHidricoEnergetico.value = data.costoHidricoEnergetico;
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: 'Error al cargar datos financieros'
    });
  }
};

onMounted(async () => {
  if (isAdminProductor.value) {
    await loadData();
  }
});
</script>

<style scoped>

</style>
