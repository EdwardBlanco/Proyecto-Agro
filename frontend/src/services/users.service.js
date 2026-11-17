/**
 * Servicio de usuarios conectado a la API (/usuarios).
 * Sincroniza los usuarios del backend con storage.js, migra referencias de propietario
 * en los predios locales y mantiene actualizado al usuario autenticado en auth.js.
 */
import { getActivePinia } from 'pinia'
import { apiGet, apiPatch, apiPost } from '@/services/api'
import { mapBackendUserToFrontend, mapFrontendUserToBackend } from '@/services/mappers'
import { getRecords, setRecords } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'

/**
 * Consulta GET /usuarios, deduplica registros, actualiza la colección local de usuarios
 * y migra el campo owner de los predios si el ID del usuario cambió al sincronizar con MongoDB.
 */
export async function fetchUsers(params = { limit: 100 }) {
  const data = await apiGet('/usuarios', { params })
  const rawUsers = Array.isArray(data) ? data : (data?.usuarios ?? [])
  const previousUsers = getRecords('users')
  const idMigrationMap = new Map()

  const mapped = []
  const seenEmails = new Set()
  const seenIds = new Set()

  for (const rawUser of rawUsers) {
    const mappedUser = mapBackendUserToFrontend(rawUser, { syncStorage: false })
    if (!mappedUser || !mappedUser.id) continue

    const emailKey = String(mappedUser.email || '').trim().toLowerCase()
    if (seenIds.has(mappedUser.id) || (emailKey && seenEmails.has(emailKey))) {
      continue
    }

    const oldMatch = previousUsers.find(
      (u) =>
        (emailKey && String(u.email || '').trim().toLowerCase() === emailKey) ||
        String(u.id) === String(mappedUser.id)
    )
    if (oldMatch && oldMatch.id && oldMatch.id !== mappedUser.id) {
      idMigrationMap.set(oldMatch.id, mappedUser.id)
    }

    seenIds.add(mappedUser.id)
    if (emailKey) seenEmails.add(emailKey)
    mapped.push(mappedUser)
  }

  setRecords('users', mapped)

  // Reasigna el owner de los predios locales cuando el usuario pasa de ID demo a ObjectId real
  if (idMigrationMap.size > 0) {
    try {
      const farms = getRecords('farms')
      let farmsChanged = false
      const updatedFarms = farms.map((farm) => {
        if (idMigrationMap.has(farm.owner)) {
          farmsChanged = true
          return { ...farm, owner: idMigrationMap.get(farm.owner) }
        }
        return farm
      })
      if (farmsChanged) {
        setRecords('farms', updatedFarms)
      }
    } catch {
      // Ignorar errores de actualización de predios locales
    }
  }

  // Sincroniza los datos del usuario autenticado en Pinia si está presente en el listado
  try {
    if (getActivePinia()) {
      const auth = useAuthStore()
      if (auth.currentUser) {
        const currentEmail = String(auth.currentUser.email || '').trim().toLowerCase()
        const syncedCurrent = mapped.find(
          (u) =>
            u.id === auth.currentUser.id ||
            (currentEmail && String(u.email || '').trim().toLowerCase() === currentEmail)
        )
        if (syncedCurrent) {
          auth.currentUser = syncedCurrent
        }
      }
    }
  } catch {
    // Ignorar si el store no está activo
  }

  return mapped
}

/**
 * Crea un usuario en POST /usuarios y conserva localmente los predios asignados en el formulario.
 */
export async function createUser(formUser) {
  const payload = mapFrontendUserToBackend(formUser, { isCreate: true })
  const data = await apiPost('/usuarios', payload)
  const rawUser = data?.usuario ?? data?.user ?? data
  const merged = {
    ...rawUser,
    ...(Array.isArray(formUser?.farms) ? { farms: formUser.farms } : {})
  }
  return mapBackendUserToFrontend(merged, { syncStorage: true })
}

/**
 * Actualiza un usuario existente en PATCH /usuarios/:id y sincroniza su copia local.
 */
export async function updateUser(id, formUser) {
  const payload = mapFrontendUserToBackend(formUser, { isCreate: false })
  const data = await apiPatch(`/usuarios/${id}`, payload)
  const rawUser = data?.usuario ?? data?.user ?? data
  const merged = {
    ...rawUser,
    ...(Array.isArray(formUser?.farms) ? { farms: formUser.farms } : {})
  }
  return mapBackendUserToFrontend(merged, { syncStorage: true })
}

/**
 * Cambia el estado activo/inactivo de un usuario mediante PATCH /usuarios/:id/estado.
 */
export async function changeUserStatus(id, active) {
  const data = await apiPatch(`/usuarios/${id}/estado`, { estado: Boolean(active) })
  const rawUser = data?.usuario ?? data?.user ?? data
  return mapBackendUserToFrontend(rawUser, { syncStorage: true })
}

export default {
  fetchUsers,
  createUser,
  updateUser,
  changeUserStatus
}
