import { ref } from 'vue'

const STORAGE_KEY = 'agrogestion.data.v1'
const revision = ref(0)

const demoData = {
  users: [
    { id: 'user-admin', name: 'Laura Mendoza', email: 'admin@agrogestion.demo', role: 'Administrador', farms: ['farm-1', 'farm-2'], active: true },
    { id: 'user-supervisor', name: 'Carlos Ríos', email: 'supervisor@agrogestion.demo', role: 'Supervisor', farms: ['farm-1', 'farm-2'], active: true },
    { id: 'user-agronomist', name: 'María Torres', email: 'agronomo@agrogestion.demo', role: 'Agrónomo', farms: ['farm-1'], active: true },
    { id: 'user-operator', name: 'José Pérez', email: 'operario@agrogestion.demo', role: 'Operario', farms: ['farm-1'], active: true }
  ],
  farms: [
    { id: 'farm-1', name: 'El Robledal', municipality: 'Rionegro', department: 'Antioquia', area: 24, owner: 'Laura Mendoza' },
    { id: 'farm-2', name: 'La Esperanza', municipality: 'La Ceja', department: 'Antioquia', area: 18, owner: 'Laura Mendoza' }
  ],
  lots: [
    { id: 'lot-1', name: 'Lote Norte', farmId: 'farm-1', area: 8, soilType: 'Franco', status: 'Activo' },
    { id: 'lot-2', name: 'Lote La Honda', farmId: 'farm-1', area: 6, soilType: 'Franco arcilloso', status: 'Activo' },
    { id: 'lot-3', name: 'Lote 3', farmId: 'farm-2', area: 7, soilType: 'Franco arenoso', status: 'Activo' }
  ],
  crops: [
    { id: 'crop-1', name: 'Aguacate Hass', variety: 'Hass', category: 'Frutal', stages: 'Floración, Cuajado, Desarrollo, Cosecha', inputs: ['input-1', 'input-2'] },
    { id: 'crop-2', name: 'Tomate', variety: 'Chonto', category: 'Hortaliza', stages: 'Germinación, Crecimiento, Floración, Cosecha', inputs: ['input-1', 'input-3'] },
    { id: 'crop-3', name: 'Café', variety: 'Castillo', category: 'Permanente', stages: 'Crecimiento, Floración, Maduración', inputs: ['input-1'] }
  ],
  inputs: [
    { id: 'input-1', name: 'Compost orgánico', category: 'Fertilizante', unit: 'kg', stock: 120, crops: 'Aguacate Hass, Tomate, Café' },
    { id: 'input-2', name: 'Cal agrícola', category: 'Correctivo', unit: 'kg', stock: 80, crops: 'Aguacate Hass' },
    { id: 'input-3', name: 'NPK 15-15-15', category: 'Fertilizante', unit: 'kg', stock: 45, crops: 'Tomate' }
  ],
  cycles: [
    { id: 'cycle-1', name: 'Aguacate · Ciclo 2026', farmId: 'farm-1', lotId: 'lot-1', cropId: 'crop-1', startDate: '2026-02-01', area: 5, target: 12000, status: 'En curso' },
    { id: 'cycle-2', name: 'Tomate · Ciclo 2026', farmId: 'farm-1', lotId: 'lot-2', cropId: 'crop-2', startDate: '2026-03-10', area: 2, target: 8500, status: 'En curso' }
  ],
  activities: [
    { id: 'activity-1', kind: 'Labor', type: 'Fertilización', cycleId: 'cycle-1', date: '2026-10-25', responsible: 'María Torres', description: 'Aplicación de compost en árboles jóvenes', status: 'Completada', notes: '' },
    { id: 'activity-2', kind: 'Incidencia', type: 'Monitoreo fitosanitario', cycleId: 'cycle-2', date: '2026-10-26', responsible: 'José Pérez', description: 'Revisión preventiva de hojas', status: 'En seguimiento', notes: 'Sin afectación crítica' }
  ],
  nurseries: [
    { id: 'nursery-1', name: 'Bandeja Hass octubre', cropId: 'crop-1', cycleId: 'cycle-1', sowingDate: '2026-10-01', germinationDate: '2026-10-12', transplantDate: '', germination: 86, status: 'En seguimiento' }
  ],
  harvests: [
    { id: 'harvest-1', cycleId: 'cycle-1', date: '2026-10-20', quantity: 420, unit: 'kg', quality: 'Primera', notes: 'Lote de prueba' }
  ],
  telemetry: [
    { id: 'reading-1', farmId: 'farm-1', lotId: 'lot-1', date: '2026-10-27T08:30', variable: 'Humedad del suelo', value: 64, unit: '%', simulated: true },
    { id: 'reading-2', farmId: 'farm-1', lotId: 'lot-1', date: '2026-10-26T14:00', variable: 'Temperatura', value: 21.4, unit: '°C', simulated: true },
    { id: 'reading-3', farmId: 'farm-1', lotId: 'lot-2', date: '2026-10-27T07:45', variable: 'Humedad del suelo', value: 58, unit: '%', simulated: true }
  ],
  notifications: [
    { id: 'notice-1', title: 'Revisar humedad de suelo', message: 'Lectura simulada de humedad: 58 % en Lote La Honda.', date: '2026-10-27', lotId: 'lot-2', status: 'Pendiente' },
    { id: 'notice-2', title: 'Seguimiento fitosanitario', message: 'Hay una incidencia en seguimiento para el ciclo de tomate.', date: '2026-10-26', lotId: 'lot-2', status: 'Atendida' }
  ]
}

function readData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(demoData)
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('El formato de almacenamiento guardado no es válido.')
    }
    for (const key of Object.keys(demoData)) {
      if (!Array.isArray(parsed[key])) throw new Error(`Falta la colección local "${key}".`)
    }
    return parsed
  } catch (error) {
    console.error('No fue posible leer los datos locales de SENAgro.', error)
    throw new Error('No se pudieron leer los datos guardados. Revisa el almacenamiento del navegador.')
  }
}

function writeData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    revision.value += 1
  } catch (error) {
    console.error('No fue posible guardar los datos locales de SENAgro.', error)
    throw new Error('No se pudieron guardar los cambios. Revisa el espacio disponible del navegador.')
  }
}

export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) writeData(demoData)
}

export function getRecords(entity) {
  revision.value
  const data = readData()
  return data[entity] ?? []
}

export function getRecord(entity, id) {
  return getRecords(entity).find((record) => record.id === id) ?? null
}

export function saveRecord(entity, record) {
  const data = readData()
  const records = data[entity] ?? []
  const index = records.findIndex((item) => item.id === record.id)
  const saved = { ...record, id: record.id || `${entity.slice(0, -1)}-${crypto.randomUUID()}` }
  if (index >= 0) records.splice(index, 1, saved)
  else records.unshift(saved)
  data[entity] = records
  writeData(data)
  return saved
}

export function removeRecord(entity, id) {
  const data = readData()
  const blockers = {
    farms: [['lots', 'farmId'], ['cycles', 'farmId'], ['telemetry', 'farmId']],
    lots: [['cycles', 'lotId'], ['telemetry', 'lotId'], ['notifications', 'lotId']],
    crops: [['cycles', 'cropId'], ['nurseries', 'cropId']],
    cycles: [['activities', 'cycleId'], ['nurseries', 'cycleId'], ['harvests', 'cycleId']],
    inputs: [['crops', 'inputs']]
  }
  for (const [relatedEntity, field] of blockers[entity] ?? []) {
    if (data[relatedEntity]?.some((item) => Array.isArray(item[field]) ? item[field].includes(id) : item[field] === id)) {
      throw new Error(`No se puede eliminar: todavía existen registros relacionados en ${relatedEntity}.`)
    }
  }
  if (entity === 'farms') {
    data.users = data.users.map((user) => ({ ...user, farms: (user.farms ?? []).filter((farmId) => farmId !== id) }))
  }
  data[entity] = (data[entity] ?? []).filter((item) => item.id !== id)
  if (entity === 'users') {
    data.farms = data.farms.map((farm) => ({ ...farm, users: (farm.users ?? []).filter((userId) => userId !== id) }))
  }
  writeData(data)
}

export function getDemoAccounts() {
  return [
    { username: 'admin', email: 'admin@agrogestion.demo', password: 'Agro2026!', userId: 'user-admin' },
    { username: 'supervisor', email: 'supervisor@agrogestion.demo', password: 'Agro2026!', userId: 'user-supervisor' },
    { username: 'agronomo', email: 'agronomo@agrogestion.demo', password: 'Agro2026!', userId: 'user-agronomist' },
    { username: 'operario', email: 'operario@agrogestion.demo', password: 'Agro2026!', userId: 'user-operator' }
  ]
}
