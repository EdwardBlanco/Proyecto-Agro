import { describe, expect, it } from 'vitest'
import { canAccess, canManageNotificationActions } from './permissions'

describe('role permissions', () => {
  it.each(['SuperAdmin', 'Admin', 'Operario'])(
    'allows %s to access the dashboard with the weather capsule',
    (role) => {
      expect(canAccess({ role }, 'dashboard')).toBe(true)
    }
  )

  it('allows Admin to access user administration', () => {
    expect(canAccess({ role: 'Admin' }, 'users')).toBe(true)
  })

  it.each(['SuperAdmin', 'Admin', 'Operario'])(
    'allows %s to manage notifications from the bell',
    (role) => {
      expect(canManageNotificationActions({ role })).toBe(true)
    }
  )
})
