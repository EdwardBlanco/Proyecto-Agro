/**
 * Store Pinia de autenticación y sesión del usuario actual.
 * Gestiona inicio/cierre de sesión contra /auth/login y /auth/me, persistencia en
 * localStorage/sessionStorage y sincronización del token JWT a través de api.js.
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost, clearAuthToken, getAuthToken, setAuthToken, TOKEN_KEY } from '@/services/api'
import { mapBackendUserToFrontend, normalizeLoginEmail } from '@/services/mappers'
import { getRecords } from '@/services/storage'

export const SESSION_KEY = 'agrogestion.session.v1'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const ready = ref(false)

  /**
   * Guarda la sesión del usuario en localStorage (si remember=true) o sessionStorage.
   */
  function persistSession(user, token, remember = true) {
    const resolvedToken = token || getAuthToken() || undefined
    const payload = JSON.stringify({
      ...(resolvedToken ? { token: resolvedToken } : {}),
      userId: user.id,
      user
    })
    if (remember) {
      localStorage.setItem(SESSION_KEY, payload)
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, payload)
      localStorage.removeItem(SESSION_KEY)
    }
  }

  /**
   * Hidrata inmediatamente la sesión desde almacenamiento local para el guard del router
   * y valida en segundo plano el token vigente consultando GET /auth/me.
   */
  async function restore(forceVerify = false) {
    if (ready.value && !forceVerify) return currentUser.value

    const wasRemembered = Boolean(
      localStorage.getItem(SESSION_KEY) || localStorage.getItem(TOKEN_KEY)
    )

    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        const storedUser = session?.user
          ? mapBackendUserToFrontend(session.user)
          : getRecords('users').find((user) => user.id === session?.userId) ?? null
        currentUser.value = storedUser && storedUser.active !== false ? storedUser : null
        if (!currentUser.value && !getAuthToken()) {
          localStorage.removeItem(SESSION_KEY)
          sessionStorage.removeItem(SESSION_KEY)
        }
      }
    } catch (error) {
      console.error('No fue posible recuperar la sesión local.', error)
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
    }
    ready.value = true

    const token = getAuthToken()
    if (token) {
      try {
        const remoteUser = await apiGet('/auth/me')
        if (remoteUser) {
          const mappedUser = mapBackendUserToFrontend(remoteUser)
          if (!mappedUser || !mappedUser.active) {
            logout()
            return null
          }
          currentUser.value = mappedUser
          persistSession(mappedUser, token, wasRemembered)
        }
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          logout()
          return null
        }
      }
    }

    return currentUser.value
  }

  /**
   * Autentica al usuario contra POST /auth/login usando correo o alias normalizado,
   * almacena el token JWT y actualiza currentUser.
   */
  async function login(identifier, password, remember = true) {
    const cleanIdentifier = String(identifier ?? '').trim()
    if (!cleanIdentifier || !password) {
      throw new Error('Ingresa tu usuario y contraseña.')
    }

    const email = normalizeLoginEmail(cleanIdentifier)
    const data = await apiPost('/auth/login', {
      correo: email,
      contrasena: password
    })

    const rawUser = data?.usuario ?? data?.user ?? data
    const token = data?.token ?? null
    const mappedUser = mapBackendUserToFrontend(rawUser)

    if (!mappedUser || !mappedUser.active) {
      throw new Error('La cuenta no está disponible. Contacta al administrador.')
    }

    const rememberSession = Boolean(remember)
    setAuthToken(token, rememberSession)
    persistSession(mappedUser, token, rememberSession)
    currentUser.value = mappedUser
    ready.value = true
    return mappedUser
  }

  /**
   * Limpia el estado reactivo, la sesión almacenada y el token JWT.
   */
  function logout() {
    currentUser.value = null
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    clearAuthToken()
  }

  const isAuthenticated = computed(() => Boolean(currentUser.value))
  return { currentUser, ready, isAuthenticated, restore, login, logout }
})
