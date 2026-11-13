# Reporte de Auditoría y Refactorizaciones Backend

Este documento detalla la resolución atómica de los 3 hallazgos identificados en la auditoría de código del sistema backend.

---

## Tabla Resumen de Hallazgos y Soluciones

| # | Componente / Archivo | Nivel de Riesgo | Hallazgo de Auditoría | Solución Aplicada |
|---|----------------------|-----------------|------------------------|-------------------|
| 1 | `backend/src/config/env.js` | **Alto** | Configuración de CORS insegura con comodín (`*`) por defecto, permitiendo solicitudes de cualquier origen. | Restricción de CORS mediante variable de entorno `CORS_ORIGIN`, transformándola en arreglo de orígenes permitidos con fallback seguro (`http://localhost:3000`). |
| 2 | `backend/src/routes/predios.routes.js` | **Medio** | Falta de validación de formato `ObjectId` en el parámetro `:id` en la ruta GET `/:id`. | Integración del middleware `idValidator` (express-validator) en la ruta GET `/:id` para interceptar identificadores malformados antes del controlador. |
| 3 | `backend/src/services/predios.service.js` | **Medio** | Ineficiencia en consultas de paginación al instanciar documentos completos de Mongoose y transformarlos secuencialmente con `toJSON()`. | Optimización de la consulta con `.lean()` y proyección `.select('-__v')` para retornar objetos Plain Old JavaScript Objects (POJO) directamente desde la base de datos. |

---

## Desglose Técnico Detallado (Antes, Durante y Después)

### 1. Restricción de CORS mediante Variables de Entorno (`backend/src/config/env.js`)

- **Antes:**
  ```javascript
  const config = {
    // ...
    corsOrigin: process.env.CORS_ORIGIN || '*',
    // ...
  };
  ```
  *Problema:* La configuración perdonaba cualquier origen al devolver `'*'` como valor predeterminado si `CORS_ORIGIN` no estaba definida. Esto exponía la API a ataques de *Cross-Origin Resource Sharing* indeseados y vulneraba el principio de mínimo privilegio.

- **Durante:**
  Se modificó la evaluación de `corsOrigin` en la configuración para procesar la variable de entorno `CORS_ORIGIN` separada por comas (permitiendo múltiples orígenes en entornos distribuidos) y fallback a un origen de desarrollo restrictivo (`['http://localhost:3000']`).

- **Después:**
  ```javascript
  const config = {
    // ...
    corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    // ...
  };
  ```
  *Justificación Arquitectónica y de Seguridad:* Al pasar una lista explícita de orígenes al middleware `cors({ origin: config.corsOrigin })`, el navegador bloquea las peticiones preflight (OPTIONS) o de lectura desde dominios no autorizados. Además, el parseo mediante `.split(',')` habilita configuraciones multi-dominio flexibles en producción sin comprometer la seguridad.

---

### 2. Validación de ObjectIDs con express-validator (`backend/src/routes/predios.routes.js`)

- **Antes:**
  ```javascript
  // Rutas de consulta (lectura)
  router.get('/', listarPredios);
  router.get('/:id', obtenerPredioPorId);
  ```
  *Problema:* A diferencia de las rutas PATCH que ya aplicaban `[...idValidator, ...]`, la ruta GET `/:id` pasaba la petición directamente a `obtenerPredioPorId`. Un `:id` malformado (por ejemplo `/predios/123-invalid`) alcanzaba Mongoose, generando excepciones de *CastError* no controladas a nivel de capa de datos en lugar de rechazar temprano en la capa de transporte/rutas.

- **Durante:**
  Se importó e incluyó el middleware reutilizable `idValidator` y `validarCampos` en la definición de la ruta GET `/:id`.

- **Después:**
  ```javascript
  // Rutas de consulta (lectura)
  router.get('/', listarPredios);
  router.get('/:id', idValidator, validarCampos, obtenerPredioPorId);
  ```
  *Justificación Arquitectónica y de Seguridad:* La validación temprana (*Fail-Fast*) en la capa de ruteo con `express-validator` garantiza que peticiones con formatos de ID inválidos sean rechazadas inmediatamente con un error `400 Bad Request` estandarizado. Esto evita consumo innecesario de recursos de la base de datos y previene ataques de denegación de servicio o exploración de vulnerabilidades a nivel de base de datos.

---

### 3. Optimización de Consultas y Paginación (`backend/src/services/predios.service.js`)

- **Antes:**
  ```javascript
  const [predios, total] = await Promise.all([
    Predio.find(query).sort({ created_at: -1 }).skip(skip).limit(limitNum),
    Predio.countDocuments(query)
  ]);

  return {
    predios: predios.map((p) => p.toJSON()),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
  ```
  *Problema:* Mongoose hidrataba cada resultado como un Documento de Mongoose completo (con getters, setters, seguimiento de cambios y métodos de instancia), para posteriormente iterar el arreglo con `.map()` y llamar a `.toJSON()` solo para eliminar el campo interno `__v`. Esto causaba una sobrecarga considerable de memoria y CPU en lecturas paginadas.

- **Durante:**
  Se encadenó la opción `.lean()` junto con la proyección `.select('-__v')` en la consulta `Predio.find()`. Esto indica a Mongoose que retorne objetos JavaScript planos (POJO) directamente desde el driver de MongoDB sin hidratar documentos Mongoose.

- **Después:**
  ```javascript
  const [predios, total] = await Promise.all([
    Predio.find(query)
      .select('-__v')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Predio.countDocuments(query)
  ]);

  return {
    predios: predios,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
  ```
  *Justificación Arquitectónica y de Seguridad:* La utilización de `.lean()` reduce radicalmente la latencia de respuesta y la huella de memoria consumida por Node.js al ignorar la hidratación de modelos Mongoose para operaciones de solo lectura. Al combinarlo con `.select('-__v')`, se mantiene exactamente la misma estructura de respuesta JSON limpia requerida por los clientes de la API sin incurrir en transformaciones iterativas posteriores.
