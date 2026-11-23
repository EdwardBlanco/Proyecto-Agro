# CLAUDE.md — Reglas Estrictas de Ingeniería SENAagro (ADSO)

Eres el Arquitecto de Software de **SENAagro** (San Gil y Socorro, Santander). Todo el código de este repositorio debe alinearse estrictamente a la documentación ubicada en `/docs/linea-base/`.

## 1. Stack Tecnológico Oficial (SRS v2.1)
- **Frontend:** Vue 3 (Composition API `<script setup>`) + Quasar Framework + Pinia + `pinia-plugin-persistedstate` (para cola offline rural RNF-05).
- **Backend / BD:** PostgreSQL en Supabase (`@supabase/supabase-js`) con Row Level Security (RLS) y Triggers PL/pgSQL.

## 2. Reglas de Negocio Innegociables (Core)
1. **Matriz RBAC de 3 Roles (`RF-00A`):** `admin_productor`, `tecnico_agronomo` y `operario_campo`. NO existe rol externo del ICA. El rol `operario_campo` tiene ocultos todos los precios en COP, márgenes financieros y configuración de predios.
2. **Cero Texto Libre (`RF-10`):** Insumos ICA, labores culturales, sectores (`hortalizas`, `hongos`, `apicultura`) y calidades deben venir exclusivamente de listas desplegables conectadas a los catálogos cerrados de PostgreSQL.
3. **Periodo de Carencia ICA (`RF-26`):** El frontend debe consultar `fecha_liberacion_carencia` y bloquear visualmente el botón de cosecha si hay carencia activa, respetando además el Trigger SQL.
4. **Vigencia de EPP (`RF-28`):** Bloquear selección/registro de aplicaciones agroquímicas si `fecha_vencimiento_epp < hoy`.
5. **Calendario Semafórico (`RF-11`):** Verde = Siembras/Labores; Amarillo = Periodos de Carencia Activos; Rojo = Alertas IoT o Cosechas Inminentes.
6. **Integridad Libro ICA (`RNF-06`):** En la UI mostrar el sello amigable `Verificado (Inalterable)` y dejar el hash SHA-256 en el detalle/PDF de auditoría.

## 3. Reglas de Trabajo en este Repositorio
- **NO** sobrescribas ni borres módulos existentes sin presentar primero un informe de brechas.
- Respeta exactamente los nombres de las 13 tablas y columnas definidos en `/docs/linea-base/`.
