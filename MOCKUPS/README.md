# Mockups de AgroGestión — Sprint 1

Prototipo visual de AgroGestión para definir y revisar la apariencia de las funcionalidades priorizadas para el Sprint 1. Reúne las pantallas de inicio de sesión, dashboard agrícola y administración/registro de usuarios bajo una guía visual común.

## Objetivo

Definir la apariencia visual de las funcionalidades del Sprint 1 mediante una guía visual compartida y mockups navegables para facilitar la revisión del equipo.

## Pantallas incluidas

### Inicio de sesión

Pantalla de acceso con fotografía agrícola, identidad de AgroGestión y formulario de usuario y contraseña. Incluye opción para mostrar u ocultar la contraseña, casilla «Recordarme», recuperación de contraseña y acceso al soporte. Al enviar el formulario, el prototipo muestra el dashboard.

### Dashboard

Vista general de la finca con navegación lateral, finca activa, búsqueda, clima y perfil. Resume indicadores agrícolas e incluye módulos visuales para:

- Estado y progreso de cultivos.
- Alertas operativas.
- Calendario de actividades.
- Monitoreo IoT y sensores.
- Próximas cosechas.
- Resumen financiero.
- Estado del inventario.

### Usuarios y registro

La sección «Usuarios» presenta un listado de ejemplo con nombre, correo, rol, estado y último acceso. Desde «Nuevo usuario» se abre el formulario de registro, que contempla nombre, apellido, correo, teléfono opcional, rol, contraseña temporal y solicitud de cambio de contraseña al iniciar sesión. También muestra una referencia breve de permisos por rol.

## Guía visual

### Paleta de colores

| Uso | Color | Código |
| --- | --- | --- |
| Verde principal y acciones | Verde hoja | `#2E7D32` |
| Verde oscuro y énfasis | Verde bosque | `#185B2B` |
| Navegación lateral | Verde profundo | `#123D29` |
| Acento y estados positivos | Verde claro | `#66BB6A` |
| Fondos de énfasis verde | Verde muy claro | `#EAF4EB` |
| Fondo general | Gris claro | `#F5F5F5` |
| Superficies | Blanco | `#FFFFFF` |
| Bordes y separadores | Gris suave | `#E6E9E6` |
| Texto principal | Gris azulado oscuro | `#263238` |
| Texto secundario | Gris verdoso | `#76817D` |
| Acento tierra | Marrón | `#8D6E63` |
| Alertas y acentos | Amarillo | `#F9A825` |

El verde comunica el contexto agrícola y destaca acciones principales; los tonos tierra y amarillo diferencian información y estados secundarios. Las alertas también se distinguen con colores semánticos.

### Tipografía

Se utiliza **Poppins** en pesos 400, 500, 600 y 700. La jerarquía se establece mediante tamaño, peso y espaciado: títulos destacados, subtítulos y etiquetas compactas para formularios, tablas e indicadores.

### Componentes visuales

- Botones primarios verdes y botones secundarios neutros.
- Campos de texto y selectores con etiquetas visibles, bordes suaves y estados de foco.
- Tarjetas blancas con bordes discretos y esquinas redondeadas.
- Navegación lateral oscura con estado activo resaltado.
- Indicadores, etiquetas de estado, barras de progreso y avatares.
- Iconografía lineal y mensajes de alerta o confirmación.
- Adaptación responsive: navegación colapsable y contenido reorganizado para pantallas pequeñas.

## Consistencia entre pantallas

Las vistas comparten la paleta, tipografía, estilo de botones, campos, tarjetas, iconos y tratamiento de estados. El login introduce la identidad visual; el dashboard y la administración reutilizan esos mismos patrones en una estructura de aplicación con navegación lateral y barra superior.

## Recorrido del prototipo

1. En el login, pulsa **Iniciar sesión** para abrir el dashboard.
2. En la navegación lateral, selecciona **Usuarios** para consultar el listado.
3. Pulsa **Nuevo usuario** para abrir el formulario de registro.
4. Usa **Volver al listado** para regresar a Usuarios.
5. **Cerrar sesión** vuelve a la pantalla de login.

Los datos y acciones son demostrativos: este proyecto es un mockup frontend y no autentica cuentas ni persiste usuarios en un backend.

## Criterios de aceptación

- [x] Mockup de inicio de sesión creado.
- [x] Mockup de dashboard creado.
- [x] Mockup de registro de usuarios creado.
- [x] Guía visual compartida definida y aplicada entre las pantallas.
- [ ] Aprobación de los mockups por el equipo: pendiente de confirmación del equipo.

## Ejecución local

Requiere Node.js y pnpm. Desde la raíz del proyecto:

```bash
pnpm install
pnpm run dev
```

Para generar la versión de producción:

```bash
pnpm run build
```

## Tecnologías

React, TypeScript, Vite y Tailwind CSS v4. Los componentes y estilos del prototipo se encuentran en `src/App.tsx` y `src/index.css`.
