# ESPECIFICACIÓN DE REQUERIMIENTOS DE SOFTWARE (SRS) — LÍNEA BASE v2.1

## Plataforma Integral de Gestión Agropecuaria, Trazabilidad BPA y Agrotrónica (`SENAagro`)

### CONTROL DE VERSIONES Y METADATOS DEL PROYECTO

| Atributo | Detalle Oficial | 
| ----- | ----- | 
| **Nombre del Proyecto** | **SENAagro** — Plataforma Integral de Gestión Proactiva Agropecuaria y Agrotrónica | 
| **Centro de Formación** | SENA — Centro Agroturístico San Gil, Santander | 
| **Programa y Ficha** | Tecnología en Análisis y Desarrollo de Software (ADSO) — Ficha `3230935` | 
| **Equipo Ejecutor** | Juan Camilo López Rúa, Johan Javier Galvis Buitrago, María Fernanda González, Andrea Carolina Silva Macías, Edward de Jesús Valderrama | 
| **Alcance Geográfico** | Predios piloto en **San Gil** y **Socorro**, escalable a productores agropecuarios del departamento de **Santander, Colombia** | 
| **Versión del Documento** | **v2.1 (Línea Base Consolidada — Control de Cambios Fase 1 / Fase 2)** | 
| **Fecha de Consolidación** | Noviembre de 2026 | 

#### Historial de Cambios de Línea Base

* **v1.0 (Borrador Inicial):** Levantamiento preliminar de 104 fichas CRUD genéricas (`Requerimientos.pdf` y `Requerimientos 1.pdf`). Deprecado por redundancia y ausencia de reglas IoT/ICA/Financieras.

* **v2.0 (Unificación Core):** Consolidación en 35 Requerimientos Funcionales y 20 Requerimientos No Funcionales integrando los 3 sectores productivos (Hortalizas/Pimentón, Hongos/Orellanas, Apicultura), reglas de bloqueo por Periodo de Carencia (ICA), telemetría IoT y Margen de Contribución Neto. Eliminación del rol de usuario externo *Auditor ICA* en favor del generador de reportes oficiales estandarizados (`RF-32`).

* **v2.1 (Actualización Arquitectónica):** Adopción formal del stack Frontend componentizado (**Vue 3 + Quasar Framework + Pinia + `pinia-plugin-persistedstate`**) para garantizar resiliencia Offline Rural (`RNF-05`), manteniendo **PostgreSQL / Supabase** en Backend y firma criptográfica **SHA-256** (`RNF-06`) en el Libro Oficial ICA.

## 1. INTRODUCCIÓN Y PROPÓSITO DEL SISTEMA

### 1.1. Propósito

El presente documento establece la **Especificación de Requerimientos de Software (SRS)** definitiva para **SENAagro**, una solución tecnológica integral orientada a transformar al productor agropecuario de San Gil, Socorro y Santander en un gerente eficiente basado en datos. El sistema articula planificación fenológica, monitoreo agrotrónico (IoT) en tiempo real, trazabilidad fitosanitaria bajo normativa de **Buenas Prácticas Agrícolas (BPA) del ICA** y control de rentabilidad financiera por unidad productiva.

### 1.2. Pilares Estratégicos del Proyecto

1. **Gerencia Eficiente:** Automatización del cálculo de densidades de siembra, previsión de insumos, Grados Día de Desarrollo (GDD), Punto de Equilibrio y Margen de Contribución Neto por lote/unidad.

2. **Trazabilidad y Cumplimiento ICA (BPA):** Control estricto e inalterable de aplicaciones de agroquímicos, verificación de vigencia de Elementos de Protección Personal (EPP), bloqueo duro de cosechas durante Periodos de Carencia (PC) activos y emisión de reportes oficiales auditables.

3. **Agrodiversificación Multisectorial:** Soporte nativo para tres líneas productivas estratégicas de la región santandereana:

   * **Hortalizas (Pimentón):** Riego automatizado por umbral de humedad volumétrica del suelo.

   * **Hongos Comestibles (Orellanas — *Pleurotus ostreatus*):** Control microclimático en salas de fructificación y trazabilidad de pasteurización de sustratos.

   * **Apicultura (*Apis mellifera*):** Monitoreo acústico (frecuencia en Hz e intensidad en dB), térmico y de geolocalización (*Geofencing*) para prevenir estrés, pérdida de reina o abandono de colmenas.

## 2. ACTORES DEL SISTEMA Y MATRIZ DE PERMISOS (RBAC)

El sistema restringe el acceso y la visibilidad de módulos mediante una matriz estricta de **3 perfiles humanos** y **1 actor automatizado de hardware**:

| Actor / Rol | Código Técnico | Alcance Operativo y Restricciones de Seguridad | 
| ----- | ----- | ----- | 
| **Administrador / Gerente Productor** | `admin_productor` | Control total de predios en Santander, configuración de tarifas (agua $\text{COP/m}^3$, energía $\text{COP/kWh}$), gestión de usuarios y EPP, visualización de márgenes financieros, control de actuadores IoT y emisión de Reportes Oficiales ICA. | 
| **Técnico Agrónomo / Especialista BPA** | `tecnico_agronomo` | Parametrización de catálogos técnicos, etapas fenológicas y umbrales IoT; prescripción de insumos ICA, gestión de análisis de agua, calibración de equipos y emisión de Reportes Técnicos ICA. **Sin acceso a márgenes financieros ni administración de cuentas.** | 
| **Operario de Campo** | `operario_campo` | Vista simplificada enfocada en **"Mi Jornada Operativa"**: consulta de tareas asignadas en el calendario semafórico, registro de labores culturales, registro de aplicaciones prescritas (bloqueado si su EPP está vencido), disposición triple lavado y pesaje físico de cosecha ($\text{kg}$). **Sin acceso a costos, precios de venta ni configuraciones.** | 
| **Nodos IoT / Telemetría Agrotrónica** | `nodo_iot_system` | Actor secundario automatizado (microcontroladores ESP32). Envía lecturas periódicas de sensores, ejecuta reglas de actuación autónoma local ante cortes de red y sincroniza eventos de consumo hídrico/energético. | 

## 3. REGLAS DE NEGOCIO DEL CORE DEL SOFTWARE

1. **RN-01 (Cero Texto Libre en Variables Críticas):** Todo registro operativo que afecte trazabilidad ICA o cálculos financieros (especies, variedades, etapas fenológicas, ingredientes activos, números de registro ICA, tipos de labor, clasificaciones de calidad) debe seleccionarse obligatoriamente desde catálogos maestros precargados mediante listas desplegables cerradas.

2. **RN-02 (Bloqueo Duro por Periodo de Carencia ICA):** Para toda aplicación química registrada sobre un ciclo productivo, el sistema calcula automáticamente:
   

   $$
   \text{Fecha\_Liberación} = \text{Fecha\_Aplicación} + \text{Días\_Periodo\_Carencia}
   $$

   
   El sistema **bloquea estrictamente** cualquier intento de registrar cosecha, despacho o venta si $\text{Fecha\_Cosecha} \le \text{Fecha\_Liberación}$.

3. **RN-03 (Validación Obligatoria de EPP y Stock):** Antes de registrar una aplicación agroquímica, el sistema verifica que el operario asignado tenga su kit de **Elementos de Protección Personal (EPP)** vigente ($\text{Fecha\_Vencimiento\_EPP} \ge \text{Fecha\_Aplicación}$) y descuenta automáticamente la cantidad aplicada del inventario maestro.

4. **RN-04 (Umbrales Técnicos Agrotrónicos por Sector):**

   * **Pimentón:** $\text{Humedad\_Suelo} < 40\%$ activa electroválvula de riego; cierra automáticamente al alcanzar $70\%$. Si existe caudal con válvula cerrada, dispara alarma crítica de fuga.

   * **Orellanas:** Rango óptimo en sala: $18^\circ\text{C} - 24^\circ\text{C}$ y $80\% - 90\%\text{ HR}$. Si $\text{Temperatura} > 26^\circ\text{C}$ activa extractor; si $\text{HR} < 75\%$ activa nebulizador.

   * **Apicultura:** Rango acústico normal: $150 - 250\text{ Hz}$. Si $\text{Frecuencia} > 300\text{ Hz}$ de forma sostenida ($>10\text{ min}$) o desplazamiento GPS supera el radio configurado, dispara alerta crítica de estrés/enjambrazón o robo.

5. **RN-05 (Cálculo Automatizado del Margen de Contribución Neto):**
   

   $$
   \text{Margen Neto} = \text{Ingresos por Venta} - \left(\text{Costo Insumos} + \text{Costo Mano de Obra} + \text{Costo Hídrico/Energético IoT}\right)
   $$

   
   Donde el costo IoT se deriva automáticamente de los segundos de encendido de cada actuador multiplicados por su caudal nominal ($\text{m}^3$), potencia ($\text{kWh}$) y tarifas del predio.

6. **RN-06 (Codificación Semafórica Estricta del Calendario):**

   * **Verde (`#2E7D32`):** Siembras, trasplantes, inoculaciones y labores culturales programadas o ejecutadas.

   * **Amarillo (`#F9A825`):** Días bloqueados por **Periodo de Carencia (PC)** activo tras aplicación química.

   * **Rojo (`#D32F2F`):** Alertas críticas IoT activas o ventanas de cosecha inminentes.

## 4. ARQUITECTURA TECNOLÓGICA Y RESTRICCIONES DE DISEÑO

### 4.1. Stack Tecnológico Oficial

* **Capa de Presentación (Frontend SPA / PWA):** Desarrollada sobre **Vue 3 (Composition API)** y **Quasar Framework**, estructurada en componentes modulares reutilizables, **Pinia** para la gestión centralizada del estado reactivo de los 3 sectores productivos y **`pinia-plugin-persistedstate`** (respaldado por almacenamiento local persistente) para garantizar la operación continua en campo sin conexión a internet.

* **Capa de Datos y Backend as a Service (BaaS):** Motor relacional **PostgreSQL** gestionado en **Supabase**, aplicando Tercera Forma Normal (3FN), integridad referencial estricta (`FOREIGN KEY`, `CHECK`), reglas de negocio transaccionales mediante *Triggers* PL/pgSQL y políticas de seguridad a nivel de fila (**Row Level Security - RLS**) alineadas a los 3 roles humanos.

* **Capa Agrotrónica (Edge / IoT):** Microcontroladores **ESP32** conectados a sensores de humedad capacitiva de suelo (Pimentón), temperatura y humedad relativa (Orellanas) y captura acústica en Hz + GPS (Apicultura), comunicados mediante API REST HTTPS con cola de almacenamiento local en memoria flash.

## 5. REQUERIMIENTOS FUNCIONALES CONSOLIDADOS (35 RF)

### Bloque 1: Seguridad, Gobernanza y Catálogos Maestros

#### `RF-00A` — Gestión de Usuarios y Control de Acceso Basado en Roles (RBAC)

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Permitir al Administrador registrar, editar, activar/desactivar usuarios y gestionar credenciales bajo la matriz estricta de 3 roles (`admin_productor`, `tecnico_agronomo`, `operario_campo`), restringiendo vistas y acciones según permisos.

* **Entradas:** Nombre completo, correo electrónico, teléfono, contraseña temporal, rol asignado (lista cerrada), estado.

* **Proceso:** 1. El administrador accede al módulo de usuarios. 2. Completa los datos y selecciona uno de los 3 roles permitidos. 3. El sistema valida unicidad de correo, encripta credenciales y aplica políticas RLS correspondientes.

* **Salida:** Cuenta creada/actualizada, registro en bitácora de auditoría y sesión autenticada con token JWT.

#### `RF-00B` — Asignación Multi-Predio y Auditoría de Sesiones

* **Prioridad:** Alta | **Complejidad:** Baja

* **Descripción:** Vincular cada usuario a uno o varios predios registrados en Santander (San Gil, Socorro, etc.) para aislar la visibilidad operativa de cada finca.

* **Entradas:** `id_usuario`, `id_predio`.

* **Proceso:** 1. Seleccionar usuario y predios asignados. 2. Validar existencia referencial. 3. Persistir relación en `usuario_predio`.

* **Salida:** Filtro automático de predios disponibles por usuario al iniciar sesión.

#### `RF-10` — Base de Datos Estandarizada (Catálogos Cerrados)

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Proveer catálogos técnicos precargados mediante menús desplegables cerrados (especies, variedades, etapas fenológicas, insumos con Registro ICA, tipos de labor y calidades) para eliminar errores de digitación y garantizar consistencia normativa.

* **Entradas:** Selección desde tablas maestras (`especies_variedades`, `etapas_fenologicas`, `insumos_maestro`).

* **Proceso:** 1. Cargar catálogos activos al inicializar formularios. 2. Bloquear entrada de texto libre en campos paramétricos. 3. Validar integridad referencial antes de guardar.

* **Salida:** Registros normalizados y auditables en PostgreSQL.

### Bloque 2: Gestión Agronómica, Multisectorial y Trazabilidad ICA (Módulo A)

#### `RF-01` — Gestión de Predios y Caracterización de Unidades Productivas Multisector

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Permitir registrar fincas en San Gil, Socorro y municipios de Santander, subdividiéndolas en unidades tipificadas: **Lotes Agrícolas (Hortalizas/Pimentón)**, **Salas de Fructificación (Hongos/Orellanas)** y **Apiarios/Colmenas (Apicultura)**, junto con sus tarifas base de agua y energía.

* **Entradas:** Nombre predio, municipio, vereda, área total ($\text{m}^2$), tarifas ($\text{COP/m}^3$, $\text{COP/kWh}$), código de unidad, sector productivo, capacidad ($\text{m}^2$, $\text{m}^3$ o número de colmenas), coordenadas GPS.

* **Proceso:** 1. Registrar predio y generar ID único. 2. Crear unidades productivas asociadas discriminando el sector. 3. Validar integridad de dimensiones y coordenadas.

* **Salida:** Predios y unidades tipificadas disponibles para planificación e IoT.

#### `RF-02` — Algoritmo de Densidad de Siembra y Capacidad Instalada

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Calcular automáticamente la cantidad óptima de plantas/surcos (pimentón), tubulares de sustrato por $\text{m}^3$ (orellanas) o capacidad de colmenas según el área/volumen de la unidad y los parámetros técnicos de la especie.

* **Entradas:** `id_unidad`, `id_especie` (distancia entre surcos y plantas o factor de carga).

* **Proceso:** 1. Recuperar área/volumen de la unidad. 2. Consultar distancias técnicas en `especies_variedades`. 3. Ejecutar cálculo automático de población óptima.

* **Salida:** Cantidad recomendada de plantas/unidades y densidad calculada.

#### `RF-03` — Previsión Dinámica de Insumos y Sustratos

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Estimar automáticamente las cantidades de fertilizantes, agua, sustratos orgánicos y micelio requeridos para alcanzar una meta de producción proyectada.

* **Entradas:** `id_unidad`, `id_especie`, meta de producción ($\text{kg}$).

* **Proceso:** 1. Consultar rendimientos referenciales y requerimientos por etapa fenológica. 2. Calcular cantidades estimadas de insumos y costo proyectado.

* **Salida:** Reporte técnico de previsión de insumos y presupuesto base.

#### `RF-04` — Trazabilidad de Semilleros, Propagación y Pasteurización de Sustratos

* **Prioridad:** Media | **Complejidad:** Media

* **Descripción:** Controlar el material biológico previo a producción definitiva: bandejas de semillero en pimentón (`%` de germinación y fecha límite de trasplante) y lotes de sustrato en orellanas (temperatura de pasteurización $65^\circ\text{C}-80^\circ\text{C}$ e inoculación).

* **Entradas:** `id_ciclo`, tipo de proceso, lote de material, fecha inicio, unidades sembradas/logradas, temperatura de pasteurización.

* **Proceso:** 1. Registrar lote de propagación/sustrato. 2. Calcular porcentaje de germinación o colonización. 3. Emitir alerta preventiva próxima a la fecha de trasplante o paso a fructificación.

* **Salida:** Historial de propagación, porcentaje de éxito y alertas de traslado.

#### `RF-05` — Cronograma Fenológico Dinámico

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Generar automáticamente el cronograma de etapas biológicas desde la fecha de siembra o inoculación hasta la fecha proyectada de cosecha, actualizándose dinámicamente según avances y GDD.

* **Entradas:** `id_ciclo`, `fecha_inicio`, `id_especie`.

* **Proceso:** 1. Consultar etapas ordenadas en `etapas_fenologicas`. 2. Calcular fechas estimadas acumuladas por etapa. 3. Actualizar proyección ante desviaciones climáticas o biológicas.

* **Salida:** Línea de tiempo fenológica y fecha estimada de cosecha.

#### `RF-06` — Seguridad Logística Post-Cosecha

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Clasificar los productos cosechados según su fisiología (climatéricos vs. no climatéricos) y validar su grado de madurez para autorizar despacho y almacenamiento.

* **Entradas:** `id_ciclo`, grado de madurez (`verde_fisiologico`, `pinton`, `maduro_consumo`), clasificación fisiológica.

* **Proceso:** 1. Consultar fisiología de la especie. 2. Validar compatibilidad entre madurez y destino comercial. 3. Emitir recomendaciones o alertas post-cosecha.

* **Salida:** Autorización logística y clasificación de lote cosechado.

#### `RF-11` — Calendario Semafórico Interactivo

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Renderizar una agenda visual dinámica codificada estrictamente por colores: **Verde** (siembras y labores culturales), **Amarillo** (periodos de carencia activos) y **Rojo** (alertas IoT críticas o cosechas inminentes).

* **Entradas:** Eventos de `labores_culturales`, rangos de `fecha_fin_carencia`, alertas de `lecturas_telemetria` y fechas de cosecha.

* **Proceso:** 1. Consolidar eventos del predio activo. 2. Aplicar reglas de prioridad semafórica. 3. Renderizar vista mensual/semanal reactiva.

* **Salida:** Calendario semafórico interactivo actualizado en tiempo real.

#### `RF-12` — Libro Oficial de Operaciones ICA y Trazabilidad BPA

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Almacenar de forma inalterable todas las aplicaciones de agroquímicos realizadas en cada ciclo, registrando Número ICA, ingrediente activo, dosis, operario responsable y fecha de liberación de Periodo de Carencia.

* **Entradas:** `id_ciclo`, `id_insumo`, `id_operario`, `id_calibracion`, fecha aplicación, dosis, blanco biológico.

* **Proceso:** 1. Validar EPP vigente del operario y stock disponible. 2. Calcular `fecha_fin_carencia`. 3. Grabar en `aplicaciones_agroquimicas` y generar registro encadenado SHA-256 en `libro_oficial_ica`.

* **Salida:** Registro sanitario oficial inmutable y actualización del estado de la unidad a `en_carencia`.

#### `RF-14` — Historial de Rotación de Cultivos y Descanso de Unidades

* **Prioridad:** Media | **Complejidad:** Media

* **Descripción:** Mantener la trazabilidad cronológica de todos los ciclos productivos ejecutados en cada lote o sala para evitar agotamiento nutricional y romper ciclos de plagas/patógenos.

* **Entradas:** `id_unidad`, historial de `ciclos_productivos`.

* **Proceso:** 1. Consultar ciclos finalizados por unidad. 2. Mostrar secuencia botánica/productiva y tiempos de descanso.

* **Salida:** Bitácora histórica de rotación por unidad productiva.

#### `RF-15` — Gestión de Inventario de Insumos y Sustratos

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Administrar entradas por compra, salidas automáticas por aplicación/siembra y existencias disponibles de agroquímicos, fertilizantes, sustratos y micelio.

* **Entradas:** `id_insumo`, tipo de movimiento, cantidad, costo unitario ($\text{COP}$).

* **Proceso:** 1. Registrar ingresos de inventario. 2. Descontar automáticamente mediante trigger al registrar aplicaciones. 3. Bloquear operaciones si el stock es insuficiente.

* **Salida:** Saldo actualizado en tiempo real y valoración de inventario.

#### `RF-16` — Alertas de Vencimiento de Químicos e Insumos Biológicos

* **Prioridad:** Media | **Complejidad:** Baja

* **Descripción:** Monitorear diariamente la fecha de vencimiento de los insumos almacenados y emitir alertas preventivas cuando resten menos de 30 días de vigencia.

* **Entradas:** `fecha_vencimiento` de `insumos_maestro`, fecha actual del sistema.

* **Proceso:** 1. Evaluar diferencia de días ($\text{Fecha\_Vencimiento} - \text{Hoy} < 30$). 2. Marcar con badge de advertencia y notificar al Administrador y Técnico Agrónomo.

* **Salida:** Listado de insumos próximos a vencer y bloqueo de uso si ya expiraron.

#### `RF-17` — Registro de Incidencias de Plagas, Enfermedades y Anomalías

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Permitir reportar eventos sanitarios en campo (plagas en pimentón, contaminación en sustratos de orellanas o anomalías en colmenas), registrando severidad y umbral de daño económico.

* **Entradas:** `id_ciclo`, categoría incidencia, agente causal, severidad (`baja`, `media`, `alta`, `critica`), supera umbral económico, observaciones.

* **Proceso:** 1. Registrar hallazgo desde campo (online u offline). 2. Asociar al ciclo activo y notificar al Técnico Agrónomo.

* **Salida:** Bitácora fitosanitaria y seguimiento hasta control.

#### `RF-18` — Cálculo Dinámico de Grados Día de Desarrollo (GDD)

* **Prioridad:** Media | **Complejidad:** Alta

* **Descripción:** Acumular diariamente los Grados Día de Desarrollo a partir de las temperaturas máximas y mínimas capturadas por los sensores IoT para ajustar con precisión la fecha estimada de cosecha.

* **Entradas:** $T_{\max}$, $T_{\min}$ diarias de telemetría, $T_{\text{base}}$ de la especie.

* **Proceso:** 1. Calcular $\text{GDD}_{\text{día}} = \max\left(0, \frac{T_{\max} + T_{\min}}{2} - T_{\text{base}}\right)$. 2. Sumar a `gdd_acumulados` del ciclo. 3. Recalcular `fecha_cosecha_estimada`.

* **Salida:** GDD acumulados y proyección dinámica de cosecha.

#### `RF-19` — Registro de Labores Culturales

* **Prioridad:** Media | **Complejidad:** Media

* **Descripción:** Registrar las actividades operativas ejecutadas por los operarios en cada ciclo (poda, tutorado, inoculación, revisión de colmenas, deshierbe) junto con las horas-hombre invertidas.

* **Entradas:** `id_ciclo`, `id_operario`, `tipo_labor` (lista cerrada), fecha, `horas_hombre`, `costo_hora_cop`.

* **Proceso:** 1. Validar datos ingresados. 2. Calcular automáticamente `costo_total_cop`. 3. Reflejar actividad en verde dentro del Calendario Semafórico.

* **Salida:** Registro de labor y acumulación de costo de mano de obra directa.

#### `RF-26` — Validación Cruzada del Periodo de Carencia (Bloqueo Duro)

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Verificar automáticamente antes de cualquier registro de cosecha, venta o despacho que hayan transcurrido los días completos de carencia de todos los agroquímicos aplicados en el ciclo.

* **Entradas:** `id_ciclo`, `fecha_cosecha`, historial de `aplicaciones_agroquimicas`.

* **Proceso:** 1. Consultar $\max(\text{fecha\_fin\_carencia})$ del ciclo. 2. Si $\text{fecha\_cosecha} \le \text{fecha\_fin\_carencia}$, ejecutar excepción de bloqueo en base de datos e interfaz.

* **Salida:** Autorización de cosecha o bloqueo sanitario estricto con fecha de liberación.

#### `RF-27` — Registro de Calibración de Equipos de Aspersión

* **Prioridad:** Media | **Complejidad:** Media

* **Descripción:** Gestionar el historial de mantenimiento y calibración de bombas de espalda, estacionarias, nebulizadores y sensores para cumplir requisitos de auditoría BPA.

* **Entradas:** `id_predio`, código equipo, tipo equipo, fecha calibración, próxima calibración, responsable, caudal medido ($\text{L/min}$).

* **Proceso:** 1. Registrar evento de calibración. 2. Alertar cuando la fecha de próxima calibración esté vencida.

* **Salida:** Historial técnico de calibración de equipos.

#### `RF-28` — Gestión de Equipos de Protección Personal (EPP)

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Administrar la entrega y vigencia de kits EPP por operario, bloqueando automáticamente la asignación de aplicaciones agroquímicas si el kit está vencido.

* **Entradas:** `id_operario`, código kit, fecha entrega, fecha vencimiento.

* **Proceso:** 1. Registrar asignación de EPP. 2. Validar vigencia automáticamente en el trigger de aplicaciones químicas (`RF-12`).

* **Salida:** Control de seguridad industrial y cumplimiento normativo BPA.

#### `RF-29` — Registro de Manejo de Residuos y Envases Triple Lavado

* **Prioridad:** Media | **Complejidad:** Media

* **Descripción:** Documentar el procedimiento de triple lavado, perforado de envases vacíos de agroquímicos y entrega a centros de acopio autorizados (ej. CampoLimpio).

* **Entradas:** `id_aplicacion`, confirmación triple lavado y perforado, cantidad envases, fecha entrega, centro de acopio, número de certificado.

* **Proceso:** 1. Asociar disposición a la aplicación química correspondiente. 2. Registrar en `libro_oficial_ica`.

* **Salida:** Evidencia ambiental auditada para certificación BPA.

#### `RF-32` — Reporte Automatizado en Formato Oficial ICA / BPA

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Generar documentos consolidados estandarizados (PDF y Excel) con los datos mínimos obligatorios exigidos por el ICA para certificar Buenas Prácticas Agrícolas en los predios evaluados, incluyendo firma de integridad SHA-256.

* **Entradas:** `id_predio`, rango de fechas.

* **Proceso:** 1. Consolidar identificación del predio, aplicaciones químicas con registro ICA, cumplimiento de periodos de carencia, vigencia de EPP, triple lavado, análisis de agua y cosechas despachadas. 2. Renderizar documento oficial descargable.

* **Salida:** Archivo PDF/Excel oficial listo para inspección del ICA (sin requerir usuario externo en plataforma).

#### `RF-33` — Trazabilidad de Calidad de Agua de Riego

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Registrar los resultados de análisis fisicoquímicos y microbiológicos de las fuentes hídricas utilizadas en el predio, alertando ante parámetros fuera de norma BPA.

* **Entradas:** `id_predio`, fuente hídrica, fecha muestreo, laboratorio, pH, conductividad, coliformes fecales, número informe.

* **Proceso:** 1. Registrar resultados de laboratorio. 2. Evaluar cumplimiento normativo y emitir alerta si no es apta para riego.

* **Salida:** Historial de inocuidad hídrica para auditoría ICA.

### Bloque 3: Telemetría IoT y Automatización Agrotrónica (Módulo B)

#### `RF-07` — Automatización de Riego para Pimentón

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Monitorear continuamente la humedad volumétrica del suelo mediante sensores IoT y controlar la apertura/cierre de electroválvulas cuando la humedad descienda por debajo del umbral técnico ($<40\%$).

* **Entradas:** Lecturas de `humedad_suelo` (`%`), umbrales configurado mínimo/máximo, caudal nominal de electroválvula.

* **Proceso:** 1. Ingerir lectura del nodo ESP32. 2. Si $\text{Humedad} < 40\%$, abrir electroválvula y registrar `fecha_inicio`. 3. Cerrar al alcanzar $70\%$, registrar `fecha_fin` y calcular $\text{m}^3$ y costo en $\text{COP}$.

* **Salida:** Control automático de riego, historial de telemetría y costo hídrico/energético.

#### `RF-08` — Control Microclimático para Orellanas

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Supervisar temperatura ($^\circ\text{C}$) y humedad relativa (`% HR`) en salas de fructificación de hongos, activando nebulizadores o extractores para mantener condiciones óptimas ($18^\circ\text{C}-24^\circ\text{C}$ y $80\%-90\%\text{ HR}$).

* **Entradas:** Lecturas de `temperatura_ambiente` y `humedad_relativa`.

* **Proceso:** 1. Evaluar lecturas contra umbrales de sala. 2. Disparar actuador correspondiente ante desviaciones. 3. Registrar evento de actuación y consumo energético.

* **Salida:** Estabilidad microclimática y bitácora ambiental.

#### `RF-09` — Telemetría Acústica y Térmica para Apicultura

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Monitorear la frecuencia acústica (`Hz`), nivel de ruido (`dB`) y temperatura interna de las colmenas para detectar tempranamente estrés, pérdida de reina o riesgo de enjambrazón/abandono.

* **Entradas:** Lecturas de `frecuencia_acustica_hz`, `nivel_ruido_db`, temperatura de cámara.

* **Proceso:** 1. Analizar frecuencia frente al rango normal ($150-250\text{ Hz}$). 2. Si supera $300\text{ Hz}$ de forma sostenida, disparar alerta crítica en dashboard y calendario semafórico (rojo).

* **Salida:** Alertas tempranas de salud de colmena y prevención de pérdida de apiario.

#### `RF-20` — Modo Local Autónomo para Nodos IoT

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Permitir que los microcontroladores en campo continúen evaluando umbrales y operando electroválvulas/extractores de forma autónoma cuando se interrumpa la conexión a internet, almacenando eventos localmente para sincronización posterior.

* **Entradas:** Umbrales cacheados en flash del ESP32, lecturas locales.

* **Proceso:** 1. Detectar pérdida de conexión con API Supabase. 2. Ejecutar reglas locales y guardar buffer con timestamp. 3. Sincronizar con bandera `cola_offline` al restablecer red.

* **Salida:** Continuidad operativa agrotrónica sin pérdida de registros.

#### `RF-21` — Monitoreo de Batería y Energía de Nodos

* **Prioridad:** Media | **Complejidad:** Media

* **Descripción:** Supervisar el porcentaje de carga/voltaje de los dispositivos IoT en campo y alertar al administrador cuando la batería caiga por debajo del $20\%$.

* **Entradas:** `id_dispositivo`, `bateria_porcentaje`.

* **Proceso:** 1. Actualizar nivel energético en cada paquete de telemetría. 2. Generar alerta preventiva de mantenimiento si $\text{Batería} < 20\%$.

* **Salida:** Indicador de salud energética por nodo.

#### `RF-22` — Calibración Remota de Sensores

* **Prioridad:** Media | **Complejidad:** Alta

* **Descripción:** Permitir al Técnico Agrónomo o Administrador ajustar el factor de corrección/offset de los sensores desde la interfaz web sin reprogramar físicamente el microcontrolador.

* **Entradas:** `id_sensor`, `factor_calibracion`, `umbral_minimo`, `umbral_maximo`.

* **Proceso:** 1. Actualizar parámetros en tabla `sensores`. 2. Sincronizar nueva configuración en la siguiente petición del nodo IoT.

* **Salida:** Sensor recalibrado con trazabilidad de configuración.

#### `RF-23` — Detección de Fugas de Agua en Red de Riego

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Detectar anomalías hidráulicas comparando el sensor de caudal (`L/min`) contra el estado lógico de la electroválvula, emitiendo alarma crítica si existe flujo de agua cuando la válvula debe estar cerrada.

* **Entradas:** Lectura de `caudal_agua_l_min`, `estado_actual` de `actuadores`.

* **Proceso:** 1. Cruzar lectura de flujo $> 0$ con `estado_actual = 'apagado'`. 2. Disparar alerta roja inmediata de posible fuga o falla mecánica de válvula.

* **Salida:** Alarma crítica de fuga hídrica y prevención de sobrecostos.

#### `RF-24` — Control de Choque Térmico en Microcultivos

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Proteger las salas de orellanas ante picos bruscos de temperatura ($>26^\circ\text{C}$) activando automáticamente sistemas de ventilación/extracción y nebulización evaporativa.

* **Entradas:** `temperatura_ambiente`, umbral crítico máximo.

* **Proceso:** 1. Detectar cruce de umbral crítico. 2. Activar extractor térmico de emergencia hasta retornar a rango seguro ($<23^\circ\text{C}$).

* **Salida:** Prevención de pérdida de cosecha de hongos por choque térmico.

#### `RF-25` — Geofencing y Seguridad de Apiarios

* **Prioridad:** Media | **Complejidad:** Alta

* **Descripción:** Monitorear las coordenadas GPS de las colmenas frente a su ubicación base registrada y emitir alerta de seguridad si se detecta un desplazamiento fuera del radio permitido ($50\text{ m}$).

* **Entradas:** Coordenadas base (`latitud_base`, `longitud_base`), lectura GPS actual, `radio_geofence_m`.

* **Proceso:** 1. Calcular distancia geodésica (fórmula de Haversine). 2. Si $\text{Distancia} > \text{Radio}$, generar alerta crítica de movimiento no autorizado.

* **Salida:** Alerta antirrobo y rastreo de ubicación del apiario.

### Bloque 4: Costos Financieros y Comercialización (Módulo C)

#### `RF-13` — Cálculo Automatizado del Margen de Contribución Neto por Ciclo

* **Prioridad:** Alta | **Complejidad:** Media

* **Descripción:** Consolidar en tiempo real los ingresos por ventas de cosecha menos la sumatoria de costos directos (insumos aplicados, mano de obra de labores y consumo hídrico/energético derivado de actuaciones IoT).

* **Entradas:** Ingresos de `cosechas_ventas`, costos de `aplicaciones_agroquimicas`, `labores_culturales` y `eventos_actuacion`.

* **Proceso:** 1. Ejecutar vista analítica `vw_rentabilidad_ciclos`. 2. Calcular margen neto en $\text{COP}$ y porcentaje de rentabilidad por ciclo y sector.

* **Salida:** Tablero financiero gerencial actualizado al instante.

#### `RF-30` — Cálculo del Punto de Equilibrio por Kilogramo

* **Prioridad:** Media | **Complejidad:** Media

* **Descripción:** Determinar el costo unitario mínimo por kilogramo ($\text{COP/kg}$) necesario para cubrir la totalidad de los costos directos acumulados de un ciclo productivo.

* **Entradas:** Costo total directo acumulado ($\text{COP}$), producción real cosechada ($\text{kg}$).

* **Proceso:** 1. Dividir $\text{Costo Total Directo} / \text{Kilogramos Cosechados}$. 2. Mostrar indicador de precio piso de venta rentable.

* **Salida:** Precio mínimo de equilibrio ($\text{COP/kg}$) por lote/sala.

#### `RF-31` — Módulo de Cosechas, Ventas y Trazabilidad Comercial

* **Prioridad:** Alta | **Complejidad:** Alta

* **Descripción:** Registrar la recolección de producto (sujeta al bloqueo de carencia `RF-26`), clasificar su calidad (`Extra`, `Primera`, `Segunda`, `Industrial`) y vincular la venta comercial al comprador y lote de origen.

* **Entradas:** `id_ciclo`, código lote cosecha, fecha, `cantidad_kg`, calidad, grado madurez, cliente comprador, destino comercial, `precio_venta_kg_cop`.

* **Proceso:** 1. Verificar ausencia de carencia activa mediante trigger SQL. 2. Registrar pesaje y datos comerciales (precios visibles solo para `admin_productor`). 3. Actualizar ingresos del ciclo.

* **Salida:** Lote cosechado trazable y actualización automática de ingresos financieros.

## 6. REQUERIMIENTOS NO FUNCIONALES CONSOLIDADOS (20 RNF)

| Código | Requisito No Funcional | Especificación Técnica y Criterio de Aceptación | 
| ----- | ----- | ----- | 
| **RNF-01** | **Arquitectura Frontend Modular Componentizada** | Interfaz desarrollada en **Vue 3 + Quasar Framework + Pinia**, con componentes desacoplados, tipografía legible y estética institucional *SENAagro* (`#123D29` / `#2E7D32`). | 
| **RNF-02** | **Persistencia Relacional e Integridad ACID** | Base de datos **PostgreSQL en Supabase** en 3FN con claves foráneas, restricciones `CHECK` y triggers transaccionales que impiden corrupción de datos ICA. | 
| **RNF-03** | **Rendimiento de Ingesta IoT** | El backend deberá procesar solicitudes HTTP POST de telemetría proveniente de nodos ESP32 con latencia inferior a $2\text{ segundos}$. | 
| **RNF-04** | **Seguridad Basada en Roles (RBAC + RLS)** | Aislamiento estricto mediante autenticación JWT y políticas **Row Level Security (RLS)** en Supabase para los 3 roles (`admin_productor`, `tecnico_agronomo`, `operario_campo`). | 
| **RNF-05** | **Resiliencia y Persistencia Offline Rural** | Uso de **`pinia-plugin-persistedstate`** en cliente y cola local en nodos IoT para operar sin conexión en veredas de San Gil y Socorro, sincronizando automáticamente al recuperar señal. | 
| **RNF-06** | **Inalterabilidad Criptográfica ICA** | Encadenamiento de registros en `libro_oficial_ica` mediante firma **SHA-256**, garantizando auditoría inmutable y verificación visual mediante sello de seguridad. | 
| **RNF-07** | **Eficiencia Energética de Nodos IoT** | Implementación de ciclos *Deep Sleep* en microcontroladores de campo para maximizar autonomía energética con paneles solares o baterías. | 
| **RNF-08** | **Diseño Responsivo Multi-Dispositivo** | Adaptación fluida en pantallas desde teléfonos móviles ($4.7"$) usados en campo hasta monitores de escritorio sin pérdida de funcionalidad. | 
| **RNF-09** | **Conversión de Unidades Regionales** | Soporte de ingreso en unidades locales (hectáreas, fanegadas, $\text{m}^2$, $\text{m}^3$) con conversión interna estandarizada al Sistema Internacional. | 
| **RNF-10** | **Recuperación ante Desastres (RTO)** | Respaldos automatizados diarios en Supabase con tiempo máximo de restauración operativa inferior a $2\text{ horas}$. | 
| **RNF-11** | **Concurrencia de Telemetría** | Capacidad para recibir y procesar simultáneamente lecturas de al menos $50$ nodos IoT concurrentes sin bloqueos de tabla. | 
| **RNF-12** | **Alto Contraste para Lectura en Campo** | Superficies sólidas de alto contraste (sin transparencias que afecten legibilidad bajo luz solar directa) y colores semafóricos inequívocos. | 
| **RNF-13** | **Confidencialidad de Datos Financieros** | Ocultamiento total de costos, tarifas, precios de venta y márgenes netos para los perfiles `operario_campo` y `tecnico_agronomo`. | 
| **RNF-14** | **Optimización de Payloads de Red** | Intercambio de tramas JSON ligeras entre sensores IoT y API REST para minimizar consumo de datos móviles en zonas rurales. | 
| **RNF-15** | **Actualización Remota de Parámetros / OTA** | Capacidad de actualizar umbrales técnicos y factores de calibración de dispositivos IoT de forma remota desde la nube. | 
| **RNF-16** | **Protección Física de Estaciones IoT** | Encapsulados con grado de protección IP65 para nodos expuestos a humedad en invernaderos de pimentón, salas de orellanas y apiarios. | 
| **RNF-17** | **Retención Histórica Normativa** | Conservación íntegra de registros sanitarios, aplicaciones químicas y reportes ICA durante al menos $5\text{ años}$ para auditorías BPA. | 
| **RNF-18** | **Sincronización Diferida Idempotente** | Prevención de registros duplicados mediante identificadores únicos (UUID) cuando la cola offline de Pinia o de los nodos IoT sincroniza datos acumulados. | 
| **RNF-19** | **Protección Eléctrica de Actuadores** | Aislamiento mediante optoacopladores/relés y protección contra sobretensiones en el control de electroválvulas y extractores. | 
| **RNF-20** | **Escalabilidad Modular Horizontal** | Arquitectura desacoplada que permite incorporar nuevos predios de Santander o nuevas líneas productivas sin modificar el núcleo relacional ni la lógica ICA. | 
