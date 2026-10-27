<script setup>
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
const recovering = ref(false)
const busy = ref(false)

async function submit() {
  if (!email.value.trim() || !password.value) {
    $q.notify({ type: 'negative', message: 'Ingresa tu usuario y contraseña.' })
    return
  }
  busy.value = true
  try {
    auth.login(email.value, password.value, remember.value)
    await router.push('/')
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-story">
        <div class="brand brand-light">
          <img src="/Logo_SENAgro.png" alt="SENAgro" class="login-logo" />
        </div>
        <div class="story-copy">
          <h1>«Cultiva información.<br />Cosecha mejores decisiones.»</h1>
          <p>Gestiona tus predios, cultivos y actividades en un solo lugar.</p>
        </div>
        <div class="login-story-foot"><q-icon name="verified_user" /> Plataforma de precisión agrícola</div>
      </div>

      <div class="login-form-side">
        <div class="login-form-wrap">
          <div class="mobile-brand brand">
            <img src="/Logo_SENAgro.png" alt="SENAgro" class="login-logo" />
          </div>
          <div class="form-eyebrow">ACCESO SEGURO</div>
          <h2>{{ recovering ? 'Recuperar acceso' : 'Bienvenido de nuevo' }}</h2>
          <p class="form-intro">
            {{ recovering ? 'La recuperación real de contraseña requiere conexión con el backend.' : 'Ingresa tus credenciales para acceder a la gestión de tus predios y módulos de telemetría.' }}
          </p>

          <q-form v-if="!recovering" class="login-form" @submit.prevent="submit">
            <label for="email">Correo electrónico o usuario</label>
            <q-input id="email" v-model="email" outlined dense placeholder="ejemplo@agrogestion.demo" autocomplete="username">
              <template #prepend><q-icon name="person_outline" /></template>
            </q-input>
            <label for="password">Contraseña</label>
            <q-input id="password" v-model="password" outlined dense :type="showPassword ? 'text' : 'password'" autocomplete="current-password">
              <template #prepend><q-icon name="lock_outline" /></template>
              <template #append><q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPassword = !showPassword" /></template>
            </q-input>
            <div class="login-options">
              <q-checkbox v-model="remember" dense label="Recordarme" />
              <button type="button" class="text-button" @click="recovering = true">¿Olvidaste tu contraseña?</button>
            </div>
            <q-btn type="submit" color="primary" unelevated no-caps class="full-width login-submit" :loading="busy" label="Iniciar sesión">
              <q-icon name="arrow_forward" class="q-ml-sm" />
            </q-btn>
          </q-form>
          <q-form v-else class="login-form" @submit.prevent="$q.notify({ type: 'info', message: 'La recuperación se habilitará al integrar el backend.' })">
            <label for="recovery-email">Correo registrado</label>
            <q-input id="recovery-email" v-model="email" outlined dense type="email" placeholder="tu@correo.com" />
            <q-btn type="submit" color="primary" unelevated no-caps class="full-width login-submit" label="Solicitar recuperación" />
            <button type="button" class="text-button back-login" @click="recovering = false">Volver al inicio de sesión</button>
          </q-form>

          <div class="private-note"><q-icon name="shield" /><span><strong>Sistema privado institucional.</strong> Acceso restringido a personal autorizado. Esta versión usa cuentas ficticias para demostración.</span></div>
        </div>
      </div>
    </section>
  </main>
</template>
