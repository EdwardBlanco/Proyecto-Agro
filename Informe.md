# Informe Técnico: Auditoría de Frontend, Pruebas Unitarias y Gestión de Dependencias

**Proyecto:** Sistema de Buenas Prácticas Agrícolas (BPA) — Módulo Frontend  
**Sprint:** Sprint 1  
**Fecha:** Noviembre 10 de 2026  

---

## 1. Resumen Ejecutivo
Este documento registra el estado de avance, las decisiones arquitectónicas y la validación técnica del módulo frontend del proyecto BPA. Durante la fase actual de QA, se completó con éxito la implementación y ejecución de pruebas unitarias sobre los flujos críticos de autenticación, resolviendo los retos de compatibilidad del ecosistema moderno.

---

## 2. Stack Tecnológico y Actualización de Dependencias
El proyecto está construido sobre una arquitectura modular orientada a características (`src/features/`), utilizando las versiones más recientes y estables del ecosistema Vue:
- **Framework Core:** Quasar v2
- **Motor de Interfaz:** Vue 3.5
- **Empaquetador:** Vite 6
- **Gestión de Estado:** Pinia v3.0.4

### ⚠️ Incidencia de Dependencias y Resolución (Pinia 3)
- **Conflicto Detectado:** Al intentar integrar `@pinia/testing` se generó un conflicto de dependencias cruzadas (`ERESOLVE`), ya que el paquete exigía versiones superiores de Pinia incompatibles con la rama actual.
- **Solución Aplicada:** Se adoptó el **soporte nativo de Pinia 3** (`setActivePinia` y `createPinia`), manteniendo un entorno nativo con Vitest y JSDOM sin alterar el árbol de dependencias del proyecto.

---

## 3. Configuración del Entorno de Pruebas (Vitest + JSDOM)
Para habilitar la ejecución automatizada de pruebas unitarias, se configuró `vite.config.js` incorporando el bloque de pruebas:

```javascript
test: {
  environment: 'jsdom',
  globals: true,
  include: [
    'src/stores/__tests__/**/*.spec.js',
    'src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
  ]
}
```

---

## 4. Resultados de la Suite de Pruebas Unitarias
Se implementó y ejecutó con éxito el archivo de pruebas `src/stores/__tests__/auth.spec.js` cubriendo las siguientes validaciones:

- **Entorno de Ejecución:** JSDOM (simulación de DOM para Vue/Pinia).
- **Métricas:**
  - **Total de pruebas ejecutadas:** 5 / 5
  - **Estado:** ✅ Aprobadas (100% de éxito)
  - **Tiempo de ejecución:** 489 ms

### Casos Validados:
- **Inicialización Limpia:** Verifica que el store inicie con `currentUser = null` y `isAuthenticated = false`.
- **Autenticación Exitosa:** Confirma que las credenciales válidas devuelven los datos de usuario y actualizan el estado reactivo.
- **Manejo de Errores:** Captura y gestiona correctamente credenciales incorrectas.
- **Restauración de Sesión:** Valida la persistencia y recuperación de sesión mediante el almacenamiento local.
- **Cierre de Sesión (Logout):** Comprueba el vaciado seguro de credenciales y limpieza de almacenamiento.

---

## 5. Recomendaciones para el Siguiente Sprint
1. **Ampliación de Cobertura:** Extender las pruebas unitarias hacia los stores de gestión de usuarios y registros agrícolas.
2. **Integración Continua (CI):** Configurar la ejecución de `npx vitest run` dentro de los procesos de integración para automatizar la calidad en cada commit.
3. **Auditoría de Seguridad:** Mantener la ejecución periódica de `npm audit` para prevenir vulnerabilidades en dependencias transitivas.
