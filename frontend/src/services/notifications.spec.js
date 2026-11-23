import { beforeEach, describe, expect, it } from 'vitest'
import { archiveNotification, deleteNotification, isNotificationArchived, markNotificationRead, unarchiveNotification } from './notifications'
import { getRecord, initializeStorage, saveRecord } from './storage'

describe('notification actions', () => {
  beforeEach(() => {
    localStorage.clear()
    initializeStorage()
    saveRecord('notifications', {
      id: 'notice-test',
      title: 'Aviso de prueba',
      message: 'Notificación local',
      date: '2026-11-19',
      status: 'Pendiente'
    })
  })

  it('persists read, archive, and delete actions in local storage', () => {
    markNotificationRead(getRecord('notifications', 'notice-test'))
    expect(getRecord('notifications', 'notice-test').readAt).toBeTruthy()

    archiveNotification(getRecord('notifications', 'notice-test'))
    expect(getRecord('notifications', 'notice-test').archivedAt).toBeTruthy()

    deleteNotification(getRecord('notifications', 'notice-test'))
    expect(getRecord('notifications', 'notice-test')).toBeNull()
  })

  it('unarchives a notification without changing its read state', () => {
    const unreadNotification = getRecord('notifications', 'notice-test')
    archiveNotification(unreadNotification)
    unarchiveNotification(getRecord('notifications', 'notice-test'))

    const unreadResult = getRecord('notifications', 'notice-test')
    expect(isNotificationArchived(unreadResult)).toBe(false)
    expect(unreadResult.status).toBe('Pendiente')
    expect(unreadResult.readAt).toBeUndefined()

    markNotificationRead(unreadResult)
    archiveNotification(getRecord('notifications', 'notice-test'))
    const archivedReadAt = getRecord('notifications', 'notice-test').readAt
    unarchiveNotification(getRecord('notifications', 'notice-test'))

    const readResult = getRecord('notifications', 'notice-test')
    expect(isNotificationArchived(readResult)).toBe(false)
    expect(readResult.status).toBe('Pendiente')
    expect(readResult.readAt).toBe(archivedReadAt)
  })

  it('restores legacy archived notifications to the active status', () => {
    saveRecord('notifications', { ...getRecord('notifications', 'notice-test'), status: 'Archivada' })

    unarchiveNotification(getRecord('notifications', 'notice-test'))

    expect(getRecord('notifications', 'notice-test').status).toBe('Pendiente')
    expect(isNotificationArchived(getRecord('notifications', 'notice-test'))).toBe(false)
  })
})
