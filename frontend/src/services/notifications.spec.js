import { beforeEach, describe, expect, it } from 'vitest'
import { deleteNotification, isNotificationUnread, markNotificationRead } from './notifications'
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

  it('persists read and delete actions in local storage', () => {
    markNotificationRead(getRecord('notifications', 'notice-test'))
    expect(getRecord('notifications', 'notice-test').readAt).toBeTruthy()

    deleteNotification(getRecord('notifications', 'notice-test'))
    expect(getRecord('notifications', 'notice-test')).toBeNull()
  })

  it('allows reading an attended notification and tracks that state independently', () => {
    saveRecord('notifications', { ...getRecord('notifications', 'notice-test'), status: 'Atendida' })
    const attendedNotification = getRecord('notifications', 'notice-test')
    expect(isNotificationUnread(attendedNotification)).toBe(true)

    markNotificationRead(attendedNotification)

    const readNotification = getRecord('notifications', 'notice-test')
    expect(readNotification.readAt).toBeTruthy()
    expect(isNotificationUnread(readNotification)).toBe(false)
  })
})
