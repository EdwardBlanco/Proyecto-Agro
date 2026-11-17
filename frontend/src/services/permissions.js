/**
 * Matriz de control de acceso basado en roles (RBAC) en el frontend.
 * Es consultada por router/index.js, AppLayout.vue, DashboardPage.vue y RecordsPage.vue.
 */

// Módulos visibles en navegación y rutas para cada rol
const access = {
  SuperAdmin: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Admin: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Operario: ['dashboard', 'farms', 'lots', 'cycles', 'activities', 'nurseries', 'harvests', 'notifications']
}

// Módulos en los que cada rol puede crear, editar o eliminar registros
const writeAccess = {
  SuperAdmin: ['farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'notifications', 'users'],
  Admin: ['farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'users'],
  Operario: ['activities', 'nurseries', 'harvests']
}

/**
 * Indica si el usuario tiene permiso de lectura sobre un módulo específico.
 */
export function canAccess(user, module) {
  return Boolean(user && access[user.role]?.includes(module))
}

/**
 * Indica si el usuario puede realizar operaciones de escritura en el módulo.
 */
export function canWrite(user, module) {
  return Boolean(user && writeAccess[user.role]?.includes(module))
}

/**
 * Retorna null cuando el rol tiene visibilidad global sobre todos los predios,
 * o el listado de IDs de predios asignados cuando el acceso está restringido (Operario).
 */
export function visibleFarmIds(user) {
  return user?.role === 'SuperAdmin' || user?.role === 'Admin'
    ? null
    : user?.farms ?? []
}
