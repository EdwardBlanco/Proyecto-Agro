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
