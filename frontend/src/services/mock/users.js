import { getActivePinia } from 'pinia'
import { getAuthToken } from '@/services/api'
import { getRecords } from '@/services/storage'
import { fetchUsers } from '@/services/users.service'
import { useAuthStore } from '@/stores/auth'

let syncPromise = null
let lastSyncedToken = null

export function resetResponsibleUsersSync() {
  syncPromise = null
  lastSyncedToken = null
}

export function getResponsibleUsers() {
  const token = getAuthToken()
  let canSyncRemote = Boolean(token)

  if (canSyncRemote && getActivePinia()) {
    try {
      const auth = useAuthStore()
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
