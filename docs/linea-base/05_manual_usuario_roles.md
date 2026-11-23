# Manual de Usuario Operativo por Rol — SENAagro

## 1. Introducción: ¿Cómo funciona SENAagro en el día a día?
**SENAagro** organiza toda la operación de la finca mediante **listas desplegables precargadas** (evitando errores de digitación en nombres de agroquímicos, dosis o lotes) y un **código de colores semafórico** fácil de leer desde celular o computador:

* **VERDE (Operación Normal / Libre):** Siembras, labores culturales rutinarias, lotes libres de carencia química y cadena criptográfica ICA íntegra.
* **AMARILLO (Precaución / Periodo de Carencia Activo):** Indica que un lote recibió una aplicación sanitaria y **aún no puede cosecharse** hasta cumplir los días de carencia exigidos por el ICA.
* **ROJO (Alerta Crítica / Bloqueo):** Humedad del suelo por debajo del 40 %, anomalía acústica en colmenas, intento de cosecha bloqueado por carencia o alteración detectada en la bitácora.

---

## 2. Perfiles de Usuario y Qué Puede Hacer Cada Uno

### Perfil 1: Administrador Productor (`ADMIN_PRODUCTOR`) — *El Gerente de la Finca*
Tiene acceso completo a toda la plataforma, incluyendo la información confidencial de costos y ganancias.
1. **Resumen y Calendario Semafórico:** Visualiza el estado de todos los predios, lotes y alertas activas del día.
2. **Finanzas y Márgenes (`/finance`):** Consulta cuánto dinero ingresó por ventas de cosecha frente a cuánto se gastó en jornales, insumos y riego/energía IoT, obteniendo la ganancia neta real por ciclo.
3. **Telemetría IoT (`/iot`):** Supervisa en tiempo real la humedad del suelo en Hortalizas/Pimentón, el microclima en Hongos/Orellanas y la frecuencia acústica en Apicultura.
4. **Libro Oficial ICA (`/ica-book`):** Verifica que el sello de seguridad muestre **Cadena Íntegra SHA-256** y descarga los reportes oficiales para auditorías.
5. **Usuarios y Permisos (`/users`):** Crea cuentas y asigna roles a agrónomos y operarios.

### Perfil 2: Técnico Agrónomo (`TECNICO_AGRONOMO`) — *Responsable Sanitario y BPA*
Tiene acceso técnico completo a cultivos, sanidad, telemetría y trazabilidad ICA, pero **no visualiza cifras financieras en pesos (COP)**.
1. **Planificación de Ciclos y Labores:** Programa siembras, fertilizaciones y controles fitosanitarios.
2. **Registro de Aplicaciones Sanitarias:** Selecciona el insumo registrado ante el ICA desde la lista desplegable; el sistema calcula automáticamente la fecha exacta de liberación de carencia.
3. **Auditoría y Firma del Libro Oficial ICA (`/ica-book`):** Exporta el archivo CSV oficial o genera el Acta PDF con espacio para su firma y tarjeta profesional.

### Perfil 3: Operario de Campo (`OPERARIO_CAMPO`) — *Ejecución en Terreno*
Cuenta con una interfaz simplificada (**Mi Jornada**) enfocada únicamente en sus tareas asignadas, sin acceso a finanzas ni a registros legales del ICA.
1. **Consulta de Tareas del Día:** Revisa qué labores debe ejecutar y en qué lotes hay restricción amarilla por carencia química.
2. **Validación de EPP:** Antes de ejecutar una labor sanitaria, verifica que su Equipo de Protección Personal (EPP) esté vigente.
3. **Monitoreo de Sensores:** Puede consultar las lecturas de campo en `/telemetry` para verificar si el riego automático está encendido.

---

## 3. Guía Paso a Paso: Cómo Exportar el Reporte Oficial para una Visita del ICA
1. Ingrese con una cuenta de **Administrador Productor** o **Técnico Agrónomo**.
2. En el menú lateral izquierdo, vaya a la sección **GERENCIA Y BPA** y haga clic en **Libro Oficial ICA**.
3. Verifique en la parte superior que la etiqueta verde indique **Cadena Íntegra SHA-256 (Verificada)** (esto demuestra al inspector que ningún registro fue alterado después de guardarse).
4. Elija el formato que necesita entregar:
   * **Para entregar archivo digital (Excel):** Haga clic en el botón **Exportar CSV ICA**. Se descargará automáticamente el archivo `Libro_Oficial_ICA_SENAagro_AAAA-MM-DD.csv` listo para abrir sin errores de tildes.
   * **Para firmar en papel o guardar en PDF:** Haga clic en **Acta Oficial PDF**, seleccione *"Guardar como PDF"* o su impresora, y firme en los espacios inferiores destinados al Productor y al Técnico Agrónomo.
