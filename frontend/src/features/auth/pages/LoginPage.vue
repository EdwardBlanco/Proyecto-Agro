<script setup>
/**
 * Pantalla de inicio de sesión (/login), con autenticación demo o cuentas locales.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const $q = useQuasar()
const email = ref('')
const password = ref('')
const remember = ref(true)
const showPassword = ref(false)
const busy = ref(false)

/**
 * Valida las credenciales locales o demo y redirige al panel principal.
 */
async function submit() {
  if (!email.value.trim() || !password.value) {
    $q.notify({ type: 'negative', message: 'Ingresa tu usuario y contraseña.' })
    return
  }
  busy.value = true
  try {
    await auth.login(email.value, password.value, remember.value)
    await router.push('/')
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || 'No fue posible iniciar sesión.' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-form-side">
        <div class="login-form-wrap">
          <div class="login-card-brand">
            <img src="/Logo_SENAgro.png" alt="SENAgro" class="login-logo" />
          </div>
          <p class="login-institutional-heading">Plataforma para la gestión de predios, cultivos y actividades del SENA.</p>
          <h2>Bienvenido de nuevo</h2>

          <q-form class="login-form" novalidate @submit.prevent="submit">
            <label for="email">Correo electrónico o usuario</label>
            <q-input id="email" v-model="email" outlined dense maxlength="254" placeholder="Ingresa tu correo o usuario" autocomplete="username" :rules="[value => Boolean(value?.trim()) || 'Este campo es obligatorio']">
              <template #prepend><q-icon name="person_outline" /></template>
            </q-input>
            <label for="password">Contraseña</label>
            <q-input id="password" v-model="password" outlined dense maxlength="60" placeholder="Ingresa tu contraseña" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" :rules="[value => Boolean(value) || 'Este campo es obligatorio']">
              <template #prepend><q-icon name="lock_outline" /></template>
              <template #append><q-btn flat round dense no-ripple type="button" class="password-toggle" :icon="showPassword ? 'visibility_off' : 'visibility'" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword" /></template>
            </q-input>
            <div class="login-options">
              <q-checkbox v-model="remember" dense label="Recordarme" />
            </div>
            <q-btn type="submit" color="primary" unelevated no-caps class="full-width login-submit" :loading="busy" label="Iniciar sesión">
              <q-icon name="arrow_forward" class="q-ml-sm" />
            </q-btn>
          </q-form>

          <div class="private-note"><q-icon name="shield" /><span><strong>Sistema privado institucional.</strong> Acceso restringido a personal autorizado.</span></div>
        </div>
      </div>
    </section>
  </main>
</template>
