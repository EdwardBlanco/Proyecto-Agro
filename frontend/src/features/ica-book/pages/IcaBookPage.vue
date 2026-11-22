<template>
  <q-page class="q-pa-md">
    <div v-if="!isAuthorized" class="q-pa-md text-center">
      <q-icon name="lock" size="xl" color="negative" />
      <div class="text-h6 q-mt-md">Acceso Restringido</div>
      <div>No tienes permisos para ver la bitácora ICA.</div>
    </div>

    <div v-else>
      <div class="row q-gutter-md">
        <div class="col">
          <q-card flat class="q-pa-md">
            <div class="text-h6">Bitácora Oficial ICA</div>
            <div class="text-subtitle2">Cadena de Bloqueo SHA-256</div>
            <StatusBadge
              :status="isChainValid ? 'green' : 'red'"
              label="Cadena Íntegra SHA-256"
            />
          </q-card>
        </div>
      </div>

      <q-card flat>
        <q-table
          :rows="icaRecords"
          :columns="columns"
          row-key="id"
          :filter="{}"
          :pagination="{ page, rowsPerPage }"
          class="q-mb-md"
        />
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';
import StatusBadge from '@/components/StatusBadge.vue';
import { fetchIcaBookData } from '@/services/api';

const $q = useQuasar();
const authStore = useAuthStore();

const isAuthorized = computed(() => {
  const role = (authStore.currentUser?.role || authStore.user?.role || '').toUpperCase();
  return ['ADMIN_PRODUCTOR', 'TECNICO_AGRONOMO'].includes(role);
});

const icaRecords = ref([]);
const isChainValid = ref(true);

const columns = [
  { name: 'tipo_evento', label: 'Tipo Evento', field: 'tipo_evento', align: 'left' },
  { name: 'referencia_tabla', label: 'Referencia Tabla', field: 'referencia_tabla', align: 'left' },
  { name: 'resumen', label: 'Resumen', field: 'resumen', align: 'left' },
  { name: 'hash_anterior', label: 'Hash Anterior', field: 'hash_anterior', align: 'left' },
  { name: 'hash_actual', label: 'Hash Actual', field: 'hash_actual', align: 'left' },
  { name: 'validacion', label: 'Validación', field: 'validacion', align: 'left', sortable: false }
];

const loadIcaBookData = async () => {
  try {
    const data = await fetchIcaBookData();
    icaRecords.value = data.records.map((record, index) => {
      const validacion = index > 0 && record.hash_anterior !== data.records[index - 1].hash_actual ? 'red' : 'green';
      return { ...record, validacion };
    });
    isChainValid.value = !icaRecords.value.some(record => record.validacion === 'red');
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: 'Error al cargar datos de la bitácora ICA'
    });
  }
};

onMounted(async () => {
  if (isAuthorized.value) {
    await loadIcaBookData();
  }
});
</script>

<style scoped>

</style>