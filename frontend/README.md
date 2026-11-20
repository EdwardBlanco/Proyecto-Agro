# SENAgro — frontend

Aplicación web de demostración para consultar y gestionar registros agrícolas. Este README cubre únicamente el frontend; el backend se mantiene separado y fuera del alcance de este proyecto.

## Requisitos e inicialización

- Node.js 20 o posterior y npm.
- Desde la carpeta `frontend`:

```powershell
npm ci
npm run dev
```

Vite muestra la dirección local al iniciar el servidor (por defecto, `http://localhost:5173`). Para verificar o previsualizar la compilación:

```powershell
npm run build
npm run preview
```

La aplicación usa Vue 3, Vite, Vue Router, Pinia y Quasar. El título de la pestaña puede configurarse mediante `VITE_APP_NAME`; la API usa `VITE_API_URL` y, si no se define, `/api/v1`. El login de las tres cuentas demo consulta el backend configurado. Las cuentas creadas por un Administrador se autentican localmente desde `localStorage`.

## Cuentas de demostración

Contraseña compartida: `Agro2026!`

| Rol | Usuario |
|---|---|
| Administrador | `admin@agrogestion.demo` |
| Superadministrador | `superadmin@agrogestion.demo` |
| Operario | `operario@agrogestion.demo` |

Son cuentas y credenciales ficticias para demostración; no se deben usar en producción. El Administrador puede crear usuarios locales con correo y contraseña propios; esas credenciales se guardan en texto plano en este navegador y se usan en el siguiente login. La cuenta debe estar activa. Esta autenticación local es solo una simulación y no es apropiada para producción.

## Funcionalidades disponibles

- Interfaz con paleta `#123D29`, `#185B2B`, `#2E7D32`, `#66BB6A`, tipografía Source Sans 3 y el nuevo logo institucional transparente.
- Inicio y cierre de sesión, rutas protegidas y permisos diferenciados: Superadministrador gestiona usuarios y permisos; Administrador conserva la gestión agrícola de sus predios sin acceso al directorio de usuarios; Operario consulta su jornada, calendario, telemetría y registros autorizados.
- Login con acceso institucional simplificado: se conserva la imagen de fondo y el logo, y se muestra el encabezado «Plataforma para la gestión de predios, cultivos y actividades del SENA.»; se retiraron los textos promocionales anteriores.
- El formulario de usuarios del Superadministrador permite asignar predios y registrar, para operarios, estado y fecha de EPP y capacitaciones. Las asignaciones se sincronizan con la API; EPP y capacitaciones permanecen como metadatos locales.
- Resumen con actividad, ciclos, lotes, cosechas, lecturas y notificaciones disponibles.
- Componentes compartidos para estados (`StatusBadge`), indicadores (`KpiCard`), progreso (`ProgressBar`) y estados vacíos (`EmptyState`).
- Administración de predios y lotes vinculados, con validación de formularios, selección de responsables y confirmación de eliminación.
- Formularios agrupados por secciones y campos condicionales, con validación de fechas, relaciones, rangos, URL de evidencia y registros repetibles de aplicaciones y capacitaciones.
- Calendario agrícola mensual y agenda que reúnen ciclos, labores e incidencias según sus fechas registradas; la fecha estimada de finalización de un ciclo no se interpreta como una duración confirmada.
- Vista de operario con actividades asignadas para hoy y acceso de solo lectura al calendario y a la telemetría simulada existente.
- Tarjetas compactas de predios y lotes con ilustraciones locales; las cards de cultivos e insumos conservan sus emojis y muestran únicamente los datos disponibles.
- Consulta y administración de cultivos, insumos, ciclos productivos, labores, semilleros y cosechas; los lotes se gestionan desde su predio.
- Cultivos: la tarjeta identifica la categoría y el tipo solo cuando están guardados; el desplegable muestra variedad, etapas e insumos asociados.
- Usuarios: tabla con avatar, rol, predios asignados y estado de cuenta, más indicadores de usuarios, administradores, operarios y cuentas activas/inactivas. EPP se muestra cuando existe en los registros.
- Filtros por select; las vistas no incluyen búsqueda por texto ni contador de registros.
- Cultivos e insumos muestran emojis de referencia seleccionables. Predios y lotes siempre usan ilustraciones placeholder; sus imágenes personalizadas previas se conservan en los datos, pero ya no se muestran.
- Historial completo de notificaciones con etiquetas de archivado y acciones visibles para marcar como leída, archivar, desarchivar o eliminar. La eliminación se confirma en un diálogo; los cambios se guardan localmente.
- Tablas con encabezados, acciones y paginación en español; en pantallas pequeñas las vistas usan tarjetas responsivas y las tablas mantienen desplazamiento horizontal cuando se requiere.
- Telemetría de demostración con filtros, indicadores, gráficos y fechas legibles. Las lecturas no provienen de sensores reales ni incluyen umbrales de alerta.
- Cápsula del clima preparada con geolocalización del navegador, sin llamadas del frontend a Open-Meteo. El stub `src/services/weather.js` espera que el backend exponga temperatura, código de clima y nombre de zona; al integrar, reemplaza ahí el `null` por la llamada al servicio backend.
- Cosechas con indicadores, producción convertida a kilogramos para unidades compatibles, rendimiento solo cuando el área está disponible y gráficos de producción/calidad.
- Semilleros con datos de siembra y germinación; los porcentajes se muestran solo si están guardados o se pueden calcular con los registros existentes.
- Cuando falta un dato se muestra «Sin datos registrados»; no se agregan valores técnicos, estados ni métricas que el sistema no pueda obtener.
- Los registros de ciclos, labores, incidencias, semilleros, cosechas y los nuevos campos de trazabilidad se guardan en `localStorage`; no se migran a nuevas tablas ni se sincronizan con la API.

Los lotes se consultan y administran desde su predio; no hay una vista global de lotes. La recuperación de contraseña fue eliminada. El clima no consulta servicios externos desde el frontend. Los permisos del cliente no sustituyen la autorización del lado del servidor.

## Estructura del frontend

- `src/features/auth`: inicio de sesión demo y autenticación local.
- `src/features/dashboard`: resumen e indicadores.
- `src/features/records`: configuración, formularios y vistas de registros agrícolas, notificaciones y usuarios.
- `src/layouts`: navegación autenticada y panel de notificaciones.
- `src/router`: navegación y guardas de rutas.
- `src/components/BackButton.vue`: botón de retorno reutilizado en vistas con una vista padre.
- `src/services/storage.js`: datos iniciales, lectura, persistencia local y operaciones de demostración.
- `src/services/dates.js`: formato de fecha y hora para visualización.
- `src/services/permissions.js`: reglas de visibilidad y escritura de la interfaz por rol.
- `src/services/production.js`: conversión de producción a kilogramos para las unidades compatibles.
- `src/services/weather.js`: punto de integración frontend del clima; actualmente devuelve `null`.
- `src/stores/auth.js`: estado de sesión local.
- `src/css`: estilos del sistema y variables de Quasar.

## Persistencia y límites

Los registros agrícolas descritos arriba y los metadatos locales de EPP/capacitación se conservan en el almacenamiento local del navegador; se pueden perder al limpiar los datos del sitio y no se sincronizan entre dispositivos. Predios y usuarios usan servicios del backend; las asignaciones de predios se guardan en la API. Las lecturas de telemetría y avisos precargados son datos de demostración. El backend debe integrar Open-Meteo y exponer los datos esperados por `src/services/weather.js`; el frontend no contacta Open-Meteo.

El alcance conserva datos de demostración: la telemetría es simulada y los registros locales no se sincronizan entre dispositivos. No se desarrollaron módulos de Finanzas ni Reportes. El catálogo actual de cultivos no contiene nombre científico, tiempo de desarrollo, temperatura, requerimientos de agua/suelo ni recomendaciones; los usuarios tampoco guardan último acceso y los registros de insumos no incluyen stock mínimo, vencimiento o ubicación de almacenamiento. El backend se ejecuta y configura por separado.
