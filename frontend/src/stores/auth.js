/**
 * Store Pinia de autenticación y sesión del usuario actual.
 * Gestiona inicio/cierre de sesión contra /auth/login y /auth/me, persistencia en
 * localStorage/sessionStorage y sincronización del token JWT a través de api.js.
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost, clearAuthToken, getAuthToken, setAuthToken, TOKEN_KEY } from '@/services/api'
import { mapBackendUserToFrontend, normalizeLoginEmail } from '@/services/mappers'
import { getDemoAccounts, getRecords } from '@/services/storage'

function normalizeLegacySessionUser(user) {
  if (!user || typeof user !== "object") return null
  const roleMap = {
    SuperAdmin: "ADMIN_PRODUCTOR",
    Admin: "ADMIN_PRODUCTOR",
    Operario: "OPERARIO_CAMPO"
  }
  const normalizedRole = roleMap[user.role] || user.role
  return { ...user, role: normalizedRole }
}

export const SESSION_KEY = 'agrogestion.session.v1'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const ready = ref(false)

  /**
   * Guarda la sesión del usuario en localStorage (si remember=true) o sessionStorage.
   */
  function persistSession(user, token, remember = true) {
    const resolvedToken = token || getAuthToken() || undefined
    const sessionUser = { ...user }
    delete sessionUser.password
    const payload = JSON.stringify({
      ...(resolvedToken ? { token: resolvedToken } : {}),
      userId: user.id,
      user: sessionUser
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
          ? session.token || getAuthToken()
            ? mapBackendUserToFrontend(session.user)
            : getRecords('users').find((user) => user.id === session?.userId) ?? session.user
          : getRecords('users').find((user) => user.id === session?.userId) ?? null
        if (storedUser) delete storedUser.password
        const normalizedStored = normalizeLegacySessionUser(storedUser)
        currentUser.value = normalizedStored && normalizedStored.active !== false ? normalizedStored : null
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
    const localUser = getRecords('users').find(
      (user) => String(user.email ?? '').trim().toLowerCase() === email
    )
    if (localUser?.active === false) {
      throw new Error('La cuenta está inactiva. Contacta al administrador.')
    }
    if (localUser && Object.prototype.hasOwnProperty.call(localUser, 'password')) {
      if (localUser.password !== String(password)) {
        throw new Error('Correo o contraseña incorrectos.')
      }
      const user = { ...localUser }
      delete user.password
      clearAuthToken()
      const rememberSession = Boolean(remember)
      persistSession(user, null, rememberSession)
      currentUser.value = user
      ready.value = true
      return user
    }

    const normalizedEmail = email === 'superadmin@agrogestion.demo' ? 'admin@agrogestion.demo' : email
    const demoAccountPrecheck = getDemoAccounts().find(
      (acc) => String(acc.email ?? '').trim().toLowerCase() === normalizedEmail
    )
    const shouldUseLegacyHttp = import.meta.env.MODE === 'test' || import.meta.env.VITE_USE_LEGACY_API === 'true'

    if (!shouldUseLegacyHttp && demoAccountPrecheck) {
      if (demoAccountPrecheck.password !== String(password)) {
        throw new Error('Correo o contraseña incorrectos.')
      }
      const fallbackProfiles = {
        'admin@agrogestion.demo': {
          id: 'user-admin',
          name: 'Carlos Mendoza (Admin Productor)',
          email: 'admin@agrogestion.demo',
          role: 'ADMIN_PRODUCTOR',
          farms: ['farm-1', 'farm-2'],
          active: true
        },
        'agronomo@agrogestion.demo': {
          id: 'user-supervisor',
          name: 'Ing. Laura Gómez (Técnico Agrónomo)',
          email: 'agronomo@agrogestion.demo',
          role: 'TECNICO_AGRONOMO',
          farms: ['farm-1', 'farm-2'],
          active: true
        },
        'operario@agrogestion.demo': {
          id: 'user-operator',
          name: 'Jorge Ramírez (Operario de Campo)',
          email: 'operario@agrogestion.demo',
          role: 'OPERARIO_CAMPO',
          farms: ['farm-1'],
          active: true
        }
      }
      const baseUser = fallbackProfiles[normalizedEmail] || normalizeLegacySessionUser(localUser)
      const user = { ...baseUser }
      delete user.password
      clearAuthToken()
      persistSession(user, null, Boolean(remember))
      currentUser.value = user
      ready.value = true
      return user
    }

    let data = null
    try {
      data = await apiPost('/auth/login', {
        correo: email,
        contrasena: password
      })
    } catch (error) {
      const isOfflineOrNoBackend = !error?.status || error.status >= 500 || error.status === 404
      const normalizedEmail = email === 'superadmin@agrogestion.demo' ? 'admin@agrogestion.demo' : email
      const demoAccount = getDemoAccounts().find(
        (acc) => String(acc.email ?? '').trim().toLowerCase() === normalizedEmail
      )
      if (isOfflineOrNoBackend && demoAccount) {
        if (demoAccount.password !== String(password)) {
          throw new Error('Correo o contraseña incorrectos.')
        }
        const fallbackProfiles = {
          'admin@agrogestion.demo': {
            id: 'user-admin',
            name: 'Carlos Mendoza (Admin Productor)',
            email: 'admin@agrogestion.demo',
            role: 'ADMIN_PRODUCTOR',
            farms: ['farm-1', 'farm-2'],
            active: true
          },
          'agronomo@agrogestion.demo': {
            id: 'user-supervisor',
            name: 'Ing. Laura Gómez (Técnico Agrónomo)',
            email: 'agronomo@agrogestion.demo',
            role: 'TECNICO_AGRONOMO',
            farms: ['farm-1', 'farm-2'],
            active: true
          },
          'operario@agrogestion.demo': {
            id: 'user-operator',
            name: 'Jorge Ramírez (Operario de Campo)',
            email: 'operario@agrogestion.demo',
            role: 'OPERARIO_CAMPO',
            farms: ['farm-1'],
            active: true
          }
        }
        const baseUser = fallbackProfiles[normalizedEmail] || normalizeLegacySessionUser(localUser)
        const user = { ...baseUser }
        delete user.password
        clearAuthToken()
        persistSession(user, null, Boolean(remember))
        currentUser.value = user
        ready.value = true
        return user
      }
      throw error
    }

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
