const access = {
  Administrador: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Supervisor: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications'],
  Agrónomo: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications'],
  Operario: ['dashboard', 'farms', 'lots', 'cycles', 'activities', 'nurseries', 'harvests', 'notifications']
}

const writeAccess = {
  Administrador: ['farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Supervisor: ['cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications'],
  Agrónomo: ['cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications'],
  Operario: ['activities', 'nurseries', 'harvests']
}

export function canAccess(user, module) {
  return Boolean(user && access[user.role]?.includes(module))
}

export function canWrite(user, module) {
  return Boolean(user && writeAccess[user.role]?.includes(module))
}

export function visibleFarmIds(user) {
  return user?.role === 'Administrador' || user?.role === 'Supervisor'
    ? null
    : user?.farms ?? []
}
