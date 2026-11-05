<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/services/permissions'
import { getRecords, saveRecord } from '@/services/storage'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const sidebarCollapsed = ref(false)
const mobileDrawerOpen = ref(false)
const isOnline = ref(navigator.onLine)
const isCompactViewport = ref(window.innerWidth < 1024)
const notificationPopover = ref(false)
const notificationTab = ref('all')
const links = [
  { title: 'Resumen', icon: 'space_dashboard', name: 'dashboard', module: 'dashboard', group: 'GENERAL' },
  { title: 'Predios y lotes', icon: 'landscape', name: 'farms', module: 'farms', group: 'GESTIÓN AGRÍCOLA' },
  { title: 'Cultivos', icon: 'eco', name: 'crops', module: 'crops', group: 'GESTIÓN AGRÍCOLA' },
  { title: 'Insumos', icon: 'inventory_2', name: 'inputs', module: 'inputs', group: 'GESTIÓN AGRÍCOLA' },
  { title: 'Ciclos productivos', icon: 'autorenew', name: 'cycles', module: 'cycles', group: 'PRODUCCIÓN' },
  { title: 'Labores e incidencias', icon: 'event_note', name: 'activities', module: 'activities', group: 'PRODUCCIÓN' },
  { title: 'Semilleros', icon: 'spa', name: 'nurseries', module: 'nurseries', group: 'PRODUCCIÓN' },
  { title: 'Cosechas', icon: 'agriculture', name: 'harvests', module: 'harvests', group: 'PRODUCCIÓN' },
  { title: 'Telemetría', icon: 'sensors', name: 'telemetry', module: 'telemetry', group: 'MONITOREO' },
  { title: 'Usuarios y permisos', icon: 'groups', name: 'users', module: 'users', group: 'ADMINISTRACIÓN' }
]
const visibleLinks = computed(() => links.filter((link) => canAccess(auth.currentUser, link.module)))
const groupedLinks = computed(() => visibleLinks.value.reduce((groups, link) => {
  groups[link.group] ??= []
  groups[link.group].push(link)
  return groups
}, {}))
const pageTitle = computed(() => route.meta.title ?? 'SENAgro')
watch(() => route.fullPath, () => {
  mobileDrawerOpen.value = false
})
function updateNetworkStatus() {
  isOnline.value = navigator.onLine
}

function updateViewportStatus() {
  isCompactViewport.value = window.innerWidth < 1024
}

onMounted(() => {
  window.addEventListener('online', updateNetworkStatus)
  window.addEventListener('offline', updateNetworkStatus)
  window.addEventListener('resize', updateViewportStatus)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateNetworkStatus)
  window.removeEventListener('offline', updateNetworkStatus)
  window.removeEventListener('resize', updateViewportStatus)
})

const notifications = computed(() => {
  const farms = auth.currentUser?.farms ?? []
  return getRecords('notifications')
    .filter((item) => {
      if (['Administrador', 'Supervisor'].includes(auth.currentUser?.role)) return true
      const farmId = getRecords('lots').find((lot) => lot.id === item.lotId)?.farmId
      return !farmId || farms.includes(farmId)
    })
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
})
const isUnread = (notification) => !notification.readAt && notification.status === 'Pendiente'
const unreadCount = computed(() => notifications.value.filter(isUnread).length)
const shownNotifications = computed(() => notificationTab.value === 'unread'
  ? notifications.value.filter(isUnread)
  : notifications.value)

function logout() {
  notificationPopover.value = false
  auth.logout()
  router.replace({ name: 'login' })
}

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

function markNotificationRead(notification) {
  if (notification.readAt) return
  try {
    saveRecord('notifications', { ...notification, readAt: new Date().toISOString() })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

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
          <q-item v-for="link in items" :key="link.name" clickable :active="route.name === link.name || (link.name === 'cycles' && route.name === 'cycle-detail')" active-class="nav-active" class="nav-item" :to="{ name: link.name }">
            <q-item-section avatar><q-icon :name="link.icon" /></q-item-section>
            <q-item-section>{{ link.title }}</q-item-section>
            <q-tooltip v-if="sidebarCollapsed" anchor="center right" self="center left">{{ link.title }}</q-tooltip>
          </q-item>
        </div>
      </q-scroll-area>
      <div class="drawer-footer">
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
          <q-badge class="network-status" :color="isOnline ? 'positive' : 'orange-10'" text-color="white" role="status" :aria-label="isOnline ? 'Conectado a la red' : 'Modo Local Autónomo Activo — Almacenando en caché'">
            <q-icon :name="isOnline ? 'cloud_done' : 'cloud_off'" class="q-mr-xs" />
            <span>{{ isOnline ? 'Conectado a la red' : 'Modo Local Autónomo Activo — Almacenando en caché' }}</span>
          </q-badge>
          <div class="notification-anchor">
            <q-btn flat round dense icon="notifications_none" class="header-icon notification-trigger" aria-label="Notificaciones" :aria-expanded="notificationPopover" @click.stop="notificationPopover = !notificationPopover">
              <q-badge v-if="unreadCount" floating color="negative" rounded>{{ unreadCount }}</q-badge>
            </q-btn>
            <q-menu v-model="notificationPopover" anchor="bottom right" self="top right" :offset="[0, 10]" class="notification-menu">
              <section class="notification-popover" aria-label="Notificaciones">
                <div class="notification-popover-title"><h2>Notificaciones</h2><q-badge v-if="unreadCount" color="primary" rounded>{{ unreadCount }}</q-badge></div>
                <div class="notification-tabs" role="tablist">
                  <button type="button" role="tab" :aria-selected="notificationTab === 'all'" :class="{ active: notificationTab === 'all' }" @click="notificationTab = 'all'">Todas</button>
                  <button type="button" role="tab" :aria-selected="notificationTab === 'unread'" :class="{ active: notificationTab === 'unread' }" @click="notificationTab = 'unread'">No leídas</button>
                </div>
                <div class="notification-list">
                  <button v-for="notification in shownNotifications" :key="notification.id" type="button" class="notification-entry" :class="{ unread: isUnread(notification) }" @click="markNotificationRead(notification)">
                    <q-avatar size="38px" color="green-1" text-color="primary"><q-icon :name="notification.title.toLowerCase().includes('humedad') ? 'water_drop' : 'notifications_active'" /></q-avatar>
                    <span class="notification-entry-copy"><strong>{{ notification.title }}</strong><span>{{ notification.message }}</span><small>{{ relativeTime(notification.date) }}</small></span>
                    <span v-if="isUnread(notification)" class="notification-unread-dot" aria-label="No leída"></span>
                  </button>
                  <div v-if="!shownNotifications.length" class="notification-empty">No hay notificaciones {{ notificationTab === 'unread' ? 'sin leer' : 'disponibles' }}.</div>
                </div>
                <button type="button" class="notification-view-all" @click="openAllNotifications">Ver todo</button>
              </section>
            </q-menu>
          </div>
          <q-separator vertical inset class="header-separator" />
          <q-btn flat no-caps class="profile-button">
            <q-avatar size="34px" color="green-1" text-color="primary">{{ auth.currentUser?.name?.slice(0, 1) }}</q-avatar>
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
