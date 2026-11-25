<script setup>
import StatusBadge from '@/components/StatusBadge.vue'

defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'analytics' },
  value: { type: [String, Number], default: 'Sin datos registrados' },
  unit: { type: String, default: '' },
  status: { type: String, default: '' },
  caption: { type: String, default: '' }
})
</script>

<template>
  <q-card flat bordered class="kpi-card">
    <q-card-section>
      <div class="kpi-card-heading">
        <h3>{{ title }}</h3>
        <q-avatar class="kpi-card-icon"><q-icon :name="icon" /></q-avatar>
      </div>
      <div class="kpi-card-value">
        <strong>{{ value }}</strong>
        <span v-if="unit">{{ unit }}</span>
      </div>
      <StatusBadge v-if="status" :status="status" />
      <p v-if="caption" class="kpi-card-caption">{{ caption }}</p>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.kpi-card {
  min-width: 0;
  border-color: var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.kpi-card .q-card__section {
  display: grid;
  gap: 10px;
  padding: 18px;
}

.kpi-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.kpi-card-heading h3 {
  margin: 0;
  color: var(--green-dark);
  font-size: 16px;
  font-weight: 600;
}

.kpi-card-icon {
  flex: 0 0 auto;
  color: var(--green-primary);
  background: var(--green-soft);
}

.kpi-card-value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--green-dark);
}

.kpi-card-value strong {
  font-size: 22px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.kpi-card-value span,
.kpi-card-caption {
  color: var(--green-muted);
  font-size: 13px;
}

.kpi-card-caption {
  margin: 0;
  line-height: 1.4;
}
</style>
