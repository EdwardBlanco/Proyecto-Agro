/**
 * Configuración de rutas de la aplicación y guardias de navegación.
 * Conecta las rutas con el store de autenticación (auth.js), los permisos por módulo
 * (permissions.js) y la verificación de acceso por predio en storage.js.
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/services/permissions'
import { getRecord } from '@/services/storage'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginPage from '@/features/auth/pages/LoginPage.vue'
import DashboardPage from '@/features/dashboard/pages/DashboardPage.vue'
import RecordsPage from '@/features/records/pages/RecordsPage.vue'
import CycleDetailPage from '@/features/records/pages/CycleDetailPage.vue'
import AgriculturalCalendarPage from '@/features/calendar/pages/AgriculturalCalendarPage.vue'
import OperatorDashboardPage from '@/features/operator/pages/OperatorDashboardPage.vue'
import useOfflineSyncStore from '@/stores/offlineSync'

// Definición de rutas públicas (login) y rutas protegidas bajo AppLayout
const routes = [
  { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardPage, meta: { module: 'dashboard', title: 'Resumen' } },
      { path: 'my-day', name: 'operator-dashboard', component: OperatorDashboardPage, meta: { module: 'dashboard', title: 'Mi jornada' } },
      { path: 'farms', name: 'farms', component: RecordsPage, meta: { module: 'farms', title: 'Predios y lotes' } },
      { path: 'farms/:farmId/lots', name: 'lots', component: RecordsPage, meta: { module: 'lots', title: 'Lotes' } },
      { path: 'crops', name: 'crops', component: RecordsPage, meta: { module: 'crops', title: 'Cultivos' } },
      { path: 'inputs', name: 'inputs', component: RecordsPage, meta: { module: 'inputs', title: 'Insumos' } },
      { path: 'calendar', name: 'calendar', component: AgriculturalCalendarPage, meta: { module: 'calendar', title: 'Calendario agrícola' } },
      { path: 'cycles', name: 'cycles', component: RecordsPage, meta: { module: 'cycles', title: 'Ciclos productivos' } },
      { path: 'cycles/:id', name: 'cycle-detail', component: CycleDetailPage, meta: { module: 'cycles', title: 'Detalle del ciclo' } },
      { path: 'activities', name: 'activities', component: RecordsPage, meta: { module: 'activities', title: 'Labores e incidencias' } },
      { path: 'nurseries', name: 'nurseries', component: RecordsPage, meta: { module: 'nurseries', title: 'Semilleros' } },
      { path: 'harvests', name: 'harvests', component: RecordsPage, meta: { module: 'harvests', title: 'Cosechas' } },
      { path: 'telemetry', name: 'telemetry', component: RecordsPage, meta: { module: 'telemetry', title: 'Telemetría simulada' } },
      { path: 'notifications', name: 'notifications', component: RecordsPage, meta: { module: 'notifications', title: 'Notificaciones' } },
      { path: 'users', name: 'users', component: RecordsPage, meta: { module: 'users', title: 'Usuarios y permisos' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHistory(), routes })

// Guardia global: restaura sesión local, valida autenticación, permisos de módulo y acceso al predio.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const offlineSync = useOfflineSyncStore()
  await auth.restore()

  // Redirección basada en autenticación
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' }
  if (to.meta.guest && auth.isAuthenticated) return { name: 'dashboard' }

  // Redirección basada en roles
  if (to.name === 'dashboard' && auth.isOperarioCampo) return { name: 'operator-dashboard' }
  if (to.name === 'operator-dashboard' && !auth.isOperarioCampo) return { name: 'dashboard' }

  // Verificación de permisos de módulo
  if (to.meta.module && !canAccess(auth.currentUser, to.meta.module)) return { name: 'dashboard' }

  // Bloquear rutas financieras para operarios de campo
  if (to.meta.module === 'users' && auth.isOperarioCampo) return { name: 'dashboard' }

  // Verificación de acceso a lotes
  if (to.name === 'lots') {
    const farmId = typeof to.params.farmId === 'string' ? to.params.farmId : ''
    const farm = farmId ? getRecord('farms', farmId) : null
    const isAssigned = auth.currentUser?.role === 'ADMIN_PRODUCTOR' || auth.currentUser?.farms?.includes(farmId)
    if (!farm || !isAssigned) return { name: 'farms' }
  }

  // Sincronizar cola offline si hay conexión
  if (navigator.onLine && offlineSync.offlineQueue.length > 0) {
    await offlineSync.syncQueue()
  }

  return true
})

export default router
