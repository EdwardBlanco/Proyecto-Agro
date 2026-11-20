import { describe, expect, it } from 'vitest'
import { canAccess, canManageNotificationActions, canWrite } from './permissions'

describe('role permissions', () => {
  it('restricts user administration to SuperAdmin', () => {
    expect(canAccess({ role: 'SuperAdmin' }, 'users')).toBe(true)
    expect(canWrite({ role: 'SuperAdmin' }, 'users')).toBe(true)
    expect(canAccess({ role: 'Admin' }, 'users')).toBe(false)
    expect(canWrite({ role: 'Admin' }, 'users')).toBe(false)
    expect(canAccess({ role: 'Operario' }, 'users')).toBe(false)
    expect(canWrite({ role: 'Operario' }, 'users')).toBe(false)
  })

  it.each(['SuperAdmin', 'Admin'])(
    'allows %s to manage notifications from the bell',
    (role) => {
      expect(canManageNotificationActions({ role })).toBe(true)
    }
  )

  it('gives Operario read-only access to the calendar and telemetry', () => {
    const operator = { role: 'Operario' }

    expect(canAccess(operator, 'calendar')).toBe(true)
    expect(canAccess(operator, 'telemetry')).toBe(true)
    expect(canAccess(operator, 'users')).toBe(false)
    for (const module of ['farms', 'lots', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'calendar', 'users']) {
      expect(canWrite(operator, module)).toBe(false)
    }
    expect(canManageNotificationActions(operator)).toBe(false)
  })

  it('preserves cycle and activity write access for Admin', () => {
    const admin = { role: 'Admin' }

    expect(canWrite(admin, 'cycles')).toBe(true)
    expect(canWrite(admin, 'activities')).toBe(true)
  })
})
