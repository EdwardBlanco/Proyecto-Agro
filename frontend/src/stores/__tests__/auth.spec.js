/**
 * Suite de pruebas de integración para el store Pinia de autenticación (src/stores/auth.js).
 * Valida el flujo completo entre auth.js, api.js, mappers.js y storage.js:
 * - Estado inicial sin sesión activa.
 * - Inicio de sesión contra POST /auth/login (normalización de alias, mapeo de roles y JWT).
 * - Manejo de credenciales inválidas (HTTP 401).
 * - Restauración de sesión en dos fases: hidratación síncrona para el router y validación
 *   remota contra GET /auth/me (incluyendo cierre automático si el token expiró).
 * - Cierre de sesión y limpieza total en localStorage/sessionStorage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SESSION_KEY, useAuthStore } from '@/stores/auth'
import { getAuthToken, TOKEN_KEY } from '@/services/api'
import { initializeStorage } from '@/services/storage'

// Helper para simular respuestas JSON compatibles con api.js
function mockJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null)
    },
    json: async () => body,
    text: async () => JSON.stringify(body)
  }
}

describe('Auth Store (useAuthStore)', () => {
  // Reinicia Pinia y el almacenamiento local antes de cada prueba
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    initializeStorage()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('inicia con un usuario nulo e inautenticado', () => {
    const auth = useAuthStore()
    expect(auth.currentUser).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  // Flujo login(): normalizeLoginEmail('admin') -> POST /auth/login -> setAuthToken(..., false) en sessionStorage
  it('autentica correctamente contra POST /api/v1/auth/login mapeando el rol y guardando el JWT', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({
        status: 'success',
        message: 'Inicio de sesión exitoso',
        data: {
          token: 'jwt-demo-admin-token',
          usuario: {
            _id: 'user-admin',
            nombre: 'Laura Mendoza',
            correo: 'admin@agrogestion.demo',
            rol: 'administrador',
            estado: true
          }
        }
      })
    )

    const auth = useAuthStore()
    const user = await auth.login('admin', 'Agro2026!', false)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/v1/auth/login')
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      correo: 'admin@agrogestion.demo',
      contrasena: 'Agro2026!'
    })

    expect(user).toBeDefined()
    expect(user.id).toBe('user-admin')
    expect(user.role).toBe('Admin')
    expect(user.farms).toEqual(['farm-1', 'farm-2'])
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.currentUser?.email).toBe('admin@agrogestion.demo')
    expect(getAuthToken()).toBe('jwt-demo-admin-token')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('jwt-demo-admin-token')
  })

  // Verifica que un error 401 propagado por api.js impida autenticar y no persista ningún token
  it('lanza un error 401 al ingresar credenciales inválidas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(
        {
          status: 'error',
          message: 'Credenciales inválidas'
        },
        401
      )
    )

    const auth = useAuthStore()
    await expect(auth.login('usuario_invalido@agrogestion.demo', 'clave_erronea', false)).rejects.toThrow(
      'Credenciales inválidas'
    )
    expect(auth.isAuthenticated).toBe(false)
    expect(getAuthToken()).toBeNull()
  })

  // Flujo restore(): hidratación inmediata desde localStorage + verificación remota con Bearer token en GET /auth/me
  it('restaura la sesión desde localStorage y valida el perfil con GET /api/v1/auth/me', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        mockJsonResponse({
          status: 'success',
          data: {
            token: 'jwt-superadmin-token',
            usuario: {
              _id: 'user-supervisor',
              nombre: 'Carlos Ríos',
              correo: 'superadmin@agrogestion.demo',
              rol: 'superadmin',
              estado: true
            }
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          status: 'success',
          data: {
            _id: 'user-supervisor',
            nombre: 'Carlos Ríos',
            correo: 'superadmin@agrogestion.demo',
            rol: 'superadmin',
            estado: true
          }
        })
      )

    const auth = useAuthStore()
    await auth.login('supervisor', 'Agro2026!', true)

    // Crear una nueva instancia del store para simular recarga de página
    setActivePinia(createPinia())
    const newAuth = useAuthStore()
    expect(newAuth.currentUser).toBeNull()

    const restorePromise = newAuth.restore()
    // Hidratación síncrona inmediata para el guard del router antes de resolver /auth/me
    expect(newAuth.isAuthenticated).toBe(true)
    expect(newAuth.currentUser?.id).toBe('user-supervisor')

    await restorePromise
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[1][0]).toContain('/api/v1/auth/me')
    expect(fetchSpy.mock.calls[1][1].headers.Authorization).toBe('Bearer jwt-superadmin-token')
    expect(newAuth.currentUser?.role).toBe('SuperAdmin')
  })

  // Verifica la invalidación automática de sesión cuando /auth/me rechaza el token almacenado con 401
  it('cierra la sesión automáticamente si GET /api/v1/auth/me responde 401 en restore()', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        mockJsonResponse({
          status: 'success',
          data: {
            token: 'jwt-expired-token',
            usuario: {
              _id: 'user-operator',
              nombre: 'José Pérez',
              correo: 'operario@agrogestion.demo',
              rol: 'operario',
              estado: true
            }
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          {
            status: 'error',
            message: 'Token expirado o inválido'
          },
          401
        )
      )

    const auth = useAuthStore()
    await auth.login('operario', 'Agro2026!', true)

    setActivePinia(createPinia())
    const newAuth = useAuthStore()
    await newAuth.restore()

    expect(newAuth.currentUser).toBeNull()
    expect(newAuth.isAuthenticated).toBe(false)
    expect(getAuthToken()).toBeNull()
  })

  // Flujo logout(): limpia estado reactivo en Pinia, SESSION_KEY y TOKEN_KEY en api.js
  it('cierra la sesión correctamente limpiando currentUser, sesión y token JWT', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({
        status: 'success',
        data: {
          token: 'jwt-maria-token',
          usuario: {
            _id: 'user-agronomist',
            nombre: 'María Torres',
            correo: 'maria@agrogestion.demo',
            rol: 'operario',
            estado: true
          }
        }
      })
    )

    const auth = useAuthStore()
    await auth.login('agronomo', 'Agro2026!', true)
    expect(auth.isAuthenticated).toBe(true)
    expect(getAuthToken()).toBe('jwt-maria-token')

    auth.logout()
    expect(auth.currentUser).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(getAuthToken()).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })
})
