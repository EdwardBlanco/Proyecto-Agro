<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: [String, Number], default: '' }
})

const tone = computed(() => {
  const value = String(props.status ?? '').toLocaleLowerCase('es-CO')
  if (!value) return 'neutral'
  if (value === 'superadmin') return 'role-superadmin'
  if (value === 'admin') return 'role-admin'
  if (value === 'operario') return 'role-operario'
  if (/(inactivo|cancelad|suspendid|baja)/.test(value)) return 'neutral'
  if (/(agotad|cr[ií]tic|error|vencid|alta)/.test(value)) return 'critical'
  if (/(preparado|activo|curso|complet|finaliz|listo|sembrad|trasplantad|resuelt|entregad|con datos|con lectura|registrad|actualizad|disponible)/.test(value)) return 'positive'
  if (/(pendient|prepar|seguim|germin|stock bajo|media)/.test(value)) return 'warning'
  return 'neutral'
})
</script>

<template>
  <q-badge class="status-badge" :class="`status-badge--${tone}`">
    {{ status || 'Sin datos registrados' }}
  </q-badge>
</template>

<style scoped>
.status-badge {
  justify-self: start;
  max-width: 100%;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  white-space: normal;
}

.status-badge--positive {
  background: var(--green-soft);
  color: var(--green-primary);
}

.status-badge--warning {
  background: color-mix(in srgb, #f2bf4a 20%, white);
  color: #805500;
}

.status-badge--critical {
  background: color-mix(in srgb, #d9534f 14%, white);
  color: #a12622;
}

.status-badge--neutral {
  background: #f0f1f2;
  color: #525960;
}

.status-badge--role-superadmin {
  background: var(--green-dark);
  color: #fff;
}

.status-badge--role-admin {
  background: var(--green-soft);
  color: var(--green-primary);
}

.status-badge--role-operario {
  background: #f0f1f2;
  color: #525960;
}
</style>
