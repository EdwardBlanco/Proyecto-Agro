/**
 * Diccionario declarativo de configuración por entidad para RecordsPage.vue y RecordFormField.vue.
 * Define columnas de tabla/tarjeta, campos de formulario, validaciones y relaciones entre módulos.
 */
const ref = (entity) => ({ entity })

export const entityConfig = {
  farms: {
    entity: 'farms', singular: 'predio', title: 'Predios y lotes', description: 'Administra tus predios y organiza sus lotes.',
    columns: [['name', 'Predio'], ['municipality', 'Municipio'], ['department', 'Departamento'], ['areaLabel', 'Área (HA)'], ['status', 'Estado'], ['lotsCount', 'Lotes']],
    sections: [
      { title: 'Identificación y ubicación', fields: ['name', 'municipality', 'department', 'latitude', 'longitude'] },
      { title: 'Área y administración', fields: ['area', 'landUse', 'owner', 'status'] },
      { title: 'Agua, ambiente y documentos', fields: ['waterSources', 'environmentNotes', 'documentReferences'] }
    ],
    fields: [
      { key: 'name', label: 'Nombre del predio', required: true, maxLength: 30 },
      { key: 'municipality', label: 'Municipio', required: true, maxLength: 30, textOnly: true },
      { key: 'department', label: 'Departamento', required: true, maxLength: 30, textOnly: true },
      { key: 'latitude', label: 'Latitud', type: 'number', min: -90, max: 90, step: 0.000001, maxLength: 12 },
      { key: 'longitude', label: 'Longitud', type: 'number', min: -180, max: 180, step: 0.000001, maxLength: 13 },
      { key: 'area', label: 'Área total · HA (Hectáreas)', type: 'number', required: true, min: 0.01, step: 0.01, maxLength: 10 },
      { key: 'landUse', label: 'Uso del suelo', maxLength: 100 },
      { key: 'owner', label: 'Responsable', type: 'users', required: true },
      { key: 'status', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo', 'En preparación'], required: true },
      { key: 'waterSources', label: 'Fuentes de agua identificadas', type: 'textarea', maxLength: 500, placeholder: 'Una fuente por línea; describe el uso si se conoce.' },
      { key: 'environmentNotes', label: 'Manejo ambiental y protección hídrica', type: 'textarea', maxLength: 500 },
      { key: 'documentReferences', label: 'Referencias documentales (una URL por línea)', type: 'textarea', maxLength: 1000, urlList: true }
    ]
  },
  lots: {
    entity: 'lots', singular: 'lote', title: 'Lotes', description: 'Lotes y áreas productivas asociadas a cada predio.',
    columns: [['name', 'Lote'], ['farmName', 'Predio'], ['areaLabel', 'Área (HA)'], ['soilType', 'Tipo de suelo'], ['status', 'Estado']],
    sections: [
      { title: 'Identificación y ubicación productiva', fields: ['name', 'farmId', 'responsible', 'status'] },
      { title: 'Área y suelo', fields: ['area', 'soilType', 'soilAnalysisDate', 'soilNotes'] },
      { title: 'Agua y ambiente', fields: ['waterSource', 'waterProtection'] }
    ],
    fields: [
      { key: 'name', label: 'Nombre del lote', required: true, maxLength: 30 },
      { key: 'farmId', label: 'Predio', type: 'ref', ...ref('farms'), required: true },
      { key: 'area', label: 'Área disponible · HA (Hectáreas)', type: 'number', required: true, min: 0.01, step: 0.01, maxLength: 10 },
      { key: 'soilType', label: 'Tipo de suelo', required: true, maxLength: 30, textOnly: true },
      { key: 'soilAnalysisDate', label: 'Fecha del último análisis de suelo', type: 'date' },
      { key: 'soilNotes', label: 'Observaciones del suelo', type: 'textarea', maxLength: 500 },
      { key: 'waterSource', label: 'Fuente de agua utilizada', maxLength: 120 },
      { key: 'waterProtection', label: 'Medidas de protección de la fuente hídrica', type: 'textarea', maxLength: 500 },
      { key: 'responsible', label: 'Responsable del lote', type: 'users', required: true },
      { key: 'status', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo', 'En preparación'], required: true }
    ]
  },
  crops: {
    entity: 'crops', singular: 'cultivo', title: 'Cultivos y catálogo agrícola', description: 'Catálogo de cultivos, variedades, etapas fenológicas e insumos relacionados.',
    columns: [['name', 'Cultivo'], ['variety', 'Variedad'], ['category', 'Categoría'], ['stages', 'Etapas fenológicas'], ['inputsLabel', 'Insumos asociados']],
    sections: [
      { title: 'Identificación del cultivo', fields: ['name', 'variety', 'category', 'otherCategory', 'emoji'] },
      { title: 'Información técnica', fields: ['stages', 'inputs'] }
    ],
    fields: [
      { key: 'name', label: 'Nombre del cultivo', required: true, maxLength: 40, textOnly: true },
      { key: 'emoji', label: 'Emoji de referencia', type: 'emoji', default: '🌱', required: true },
      { key: 'variety', label: 'Variedad', required: true, maxLength: 40, textOnly: true },
      { key: 'category', label: 'Categoría', type: 'select', options: ['Frutal', 'Hortaliza', 'Permanente', 'Cereal', 'Otro'], required: true },
      { key: 'otherCategory', label: 'Especifica la categoría', required: true, maxLength: 40, textOnly: true, placeholder: 'Escribe la categoría del cultivo' },
      { key: 'stages', label: 'Etapas fenológicas (separadas por coma)', type: 'textarea', required: true, maxLength: 200 },
      { key: 'inputs', label: 'Insumos asociados', type: 'ref', entity: 'inputs', multiple: true }
    ]
  },
  inputs: {
    entity: 'inputs', singular: 'insumo', title: 'Insumos y agroquímicos', description: 'Consulta y administra el catálogo de insumos de uso agrícola.',
    columns: [['name', 'Insumo'], ['category', 'Categoría'], ['unit', 'Unidad'], ['stock', 'Existencia'], ['crops', 'Cultivos asociados']],
    sections: [
      { title: 'Identificación y clasificación', fields: ['name', 'emoji', 'category', 'manufacturer', 'registrationNumber', 'activeIngredient'] },
      { title: 'Inventario y uso', fields: ['unit', 'stock', 'crops', 'storageConditions'] },
      { title: 'Fichas y seguridad', fields: ['technicalSheetUrl', 'safetySheetUrl'] }
    ],
    fields: [
      { key: 'name', label: 'Nombre del insumo', required: true, maxLength: 40, textOnly: true },
      { key: 'emoji', label: 'Emoji de referencia', type: 'emoji', default: '🧪', required: true },
      { key: 'category', label: 'Categoría', type: 'select', options: ['Fertilizante', 'Agroquímico', 'Bioinsumo', 'Semilla', 'Correctivo', 'Herramienta', 'Otro'], required: true },
      { key: 'manufacturer', label: 'Fabricante o proveedor', maxLength: 100 },
      { key: 'registrationNumber', label: 'Registro ICA (cuando aplique)', maxLength: 60, visibleWhen: { category: ['Fertilizante', 'Agroquímico', 'Bioinsumo', 'Semilla'] } },
      { key: 'activeIngredient', label: 'Ingrediente activo (si aplica)', maxLength: 100, visibleWhen: { category: ['Agroquímico'] } },
      { key: 'unit', label: 'Unidad de medida', type: 'select', options: ['kg', 'g', 'toneladas', 'L', 'mL', 'unidades', 'cajas'], required: true },
      { key: 'stock', label: 'Existencia de referencia', type: 'number', min: 0, step: 0.01, maxLength: 10 },
      { key: 'crops', label: 'Cultivos asociados', type: 'ref', ...ref('crops'), multiple: true },
      { key: 'storageConditions', label: 'Condiciones de almacenamiento indicadas', type: 'textarea', maxLength: 500 },
      { key: 'technicalSheetUrl', label: 'URL de ficha técnica', type: 'url', maxLength: 500 },
      { key: 'safetySheetUrl', label: 'URL de ficha de seguridad', type: 'url', maxLength: 500 }
    ]
  },
  cycles: {
    entity: 'cycles', singular: 'ciclo productivo', title: 'Ciclos productivos', description: 'Sigue la evolución de cada cultivo desde la siembra hasta la cosecha.',
    columns: [['name', 'Ciclo'], ['farmName', 'Predio'], ['lotName', 'Lote'], ['cropName', 'Cultivo'], ['startDate', 'Inicio'], ['areaLabel', 'Área (HA)'], ['status', 'Estado']],
    sections: [
      { title: 'Identificación y relaciones', fields: ['name', 'farmId', 'lotId', 'cropId', 'responsible'] },
      { title: 'Establecimiento y planificación', fields: ['startDate', 'estimatedEndDate', 'area', 'plantingMethod', 'plantingDensity', 'propagationMaterial'] },
      { title: 'Seguimiento', fields: ['target', 'status', 'notes'] }
    ],
    fields: [
      { key: 'name', label: 'Nombre del ciclo', required: true, maxLength: 60 },
      { key: 'farmId', label: 'Predio', type: 'ref', ...ref('farms'), required: true },
      { key: 'lotId', label: 'Lote', type: 'ref', ...ref('lots'), required: true },
      { key: 'cropId', label: 'Cultivo', type: 'ref', ...ref('crops'), required: true },
      { key: 'startDate', label: 'Fecha de inicio', type: 'date', required: true },
      { key: 'estimatedEndDate', label: 'Fecha estimada de finalización', type: 'date' },
      { key: 'area', label: 'Área sembrada (HA)', type: 'number', required: true, min: 0.01, maxLength: 10 },
      { key: 'plantingMethod', label: 'Sistema o método de siembra', maxLength: 100 },
      { key: 'plantingDensity', label: 'Densidad de siembra (plantas/HA)', type: 'number', min: 0.01, step: 0.1, maxLength: 10 },
      { key: 'propagationMaterial', label: 'Material de propagación y procedencia', maxLength: 200 },
      { key: 'responsible', label: 'Responsable del ciclo', type: 'users', role: 'Operario', valueField: 'name' },
      { key: 'target', label: 'Meta de producción (kg)', type: 'number', min: 0, maxLength: 10 },
      { key: 'status', label: 'Estado del ciclo', type: 'select', options: ['Planeado', 'En curso', 'Finalizado', 'Suspendido'], required: true },
      { key: 'notes', label: 'Observaciones', type: 'textarea', maxLength: 500 }
    ]
  },
  activities: {
    entity: 'activities', singular: 'registro', title: 'Labores e incidencias', description: 'Historial de labores culturales e incidencias vinculadas a un ciclo.',
    columns: [['kind', 'Tipo de registro'], ['type', 'Actividad'], ['cycleName', 'Ciclo productivo'], ['date', 'Fecha'], ['responsible', 'Responsable'], ['status', 'Seguimiento']],
    fields: [
      { key: 'kind', label: 'Registro', type: 'select', options: ['Labor', 'Incidencia'], required: true },
      { key: 'type', label: 'Tipo de labor o incidencia', required: true, maxLength: 50 },
      { key: 'cycleId', label: 'Ciclo productivo', type: 'ref', ...ref('cycles'), required: true },
      { key: 'date', label: 'Fecha', type: 'date', required: true },
      { key: 'time', label: 'Hora programada o de ejecución', type: 'time' },
      { key: 'priority', label: 'Prioridad de la incidencia', type: 'select', options: ['Baja', 'Media', 'Alta'], visibleWhen: { kind: ['Incidencia'] } },
      { key: 'responsible', label: 'Responsable', type: 'users', required: true, role: 'Operario', valueField: 'name' },
      { key: 'participants', label: 'Personal participante', type: 'users', role: 'Operario', valueField: 'name', multiple: true },
      { key: 'description', label: 'Descripción', type: 'textarea', required: true, maxLength: 300 },
      { key: 'inputIds', label: 'Otros insumos utilizados (si aplica)', type: 'ref', ...ref('inputs'), multiple: true, visibleWhen: { kind: ['Labor'] } },
      { key: 'applicationType', label: 'Tipo de aplicación agrícola', type: 'select', options: ['Plaguicida', 'Fertilizante', 'Bioinsumo', 'Otro'], visibleWhen: { kind: ['Labor'] } },
      { key: 'applications', label: 'Detalle de productos aplicados', type: 'application-products', multiple: true, visibleWhen: { applicationType: ['Plaguicida', 'Fertilizante', 'Bioinsumo', 'Otro'] } },
      { key: 'equipmentUsed', label: 'Equipos o herramientas utilizados', type: 'textarea', maxLength: 300, visibleWhen: { kind: ['Labor'] } },
      { key: 'evidenceReferences', label: 'Referencias de evidencia (una URL por línea)', type: 'textarea', maxLength: 1000, urlList: true },
      { key: 'correctiveAction', label: 'Acciones correctivas o seguimiento', type: 'textarea', maxLength: 500, visibleWhen: { kind: ['Incidencia'] } },
      { key: 'followUpDate', label: 'Fecha de seguimiento', type: 'date', visibleWhen: { kind: ['Incidencia'] } },
      { key: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'En seguimiento', 'Completada'], required: true },
      { key: 'notes', label: 'Observaciones', type: 'textarea', maxLength: 300 }
    ]
  },
  nurseries: {
    entity: 'nurseries', singular: 'semillero', title: 'Semilleros', description: 'Registra siembra, germinación y trasplante de tus semilleros.',
    columns: [['name', 'Semillero'], ['cropName', 'Cultivo'], ['cycleName', 'Ciclo'], ['sowingDate', 'Siembra'], ['germination', 'Germinación (%)'], ['status', 'Estado']],
    sections: [
      { title: 'Identificación y material', fields: ['name', 'cropId', 'cycleId', 'seedSource', 'seedLot'] },
      { title: 'Producción del semillero', fields: ['sowingDate', 'quantity', 'unit', 'substrate', 'productionConditions', 'treatments'] },
      { title: 'Desarrollo y destino', fields: ['germinationDate', 'germination', 'transplantDate', 'destination', 'status'] }
    ],
    fields: [
      { key: 'name', label: 'Nombre del semillero', required: true, maxLength: 50 },
      { key: 'cropId', label: 'Cultivo', type: 'ref', ...ref('crops'), required: true },
      { key: 'cycleId', label: 'Ciclo asociado (opcional)', type: 'ref', ...ref('cycles') },
      { key: 'seedSource', label: 'Procedencia del material de propagación', maxLength: 150 },
      { key: 'seedLot', label: 'Lote o identificación del material', maxLength: 80 },
      { key: 'sowingDate', label: 'Fecha de siembra', type: 'date', required: true },
      { key: 'quantity', label: 'Cantidad sembrada', type: 'number', min: 0.01, step: 1, maxLength: 10 },
      { key: 'unit', label: 'Unidad de cantidad', type: 'select', options: ['semillas', 'plántulas', 'bandejas', 'unidades'] },
      { key: 'substrate', label: 'Sustrato', maxLength: 100 },
      { key: 'productionConditions', label: 'Condiciones de producción', type: 'textarea', maxLength: 500 },
      { key: 'treatments', label: 'Tratamientos aplicados', type: 'textarea', maxLength: 500 },
      { key: 'germinationDate', label: 'Fecha de germinación', type: 'date' },
      { key: 'transplantDate', label: 'Fecha de trasplante', type: 'date' },
      { key: 'germination', label: 'Germinación (%)', type: 'number', min: 0, max: 100, maxLength: 3 },
      { key: 'destination', label: 'Destino del material vegetal', maxLength: 150 },
      { key: 'status', label: 'Estado', type: 'select', options: ['En seguimiento', 'Listo para trasplante', 'Trasplantado', 'Finalizado'], required: true }
    ]
  },
  harvests: {
    entity: 'harvests', singular: 'cosecha', title: 'Cosechas y producción', description: 'Consulta la producción acumulada y registra cosechas vinculadas a su ciclo.',
    columns: [['cycleName', 'Ciclo productivo'], ['date', 'Fecha'], ['quantity', 'Cantidad'], ['unit', 'Unidad'], ['quality', 'Calidad']],
    sections: [
      { title: 'Trazabilidad', fields: ['cycleId', 'date', 'traceabilityCode', 'responsible'] },
      { title: 'Cantidad y clasificación', fields: ['quantity', 'unit', 'quality'] },
      { title: 'Destino y observaciones', fields: ['destination', 'notes'] }
    ],
    fields: [
      { key: 'cycleId', label: 'Ciclo productivo', type: 'ref', ...ref('cycles'), required: true },
      { key: 'date', label: 'Fecha de cosecha', type: 'date', required: true },
      { key: 'traceabilityCode', label: 'Código de trazabilidad (opcional)', maxLength: 60 },
      { key: 'responsible', label: 'Responsable de la cosecha', type: 'users', role: 'Operario', valueField: 'name' },
      { key: 'quantity', label: 'Cantidad', type: 'number', required: true, min: 0.01, maxLength: 10 },
      { key: 'unit', label: 'Unidad', type: 'select', options: ['kg', 'toneladas', 'unidades', 'cajas'], required: true },
      { key: 'quality', label: 'Clasificación / calidad', type: 'select', options: ['Primera', 'Segunda', 'Tercera', 'Sin clasificar'], required: true },
      { key: 'destination', label: 'Destino o cliente inmediato (si se conoce)', maxLength: 150 },
      { key: 'notes', label: 'Observaciones', type: 'textarea', maxLength: 300 }
    ]
  },
  telemetry: {
    entity: 'telemetry', singular: 'lectura', title: 'Telemetría e IoT', description: 'Historial demostrativo de lecturas. No hay sensores reales conectados.',
    columns: [['farmName', 'Predio'], ['lotName', 'Lote'], ['variable', 'Variable'], ['valueWithUnit', 'Lectura'], ['dateLabel', 'Fecha y hora'], ['simulatedLabel', 'Origen']],
    fields: [
      { key: 'farmId', label: 'Predio', type: 'ref', ...ref('farms'), required: true },
      { key: 'lotId', label: 'Lote', type: 'ref', ...ref('lots'), required: true },
      { key: 'variable', label: 'Variable medida', type: 'select', options: ['Humedad del suelo', 'Temperatura', 'Precipitación', 'Humedad ambiental', 'pH'], required: true },
      { key: 'value', label: 'Valor', type: 'number', required: true, maxLength: 10 },
      { key: 'unit', label: 'Unidad', required: true, maxLength: 10 },
      { key: 'date', label: 'Fecha y hora', type: 'datetime-local', required: true }
    ]
  },
  notifications: {
    entity: 'notifications', singular: 'notificación', title: 'Notificaciones', description: 'Avisos locales sobre eventos y lecturas de demostración.',
    columns: [['title', 'Notificación'], ['message', 'Detalle'], ['date', 'Fecha'], ['status', 'Estado']],
    fields: [
      { key: 'title', label: 'Título', required: true, maxLength: 80 },
      { key: 'message', label: 'Detalle', type: 'textarea', required: true, maxLength: 300 },
      { key: 'date', label: 'Fecha', type: 'date', required: true },
      { key: 'lotId', label: 'Lote relacionado (opcional)', type: 'ref', ...ref('lots') },
      { key: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'Atendida', 'Archivada'], required: true }
    ]
  },
  users: {
    entity: 'users', singular: 'usuario', title: 'Usuarios y permisos', description: 'Administra cuentas del sistema y su acceso a predios.',
    columns: [['name', 'Nombre'], ['email', 'Correo'], ['role', 'Rol'], ['farmsLabel', 'Predios asignados'], ['eppStatus', 'Estado EPP'], ['activeLabel', 'Estado de cuenta']],
    sections: [
      { title: 'Cuenta y permisos', fields: ['name', 'email', 'password', 'role', 'farms', 'farmId', 'active'] },
      { title: 'Seguridad y capacitación del personal', fields: ['eppStatus', 'eppDeliveredAt', 'trainingRecords'] }
    ],
    fields: [
      { key: 'name', label: 'Nombre completo', required: true, maxLength: 40, textOnly: true },
      { key: 'email', label: 'Correo', type: 'email', required: true, maxLength: 254 },
      { key: 'password', label: 'Contraseña', type: 'password', maxLength: 60 },
      { key: 'role', label: 'Rol', type: 'select', options: ['SuperAdmin', 'Admin', 'Operario'], required: true },
      { key: 'farmId', label: 'Predio asignado', type: 'ref', ...ref('farms'), required: true },
      { key: 'eppStatus', label: 'Estado de entrega de EPP', type: 'select', options: ['Entregado', 'Pendiente'], required: true, visibleWhen: { role: ['Operario'] } },
      { key: 'eppDeliveredAt', label: 'Fecha de entrega de EPP', type: 'date', required: true, visibleWhen: { role: ['Operario'], eppStatus: ['Entregado'] } },
      { key: 'trainingRecords', label: 'Registros de capacitación', type: 'training-records', multiple: true, visibleWhen: { role: ['Operario'] } },
      { key: 'farms', label: 'Predios autorizados', type: 'farms', multiple: true },
      { key: 'active', label: 'Estado de cuenta', type: 'select-value', options: [{ label: 'Activo', value: true }, { label: 'Inactivo', value: false }], required: true }
    ]
  }
}
