<script setup>
import { useRouter } from 'vue-router'

defineProps({
  label: { type: String, default: 'Volver' },
  to: { type: [String, Object], default: null },
  fallback: { type: String, default: 'dashboard' }
})

const router = useRouter()

function goBack(fallback) {
  const previous = window.history.state?.back
  if (typeof previous === 'string' && previous.startsWith('/')) router.back()
  else router.push({ name: fallback })
}
</script>

<template>
  <q-btn
    v-if="to"
    flat
    no-caps
    color="primary"
    icon="arrow_back"
    :label="label"
    class="back-link"
    :to="to"
  />
  <q-btn
    v-else
    flat
    no-caps
    color="primary"
    icon="arrow_back"
    :label="label"
    class="back-link"
    @click="goBack(fallback)"
  />
</template>
