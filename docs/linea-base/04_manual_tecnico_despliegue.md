# Manual Técnico, Arquitectura y Guía de Despliegue — SENAagro (v2.1.1)

## 1. Propósito del Sistema y Tres Pilares de Diseño
**SENAagro** es una plataforma web de gestión agropecuaria proactiva que transforma al productor rural en un gerente basado en datos reales. Toda su ingeniería responde a tres pilares innegociables:
1. **Gerencia Eficiente:** Cálculo automático del Margen de Contribución Neto por lote y ciclo productivo, integrando ingresos por cosecha frente a costos de mano de obra, insumos sanitarios y consumo hídrico/energético derivado de los actuadores IoT.
2. **Trazabilidad Normativa ICA (BPA):** Control estricto de Periodos de Carencia (PC), vigencia de Equipos de Protección Personal (EPP) y bitácora inalterable con encadenamiento criptográfico **SHA-256 (RNF-06)**.
3. **Agrodiversificación Multisectorial:** Soporte nativo para **Hortalizas/Pimentón** (riego automatizado por humedad de suelo), **Hongos/Orellanas** (control microclimático de sustrato) y **Apicultura** (monitoreo acústico de colmenas para prevención de abandono).

---

## 2. Arquitectura Tecnológica (Stack y Estructura)
El proyecto sigue una arquitectura desacoplada limpia (sin dependencias innecesarias):
* **Frontend:** Vue 3 (Composition API) + Quasar Framework + Pinia (gestión de estado) + Vue Router + CSS limpio (`frontend/src/css/app.css`), empaquetado con **Vite 6**.
* **Base de Datos y Seguridad:** **PostgreSQL en Supabase** normalizado en **Tercera Forma Normal (3FN — 13 tablas)** con políticas **Row Level Security (RLS)** y triggers PL/pgSQL de auditoría automática.
* **Pruebas Automatizadas:** **Vitest + JSDOM** (`frontend/src/services/__tests__/fase5-business-rules.spec.js`).

### Mapa de Carpetas Clave del Repositorio
```text
Proyecto-Agro-develop/
├── docs/linea-base/               # Contratos SQL oficiales y manuales de grado
│   ├── 01_schema_tablas_v2_1.sql  # DDL maestro (13 tablas 3FN)
│   ├── 02_rls_y_seed_santander.sql       # Seguridad por fila y rol RBAC
│   ├── 03_triggers_negocio_ica.sql# Triggers de Carencia (RF-26) y Hash SHA-256
│   ├── 04_manual_tecnico_despliegue.md
│   └── 05_manual_usuario_roles.md
└── frontend/
    └── src/
        ├── features/
        │   ├── auth/              # Inicio de sesión y restauración de sesión
        │   ├── calendar/          # Calendario agrícola semafórico
        │   ├── dashboard/         # Tablero gerencial y KPIs
        │   ├── finance/           # Márgenes netos en COP (exclusivo ADMIN_PRODUCTOR)
        │   ├── ica-book/          # Libro Oficial ICA SHA-256 + Exportación CSV/PDF
        │   ├── iot/               # Telemetría multisectorial y actuadores
        │   ├── operator/          # Vista operativa simplificada para campo
        │   └── records/           # Gestión CRUD de predios, lotes, labores y cosechas
        ├── router/index.js        # Guardias de navegación y control RBAC
        └── services/
            ├── api.js             # Cliente HTTP + consultas Supabase + respaldos
            └── permissions.js     # Matriz centralizada de permisos por rol
```

---

## 3. Reglas de Negocio Implementadas en Código y Base de Datos
| Código | Regla de Negocio | Implementación Técnica |
| :--- | :--- | :--- |
| **RF-26** | **Bloqueo de Periodo de Carencia (PC)** | Impide registrar cosechas si `fecha_cosecha <= (fecha_aplicacion + dias_carencia)`. Se valida tanto en frontend (`validation.js`) como por trigger en PostgreSQL. |
| **RF-28** | **Vigencia de EPP en Aplicaciones** | Bloquea aplicaciones sanitarias si el operario no tiene dotación EPP vigente registrada. |
| **IOT-01** | **Umbral Hídrico Hortalizas / Pimentón** | Si `humedad_suelo < 40%`, dispara alerta roja semafórica y registra activación de `electrovalvula_riego`. |
| **IOT-02** | **Control Microclimático Hongos** | Monitorea temperatura y humedad relativa del sustrato (`nebulizador_sustrato`). |
| **IOT-03** | **Alerta Acústica Apicultura** | Evalúa `frecuencia_acustica` en colmenas para detectar estrés térmico o riesgo de enjambrazón/abandono. |
| **FIN-01** | **Margen de Contribución Neto (COP)** | `Ingresos Cosecha - (Mano de Obra + Insumos Sanitarios + Costo Operativo IoT)`. Oculto para operarios y agrónomos. |
| **RNF-06** | **Integridad Bitácora ICA (SHA-256)** | Cada registro en `libro_oficial_ica` enlaza `hash_anterior` con el `hash_actual` del evento previo. Si alguien altera un dato histórico, la cadena se rompe y muestra alerta roja. |

---

## 4. Guía Rápida de Instalación, Pruebas y Despliegue (Paso a Paso)

### 4.1. Ejecución Local en Desarrollo
1. **Clonar e instalar dependencias:**
   ```bash
   npm --prefix frontend install
   ```
2. **Configurar variables de entorno (`frontend/.env`):**
   ```env
   VITE_APP_NAME=SENAagro
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_llave_publica_anon
   ```
3. **Ejecutar la suite de certificación (46 pruebas automatizadas):**
   ```bash
   npm --prefix frontend test
   ```
   *Resultado esperado:* `Test Files 8 passed (8)` y `Tests 46 passed (46)`.
4. **Levantar servidor local o generar compilación de producción:**
   ```bash
   npm --prefix frontend run dev    # Desarrollo en http://localhost:5173
   npm --prefix frontend run build  # Compilación lista para producción en frontend/dist
   ```

### 4.2. Despliegue en Producción (Supabase + Vercel)
1. **Base de Datos (Supabase):** Ejecutar en el *SQL Editor* de Supabase, en estricto orden numérico, los scripts `01_schema_tablas_v2_1.sql`, `02_rls_y_seed_santander.sql` y `03_triggers_negocio_ica.sql`.
2. **Frontend (Vercel):**
   * Conectar el repositorio GitHub y configurar **Root Directory** en `frontend`.
   * Configurar **Build Command:** `npm run build` y **Output Directory:** `dist`.
   * Registrar en Vercel las 3 variables de entorno (`VITE_APP_NAME`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
