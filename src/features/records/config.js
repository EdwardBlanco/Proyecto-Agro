const ref = (entity) => ({ entity })

export const entityConfig = {
  farms: {
    entity: 'farms', singular: 'predio', title: 'Predios y lotes', description: 'Administra tus predios y organiza sus lotes.',
    columns: [['name', 'Predio'], ['municipality', 'Municipio'], ['department', 'Departamento'], ['area', 'Área (ha)'], ['lotsCount', 'Lotes']],
    fields: [
      { key: 'name', label: 'Nombre del predio', required: true },
      { key: 'municipality', label: 'Municipio', required: true },
      { key: 'department', label: 'Departamento', required: true },
      { key: 'area', label: 'Área total (ha)', type: 'number', required: true, min: 0.01 },
      { key: 'owner', label: 'Responsable', required: true }
    ]
  },
  lots: {
    entity: 'lots', singular: 'lote', title: 'Lotes', description: 'Lotes y áreas productivas asociadas a cada predio.',
    columns: [['name', 'Lote'], ['farmName', 'Predio'], ['area', 'Área (ha)'], ['soilType', 'Tipo de suelo'], ['status', 'Estado']],
    fields: [
      { key: 'name', label: 'Nombre del lote', required: true },
      { key: 'farmId', label: 'Predio', type: 'ref', ...ref('farms'), required: true },
      { key: 'area', label: 'Área disponible (ha)', type: 'number', required: true, min: 0.01 },
      { key: 'soilType', label: 'Tipo de suelo', required: true },
      { key: 'status', label: 'Estado', type: 'select', options: ['Activo', 'En descanso', 'Inactivo'], required: true }
    ]
  },
  crops: {
    entity: 'crops', singular: 'cultivo', title: 'Cultivos y catálogo agrícola', description: 'Catálogo de cultivos, variedades, etapas fenológicas e insumos relacionados.',
    columns: [['name', 'Cultivo'], ['variety', 'Variedad'], ['category', 'Categoría'], ['stages', 'Etapas fenológicas'], ['inputsLabel', 'Insumos asociados']],
    fields: [
      { key: 'name', label: 'Nombre del cultivo', required: true },
      { key: 'variety', label: 'Variedad', required: true },
      { key: 'category', label: 'Categoría', type: 'select', options: ['Frutal', 'Hortaliza', 'Permanente', 'Cereal', 'Otro'], required: true },
      { key: 'stages', label: 'Etapas fenológicas (separadas por coma)', type: 'textarea', required: true },
      { key: 'inputs', label: 'Insumos asociados', type: 'ref', entity: 'inputs', multiple: true }
    ]
  },
  inputs: {
    entity: 'inputs', singular: 'insumo', title: 'Insumos y agroquímicos', description: 'Consulta y administra el catálogo de insumos de uso agrícola.',
    columns: [['name', 'Insumo'], ['category', 'Categoría'], ['unit', 'Unidad'], ['stock', 'Existencia'], ['crops', 'Cultivos asociados']],
    fields: [
      { key: 'name', label: 'Nombre del insumo', required: true },
      { key: 'category', label: 'Categoría', type: 'select', options: ['Fertilizante', 'Agroquímico', 'Semilla', 'Correctivo', 'Herramienta', 'Otro'], required: true },
      { key: 'unit', label: 'Unidad de medida', required: true },
      { key: 'stock', label: 'Existencia (opcional)', type: 'number', min: 0 },
      { key: 'crops', label: 'Cultivos asociados', type: 'textarea' }
    ]
  },
  cycles: {
    entity: 'cycles', singular: 'ciclo productivo', title: 'Ciclos productivos', description: 'Sigue la evolución de cada cultivo desde la siembra hasta la cosecha.',
    columns: [['name', 'Ciclo'], ['farmName', 'Predio'], ['lotName', 'Lote'], ['cropName', 'Cultivo'], ['startDate', 'Inicio'], ['area', 'Área (ha)'], ['status', 'Estado']],
    fields: [
      { key: 'name', label: 'Nombre del ciclo', required: true },
      { key: 'farmId', label: 'Predio', type: 'ref', ...ref('farms'), required: true },
      { key: 'lotId', label: 'Lote', type: 'ref', ...ref('lots'), required: true },
      { key: 'cropId', label: 'Cultivo', type: 'ref', ...ref('crops'), required: true },
      { key: 'startDate', label: 'Fecha de inicio', type: 'date', required: true },
      { key: 'area', label: 'Área sembrada (ha)', type: 'number', required: true, min: 0.01 },
      { key: 'target', label: 'Meta de producción (kg)', type: 'number', min: 0 },
      { key: 'status', label: 'Estado del ciclo', type: 'select', options: ['Planeado', 'En curso', 'Finalizado', 'Suspendido'], required: true }
    ]
  },
  activities: {
    entity: 'activities', singular: 'registro', title: 'Labores e incidencias', description: 'Historial de labores culturales e incidencias vinculadas a un ciclo.',
    columns: [['kind', 'Tipo de registro'], ['type', 'Actividad'], ['cycleName', 'Ciclo productivo'], ['date', 'Fecha'], ['responsible', 'Responsable'], ['status', 'Seguimiento']],
    fields: [
      { key: 'kind', label: 'Registro', type: 'select', options: ['Labor', 'Incidencia'], required: true },
      { key: 'type', label: 'Tipo de labor o incidencia', required: true },
      { key: 'cycleId', label: 'Ciclo productivo', type: 'ref', ...ref('cycles'), required: true },
      { key: 'date', label: 'Fecha', type: 'date', required: true },
      { key: 'responsible', label: 'Responsable', required: true },
      { key: 'description', label: 'Descripción', type: 'textarea', required: true },
      { key: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'En seguimiento', 'Completada'], required: true },
      { key: 'notes', label: 'Observaciones', type: 'textarea' }
    ]
  },
  nurseries: {
    entity: 'nurseries', singular: 'semillero', title: 'Semilleros', description: 'Registra siembra, germinación y trasplante de tus semilleros.',
    columns: [['name', 'Semillero'], ['cropName', 'Cultivo'], ['cycleName', 'Ciclo'], ['sowingDate', 'Siembra'], ['germination', 'Germinación (%)'], ['status', 'Estado']],
    fields: [
      { key: 'name', label: 'Nombre del semillero', required: true },
      { key: 'cropId', label: 'Cultivo', type: 'ref', ...ref('crops'), required: true },
      { key: 'cycleId', label: 'Ciclo asociado (opcional)', type: 'ref', ...ref('cycles') },
      { key: 'sowingDate', label: 'Fecha de siembra', type: 'date', required: true },
      { key: 'germinationDate', label: 'Fecha de germinación', type: 'date' },
      { key: 'transplantDate', label: 'Fecha de trasplante', type: 'date' },
      { key: 'germination', label: 'Germinación (%)', type: 'number', min: 0, max: 100 },
      { key: 'status', label: 'Estado', type: 'select', options: ['En seguimiento', 'Listo para trasplante', 'Trasplantado', 'Finalizado'], required: true }
    ]
  },
  harvests: {
    entity: 'harvests', singular: 'cosecha', title: 'Cosechas y producción', description: 'Consulta la producción acumulada y registra cosechas vinculadas a su ciclo.',
    columns: [['cycleName', 'Ciclo productivo'], ['date', 'Fecha'], ['quantity', 'Cantidad'], ['unit', 'Unidad'], ['quality', 'Calidad']],
    fields: [
      { key: 'cycleId', label: 'Ciclo productivo', type: 'ref', ...ref('cycles'), required: true },
      { key: 'date', label: 'Fecha de cosecha', type: 'date', required: true },
      { key: 'quantity', label: 'Cantidad', type: 'number', required: true, min: 0.01 },
      { key: 'unit', label: 'Unidad', type: 'select', options: ['kg', 'toneladas', 'unidades', 'cajas'], required: true },
      { key: 'quality', label: 'Clasificación / calidad', type: 'select', options: ['Primera', 'Segunda', 'Tercera', 'Sin clasificar'], required: true },
      { key: 'notes', label: 'Observaciones', type: 'textarea' }
    ]
  },
  telemetry: {
    entity: 'telemetry', singular: 'lectura', title: 'Telemetría e IoT', description: 'Historial demostrativo de lecturas. No hay sensores reales conectados.',
    columns: [['farmName', 'Predio'], ['lotName', 'Lote'], ['variable', 'Variable'], ['valueWithUnit', 'Lectura'], ['date', 'Fecha'], ['simulatedLabel', 'Origen']],
    fields: [
      { key: 'farmId', label: 'Predio', type: 'ref', ...ref('farms'), required: true },
      { key: 'lotId', label: 'Lote', type: 'ref', ...ref('lots'), required: true },
      { key: 'variable', label: 'Variable medida', type: 'select', options: ['Humedad del suelo', 'Temperatura', 'Precipitación', 'Humedad ambiental', 'pH'], required: true },
      { key: 'value', label: 'Valor', type: 'number', required: true },
      { key: 'unit', label: 'Unidad', required: true },
      { key: 'date', label: 'Fecha y hora', type: 'datetime-local', required: true }
    ]
  },
  notifications: {
    entity: 'notifications', singular: 'notificación', title: 'Notificaciones', description: 'Avisos locales sobre eventos y lecturas de demostración.',
    columns: [['title', 'Notificación'], ['message', 'Detalle'], ['date', 'Fecha'], ['status', 'Estado']],
    fields: [
      { key: 'title', label: 'Título', required: true },
      { key: 'message', label: 'Detalle', type: 'textarea', required: true },
      { key: 'date', label: 'Fecha', type: 'date', required: true },
      { key: 'lotId', label: 'Lote relacionado (opcional)', type: 'ref', ...ref('lots') },
      { key: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'Atendida'], required: true }
    ]
  },
  users: {
    entity: 'users', singular: 'usuario', title: 'Usuarios y permisos', description: 'Administra cuentas locales de demostración y su acceso a predios.',
    columns: [['name', 'Nombre'], ['email', 'Correo'], ['role', 'Rol'], ['farmsLabel', 'Predios asignados'], ['activeLabel', 'Estado']],
    fields: [
      { key: 'name', label: 'Nombre completo', required: true },
      { key: 'email', label: 'Correo', type: 'email', required: true },
      { key: 'role', label: 'Rol', type: 'select', options: ['Administrador', 'Supervisor', 'Agrónomo', 'Operario'], required: true },
      { key: 'farms', label: 'Predios autorizados', type: 'farms', multiple: true },
      { key: 'active', label: 'Estado', type: 'select-value', options: [{ label: 'Activo', value: true }, { label: 'Inactivo', value: false }], required: true }
    ]
  }
}
