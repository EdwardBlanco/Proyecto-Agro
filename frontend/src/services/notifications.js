import { removeRecord, saveRecord } from '@/services/storage'

export function isNotificationUnread(notification) {
  return !notification.readAt
}

export function markNotificationRead(notification) {
  if (!isNotificationUnread(notification)) return
  saveRecord('notifications', { ...notification, readAt: new Date().toISOString() })
}

export function deleteNotification(notification) {
  removeRecord('notifications', notification.id)
}
