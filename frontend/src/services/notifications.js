import { removeRecord, saveRecord } from '@/services/storage'

export function isNotificationUnread(notification) {
  return !notification.readAt && notification.status === 'Pendiente'
}

export function isNotificationArchived(notification) {
  return Boolean(notification.archivedAt) || notification.status === 'Archivada'
}

export function markNotificationRead(notification) {
  if (!isNotificationUnread(notification)) return
  saveRecord('notifications', { ...notification, readAt: new Date().toISOString() })
}

export function archiveNotification(notification) {
  if (isNotificationArchived(notification)) return
  saveRecord('notifications', { ...notification, archivedAt: new Date().toISOString() })
}

export function unarchiveNotification(notification) {
  if (!isNotificationArchived(notification)) return
  const restoredNotification = {
    ...notification,
    status: notification.status === 'Archivada' ? 'Pendiente' : notification.status
  }
  delete restoredNotification.archivedAt
  saveRecord('notifications', restoredNotification)
}

export function deleteNotification(notification) {
  removeRecord('notifications', notification.id)
}
