import { getActivePinia } from 'pinia'
import { apiGet, apiPatch, apiPost } from '@/services/api'
import {
  mapBackendFarmToFrontend,
  mapFrontendFarmToBackend,
  migrateFarmIdReferences
} from '@/services/mappers'
import { getRecords, setRecords } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'

export async function fetchFarms(params = { limit: 100 }) {
  const data = await apiGet('/predios', { params })
  const rawFarms = Array.isArray(data) ? data : (data?.predios ?? [])
  const previousFarms = getRecords('farms')
  const idMigrationMap = new Map()

  const mapped = []
  const seenIds = new Set()
  const seenNames = new Set()

  for (const rawFarm of rawFarms) {
    const mappedFarm = mapBackendFarmToFrontend(rawFarm, { syncStorage: false })
    if (!mappedFarm || !mappedFarm.id) continue

    const nameKey = String(mappedFarm.name || '').trim().toLowerCase()
    if (seenIds.has(mappedFarm.id) || (nameKey && seenNames.has(nameKey))) {
      continue
    }

    const oldMatch = previousFarms.find(
      (f) =>
        String(f.id) === String(mappedFarm.id) ||
        (nameKey && String(f.name || '').trim().toLowerCase() === nameKey)
    )
    if (oldMatch && oldMatch.id && oldMatch.id !== mappedFarm.id) {
      idMigrationMap.set(oldMatch.id, mappedFarm.id)
    }

    seenIds.add(mappedFarm.id)
    if (nameKey) seenNames.add(nameKey)
    mapped.push(mappedFarm)
  }

  if (mapped.length > 0) {
    setRecords('farms', mapped)

    if (idMigrationMap.size > 0) {
      migrateFarmIdReferences(idMigrationMap)

      try {
        if (getActivePinia()) {
          const auth = useAuthStore()
          if (auth.currentUser && Array.isArray(auth.currentUser.farms)) {
            let changed = false
            const updatedFarms = auth.currentUser.farms.map((farmId) => {
              if (idMigrationMap.has(farmId)) {
                changed = true
                return idMigrationMap.get(farmId)
              }
              return farmId
            })
            if (changed) {
              auth.currentUser = {
                ...auth.currentUser,
                farms: Array.from(new Set(updatedFarms))
              }
            }
          }
        }
      } catch {
        // Ignorar si el store no está activo
      }
    }
  }

  return mapped
}

export async function createFarm(formFarm) {
  const payload = mapFrontendFarmToBackend(formFarm)
  const data = await apiPost('/predios', payload)
  const rawFarm = data?.predio ?? data?.farm ?? data
  const merged = {
    ...rawFarm,
    ...(formFarm?.owner ? { owner: formFarm.owner } : {}),
    ...(formFarm?.municipality ? { municipality: formFarm.municipality } : {}),
    ...(formFarm?.department ? { department: formFarm.department } : {}),
    ...(formFarm?.status ? { status: formFarm.status } : {}),
    ...(formFarm?.image !== undefined ? { image: formFarm.image } : {})
  }
  return mapBackendFarmToFrontend(merged, { syncStorage: true })
}

export async function updateFarm(id, formFarm) {
  const payload = mapFrontendFarmToBackend(formFarm)
  const data = await apiPatch(`/predios/${id}`, payload)
  const rawFarm = data?.predio ?? data?.farm ?? data
  const merged = {
    ...rawFarm,
    ...(formFarm?.owner ? { owner: formFarm.owner } : {}),
    ...(formFarm?.municipality ? { municipality: formFarm.municipality } : {}),
    ...(formFarm?.department ? { department: formFarm.department } : {}),
    ...(formFarm?.status ? { status: formFarm.status } : {}),
    ...(formFarm?.image !== undefined ? { image: formFarm.image } : {})
  }
  return mapBackendFarmToFrontend(merged, { syncStorage: true })
}

export async function changeFarmStatus(id, active) {
  const data = await apiPatch(`/predios/${id}/estado`, { estado: Boolean(active) })
  const rawFarm = data?.predio ?? data?.farm ?? data
  const merged = {
    ...rawFarm,
    estado: Boolean(active),
    status: active ? 'Activo' : 'Inactivo'
  }
  return mapBackendFarmToFrontend(merged, { syncStorage: true })
}

export default {
  fetchFarms,
  createFarm,
  updateFarm,
  changeFarmStatus
}
