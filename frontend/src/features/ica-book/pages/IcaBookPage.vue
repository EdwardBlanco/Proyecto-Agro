<template>
  <q-page class="q-pa-md">
    <div v-if="!isAuthorized" class="q-pa-md text-center">
      <div class="text-h6 q-mt-md"><q-icon class="decorative-inline-icon" name="lock" />Acceso Restringido</div>
      <div>No tienes permisos para ver la bitácora oficial ICA.</div>
    </div>

    <div v-else class="ica-report-container">
      <div class="row q-gutter-md q-mb-md">
        <div class="col">
          <q-card flat bordered class="q-pa-md">
            <div class="row items-center justify-between q-col-gutter-md">
              <div class="col-12 col-md-7">
                <div class="text-overline text-positive">TRAZABILIDAD NORMATIVA BPA - RESOLUCIÓN ICA</div>
                <div class="text-h6">Libro Oficial de Operaciones Agrícolas y Sanitarias (ICA)</div>
                <div class="text-subtitle2 text-grey-7 q-mb-sm">
                  Bitácora inalterable con encadenamiento criptográfico SHA-256 (RNF-06) · Generado: {{ auditTimestamp }}
                </div>
                <StatusBadge
                  :status="isChainValid ? 'green' : 'red'"
                  :label="isChainValid ? 'Cadena Íntegra SHA-256 (Verificada)' : 'Alerta de Alteración en Bitácora'"
                />
              </div>

              <div class="col-12 col-md-5 row justify-end q-gutter-sm no-print">
                <q-btn
                  outline
                  color="primary"
                  icon="download"
                  label="Exportar CSV ICA"
                  :disable="icaRecords.length === 0"
                  @click="exportOfficialIcaCsv"
                />
                <q-btn
                  unelevated
                  color="positive"
                  icon="print"
                  label="Acta Oficial PDF"
                  :disable="icaRecords.length === 0"
                  @click="printOfficialIcaReport"
                />
              </div>
            </div>
          </q-card>
        </div>
      </div>

      <q-card flat bordered>
        <q-table
          :rows="icaRecords"
          :columns="columns"
          row-key="hash_actual"
          v-model:pagination="pagination"
          class="q-mb-md"
        />
      </q-card>

      <div class="print-signatures q-mt-xl">
        <div class="row q-col-gutter-xl">
          <div class="col-6">
            <div class="signature-line"></div>
            <div class="text-weight-bold">Firma del Productor / Representante Legal</div>
            <div class="text-caption">Rol: ADMIN_PRODUCTOR · SENAagro Trazabilidad BPA</div>
          </div>
          <div class="col-6">
            <div class="signature-line"></div>
            <div class="text-weight-bold">Firma del Ingeniero / Técnico Agrónomo</div>
            <div class="text-caption">Rol: TECNICO_AGRONOMO · Tarjeta Profesional N° ________________</div>
          </div>
        </div>
      </div>
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
const pagination = ref({ page: 1, rowsPerPage: 15 });
const auditTimestamp = ref(new Date().toLocaleString('es-CO'));

const columns = [
  { name: 'tipo_evento', label: 'Tipo Evento', field: 'tipo_evento', align: 'left' },
  { name: 'referencia_tabla', label: 'Tabla Origen', field: 'referencia_tabla', align: 'left' },
  { name: 'resumen', label: 'Detalle Técnico BPA', field: 'resumen', align: 'left' },
  { name: 'hash_anterior', label: 'Hash Anterior (SHA-256)', field: 'hash_anterior', align: 'left' },
  { name: 'hash_actual', label: 'Hash Actual (SHA-256)', field: 'hash_actual', align: 'left' },
  { name: 'validacion', label: 'Integridad', field: 'estado_integridad', align: 'left', sortable: false }
];

function buildOfficialIcaCsv(records, chainOk) {
  const headers = [
    "Consecutivo",
    "Tipo_Evento_ICA",
    "Tabla_Origen",
    "Detalle_Tecnico_BPA",
    "Hash_Anterior_SHA256",
    "Hash_Actual_SHA256",
    "Estado_Integridad_RNF06"
  ];
  const escapeCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const rows = records.map((rec, idx) => [
    idx + 1,
    rec.tipo_evento,
    rec.referencia_tabla,
    rec.resumen,
    rec.hash_anterior,
    rec.hash_actual,
    rec.validacion === "green" ? "CADENA_INTEGRA" : "ALERTA_ALTERACION"
  ].map(escapeCell).join(";"));

  const metaLine = `# REPORTE OFICIAL ICA - SENAAGRO | ESTADO_CADENA: ${chainOk ? "INTEGRA" : "ALTERADA"} | FECHA: ${new Date().toISOString()}`;
  return "\uFEFF" + [metaLine, headers.join(";"), ...rows].join("\n");
}

const exportOfficialIcaCsv = () => {
  try {
    const csvContent = buildOfficialIcaCsv(icaRecords.value, isChainValid.value);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSlug = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `Libro_Oficial_ICA_SENAagro_${dateSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    $q.notify({
      color: "positive",
      icon: "check_circle",
      message: "Reporte Oficial ICA (CSV) descargado correctamente."
    });
  } catch {
    $q.notify({
      color: "negative",
      message: "No fue posible exportar el archivo CSV oficial del ICA."
    });
  }
};

const printOfficialIcaReport = () => {
  auditTimestamp.value = new Date().toLocaleString('es-CO');
  window.print();
};

const loadIcaBookData = async () => {
  try {
    const data = await fetchIcaBookData();
    icaRecords.value = data.records.map((record, index) => {
      const validacion = index > 0 && record.hash_anterior !== data.records[index - 1].hash_actual ? 'red' : 'green';
      return {
        ...record,
        validacion,
        estado_integridad: validacion === 'green' ? 'Íntegro (SHA-256)' : 'Alterado'
      };
    });
    isChainValid.value = !icaRecords.value.some((record) => record.validacion === 'red');
  } catch {
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
.print-signatures {
  display: none;
}

.signature-line {
  border-top: 1px solid #1f2937;
  margin-bottom: 8px;
  width: 85%;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-signatures {
    display: block;
    page-break-inside: avoid;
  }
}
</style>
