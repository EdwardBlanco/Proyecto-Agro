/**
 * Adaptadores bidireccionales entre los esquemas del backend (MongoDB / API REST en español)
 * y el modelo interno del frontend (en inglés), incluyendo la sincronización con storage.js.
 */
import { getRecords, saveRecord, setRecords } from '@/services/storage'

// Diccionario de equivalencias entre roles del backend y nombres de rol en la UI del frontend
export const BACKEND_TO_FRONTEND_ROLE = {
  superadmin: 'SuperAdmin',
  supervisor: 'SuperAdmin',
  administrador: 'Admin',
  admin: 'Admin',
  operario: 'Operario',
  agronomo: 'Operario',
  'agrónomo': 'Operario'
}

// Diccionario inverso para enviar roles normalizados al backend
export const FRONTEND_TO_BACKEND_ROLE = {
  SuperAdmin: 'superadmin',
  Supervisor: 'superadmin',
  Admin: 'administrador',
  Administrador: 'administrador',
  Operario: 'operario',
  'Agrónomo': 'operario'
}

// Alias cortos permitidos en el formulario de inicio de sesión para cuentas de demostración
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

/**
 * Convierte un rol proveniente del backend al formato esperado por permissions.js y la UI.
 */
export function toFrontendRole(role) {
  if (!role) return 'Operario'
  if (['SuperAdmin', 'Admin', 'Operario'].includes(role)) return role
  const normalized = String(role).trim().toLowerCase()
  return BACKEND_TO_FRONTEND_ROLE[normalized] || 'Operario'
}

/**
 * Convierte un rol del frontend al identificador aceptado por la API del backend.
 */
export function toBackendRole(role) {
  if (!role) return 'operario'
  if (FRONTEND_TO_BACKEND_ROLE[role]) return FRONTEND_TO_BACKEND_ROLE[role]
  const normalized = String(role).trim().toLowerCase()
  if (['superadmin', 'administrador', 'operario'].includes(normalized)) return normalized
  if (normalized === 'admin') return 'administrador'
  if (normalized === 'supervisor') return 'superadmin'
  return 'operario'
}

/**
 * Normaliza el identificador ingresado en el login (correo completo o alias demo).
 */
export function normalizeLoginEmail(identifier) {
  const clean = String(identifier ?? '').trim().toLowerCase()
  if (!clean) return ''
  if (clean.includes('@')) return clean
  return LOGIN_EMAIL_ALIASES[clean] || clean
}

/**
 * Transforma un documento de usuario recibido desde el backend al formato del frontend.
 * Opcionalmente sincroniza el registro en localStorage preservando predios asignados locales.
 */
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
    ...existingUser,
    id,
    name: name || existingUser?.name || '',
    email: email || existingUser?.email || '',
    role,
    active,
    farms,
    ...(backendUser.eppStatus !== undefined || existingUser?.eppStatus !== undefined
      ? { eppStatus: backendUser.eppStatus ?? existingUser?.eppStatus }
      : {}),
    ...(backendUser.eppDeliveredAt !== undefined || existingUser?.eppDeliveredAt !== undefined
      ? { eppDeliveredAt: backendUser.eppDeliveredAt ?? existingUser?.eppDeliveredAt }
      : {}),
    ...(backendUser.trainingRecords !== undefined || existingUser?.trainingRecords !== undefined
      ? { trainingRecords: backendUser.trainingRecords ?? existingUser?.trainingRecords }
      : {})
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

/**
 * Transforma un usuario del formulario del frontend al payload esperado por POST/PATCH /usuarios.
 */
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
  if (Array.isArray(frontendUser.farms)) {
    payload.predios_asignados = Array.from(new Set(frontendUser.farms.map((farmId) => String(farmId).trim()).filter(Boolean)))
  }

  const password = String(frontendUser.password ?? frontendUser.contrasena ?? '').trim()
  if (password) {
    payload.contrasena = password
  } else if (isCreate) {
    // Contraseña inicial por defecto cuando se crea una cuenta sin definir clave explícita
    payload.contrasena = 'Agro2026!'
  }

  return payload
}

/**
 * Actualiza referencias locales de farmId en lotes, ciclos, telemetría y usuarios
 * cuando un predio demo pasa a tener su ObjectId real proveniente de MongoDB.
 */
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

/**
 * Convierte un predio del frontend (área en hectáreas, municipio/departamento, estado textual)
 * al payload esperado por POST/PATCH /predios (área en m², ubicación compuesta y estado booleano).
 */
export function mapFrontendFarmToBackend(frontendFarm = {}) {
  if (!frontendFarm || typeof frontendFarm !== 'object') return {}

  const name = String(frontendFarm.name ?? frontendFarm.nombre ?? '').trim()

  const municipality = String(frontendFarm.municipality ?? '').trim()
  const department = String(frontendFarm.department ?? '').trim()
  let location = ''
  if (municipality && department) {
    location = `${municipality}, ${department}`
  } else if (frontendFarm.ubicacion) {
    location = String(frontendFarm.ubicacion).trim()
  } else {
    location = [municipality, department].filter(Boolean).join(', ')
  }

  const rawLat = frontendFarm.latitud ?? frontendFarm.latitude
  const rawLng = frontendFarm.longitud ?? frontendFarm.longitude
  const coordinate = (label, rawValue, min, max) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return undefined
    const number = Number(rawValue)
    if (!Number.isFinite(number) || number < min || number > max) {
      throw new Error(`${label} debe estar en el rango ${min} a ${max}.`)
    }
    return number
  }
  const latitude = coordinate('La latitud', rawLat, -90, 90)
  const longitude = coordinate('La longitud', rawLng, -180, 180)

  // Conversión de hectáreas (frontend) a metros cuadrados (backend)
  let areaM2 = 0
  if (
    frontendFarm.area_m2 !== undefined &&
    frontendFarm.area_m2 !== null &&
    frontendFarm.area_m2 !== '' &&
    Number.isFinite(Number(frontendFarm.area_m2)) &&
    Number(frontendFarm.area_m2) >= 0
  ) {
    areaM2 = Math.round(Number(frontendFarm.area_m2) * 100) / 100
  } else {
    const rawHa = Number(String(frontendFarm.area ?? 0).replace(',', '.'))
    areaM2 =
      Number.isFinite(rawHa) && rawHa >= 0 ? Math.round(rawHa * 10000 * 100) / 100 : 0
  }

  const active =
    frontendFarm.status !== undefined && frontendFarm.status !== null && frontendFarm.status !== ''
      ? String(frontendFarm.status).trim() !== 'Inactivo'
      : typeof frontendFarm.estado === 'boolean'
        ? frontendFarm.estado
        : true

  const payload = {
    nombre: name,
    ubicacion: location,
    area_m2: areaM2,
    estado: active
  }
  if (latitude !== undefined) payload.latitud = latitude
  if (longitude !== undefined) payload.longitud = longitude
  if (frontendFarm.owner !== undefined && frontendFarm.owner !== null && frontendFarm.owner !== '') {
    payload.responsable = String(frontendFarm.owner)
  }
  return payload
}

/**
 * Transforma un predio recibido del backend al modelo del frontend, convirtiendo m² a hectáreas,
 * separando municipio/departamento y conservando metadatos locales (responsable, imagen, estado intermedio).
 */
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

  const location = String(backendFarm.ubicacion ?? '').trim()
  let parsedMunicipality = ''
  let parsedDepartment = ''
  if (location) {
    const commaIndex = location.indexOf(',')
    if (commaIndex >= 0) {
      parsedMunicipality = location.slice(0, commaIndex).trim()
      parsedDepartment = location.slice(commaIndex + 1).trim()
    } else {
      parsedMunicipality = location
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
    ''

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

  const owner = backendFarm.responsable ?? backendFarm.owner ?? existingFarm?.owner

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

  const localFields = ['landUse', 'waterSources', 'environmentNotes', 'documentReferences']
  const localMetadata = Object.fromEntries(localFields
    .filter((key) => backendFarm[key] !== undefined || existingFarm?.[key] !== undefined)
    .map((key) => [key, backendFarm[key] ?? existingFarm?.[key]]))
  const mappedFarm = {
    ...existingFarm,
    ...localMetadata,
    id,
    name: name || existingFarm?.name || '',
    municipality,
    department,
    area,
    status,
    ...(owner !== undefined && owner !== null && owner !== '' ? { owner: String(owner) } : {}),
    ...(backendFarm.latitud !== undefined || backendFarm.latitude !== undefined
      ? { latitude: Number(backendFarm.latitud ?? backendFarm.latitude) }
      : existingFarm?.latitude !== undefined ? { latitude: existingFarm.latitude } : {}),
    ...(backendFarm.longitud !== undefined || backendFarm.longitude !== undefined
      ? { longitude: Number(backendFarm.longitud ?? backendFarm.longitude) }
      : existingFarm?.longitude !== undefined ? { longitude: existingFarm.longitude } : {}),
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
