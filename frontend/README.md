# SENAgro — frontend

Aplicación web de demostración para consultar y gestionar registros agrícolas. Este repositorio contiene únicamente el frontend; no incluye API, servidor ni base de datos. Los cambios y operaciones de esta versión se guardan en el navegador.

## Requisitos e inicialización

- Node.js 20 o posterior y npm.
- Desde la raíz del repositorio:

```powershell
npm ci
npm run dev
```

Vite muestra la dirección local al iniciar el servidor (por defecto, `http://localhost:5173`). Para verificar o previsualizar la compilación:

```powershell
npm run build
npm run preview
```

La aplicación usa Vue 3, Vite, Vue Router, Pinia y Quasar. El título de la pestaña puede configurarse mediante `VITE_APP_NAME`; no se necesita configurar una URL de API.

## Cuentas de demostración

Contraseña compartida: `Agro2026!`

| Rol | Usuario |
|---|---|
| Administrador | `admin@agrogestion.demo` |
| Superadministrador | `superadmin@agrogestion.demo` |
| Operario | `operario@agrogestion.demo` |

Son cuentas y credenciales ficticias definidas en el cliente, solo para probar la interfaz. No se deben usar en producción. Los nuevos usuarios creados en la aplicación son registros locales y no reciben credenciales.

## Funcionalidades disponibles

- Inicio y cierre de sesión de demostración, rutas protegidas y opciones de interfaz según el rol y los predios asignados.
- Resumen con actividad, ciclos, lotes, cosechas, lecturas y notificaciones disponibles.
- Administración local de predios y lotes vinculados; validación de nombres, ubicación, áreas, responsables y relaciones.
- Consulta y administración de cultivos, insumos, ciclos productivos, labores, semilleros y cosechas.
- Consulta de telemetría y notificaciones de demostración. Las lecturas no provienen de sensores reales.
- Imágenes opcionales para predios y lotes, con placeholders locales cuando no hay imagen disponible.
- Persistencia de demostración mediante `localStorage`.

Los lotes se consultan y administran desde su predio; no hay una vista global de lotes. La telemetría y las notificaciones no tienen conexión ni entrega externa. La interfaz de notificaciones del Administrador y del Operario es de consulta; el Superadministrador conserva las acciones locales disponibles. Los permisos del cliente solo controlan la interfaz y no sustituyen autorización del lado del servidor.

## Estructura del frontend

- `src/features/auth`: inicio de sesión de demostración.
- `src/features/dashboard`: resumen e indicadores.
- `src/features/records`: configuración, formularios y vistas de registros agrícolas, notificaciones y usuarios.
- `src/layouts`: navegación autenticada y panel de notificaciones.
- `src/router`: navegación y guardas de rutas.
- `src/services/storage.js`: datos iniciales, lectura, persistencia local y operaciones de demostración.
- `src/services/permissions.js`: reglas de visibilidad y escritura de la interfaz por rol.
- `src/services/production.js`: conversión de producción a kilogramos para las unidades compatibles.
- `src/stores/auth.js`: estado de sesión local.
- `src/css`: estilos del sistema y variables de Quasar.

## Persistencia y límites

Los registros, imágenes pequeñas y sesión se conservan en el almacenamiento local del navegador. Se pueden perder al limpiar los datos del sitio y no se sincronizan entre dispositivos. Las lecturas de telemetría y avisos precargados son datos de demostración. La recuperación de contraseña, el alta segura de cuentas, los sensores reales, la sincronización y la autorización confiable requieren servicios externos que no forman parte de este repositorio.

No hay un directorio ni un README de backend en este repositorio. La documentación aquí describe únicamente el frontend; no se creó ni modificó documentación o código de backend.
