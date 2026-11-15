import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { initializeStorage } from '@/services/storage'

describe('Auth Store (useAuthStore)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    initializeStorage()
  })

  it('inicia con un usuario nulo e inautenticado', () => {
    const auth = useAuthStore()
    expect(auth.currentUser).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('autentica correctamente a un usuario de demostración existente (Admin)', () => {
    const auth = useAuthStore()
    const user = auth.login('admin', 'Agro2026!', false)

    expect(user).toBeDefined()
    expect(user.id).toBe('user-admin')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.currentUser?.email).toBe('admin@agrogestion.demo')
  })

  it('lanza un error al ingresar credenciales inválidas', () => {
    const auth = useAuthStore()
    expect(() => auth.login('usuario_invalido', 'clave_erronea', false)).toThrow(
      'Usuario o contraseña incorrectos. Usa una cuenta de demostración.'
    )
  })

  it('restaura la sesión desde localStorage cuando la casilla remember es verdadera', () => {
    const auth = useAuthStore()
    auth.login('supervisor', 'Agro2026!', true)

    // Crear una nueva instancia del store para simular recarga de página
    setActivePinia(createPinia())
    const newAuth = useAuthStore()
    expect(newAuth.currentUser).toBeNull()

    newAuth.restore()
    expect(newAuth.isAuthenticated).toBe(true)
    expect(newAuth.currentUser?.id).toBe('user-supervisor')
  })

  it('cierra la sesión correctamente limpliado currentUser y almacenamiento', () => {
    const auth = useAuthStore()
    auth.login('agronomo', 'Agro2026!', true)
    expect(auth.isAuthenticated).toBe(true)

    auth.logout()
    expect(auth.currentUser).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })
})
