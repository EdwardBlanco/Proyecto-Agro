import { getRecords, saveRecord, setRecords } from '@/services/storage'

export const BACKEND_TO_FRONTEND_ROLE = {
  superadmin: 'SuperAdmin',
  supervisor: 'SuperAdmin',
  administrador: 'Admin',
  admin: 'Admin',
  operario: 'Operario',
  agronomo: 'Operario',
  'agrónomo': 'Operario'
}

export const FRONTEND_TO_BACKEND_ROLE = {
  SuperAdmin: 'superadmin',
  Supervisor: 'superadmin',
  Admin: 'administrador',
  Administrador: 'administrador',
  Operario: 'operario',
  'Agrónomo': 'operario'
}

export const LOGIN_EMAIL_ALIASES = {
  admin: 'admin@agrogestion.demo',
  administrador: 'admin@agrogestion.demo',
  superadmin: 'superadmin@agrogestion.demo',
  supervisor: 'superadmin@agrogestion.demo',
  operario: 'operario@agrogestion.demo',
  maria: 'maria@agrogestion.demo',
  agronomo: 'maria@agrogestion.demo',
  'agrónomo': 'maria@agrogestion.demo'
}

export function toFrontendRole(rol) {
  if (!rol) return 'Operario'
  if (['SuperAdmin', 'Admin', 'Operario'].includes(rol)) return rol
  const normalized = String(rol).trim().toLowerCase()
  return BACKEND_TO_FRONTEND_ROLE[normalized] || 'Operario'
}

export function toBackendRole(role) {
  if (!role) return 'operario'
  if (FRONTEND_TO_BACKEND_ROLE[role]) return FRONTEND_TO_BACKEND_ROLE[role]
  const normalized = String(role).trim().toLowerCase()
  if (['superadmin', 'administrador', 'operario'].includes(normalized)) return normalized
  if (normalized === 'admin') return 'administrador'
  if (normalized === 'supervisor') return 'superadmin'
  return 'operario'
}

export function normalizeLoginEmail(identifier) {
  const clean = String(identifier ?? '').trim().toLowerCase()
  if (!clean) return ''
  if (clean.includes('@')) return clean
  return LOGIN_EMAIL_ALIASES[clean] || clean
}

export function mapBackendUserToFrontend(backendUser, { syncStorage = true } = {}) {
  if (!backendUser || typeof backendUser !== 'object') return null

  const rawId = backendUser._id ?? backendUser.id ?? ''
  const email = String(backendUser.correo ?? backendUser.email ?? '').trim().toLowerCase()
  const name = String(backendUser.nombre ?? backendUser.name ?? '').trim()
  const role = toFrontendRole(backendUser.rol ?? backendUser.role)
  const active =
    typeof backendUser.estado === 'boolean'
      ? backendUser.estado
      : typeof backendUser.active === 'boolean'
        ? backendUser.active
        : true

  let existingUser = null
  try {
    const localUsers = getRecords('users')
    existingUser =
      localUsers.find(
        (u) =>
          (rawId && String(u.id) === String(rawId)) ||
          (email && String(u.email || '').trim().toLowerCase() === email)
      ) ?? null
  } catch {
    existingUser = null
  }

  const id = String(rawId || existingUser?.id || '')
  const rawFarms = backendUser.farms ?? backendUser.predios_asignados
  let farms = []
  if (Array.isArray(rawFarms)) {
    farms = rawFarms
      .map((item) => (typeof item === 'object' && item !== null ? String(item._id ?? item.id ?? '') : String(item)))
      .filter(Boolean)
  } else if (Array.isArray(existingUser?.farms)) {
    farms = [...existingUser.farms]
  }

  const mappedUser = {
    id,
    name: name || existingUser?.name || '',
    email: email || existingUser?.email || '',
    role,
    active,
    farms
  }

  if (syncStorage && mappedUser.id) {
    try {
      if (existingUser && existingUser.id && existingUser.id !== mappedUser.id) {
        const updatedUsers = getRecords('users').map((u) =>
          u.id === existingUser.id ? mappedUser : u
        )
        setRecords('users', updatedUsers)
        const farms = getRecords('farms')
        if (farms.some((f) => f.owner === existingUser.id)) {
          setRecords(
            'farms',
            farms.map((f) => (f.owner === existingUser.id ? { ...f, owner: mappedUser.id } : f))
          )
        }
      } else {
        saveRecord('users', mappedUser)
      }
    } catch {
      // Ignorar fallos de sincronización en storage local
    }
  }

  return mappedUser
}

export function mapFrontendUserToBackend(frontendUser = {}, { isCreate = false } = {}) {
  if (!frontendUser || typeof frontendUser !== 'object') return {}
  const payload = {
    nombre: String(frontendUser.name ?? frontendUser.nombre ?? '').trim(),
    correo: String(frontendUser.email ?? frontendUser.correo ?? '').trim().toLowerCase(),
    rol: toBackendRole(frontendUser.role ?? frontendUser.rol),
    estado:
      typeof frontendUser.active === 'boolean'
        ? frontendUser.active
        : typeof frontendUser.estado === 'boolean'
          ? frontendUser.estado
          : true
  }

  const password = String(frontendUser.password ?? frontendUser.contrasena ?? '').trim()
  if (password) {
    payload.contrasena = password
  } else if (isCreate) {
    payload.contrasena = 'Agro2026!'
  }

  return payload
}

export function migrateFarmIdReferences(idMigrationMap) {
  if (!idMigrationMap || idMigrationMap.size === 0) return

  try {
    for (const entity of ['lots', 'cycles', 'telemetry']) {
      const records = getRecords(entity)
      let changed = false
      const updated = records.map((item) => {
        if (item.farmId && idMigrationMap.has(item.farmId)) {
          changed = true
          return { ...item, farmId: idMigrationMap.get(item.farmId) }
        }
        return item
      })
      if (changed) {
        setRecords(entity, updated)
      }
    }

    const users = getRecords('users')
    let usersChanged = false
    const updatedUsers = users.map((user) => {
      if (!Array.isArray(user.farms)) return user
      let hasMapped = false
      const nextFarms = user.farms.map((farmId) => {
        if (idMigrationMap.has(farmId)) {
          hasMapped = true
          return idMigrationMap.get(farmId)
        }
        return farmId
      })
      if (hasMapped) {
        usersChanged = true
        return { ...user, farms: Array.from(new Set(nextFarms)) }
      }
      return user
    })
    if (usersChanged) {
      setRecords('users', updatedUsers)
    }
  } catch {
    // Ignorar errores de sincronización local
  }
}

export function mapFrontendFarmToBackend(frontendFarm = {}) {
  if (!frontendFarm || typeof frontendFarm !== 'object') return {}

  const nombre = String(frontendFarm.name ?? frontendFarm.nombre ?? '').trim()

  const municipality = String(frontendFarm.municipality ?? '').trim()
  const department = String(frontendFarm.department ?? '').trim()
  let ubicacion = ''
  if (municipality && department) {
    ubicacion = `${municipality}, ${department}`
  } else if (frontendFarm.ubicacion) {
    ubicacion = String(frontendFarm.ubicacion).trim()
  } else {
    ubicacion = [municipality, department].filter(Boolean).join(', ')
  }

  const rawLat = frontendFarm.latitud ?? frontendFarm.latitude
  const parsedLat =
    rawLat !== undefined && rawLat !== null && rawLat !== '' ? Number(rawLat) : NaN
  const latitud =
    Number.isFinite(parsedLat) && parsedLat >= -90 && parsedLat <= 90 ? parsedLat : 6.1552

  const rawLng = frontendFarm.longitud ?? frontendFarm.longitude
  const parsedLng =
    rawLng !== undefined && rawLng !== null && rawLng !== '' ? Number(rawLng) : NaN
  const longitud =
    Number.isFinite(parsedLng) && parsedLng >= -180 && parsedLng <= 180 ? parsedLng : -75.3737

  let area_m2 = 0
  if (
    frontendFarm.area_m2 !== undefined &&
    frontendFarm.area_m2 !== null &&
    frontendFarm.area_m2 !== '' &&
    Number.isFinite(Number(frontendFarm.area_m2)) &&
    Number(frontendFarm.area_m2) >= 0
  ) {
    area_m2 = Math.round(Number(frontendFarm.area_m2) * 100) / 100
  } else {
    const rawHa = Number(String(frontendFarm.area ?? 0).replace(',', '.'))
    area_m2 =
      Number.isFinite(rawHa) && rawHa >= 0 ? Math.round(rawHa * 10000 * 100) / 100 : 0
  }

  const estado =
    frontendFarm.status !== undefined && frontendFarm.status !== null && frontendFarm.status !== ''
      ? String(frontendFarm.status).trim() !== 'Inactivo'
      : typeof frontendFarm.estado === 'boolean'
        ? frontendFarm.estado
        : true

  return {
    nombre,
    ubicacion,
    latitud,
    longitud,
    area_m2,
    estado
  }
}

export function mapBackendFarmToFrontend(backendFarm, { syncStorage = true } = {}) {
  if (!backendFarm || typeof backendFarm !== 'object') return null

  const rawId = backendFarm._id ?? backendFarm.id ?? ''
  const name = String(backendFarm.nombre ?? backendFarm.name ?? '').trim()

  let existingFarm = null
  try {
    const localFarms = getRecords('farms')
    existingFarm =
      localFarms.find(
        (f) =>
          (rawId && String(f.id) === String(rawId)) ||
          (name && String(f.name || '').trim().toLowerCase() === name.toLowerCase())
      ) ?? null
  } catch {
    existingFarm = null
  }

  const id = String(rawId || existingFarm?.id || '')

  const ubicacion = String(backendFarm.ubicacion ?? '').trim()
  let parsedMunicipality = ''
  let parsedDepartment = ''
  if (ubicacion) {
    const commaIndex = ubicacion.indexOf(',')
    if (commaIndex >= 0) {
      parsedMunicipality = ubicacion.slice(0, commaIndex).trim()
      parsedDepartment = ubicacion.slice(commaIndex + 1).trim()
    } else {
      parsedMunicipality = ubicacion
    }
  }

  const municipality =
    String(backendFarm.municipality ?? '').trim() ||
    parsedMunicipality ||
    existingFarm?.municipality ||
    ''
  const department =
    String(backendFarm.department ?? '').trim() ||
    parsedDepartment ||
    existingFarm?.department ||
    'Antioquia'

  let area = 0
  if (
    backendFarm.area_m2 !== undefined &&
    backendFarm.area_m2 !== null &&
    backendFarm.area_m2 !== '' &&
    Number.isFinite(Number(backendFarm.area_m2))
  ) {
    area = Number((Number(backendFarm.area_m2) / 10000).toFixed(4))
  } else if (
    backendFarm.area !== undefined &&
    backendFarm.area !== null &&
    backendFarm.area !== '' &&
    Number.isFinite(Number(backendFarm.area))
  ) {
    area = Number(backendFarm.area)
  } else if (existingFarm?.area !== undefined) {
    area = Number(existingFarm.area)
  }

  let defaultOwner = 'user-admin'
  try {
    const users = getRecords('users')
    const firstActive = users.find((u) => u.active !== false) || users[0]
    if (firstActive?.id) defaultOwner = firstActive.id
  } catch {
    defaultOwner = 'user-admin'
  }
  const owner = String(backendFarm.owner || existingFarm?.owner || defaultOwner)

  let status = 'Activo'
  if (backendFarm.estado === false) {
    status = 'Inactivo'
  } else if (backendFarm.estado === true) {
    if (
      backendFarm.status === 'En preparación' ||
      (!backendFarm.status && existingFarm?.status === 'En preparación')
    ) {
      status = 'En preparación'
    } else {
      status = 'Activo'
    }
  } else if (['Activo', 'Inactivo', 'En preparación'].includes(backendFarm.status)) {
    status = backendFarm.status
  } else if (['Activo', 'Inactivo', 'En preparación'].includes(existingFarm?.status)) {
    status = existingFarm.status
  }

  const image = backendFarm.image !== undefined ? backendFarm.image : existingFarm?.image

  const mappedFarm = {
    id,
    name: name || existingFarm?.name || '',
    municipality,
    department,
    area,
    owner,
    status,
    ...(image !== undefined ? { image } : {})
  }

  if (syncStorage && mappedFarm.id) {
    try {
      if (existingFarm && existingFarm.id && existingFarm.id !== mappedFarm.id) {
        const updatedFarms = getRecords('farms').map((f) =>
          f.id === existingFarm.id ? mappedFarm : f
        )
        setRecords('farms', updatedFarms)
        migrateFarmIdReferences(new Map([[existingFarm.id, mappedFarm.id]]))
      } else {
        saveRecord('farms', mappedFarm)
      }
    } catch {
      // Ignorar fallos de sincronización en storage local
    }
  }

  return mappedFarm
}
