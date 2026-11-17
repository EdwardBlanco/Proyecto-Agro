/**
 * Proveedor de opciones de usuarios responsables para selectores de formularios (RecordsPage.vue).
 * Lee de storage.js y dispara una sincronización silenciosa con GET /usuarios cuando hay sesión
 * activa de administrador para mantener los responsables actualizados respecto al backend.
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
 * iniciando en segundo plano la sincronización con el backend si corresponde al token actual.
 */
export function getResponsibleUsers() {
  const token = getAuthToken()
  let canSyncRemote = Boolean(token)

  if (canSyncRemote && getActivePinia()) {
    try {
      const auth = useAuthStore()
      // Solo SuperAdmin y Admin tienen permiso para listar todos los usuarios en el backend
      if (auth.currentUser && !['SuperAdmin', 'Admin'].includes(auth.currentUser.role)) {
        canSyncRemote = false
      }
    } catch {
      // Ignorar si no hay store disponible
    }
  }

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
    .map((user) => ({ label: user.name, value: user.id }))
}
