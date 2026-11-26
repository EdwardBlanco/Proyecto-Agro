<script setup>
import { useRouter } from 'vue-router'

defineProps({
  to: { type: [String, Object], default: null },
  fallback: { type: String, default: 'dashboard' }
})

const router = useRouter()

function goBack(to, fallback) {
  const previous = window.history.state?.back
  if (typeof previous === 'string' && previous.startsWith('/')) router.back()
  else if (to) router.push(to)
  else router.push({ name: fallback })
}
</script>

<template>
  <q-btn
    flat
    color="primary"
    icon="arrow_back"
    aria-label="Volver"
    class="back-link"
    @click="goBack(to, fallback)"
  />
</template>
