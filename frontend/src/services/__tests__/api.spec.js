/**
 * Suite de pruebas unitarias para el cliente HTTP base (src/services/api.js).
 * Valida la gestión de tokens JWT en localStorage/sessionStorage (incluido el
 * respaldo compartido con src/stores/auth.js mediante agrogestion.session.v1),
 * la inyección automática de la cabecera Authorization, el desempaquetado de
 * respuestas del backend, la normalización de errores y el endpoint /health.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE_URL,
  TOKEN_KEY,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  checkApiHealth,
  clearAuthToken,
  getAuthToken,
  setAuthToken
} from '../api'

describe('Servicio HTTP Base (api.js)', () => {
  // Limpia el almacenamiento del navegador y restaura mocks entre pruebas para aislar cada caso
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  // Flujo de almacenamiento y recuperación del token JWT usado por auth.js y apiRequest()
  describe('Gestión de token de autenticación', () => {
    it('almacena el token en localStorage cuando remember es true y lo recupera', () => {
      setAuthToken('jwt-token-local', true)
      expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-token-local')
      expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
      expect(getAuthToken()).toBe('jwt-token-local')
    })

    it('almacena el token en sessionStorage cuando remember es false', () => {
      setAuthToken('jwt-token-session', false)
      expect(sessionStorage.getItem(TOKEN_KEY)).toBe('jwt-token-session')
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
      expect(getAuthToken()).toBe('jwt-token-session')
    })

    // Verifica el respaldo cuando el token viene embebido en la sesión persistida por stores/auth.js
    it('recupera el token desde agrogestion.session.v1 si no existe en TOKEN_KEY', () => {
      localStorage.setItem(
        'agrogestion.session.v1',
        JSON.stringify({ userId: 'u-1', token: 'session-embedded-token' })
      )
      expect(getAuthToken()).toBe('session-embedded-token')
    })

    it('limpia el token tanto de localStorage como de sessionStorage', () => {
      setAuthToken('jwt-token-local', true)
      clearAuthToken()
      expect(getAuthToken()).toBeNull()
    })
  })

  // Flujo de construcción de URL, cabeceras, serialización JSON y manejo de errores con fetch mockeado
  describe('Peticiones HTTP y cabeceras', () => {
    it('ejecuta apiGet y desempaqueta payload.data en respuestas { status: "success", data }', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          status: 'success',
          message: 'Lista obtenida',
          data: [{ _id: '1', nombre: 'El Robledal' }]
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await apiGet('/predios', { params: { estado: 'activo' } })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/predios?estado=activo`)
      expect(options.method).toBe('GET')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(result).toEqual([{ _id: '1', nombre: 'El Robledal' }])
    })

    // Comprueba que getAuthToken() alimenta automáticamente el header Authorization en apiRequest()
    it('inyecta automáticamente el header Authorization: Bearer <token> cuando hay token activo', async () => {
      setAuthToken('token-secreto-123', true)

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          status: 'success',
          data: { usuario: { id: 'u1', correo: 'admin@agrogestion.demo' } }
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      await apiGet('/auth/perfil')

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers.Authorization).toBe('Bearer token-secreto-123')
    })

    it('ejecuta apiPost serializando el body en JSON y enviando Content-Type: application/json', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          status: 'success',
          message: 'Inicio de sesión exitoso',
          data: { token: 'jwt-abc', usuario: { nombre: 'Laura Mendoza' } }
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const payload = { correo: 'admin@agrogestion.demo', contrasena: 'Agro2026!' }
      const data = await apiPost('/auth/login', payload)

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/auth/login`)
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(options.body).toBe(JSON.stringify(payload))
      expect(data.token).toBe('jwt-abc')
    })

    it('soporta apiPatch y apiDelete correctamente', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          status: 'success',
          data: { _id: 'p1', nombre: 'Actualizado' }
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      await apiPatch('/predios/p1', { nombre: 'Actualizado' })
      expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')

      await apiDelete('/predios/p1')
      expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
    })

    // Valida la normalización de errores HTTP 4xx/5xx para que servicios y vistas lean status y details
    it('lanza un Error enriquecido con status y details cuando la respuesta HTTP no es ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        headers: { get: () => 'application/json' },
        json: async () => ({
          status: 'fail',
          statusCode: 422,
          message: 'Errores de validación en los datos enviados',
          details: [{ campo: 'correo', mensaje: 'Correo inválido' }]
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(apiPost('/usuarios', { correo: 'invalido' })).rejects.toMatchObject({
        message: 'Errores de validación en los datos enviados',
        status: 422,
        details: [{ campo: 'correo', mensaje: 'Correo inválido' }]
      })
    })

    // Verifica que checkApiHealth consulte /health sin desempaquetar payload.data
    it('checkApiHealth consulta /health y retorna el payload directo del servidor', async () => {
      const healthPayload = {
        status: 'OK',
        timestamp: '2026-11-17T00:00:00.000Z',
        uptime: 42.5,
        database: 'connected'
      }
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => healthPayload
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await checkApiHealth()
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/health`)
      expect(options.method).toBe('GET')
      expect(result).toEqual(healthPayload)
    })
  })
})
