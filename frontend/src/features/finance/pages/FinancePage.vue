<template>
  <q-page class="q-pa-md">
    <div v-if="!isAdminProductor" class="q-pa-md text-center">
      <div class="text-h6 q-mt-md"><q-icon class="decorative-inline-icon" name="lock" />Acceso Restringido</div>
      <div>No tienes permisos para ver información financiera.</div>
    </div>

    <div v-else class="q-gutter-md">
      <q-card flat bordered class="finance-panel-card">
        <q-card-section>
          <div class="text-h6 text-weight-bold" style="color: var(--green-dark)">Margen de Contribución Neto por Ciclo</div>
          <div class="text-caption" style="color: var(--green-muted)">
            Consolidación gerencial exclusiva para Administrador Productor (ingresos por cosecha menos costos operativos e IoT).
          </div>
        </q-card-section>
        <q-card-section>
          <div class="finance-kpi-grid">
            <KpiCard
              title="Ingresos Totales"
              icon="trending_up"
              :value="formatCop(ingresosTotales)"
              unit="COP"
              status="Ingreso registrado"
              caption="Ventas consolidadas de cosecha comercializada"
            />
            <KpiCard
              title="Costo Mano de Obra"
              icon="engineering"
              :value="formatCop(costoManoObra)"
              unit="COP"
              status="Egreso operativo"
              caption="Jornales y labores agrícolas ejecutadas"
            />
            <KpiCard
              title="Costo Insumos Sanitarios"
              icon="science"
              :value="formatCop(costoInsumosSanitarios)"
              unit="COP"
              status="Egreso operativo"
              caption="Fertilizantes, correctivos y control fitosanitario"
            />
            <KpiCard
              title="Costo Hídrico y Energético"
              icon="bolt"
              :value="formatCop(costoHidricoEnergetico)"
              unit="COP"
              status="Egreso IoT"
              caption="Consumo estimado por activación de actuadores"
            />
            <KpiCard
              title="Margen Neto"
              icon="account_balance_wallet"
              :value="formatCop(margenNeto)"
              unit="COP"
              :status="margenNeto > 0 ? 'Rentabilidad positiva' : 'Alerta crítica de margen'"
              caption="Utilidad neta disponible tras cubrir costos directos"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import KpiCard from '@/components/KpiCard.vue';
import { useAuthStore } from '@/stores/auth';
import { fetchFinanceData } from '@/services/api';

const authStore = useAuthStore();

const isAdminProductor = computed(() => (authStore.currentUser?.role || authStore.user?.role)?.toUpperCase() === 'ADMIN_PRODUCTOR');

const ingresosTotales = ref(4850000);
const costoManoObra = ref(1320000);
const costoInsumosSanitarios = ref(640000);
const costoHidricoEnergetico = ref(215000);

const margenNeto = computed(() => {
  return ingresosTotales.value - (costoManoObra.value + costoInsumosSanitarios.value + costoHidricoEnergetico.value);
});

function formatCop(value) {
  return `$ ${Number(value || 0).toLocaleString('es-CO')}`;
}

const loadData = async () => {
  try {
    const data = await fetchFinanceData();
    if (data && typeof data.ingresosTotales === 'number') {
      ingresosTotales.value = data.ingresosTotales;
      costoManoObra.value = data.costoManoObra;
      costoInsumosSanitarios.value = data.costoInsumosSanitarios;
      costoHidricoEnergetico.value = data.costoHidricoEnergetico;
    }
  } catch {
    // Mantiene cifras financieras base del ciclo cuando no hay backend Express activo
  }
};

onMounted(async () => {
  if (isAdminProductor.value) {
    await loadData();
  }
});
</script>

<style scoped>
.finance-panel-card {
  border-color: var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.finance-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
  grid-auto-rows: 1fr;
  gap: 16px;
  align-items: stretch;
}
</style>
