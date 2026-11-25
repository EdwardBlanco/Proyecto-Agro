/**
 * Suite de pruebas para el servicio y adaptadores de predios.
 * Valida la integración entre farms.service.js, mappers.js, api.js, storage.js y stores/auth.js:
 * - Transformación bidireccional de campos frontend <-> backend (hectáreas <-> area_m2, ubicación).
 * - Peticiones HTTP al recurso /predios y sincronización con el almacenamiento local.
 * - Migración en cascada de referencias farmId (demo -> ObjectId) en lotes, ciclos, telemetría,
 *   usuarios y el usuario autenticado en Pinia.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { API_BASE_URL, setAuthToken } from '@/services/api'
import { mapBackendFarmToFrontend, mapFrontendFarmToBackend } from '@/services/mappers'
import { getRecord, getRecords, initializeStorage } from '@/services/storage'
import {
  changeFarmStatus,
  createFarm,
  fetchFarms,
  updateFarm
} from '@/services/farms.service'
import { useAuthStore } from '@/stores/auth'

// Helper para simular respuestas JSON compatibles con el parser de api.js
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

describe('Servicio y Adaptadores de Predios (farms.service.js / mappers.js)', () => {
  // Inicializa Pinia y la base local semilla (storage.js) antes de cada prueba
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    initializeStorage()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  // Pruebas unitarias de mappers.js sin llamadas HTTP
  describe('Adaptadores bidireccionales (mappers.js)', () => {
    it('mapFrontendFarmToBackend convierte HA a area_m2, construye ubicacion y asigna coordenadas válidas', () => {
      const payload = mapFrontendFarmToBackend({
        name: '  Finca Los Pinos  ',
        municipality: 'Guarne',
        department: 'Antioquia',
        area: 12.5,
        status: 'En preparación'
      })

      expect(payload).toEqual({
        nombre: 'Finca Los Pinos',
        ubicacion: 'Guarne, Antioquia',
        latitud: 6.1552,
        longitud: -75.3737,
        area_m2: 125000,
        estado: true
      })

      const inactivePayload = mapFrontendFarmToBackend({
        name: 'Predio Cerrado',
        ubicacion: 'Marinilla, Antioquia',
        latitud: 6.1736,
        longitud: -75.3361,
        area: 3.25,
        status: 'Inactivo'
      })

      expect(inactivePayload).toEqual({
        nombre: 'Predio Cerrado',
        ubicacion: 'Marinilla, Antioquia',
        latitud: 6.1736,
        longitud: -75.3361,
        area_m2: 32500,
        estado: false
      })
    })

    it('mapBackendFarmToFrontend convierte area_m2 a HA, separa ubicacion y preserva metadatos locales', () => {
      const mapped = mapBackendFarmToFrontend(
        {
          _id: '65f1a2b3c4d5e6f7a8b9d001',
          nombre: 'El Robledal',
          ubicacion: 'Rionegro, Antioquia',
          latitud: 6.1552,
          longitud: -75.3737,
          area_m2: 240000,
          estado: true
        },
        { syncStorage: false }
      )

      expect(mapped).toEqual({
        id: '65f1a2b3c4d5e6f7a8b9d001',
        name: 'El Robledal',
        municipality: 'Rionegro',
        department: 'Antioquia',
        area: 24,
        owner: 'user-admin',
        status: 'Activo'
      })

      const withoutDepartment = mapBackendFarmToFrontend(
        {
          _id: '65f1a2b3c4d5e6f7a8b9d099',
          nombre: 'Predio San Nicolás',
          ubicacion: 'El Retiro',
          area_m2: 55000,
          estado: false
        },
        { syncStorage: false }
      )

      expect(withoutDepartment.municipality).toBe('El Retiro')
      expect(withoutDepartment.department).toBe('Antioquia')
      expect(withoutDepartment.area).toBe(5.5)
      expect(withoutDepartment.status).toBe('Inactivo')
    })
  })

  // Pruebas de integración entre farms.service.js, api.js, mappers.js, storage.js y auth.js
  describe('Operaciones HTTP del Servicio de Predios (farms.service.js)', () => {
    it('fetchFarms consulta GET /api/v1/predios, sincroniza storage y migra referencias farmId en lots, cycles, telemetry, users y auth.currentUser', async () => {
      setAuthToken('jwt-admin-token', true)
      const auth = useAuthStore()
      auth.currentUser = getRecord('users', 'user-admin')

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        mockJsonResponse({
          status: 'success',
          message: 'Listado de predios obtenido exitosamente',
          data: {
            predios: [
              {
                _id: '65f1a2b3c4d5e6f7a8b9d001',
                nombre: 'El Robledal',
                ubicacion: 'Rionegro, Antioquia',
                latitud: 6.1552,
                longitud: -75.3737,
                area_m2: 240000,
                estado: true
              },
              {
                _id: '65f1a2b3c4d5e6f7a8b9d002',
                nombre: 'La Esperanza',
                ubicacion: 'La Ceja, Antioquia',
                latitud: 6.0319,
                longitud: -75.4316,
                area_m2: 180000,
                estado: true
              }
            ],
            total: 2,
            page: 1,
            limit: 100,
            totalPages: 1
          }
        })
      )

      const farms = await fetchFarms()

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy.mock.calls[0][0]).toBe(`${API_BASE_URL}/predios?limit=100`)
      expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-admin-token')

      expect(farms).toHaveLength(2)
      expect(farms[0]).toEqual({
        id: '65f1a2b3c4d5e6f7a8b9d001',
        name: 'El Robledal',
        municipality: 'Rionegro',
        department: 'Antioquia',
        area: 24,
        owner: 'user-admin',
        status: 'Activo'
      })

      // Verifica migración de referencias farm-1 -> ObjectId real en storage.js y auth.currentUser
      expect(getRecord('lots', 'lot-1')?.farmId).toBe('65f1a2b3c4d5e6f7a8b9d001')
      expect(getRecord('lots', 'lot-3')?.farmId).toBe('65f1a2b3c4d5e6f7a8b9d002')
      expect(getRecord('cycles', 'cycle-1')?.farmId).toBe('65f1a2b3c4d5e6f7a8b9d001')
      expect(getRecord('telemetry', 'reading-1')?.farmId).toBe('65f1a2b3c4d5e6f7a8b9d001')
      expect(getRecord('users', 'user-admin')?.farms).toEqual([
        '65f1a2b3c4d5e6f7a8b9d001',
        '65f1a2b3c4d5e6f7a8b9d002'
      ])
      expect(auth.currentUser.farms).toEqual([
        '65f1a2b3c4d5e6f7a8b9d001',
        '65f1a2b3c4d5e6f7a8b9d002'
      ])
    })

    // Verifica creación en backend y conservación de metadatos locales (owner, status, image) en storage.js
    it('createFarm envía POST /api/v1/predios con area_m2 y ubicacion y guarda el predio en storage', async () => {
      setAuthToken('jwt-admin-token', true)

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        mockJsonResponse(
          {
            status: 'success',
            message: 'Predio creado exitosamente',
            data: {
              _id: '65f1a2b3c4d5e6f7a8b9d010',
              nombre: 'Hacienda San Isidro',
              ubicacion: 'Santuario, Antioquia',
              latitud: 6.1552,
              longitud: -75.3737,
              area_m2: 150000,
              estado: true
            }
          },
          201
        )
      )

      const created = await createFarm({
        name: 'Hacienda San Isidro',
        municipality: 'Santuario',
        department: 'Antioquia',
        area: 15,
        owner: 'user-supervisor',
        status: 'En preparación',
        image: 'data:image/png;base64,iVBORw0KGgo='
      })

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, options] = fetchSpy.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/predios`)
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({
        nombre: 'Hacienda San Isidro',
        ubicacion: 'Santuario, Antioquia',
        latitud: 6.1552,
        longitud: -75.3737,
        area_m2: 150000,
        estado: true
      })

      expect(created).toEqual({
        id: '65f1a2b3c4d5e6f7a8b9d010',
        name: 'Hacienda San Isidro',
        municipality: 'Santuario',
        department: 'Antioquia',
        area: 15,
        owner: 'user-supervisor',
        status: 'En preparación',
        image: 'data:image/png;base64,iVBORw0KGgo='
      })

      expect(getRecord('farms', '65f1a2b3c4d5e6f7a8b9d010')).toEqual(created)
    })

    // Verifica actualización parcial en PATCH /predios/:id y sincronización inmediata del registro local
    it('updateFarm envía PATCH /api/v1/predios/:id y actualiza el predio en storage', async () => {
      setAuthToken('jwt-admin-token', true)

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        mockJsonResponse({
          status: 'success',
          message: 'Predio actualizado exitosamente',
          data: {
            _id: 'farm-1',
            nombre: 'El Robledal Norte',
            ubicacion: 'Rionegro, Antioquia',
            latitud: 6.1552,
            longitud: -75.3737,
            area_m2: 300000,
            estado: true
          }
        })
      )

      const updated = await updateFarm('farm-1', {
        name: 'El Robledal Norte',
        municipality: 'Rionegro',
        department: 'Antioquia',
        area: 30,
        owner: 'user-admin',
        status: 'Activo'
      })

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, options] = fetchSpy.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/predios/farm-1`)
      expect(options.method).toBe('PATCH')
      expect(JSON.parse(options.body)).toEqual({
        nombre: 'El Robledal Norte',
        ubicacion: 'Rionegro, Antioquia',
        latitud: 6.1552,
        longitud: -75.3737,
        area_m2: 300000,
        estado: true
      })

      expect(updated.name).toBe('El Robledal Norte')
      expect(updated.area).toBe(30)
      expect(getRecord('farms', 'farm-1')?.area).toBe(30)
    })

    // Verifica cambio de estado booleano en backend y su mapeo a 'Activo'/'Inactivo' en storage.js
    it('changeFarmStatus envía PATCH /api/v1/predios/:id/estado y refleja el nuevo estado en storage', async () => {
      setAuthToken('jwt-admin-token', true)

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        mockJsonResponse({
          status: 'success',
          message: 'Estado del predio actualizado exitosamente',
          data: {
            _id: 'farm-2',
            nombre: 'La Esperanza',
            ubicacion: 'La Ceja, Antioquia',
            latitud: 6.0319,
            longitud: -75.4316,
            area_m2: 180000,
            estado: false
          }
        })
      )

      const deactivated = await changeFarmStatus('farm-2', false)

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, options] = fetchSpy.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/predios/farm-2/estado`)
      expect(options.method).toBe('PATCH')
      expect(JSON.parse(options.body)).toEqual({ estado: false })

      expect(deactivated.status).toBe('Inactivo')
      expect(getRecord('farms', 'farm-2')?.status).toBe('Inactivo')
      expect(getRecords('farms')).toHaveLength(2)
    })
  })
})
