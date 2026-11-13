const access = {
  SuperAdmin: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Admin: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Operario: ['dashboard', 'farms', 'lots', 'cycles', 'activities', 'nurseries', 'harvests', 'notifications']
}

const writeAccess = {
  SuperAdmin: ['farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Admin: ['farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Operario: ['activities', 'nurseries', 'harvests']
}

export function canAccess(user, module) {
  return Boolean(user && access[user.role]?.includes(module))
}

export function canWrite(user, module) {
  return Boolean(user && writeAccess[user.role]?.includes(module))
}

export function visibleFarmIds(user) {
  return user?.role === 'SuperAdmin' || user?.role === 'Admin'
    ? null
    : user?.farms ?? []
}
