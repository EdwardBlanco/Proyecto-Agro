<script setup>
/**
 * Shell principal autenticado de la aplicación (barra lateral, cabecera y notificaciones).
 * Filtra los enlaces de navegación según permissions.js y sincroniza el centro de notificaciones con storage.js.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { canAccess, canManageNotificationActions } from '@/services/permissions'
import { getRecord, getRecords } from '@/services/storage'
import {
  archiveNotification as archiveLocalNotification,
  deleteNotification as deleteLocalNotification,
  isNotificationArchived,
  isNotificationUnread,
  markNotificationRead as markLocalNotificationRead
} from '@/services/notifications'
import { getCurrentWeather } from '@/services/weather'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const sidebarCollapsed = ref(false)
const mobileDrawerOpen = ref(false)
const isCompactViewport = ref(window.innerWidth < 1024)
const notificationPopover = ref(false)
const weatherData = ref(null)
const weatherState = ref('loading')
const isOperator = computed(() => auth.currentUser?.role === 'Operario')

// Catálogo de rutas del menú lateral agrupadas por área funcional
const links = [
  { title: 'Resumen', icon: 'space_dashboard', name: 'dashboard', module: 'dashboard', group: 'GENERAL', hideForOperator: true },
  { title: 'Mi jornada', icon: 'today', name: 'operator-dashboard', module: 'dashboard', group: 'GENERAL', operatorOnly: true },
  { title: 'Predios y lotes', icon: 'landscape', name: 'farms', module: 'farms', group: 'GESTIÓN AGRÍCOLA' },
  { title: 'Cultivos', icon: 'eco', name: 'crops', module: 'crops', group: 'GESTIÓN AGRÍCOLA' },
  { title: 'Insumos', icon: 'inventory_2', name: 'inputs', module: 'inputs', group: 'GESTIÓN AGRÍCOLA' },
  { title: 'Calendario agrícola', icon: 'calendar_month', name: 'calendar', module: 'calendar', group: 'PRODUCCIÓN' },
  { title: 'Ciclos productivos', icon: 'autorenew', name: 'cycles', module: 'cycles', group: 'PRODUCCIÓN' },
  { title: 'Labores e incidencias', icon: 'event_note', name: 'activities', module: 'activities', group: 'PRODUCCIÓN' },
  { title: 'Semilleros', icon: 'spa', name: 'nurseries', module: 'nurseries', group: 'PRODUCCIÓN' },
  { title: 'Cosechas', icon: 'agriculture', name: 'harvests', module: 'harvests', group: 'PRODUCCIÓN' },
  { title: 'Telemetría', icon: 'sensors', name: 'telemetry', module: 'telemetry', group: 'MONITOREO' },
  { title: 'Usuarios y permisos', icon: 'groups', name: 'users', module: 'users', group: 'ADMINISTRACIÓN' }
]
const visibleLinks = computed(() => links.filter((link) =>
  canAccess(auth.currentUser, link.module) &&
  (!link.operatorOnly || isOperator.value) &&
  (!link.hideForOperator || !isOperator.value)
))
const groupedLinks = computed(() => visibleLinks.value.reduce((groups, link) => {
  groups[link.group] ??= []
  groups[link.group].push(link)
  return groups
}, {}))
const pageTitle = computed(() => route.name === 'cycle-detail'
  ? getRecord('cycles', route.params.id)?.name ?? route.meta.title ?? 'Detalle del ciclo'
  : route.meta.title ?? 'Resumen')

// Cierra el cajón móvil automáticamente al navegar entre rutas
watch(() => route.fullPath, () => {
  mobileDrawerOpen.value = false
})

/**
 * Detecta cambios de ancho de pantalla para alternar entre menú de escritorio y móvil.
 */
function updateViewportStatus() {
  isCompactViewport.value = window.innerWidth < 1024
}

function loadWeather() {
  if (!navigator.geolocation) {
    weatherState.value = 'unavailable'
    return
  }
  weatherState.value = 'loading'
  try {
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        weatherData.value = await getCurrentWeather({ lat: coords.latitude, lon: coords.longitude })
        weatherState.value = weatherData.value ? 'ready' : 'no-data'
      } catch (error) {
        console.error('No fue posible cargar el clima.', error)
        weatherState.value = 'no-data'
      }
    }, (error) => {
      weatherState.value = error.code === 1 ? 'permission' : 'no-data'
    }, { maximumAge: 300000, timeout: 10000 })
  } catch (error) {
    console.error('No fue posible solicitar la ubicación.', error)
    weatherState.value = 'unavailable'
  }
}

const weatherLabel = computed(() => weatherData.value?.temperature !== undefined && weatherData.value?.temperature !== null
  ? `${weatherData.value.temperature}°C`
  : weatherState.value === 'loading' ? 'Cargando' : '--°C')
const weatherMessage = computed(() => ({
  loading: 'Cargando el clima de tu zona.',
  permission: 'La ubicación no está autorizada.',
  unavailable: 'La ubicación no está disponible en este dispositivo.',
  'no-data': 'No hay datos del clima disponibles.',
  ready: 'Clima de tu zona.'
})[weatherState.value])

onMounted(() => {
  window.addEventListener('resize', updateViewportStatus)
  loadWeather()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportStatus)
})

// Notificaciones visibles según el rol y los predios asignados al usuario
const notifications = computed(() => {
  const farms = auth.currentUser?.farms ?? []
  return getRecords('notifications')
    .filter((item) => {
      if (item.deletedAt || isNotificationArchived(item)) return false
      if (auth.currentUser?.role === 'SuperAdmin') return true
      const farmId = getRecords('lots').find((lot) => lot.id === item.lotId)?.farmId
      return Boolean(farmId && farms.includes(farmId))
    })
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
})
const isUnread = isNotificationUnread
const unreadCount = computed(() => notifications.value.filter(isUnread).length)

/**
 * Cierra la sesión en el store y redirige a la pantalla de login.
 */
function logout() {
  notificationPopover.value = false
  auth.logout()
  router.replace({ name: 'login' })
}

/**
 * Formatea marcas de tiempo relativas ("Ahora", "Hace X min/h/d") para el popover de avisos.
 */
function relativeTime(value) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days} d`
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(timestamp)
}

/**
 * Marca una notificación individual como leída en almacenamiento local.
 */
function markNotificationRead(notification) {
  if (!canManageNotificationActions(auth.currentUser) || !isUnread(notification)) return
  try {
    markLocalNotificationRead(notification)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function archiveNotification(notification) {
  if (!canManageNotificationActions(auth.currentUser)) return
  try {
    archiveLocalNotification(notification)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

function deleteNotification(notification) {
  if (!canManageNotificationActions(auth.currentUser)) return
  $q.dialog({
    title: 'Eliminar notificación',
    message: `¿Quieres eliminar “${notification.title}”? Esta acción no se puede deshacer.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
    persistent: true
  }).onOk(() => {
    try {
      deleteLocalNotification(notification)
    } catch (error) {
      $q.notify({ type: 'negative', message: error.message })
    }
  })
}

/**
 * Cierra el menú flotante y navega a la vista completa de notificaciones.
 */
async function openAllNotifications() {
  notificationPopover.value = false
  await router.push({ name: 'notifications' })
}

</script>

<template>
  <q-layout view="hHh Lpr fFf" class="app-shell">
    <q-drawer :model-value="isCompactViewport ? mobileDrawerOpen : true" :behavior="isCompactViewport ? 'mobile' : 'desktop'" :mini="sidebarCollapsed && !isCompactViewport" :width="258" :mini-width="72" :mini-to-overlay="false" :class="{ 'side-drawer-mini': sidebarCollapsed && !isCompactViewport }" class="side-drawer" @update:model-value="mobileDrawerOpen = $event">
      <div class="drawer-header-row">
        <span v-if="!sidebarCollapsed" class="nav-heading">GENERAL</span>
        <q-btn flat round dense class="drawer-toggle" :icon="sidebarCollapsed ? 'menu' : 'chevron_left'" :aria-label="sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'" @click="sidebarCollapsed = !sidebarCollapsed">
          <q-tooltip>{{ sidebarCollapsed ? 'Expandir menú' : 'Contraer menú' }}</q-tooltip>
        </q-btn>
      </div>
      <q-scroll-area class="nav-scroll">
        <div v-for="(items, group) in groupedLinks" :key="group" class="nav-group" :class="{ 'nav-group-first': group === 'GENERAL' }">
          <div v-if="group !== 'GENERAL'" class="nav-heading">{{ group }}</div>
          <q-item v-for="link in items" :key="link.name" clickable :active="route.name === link.name || (link.name === 'farms' && route.name === 'lots') || (link.name === 'cycles' && route.name === 'cycle-detail')" active-class="nav-active" class="nav-item" :to="{ name: link.name }">
            <q-item-section avatar><q-icon :name="link.icon" /></q-item-section>
            <q-item-section>{{ link.title }}</q-item-section>
            <q-tooltip v-if="sidebarCollapsed" anchor="center right" self="center left">{{ link.title }}</q-tooltip>
          </q-item>
        </div>
      </q-scroll-area>
      <div class="drawer-footer">
        <div class="drawer-user" :class="{ 'drawer-user-mini': sidebarCollapsed && !isCompactViewport }">
          <q-avatar size="34px" class="brand-green-tint brand-green-text">{{ auth.currentUser?.name?.slice(0, 1) }}</q-avatar>
          <div v-if="!sidebarCollapsed || isCompactViewport" class="drawer-user-copy"><strong>{{ auth.currentUser?.name }}</strong><small>{{ auth.currentUser?.role }}</small></div>
        </div>
        <q-btn
          flat
          :no-caps="!sidebarCollapsed"
          :round="sidebarCollapsed"
          dense
          icon="logout"
          :label="sidebarCollapsed ? undefined : 'Cerrar sesión'"
          class="drawer-logout-btn"
          aria-label="Cerrar sesión"
          @click="logout"
        >
          <q-tooltip>Cerrar sesión</q-tooltip>
        </q-btn>
      </div>
    </q-drawer>

    <q-page-container>
      <header class="top-header">
        <q-toolbar class="top-toolbar">
          <q-btn v-if="isCompactViewport" flat round dense icon="menu" class="mobile-menu-toggle" aria-label="Abrir menú de navegación" @click="mobileDrawerOpen = !mobileDrawerOpen" />
          <div class="header-left">
            <img src="/Logo_SENAgro.png" alt="SENAgro" class="header-logo" />
            <q-separator vertical inset class="header-logo-separator" />
            <div class="page-heading"><strong>{{ pageTitle }}</strong></div>
          </div>
          <q-space />
          <div class="weather-capsule" role="status" :aria-label="weatherMessage">
            <q-icon name="wb_cloudy" />
            <span>{{ weatherLabel }}</span>
            <small v-if="weatherData?.zoneName">{{ weatherData.zoneName }}</small>
            <q-tooltip>{{ weatherMessage }}</q-tooltip>
          </div>
          <div class="notification-anchor">
            <q-btn flat round dense icon="notifications_none" class="header-icon notification-trigger" aria-label="Notificaciones" :aria-expanded="notificationPopover" @click.stop="notificationPopover = !notificationPopover">
              <q-badge v-if="unreadCount" floating color="negative" rounded>{{ unreadCount }}</q-badge>
            </q-btn>
            <q-menu v-model="notificationPopover" anchor="bottom right" self="top right" :offset="[0, 10]" class="notification-menu">
              <section class="notification-popover" aria-label="Notificaciones">
                <div class="notification-popover-title"><h2>Notificaciones</h2><q-badge v-if="unreadCount" color="primary" rounded>{{ unreadCount }}</q-badge></div>
                <div class="notification-list">
                  <div v-for="notification in notifications" :key="notification.id" class="notification-entry" :class="{ unread: isUnread(notification) }">
                    <q-avatar size="38px" class="brand-green-tint brand-green-text"><q-icon :name="notification.title.toLowerCase().includes('humedad') ? 'water_drop' : 'notifications_active'" /></q-avatar>
                    <span class="notification-entry-copy"><strong>{{ notification.title }}</strong><span>{{ notification.message }}</span><small>{{ relativeTime(notification.date) }}</small></span>
                    <span v-if="isUnread(notification)" class="notification-unread-dot" aria-label="No leída"></span>
                    <div v-if="canManageNotificationActions(auth.currentUser)" class="notification-entry-actions">
                      <q-btn flat round dense icon="done" aria-label="Marcar como leída" :disable="!isUnread(notification)" @click="markNotificationRead(notification)"><q-tooltip>Marcar como leída</q-tooltip></q-btn>
                      <q-btn flat round dense icon="archive" aria-label="Archivar" @click="archiveNotification(notification)"><q-tooltip>Archivar</q-tooltip></q-btn>
                      <q-btn flat round dense icon="delete_outline" color="negative" aria-label="Eliminar" @click="deleteNotification(notification)"><q-tooltip>Eliminar</q-tooltip></q-btn>
                    </div>
                  </div>
                  <div v-if="!notifications.length" class="notification-empty">No hay notificaciones recientes.</div>
                </div>
                <button type="button" class="notification-view-all" @click="openAllNotifications">Ver todo</button>
              </section>
            </q-menu>
          </div>
          <q-separator vertical inset class="header-separator" />
          <q-btn flat no-caps class="profile-button">
            <q-avatar size="34px" class="brand-green-tint brand-green-text">{{ auth.currentUser?.name?.slice(0, 1) }}</q-avatar>
            <div class="profile-copy"><strong>{{ auth.currentUser?.name }}</strong><small>{{ auth.currentUser?.role }}</small></div>
            <q-icon name="expand_more" />
            <q-menu><q-list style="min-width: 180px"><q-item clickable v-close-popup @click="logout"><q-item-section avatar><q-icon name="logout" /></q-item-section><q-item-section>Cerrar sesión</q-item-section></q-item></q-list></q-menu>
          </q-btn>
        </q-toolbar>
      </header>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
