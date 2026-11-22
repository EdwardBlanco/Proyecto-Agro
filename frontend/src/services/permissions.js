/**
 * Matriz de control de acceso basado en roles (RBAC) en el frontend.
 * Es consultada por router/index.js, AppLayout.vue, DashboardPage.vue y RecordsPage.vue.
 */

// Módulos visibles en navegación y rutas para cada rol
const access = {
  ADMIN_PRODUCTOR: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'finance', 'ica-book', 'calendar', 'notifications', 'users'],
  TECNICO_AGRONOMO: ['dashboard', 'farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'ica-book', 'calendar', 'notifications'],
  OPERARIO_CAMPO: ['dashboard', 'farms', 'lots', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'calendar', 'notifications']
};

// Módulos en los que cada rol puede crear, editar o eliminar registros
const writeAccess = {
  ADMIN_PRODUCTOR: ['farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry', 'users'],
  TECNICO_AGRONOMO: ['farms', 'lots', 'crops', 'inputs', 'cycles', 'activities', 'nurseries', 'harvests', 'telemetry'],
  OPERARIO_CAMPO: []
};

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
 * Permite gestionar notificaciones personales en la burbuja a todos los roles de la aplicación.
 */
export function canManageNotificationActions(user) {
  return Boolean(user && ['ADMIN_PRODUCTOR', 'TECNICO_AGRONOMO'].includes(user.role))
}

/**
 * Retorna null para el SuperAdmin, que tiene visibilidad global, y los predios
 * asignados para Admin y Operario.
 */
export function visibleFarmIds(user) {
  return user?.role === 'SuperAdmin' ? null : user?.farms ?? []
}
