import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/services/permissions'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginPage from '@/features/auth/pages/LoginPage.vue'
import DashboardPage from '@/features/dashboard/pages/DashboardPage.vue'
import RecordsPage from '@/features/records/pages/RecordsPage.vue'
import CycleDetailPage from '@/features/records/pages/CycleDetailPage.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardPage, meta: { module: 'dashboard', title: 'Resumen' } },
      { path: 'farms', name: 'farms', component: RecordsPage, meta: { module: 'farms', title: 'Predios y lotes' } },
      { path: 'lots', name: 'lots', component: RecordsPage, meta: { module: 'lots', title: 'Lotes' } },
      { path: 'crops', name: 'crops', component: RecordsPage, meta: { module: 'crops', title: 'Cultivos' } },
      { path: 'inputs', name: 'inputs', component: RecordsPage, meta: { module: 'inputs', title: 'Insumos' } },
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

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.restore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' }
  if (to.meta.guest && auth.isAuthenticated) return { name: 'dashboard' }
  if (to.meta.module && !canAccess(auth.currentUser, to.meta.module)) return { name: 'dashboard' }
  return true
})

export default router
