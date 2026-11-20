/**
 * Proveedor de opciones de usuarios responsables para selectores de formularios (RecordsPage.vue).
 * Lee de storage.js y sincroniza GET /usuarios en segundo plano solo para SuperAdmin.
 */
import { getActivePinia } from 'pinia'
import { getAuthToken } from '@/services/api'
import { getRecords } from '@/services/storage'
import { fetchUsers } from '@/services/users.service'
import { useAuthStore } from '@/stores/auth'

let syncPromise = null
let lastSyncedToken = null

/**
 * Reinicia el control de caché de sincronización (útil en pruebas unitarias o al cambiar de sesión).
 */
export function resetResponsibleUsersSync() {
  syncPromise = null
  lastSyncedToken = null
}

/**
 * Retorna la lista de usuarios activos en formato { label, value } para componentes q-select,
 * iniciando la sincronización con el backend únicamente para SuperAdmin.
 */
export function getResponsibleUsers(role = null, valueField = 'id') {
  const token = getAuthToken()
  const activePinia = getActivePinia()
  const canSyncRemote = Boolean(
    token && activePinia && useAuthStore(activePinia).currentUser?.role === 'SuperAdmin'
  )

  if (canSyncRemote && token !== lastSyncedToken && !syncPromise) {
    syncPromise = fetchUsers()
      .then(() => {
        lastSyncedToken = token
      })
      .catch(() => {
        // Conservar registros en almacenamiento local si falla la sincronización
      })
      .finally(() => {
        syncPromise = null
      })
  } else if (!token) {
    lastSyncedToken = null
  }

  return getRecords('users')
    .filter((user) => user.active)
    .filter((user) => !role || user.role === role)
    .map((user) => ({ label: user.name, value: user[valueField] }))
}
