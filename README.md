# SENAgro — aplicación frontend

Interfaz web demostrativa para la gestión agrícola. Todo el código de esta aplicación está en `frontend/`; no se implementó ni modificó el backend.

## Requisitos y ejecución

- Node.js 20 o posterior y npm.
- Desde la carpeta `frontend`:

```powershell
npm install
npm run dev
```

Para comprobar la compilación de producción:

```powershell
npm run build
npm run preview
```

La aplicación usa Vue 3, Vite, Quasar, Vue Router y Pinia. Copia `.env.example` a `.env` si necesitas ajustar el título de la pestaña con `VITE_APP_NAME`; actualmente no se requiere una URL de API.

## Cuentas ficticias para desarrollo

Contraseña compartida de demostración: `Agro2026!`

| Rol | Usuario |
|---|---|
| Administrador | `admin@agrogestion.demo` |
| Supervisor | `supervisor@agrogestion.demo` |
| Agrónomo | `agronomo@agrogestion.demo` |
| Operario | `operario@agrogestion.demo` |

Son cuentas totalmente ficticias para probar la interfaz; no deben reutilizarse en producción. La contraseña está en el cliente porque no hay servidor de autenticación. Los usuarios que se agregan en el módulo de administración son registros de demostración y no reciben credenciales.

## Organización

- `src/features/auth`: inicio de sesión y recuperación simulada.
- `src/features/dashboard`: resumen e indicadores derivados de los registros locales.
- `src/features/records`: configuración y pantallas reutilizables de consulta, alta, edición, detalle y eliminación para los módulos.
- `src/layouts`: navegación, menú responsive y encabezado autenticado.
- `src/router`: rutas y protección de páginas.
- `src/services/storage.js`: inicialización, datos de demostración, persistencia CRUD y guardas para relaciones.
- `src/services/permissions.js`: reglas de visibilidad y escritura por rol.
- `src/stores/auth.js`: estado de sesión simulado con Pinia.
- `src/css`: identidad visual, componentes compartidos y variables de Quasar.

## Funcionalidades y alcance actual

| Requisito | Estado | Alcance de esta versión |
|---|---|---|
| GP-01 Usuarios, acceso y permisos | PARCIAL | Login, logout, sesión de demostración, rutas protegidas, cuatro roles, reglas centrales y gestión local de usuarios; sin credenciales para cuentas nuevas ni recuperación real. |
| Dashboard | COMPLETADO | Indicadores, actividad, avisos, producción, semilleros y lecturas calculados con datos disponibles y filtrados por predio autorizado; convierte toneladas a kg y no suma cajas/unidades a esa métrica. |
| GP-02 Predios y lotes | COMPLETADO | CRUD local, detalle de predio y lotes vinculados; validación de área y bloqueo de eliminación con dependencias. |
| GP-03 Catálogos agrícolas | PARCIAL | CRUD de cultivos e insumos, asociación de insumos a cultivos y etapas fenológicas editables como lista de texto; no hay catálogo CRUD independiente para cada etapa. |
| GP-04 Ciclos productivos | COMPLETADO | Selección vinculada de predio, lote y cultivo; seguimiento y validación de área disponible. |
| GP-05 Labores e incidencias | COMPLETADO | Registros enlazados a ciclos, responsables, estados e historial en el detalle del ciclo. |
| GP-06 Semilleros y cosechas | COMPLETADO | Registros vinculados, validación de relaciones y fechas, cantidades e indicadores de producción. |
| GP-07 Telemetría y notificaciones | PARCIAL | Historial y notificaciones editables con lecturas identificadas como simuladas; no hay sensores, alertas automáticas ni transmisión real. |
| Persistencia local | COMPLETADO | Datos y sesión de demostración se guardan en el navegador; incluye relaciones y controles para no borrar registros con dependencias. |
| Agenda e inventario | PARCIAL | Las fechas y existencias se consultan en labores e insumos; no se implementó calendario independiente ni movimientos de inventario. |

## Golden path para probar

1. Inicia sesión con `admin@agrogestion.demo` y la contraseña de demostración.
2. Revisa el dashboard y abre **Predios y lotes**. Consulta los detalles de un predio o crea otro.
3. En **Lotes**, crea uno asociado a un predio existente.
4. Abre **Cultivos** y consulta el catálogo disponible.
5. En **Ciclos productivos**, crea un ciclo seleccionando predio, lote y cultivo; el área no puede exceder el espacio disponible.
6. Abre el detalle del ciclo y consulta su historial.
7. En **Labores e incidencias**, crea una actividad y vincúlala al ciclo.
8. En **Semilleros**, registra un semillero asociado al mismo cultivo y ciclo.
9. En **Cosechas**, registra una cosecha relacionada con el ciclo.
10. Consulta **Telemetría** y **Notificaciones**; los datos de sensores son ficticios.
11. Vuelve al dashboard, recarga el navegador y verifica que los datos siguen guardados.
12. Cierra sesión e inicia con otra cuenta ficticia. Por ejemplo, el Operario no puede abrir Usuarios y permisos.

Los registros demo usan fechas de octubre de 2026 para que coincidan con el escenario de demostración.

## Límites y trabajo necesario en backend

`localStorage` es editable por el usuario y solo sirve para demostración. Las reglas de roles y rutas del frontend mejoran la experiencia, pero no son una medida de seguridad. Antes de usar datos reales se necesita:

- API y base de datos con modelos, identificadores, restricciones, migraciones y auditoría.
- Inicio de sesión, sesiones/tokens, almacenamiento seguro de credenciales, cierre y autorización validados en servidor.
- Alta de usuarios desde el administrador, invitaciones o restablecimiento de credenciales.
- Recuperación de contraseña mediante un canal verificado.
- Validación de todas las reglas de negocio y permisos en el servidor.
- Integración de telemetría con dispositivos o plataforma de sensores, alertas y notificaciones reales.
- Carga y almacenamiento seguros de archivos si se añaden fotografías o documentos.
- Calendario de actividades y movimientos de inventario si forman parte del alcance de producto.

No se ejecuta ninguna llamada HTTP ni se presupone un contrato de API.
