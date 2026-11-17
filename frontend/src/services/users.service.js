import { getActivePinia } from 'pinia'
import { apiGet, apiPatch, apiPost } from '@/services/api'
import { mapBackendUserToFrontend, mapFrontendUserToBackend } from '@/services/mappers'
import { getRecords, setRecords } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'

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
