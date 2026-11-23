# SENAagro — Contexto Técnico Consolidado (Línea Base v2.1.1)

## 1. Propósito y Pilares del Proyecto
Plataforma agrotrónica de gestión integral para el sector agropecuario colombiano (Santander) que articula tres pilares:
- **Gerencia Eficiente:** Cálculo automatizado de Margen de Contribución Neto por lote/ciclo, integrando costos de mano de obra, agroquímicos y gasto hídrico/energético derivado de actuadores IoT.
- **Trazabilidad Normativa ICA (BPA):** Bloqueo automático de cosechas con Periodo de Carencia (PC) vigente (`RF-26`), catálogos precargados sin texto libre en variables críticas (`RF-10`) e integridad criptográfica SHA-256 en el Libro Oficial ICA (`RNF-06`).
- **Agrodiversificación Multisectorial:** Hortalizas/Pimentón (riego automatizado si humedad < 40 %), Hongos/Orellanas (control microclimático ≤ 25 °C y ≥ 60 % HR) y Apicultura (monitoreo acústico de colmenas > 200 Hz).

## 2. Arquitectura Vigente (Sin Backend Express Legado en Producción)
- **Base de Datos y Backend:** PostgreSQL 14+ sobre Supabase (`13 tablas en Tercera Forma Normal - 3FN`), políticas Row Level Security (`RLS` para `RF-08A`) y triggers PL/pgSQL (`01_schema_tablas_v2_1.sql`, `02_rls_y_seed_santander.sql`, `03_triggers_negocio_ica.sql`).
- **Frontend:** Vue 3 + Quasar Framework + Pinia + Vue Router + Vite (`frontend/`), diseño limpio con paleta institucional (`#123D29`, `#185B28`, `#2E7D32`, `#66BB6A`) y tipografía `Source Sans 3`.
- **Resiliencia Offline-First (`RNF-05`):** Persistencia local estructurada en `localStorage` + cola de sincronización `offlineSync.js` para operación continua en fincas con conectividad intermitente.

## 3. Roles Oficiales RBAC (`RF-08A`) y Credenciales Demo
- `ADMIN_PRODUCTOR`: `admin@agrogestion.demo` / `Agro2026!` (Acceso total: Resumen, Finanzas, Libro ICA, IoT, Insumos, Usuarios).
- `TECNICO_AGRONOMO`: `agronomo@agrogestion.demo` / `Agro2026!` (Acceso agronómico, Libro ICA, IoT, Insumos; sin Finanzas ni Usuarios).
- `OPERARIO_CAMPO`: `operario@agrogestion.demo` / `Agro2026!` (Redirige a `/my-day` y lectura de telemetría IoT; sin Finanzas ni Libro ICA).

## 4. Estado Certificado de Calidad (Fase 5 Completada)
- **Pruebas Automatizadas:** `46/46` aprobadas en Vitest (`npm --prefix frontend test`).
- **Build de Producción:** `npm --prefix frontend run build` limpio (271 módulos transformados en `dist/`).
- **Consola del Navegador:** 0 errores HTTP `400`/`500` y persistencia de sesión exacta al recargar (`F5` / `Cmd+Shift+R`).
- **Documentación Maestra (`docs/linea-base/`):** SRS v2.1.1, scripts SQL `01`–`03`, Manual Técnico de Despliegue con matriz de portabilidad Cloud/On-Premise (`04_manual_tecnico_despliegue.md`) y Manual de Usuario por Roles (`05_manual_usuario_roles.md`).
