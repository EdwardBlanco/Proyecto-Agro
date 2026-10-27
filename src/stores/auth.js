import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getDemoAccounts, getRecords } from '@/services/storage'

const SESSION_KEY = 'agrogestion.session.v1'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const ready = ref(false)

  function restore() {
    if (ready.value) return
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        currentUser.value = getRecords('users').find((user) => user.id === session.userId) ?? null
        if (!currentUser.value) {
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
  }

  function login(identifier, password, remember) {
    const account = getDemoAccounts().find((item) =>
      [item.email, item.username].some((value) => value.toLowerCase() === identifier.trim().toLowerCase()) && item.password === password
    )
    if (!account) throw new Error('Usuario o contraseña incorrectos. Usa una cuenta de demostración.')
    const user = getRecords('users').find((item) => item.id === account.userId && item.active)
    if (!user) throw new Error('La cuenta no está disponible. Contacta al administrador.')
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }))
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }))
    if (remember) sessionStorage.removeItem(SESSION_KEY)
    else localStorage.removeItem(SESSION_KEY)
    currentUser.value = user
    ready.value = true
    return user
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  }

  const isAuthenticated = computed(() => Boolean(currentUser.value))
  return { currentUser, isAuthenticated, restore, login, logout }
})
