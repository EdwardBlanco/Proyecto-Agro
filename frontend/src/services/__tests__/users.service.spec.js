import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { API_BASE_URL, setAuthToken } from '@/services/api'
import { getRecord, getRecords, initializeStorage } from '@/services/storage'
import {
  changeUserStatus,
  createUser,
  fetchUsers,
  updateUser
} from '@/services/users.service'
import { getResponsibleUsers, resetResponsibleUsersSync } from '@/services/mock/users'

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

describe('Servicio de Usuarios (users.service.js)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    initializeStorage()
    resetResponsibleUsersSync()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('fetchUsers consulta GET /api/v1/usuarios, sincroniza storage conservando predios y migra owner de predios', async () => {
    setAuthToken('jwt-admin-token', true)

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({
        status: 'success',
        message: 'Listado de usuarios obtenido exitosamente',
        data: {
          usuarios: [
            {
              _id: '65f1a2b3c4d5e6f7a8b9c001',
              nombre: 'Laura Mendoza',
              correo: 'admin@agrogestion.demo',
              rol: 'administrador',
              estado: true
            },
            {
              _id: '65f1a2b3c4d5e6f7a8b9c002',
              nombre: 'Carlos Ríos',
              correo: 'superadmin@agrogestion.demo',
              rol: 'superadmin',
              estado: true
            },
            {
              _id: '65f1a2b3c4d5e6f7a8b9c003',
              nombre: 'José Pérez',
              correo: 'operario@agrogestion.demo',
              rol: 'operario',
              estado: false
            }
          ],
          total: 3,
          page: 1,
          limit: 100,
          totalPages: 1
        }
      })
    )

    const users = await fetchUsers()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toBe(`${API_BASE_URL}/usuarios?limit=100`)
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-admin-token')

    expect(users).toHaveLength(3)
    expect(users[0]).toEqual({
      id: '65f1a2b3c4d5e6f7a8b9c001',
      name: 'Laura Mendoza',
      email: 'admin@agrogestion.demo',
      role: 'Admin',
      active: true,
      farms: ['farm-1', 'farm-2']
    })
    expect(users[2].role).toBe('Operario')
    expect(users[2].active).toBe(false)

    const storedUsers = getRecords('users')
    expect(storedUsers).toHaveLength(3)
    expect(storedUsers.some((u) => u.id === 'user-admin')).toBe(false)

    // Verifica que los predios que tenían owner: 'user-admin' ahora apunten al ObjectId real
    const farm1 = getRecord('farms', 'farm-1')
    expect(farm1.owner).toBe('65f1a2b3c4d5e6f7a8b9c001')
  })

  it('createUser envía POST /api/v1/usuarios con contraseña por defecto cuando se omite y guarda el usuario en storage', async () => {
    setAuthToken('jwt-admin-token', true)

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(
        {
          status: 'success',
          message: 'Usuario creado exitosamente',
          data: {
            _id: '65f1a2b3c4d5e6f7a8b9c099',
            nombre: 'Andrés Salazar',
            correo: 'andres@agrogestion.demo',
            rol: 'operario',
            estado: true
          }
        },
        201
      )
    )

    const created = await createUser({
      name: 'Andrés Salazar',
      email: 'Andres@agrogestion.demo',
      role: 'Operario',
      active: true,
      farms: ['farm-1']
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/usuarios`)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      nombre: 'Andrés Salazar',
      correo: 'andres@agrogestion.demo',
      rol: 'operario',
      estado: true,
      contrasena: 'Agro2026!'
    })

    expect(created).toEqual({
      id: '65f1a2b3c4d5e6f7a8b9c099',
      name: 'Andrés Salazar',
      email: 'andres@agrogestion.demo',
      role: 'Operario',
      active: true,
      farms: ['farm-1']
    })

    expect(getRecord('users', '65f1a2b3c4d5e6f7a8b9c099')).toEqual(created)
  })

  it('updateUser envía PATCH /api/v1/usuarios/:id y actualiza el registro en storage conservando predios', async () => {
    setAuthToken('jwt-admin-token', true)

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({
        status: 'success',
        message: 'Usuario actualizado exitosamente',
        data: {
          _id: 'user-operator',
          nombre: 'José Pérez Editado',
          correo: 'operario@agrogestion.demo',
          rol: 'administrador',
          estado: true
        }
      })
    )

    const updated = await updateUser('user-operator', {
      name: 'José Pérez Editado',
      email: 'operario@agrogestion.demo',
      role: 'Admin',
      active: true,
      farms: ['farm-1', 'farm-2']
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/usuarios/user-operator`)
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual({
      nombre: 'José Pérez Editado',
      correo: 'operario@agrogestion.demo',
      rol: 'administrador',
      estado: true
    })

    expect(updated).toEqual({
      id: 'user-operator',
      name: 'José Pérez Editado',
      email: 'operario@agrogestion.demo',
      role: 'Admin',
      active: true,
      farms: ['farm-1', 'farm-2']
    })
    expect(getRecord('users', 'user-operator')?.role).toBe('Admin')
  })

  it('changeUserStatus envía PATCH /api/v1/usuarios/:id/estado y refleja el nuevo estado en storage', async () => {
    setAuthToken('jwt-admin-token', true)

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({
        status: 'success',
        message: 'Estado del usuario actualizado exitosamente',
        data: {
          _id: 'user-operator',
          nombre: 'José Pérez',
          correo: 'operario@agrogestion.demo',
          rol: 'operario',
          estado: false
        }
      })
    )

    const deactivated = await changeUserStatus('user-operator', false)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/usuarios/user-operator/estado`)
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual({ estado: false })

    expect(deactivated.active).toBe(false)
    expect(deactivated.farms).toEqual(['farm-1'])
    expect(getRecord('users', 'user-operator')?.active).toBe(false)
  })

  it('getResponsibleUsers retorna usuarios activos en formato { label, value } y sincroniza con el backend si hay token', async () => {
    setAuthToken('jwt-admin-token', true)

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({
        status: 'success',
        data: {
          usuarios: [
            {
              _id: '65f1a2b3c4d5e6f7a8b9c001',
              nombre: 'Laura Mendoza',
              correo: 'admin@agrogestion.demo',
              rol: 'administrador',
              estado: true
            },
            {
              _id: '65f1a2b3c4d5e6f7a8b9c003',
              nombre: 'José Pérez',
              correo: 'operario@agrogestion.demo',
              rol: 'operario',
              estado: false
            }
          ]
        }
      })
    )

    const initialResponsible = getResponsibleUsers()
    expect(initialResponsible.length).toBeGreaterThan(0)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Esperar a que resuelva la sincronización en segundo plano
    await vi.waitFor(() => {
      const syncedResponsible = getResponsibleUsers()
      expect(syncedResponsible).toEqual([
        { label: 'Laura Mendoza', value: '65f1a2b3c4d5e6f7a8b9c001' }
      ])
    })
  })
})
