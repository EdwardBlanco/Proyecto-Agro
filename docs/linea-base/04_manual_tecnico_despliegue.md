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

---

## Portabilidad Arquitectónica y Mitigación de Riesgos de Infraestructura

En cumplimiento de los atributos de calidad de portabilidad e interoperabilidad (norma ISO/IEC 25010), **SENAagro (Línea Base v2.1.1)** está diseñado para operar tanto en nube gestionada (Supabase Cloud + Vercel) como en infraestructura privada (*On-Premise* / servidores institucionales propios) sin reescribir su lógica de negocio.

### 1. Escenarios de Despliegue Soportados

| Escenario de Infraestructura | Arquitectura Técnica | Compatibilidad | Esfuerzo Estimado de Adaptación |
| :--- | :--- | :--- | :--- |
| **Nube Gestionada (Por defecto)** | PostgreSQL en Supabase Cloud + Frontend estático en Vercel con persistencia *offline-first* (`RNF-05`). | Nativa (100 %) | Inmediato (variables `.env`). |
| **Servidor Privado con PostgreSQL 14+** | Motor PostgreSQL institucional ejecutando los scripts `01`, `02` y `03` + contenedor ligero **PostgREST** como capa API REST. | Nativa (90 % – 95 %) | 1 a 3 días (configuración de red y `.env`). |
| **Intranet Aislada (Docker / Sin salida a Internet)** | Despliegue autoalojado (*Self-Hosted*) mediante Docker Compose (PostgreSQL + PostgREST + GoTrue) y compilación `dist/` servida en Nginx. | Alta (85 % – 90 %) | 3 a 5 días (orquestación de contenedores). |

### 2. Matriz de Mitigación de Riesgos de Migración

1. **Desacoplamiento de Endpoints y Credenciales:**
   * *Riesgo:* Dependencia de URLs o llaves fijas dentro del código fuente del cliente web.
   * *Mitigación:* Toda comunicación remota se centraliza en `frontend/src/services/api.js` mediante variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`). El cambio hacia un servidor privado requiere únicamente actualizar dichas variables y recompilar el paquete estático (`npm run build`).
2. **Integridad de Reglas Sanitarias ICA y Seguridad en Base de Datos:**
   * *Riesgo:* Pérdida de validaciones de Periodos de Carencia (`RF-26`), aislamiento por roles (`RF-08A`) o trazabilidad SHA-256 (`RNF-06`) al cambiar de servidor.
   * *Mitigación:* Las reglas críticas residen en **SQL estándar y PL/pgSQL puro** dentro de PostgreSQL (`01_schema_tablas_v2_1.sql`, `02_rls_y_seed_santander.sql` y `03_triggers_negocio_ica.sql`), garantizando comportamiento idéntico en cualquier instancia PostgreSQL 14 o superior.
3. **Capa de Exposición REST sobre PostgreSQL Puro:**
   * *Riesgo:* Entornos servidores donde solo se habilita el motor PostgreSQL (puerto `5432`) sin capa HTTP intermedia.
   * *Mitigación:* Despliegue de un binario único o contenedor **PostgREST** conectado al esquema `public` con el rol `anon`/`authenticated`, conservando exactamente el mismo contrato de consultas del cliente `@supabase/supabase-js`.
4. **Integración con Proveedores de Identidad Externos (SSO / LDAP / OAuth2):**
   * *Riesgo:* Requerimiento de autenticación centralizada en entornos corporativos o institucionales.
   * *Mitigación:* El store `frontend/src/stores/auth.js` aísla la resolución de sesión (`restore`, `login`, `logout`) y normaliza los perfiles hacia la matriz RBAC oficial (`ADMIN_PRODUCTOR`, `TECNICO_AGRONOMO`, `OPERARIO_CAMPO`), permitiendo acoplar un proveedor JWT o OIDC externo sin modificar las vistas ni los permisos de módulos (`permissions.js`).
5. **Continuidad Operativa en Conectividad Intermitente (`RNF-05`):**
   * *Riesgo:* Latencia alta o cortes de red en zonas rurales o granjas experimentales.
   * *Mitigación:* La cola de sincronización local (`offlineSync.js`) y el almacenamiento estructurado en navegador garantizan el registro de labores, lectura de sensores y consulta fenológica sin interrupciones, respaldados por 46 pruebas automatizadas de integración en Vitest.
