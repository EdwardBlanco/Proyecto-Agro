-- ============================================================================
-- PROYECTO: SENAagro - Gerencia Agropecuaria Inteligente y Trazabilidad BPA
-- FASE 3 (15 Agosto - 15 Septiembre): Políticas RLS (RBAC 3 Roles) y Seed Data
-- MOTOR: PostgreSQL 15+ / Supabase
-- CONTEXTO TERRITORIAL: San Gil y Socorro, Santander, Colombia
-- NOTA TÉCNICA: Sentencias INSERT directas y explícitas (sin bucles FOR/LOOP).
-- ============================================================================

-- ============================================================================
-- BLOQUE A: FUNCIONES AUXILIARES Y POLÍTICAS ROW LEVEL SECURITY (RLS) - RF-00A
-- ============================================================================

-- 1. Obtener el rol del usuario autenticado desde la tabla perfiles_usuarios
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT rol FROM public.perfiles_usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Verificar si el usuario tiene asignación activa sobre un predio específico
CREATE OR REPLACE FUNCTION public.user_has_predio(p_predio_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_predios up
    JOIN public.perfiles_usuarios pu ON pu.id = up.usuario_id
    WHERE pu.auth_user_id = auth.uid()
      AND up.predio_id = p_predio_id
      AND pu.activo = TRUE
  );
$$;

-- Activar RLS en las tablas críticas del dominio
ALTER TABLE public.predios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_productivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_productivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labores_culturales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicaciones_sanitarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosechas_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetria_lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actuadores_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libro_oficial_ica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLÍTICAS: PREDIOS Y UNIDADES PRODUCTIVAS (RF-01, RF-02)
-- ----------------------------------------------------------------------------
CREATE POLICY "predios_select_asignados" ON public.predios
  FOR SELECT USING (public.user_has_predio(id));

CREATE POLICY "predios_all_admin" ON public.predios
  FOR ALL USING (public.get_user_role() = 'admin_productor');

CREATE POLICY "unidades_select_asignadas" ON public.unidades_productivas
  FOR SELECT USING (public.user_has_predio(predio_id));

CREATE POLICY "unidades_write_admin_agronomo" ON public.unidades_productivas
  FOR ALL USING (
    public.user_has_predio(predio_id)
    AND public.get_user_role() IN ('admin_productor', 'tecnico_agronomo')
  );

-- ----------------------------------------------------------------------------
-- POLÍTICAS: CICLOS PRODUCTIVOS Y LABORES CULTURALES (RF-03, RF-10)
-- ----------------------------------------------------------------------------
CREATE POLICY "ciclos_select_predio" ON public.ciclos_productivos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.unidades_productivas u
      WHERE u.id = ciclos_productivos.unidad_id
        AND public.user_has_predio(u.predio_id)
    )
  );

CREATE POLICY "ciclos_write_mgmt" ON public.ciclos_productivos
  FOR ALL USING (
    public.get_user_role() IN ('admin_productor', 'tecnico_agronomo')
  );

CREATE POLICY "labores_select_predio" ON public.labores_culturales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ciclos_productivos c
      JOIN public.unidades_productivas u ON u.id = c.unidad_id
      WHERE c.id = labores_culturales.ciclo_id
        AND public.user_has_predio(u.predio_id)
    )
  );

-- Los 3 roles pueden registrar labores ejecutadas en campo
CREATE POLICY "labores_insert_todos_roles" ON public.labores_culturales
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin_productor', 'tecnico_agronomo', 'operario_campo')
  );

-- ----------------------------------------------------------------------------
-- POLÍTICAS: SANIDAD Y PERIODO DE CARENCIA ICA (RF-12, RF-26, RF-28)
-- ----------------------------------------------------------------------------
CREATE POLICY "sanidad_select_predio" ON public.aplicaciones_sanitarias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ciclos_productivos c
      JOIN public.unidades_productivas u ON u.id = c.unidad_id
      WHERE c.id = aplicaciones_sanitarias.ciclo_id
        AND public.user_has_predio(u.predio_id)
    )
  );

-- Operario puede registrar ejecución si tiene EPP vigente (validado por Trigger RF-28)
CREATE POLICY "sanidad_insert_roles" ON public.aplicaciones_sanitarias
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin_productor', 'tecnico_agronomo', 'operario_campo')
  );

-- ----------------------------------------------------------------------------
-- POLÍTICAS: COSECHAS Y VENTAS (AISLAMIENTO FINANCIERO ESTRICTO)
-- ----------------------------------------------------------------------------
-- Solo Admin y Técnico ven historial de cosechas (Operario no consulta precios)
CREATE POLICY "cosechas_select_mgmt" ON public.cosechas_ventas
  FOR SELECT USING (
    public.get_user_role() IN ('admin_productor', 'tecnico_agronomo')
  );

-- Operario puede insertar pesaje físico (con precio_kg = 0 / NULL), Admin registra venta
CREATE POLICY "cosechas_insert_campo_y_admin" ON public.cosechas_ventas
  FOR INSERT WITH CHECK (
    (public.get_user_role() = 'admin_productor')
    OR (
      public.get_user_role() IN ('tecnico_agronomo', 'operario_campo')
      AND COALESCE(precio_unitario_cop, 0) = 0
    )
  );

CREATE POLICY "cosechas_update_solo_admin" ON public.cosechas_ventas
  FOR UPDATE USING (public.get_user_role() = 'admin_productor');

-- ----------------------------------------------------------------------------
-- POLÍTICAS: TELEMETRÍA IOT Y ACTUADORES (RF-07, RF-08, RF-09)
-- ----------------------------------------------------------------------------
CREATE POLICY "iot_select_predio" ON public.telemetria_lecturas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.unidades_productivas u
      WHERE u.id = telemetria_lecturas.unidad_id
        AND public.user_has_predio(u.predio_id)
    )
  );

CREATE POLICY "actuadores_select_predio" ON public.actuadores_eventos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.unidades_productivas u
      WHERE u.id = actuadores_eventos.unidad_id
        AND public.user_has_predio(u.predio_id)
    )
  );

-- ----------------------------------------------------------------------------
-- POLÍTICAS: LIBRO OFICIAL ICA INMUTABLE (RNF-06 / RF-32)
-- Nadie puede hacer UPDATE ni DELETE sobre el libro oficial ICA
-- ----------------------------------------------------------------------------
CREATE POLICY "libro_ica_select_admin_agronomo" ON public.libro_oficial_ica
  FOR SELECT USING (
    public.get_user_role() IN ('admin_productor', 'tecnico_agronomo')
  );

-- No se crean políticas FOR UPDATE ni FOR DELETE: PostgreSQL bloquea ambas por defecto.


-- ============================================================================
-- BLOQUE B: DATOS SEMILLA EXPLÍCITOS (SAN GIL & SOCORRO, SANTANDER)
-- ============================================================================

-- 1. PREDIOS EN SANTANDER
INSERT INTO public.predios (id, nombre, municipio, vereda, departamento, altitud_msnm, tarifa_kwh_cop, tarifa_m3_agua_cop, activo)
VALUES ('11111111-1111-1111-1111-111111111101', 'Finca La Meseta', 'San Gil', 'Vereda Guarigua', 'Santander', 1180, 850.00, 2500.00, TRUE);

INSERT INTO public.predios (id, nombre, municipio, vereda, departamento, altitud_msnm, tarifa_kwh_cop, tarifa_m3_agua_cop, activo)
VALUES ('11111111-1111-1111-1111-111111111102', 'Finca El Mirador', 'Socorro', 'Vereda Chanchón', 'Santander', 1290, 850.00, 2350.00, TRUE);

-- 2. UNIDADES PRODUCTIVAS MULTISECTOR (Hortalizas, Hongos, Apicultura)
INSERT INTO public.unidades_productivas (id, predio_id, codigo, nombre, sector, capacidad_valor, unidad_medida, estado)
VALUES ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'LOT-SG-N1', 'Lote Norte N1 · Pimentón Nathalie', 'hortalizas', 2500.00, 'm2', 'activo');

INSERT INTO public.unidades_productivas (id, predio_id, codigo, nombre, sector, capacidad_valor, unidad_medida, estado)
VALUES ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', 'SAL-SG-S1', 'Sala Fructificación S1 · Orellanas', 'hongos', 120.00, 'm3', 'activo');

INSERT INTO public.unidades_productivas (id, predio_id, codigo, nombre, sector, capacidad_valor, unidad_medida, estado)
VALUES ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'API-SG-01', 'Apiario El Roble · Apis mellifera', 'apicultura', 18.00, 'colmenas', 'activo');

INSERT INTO public.unidades_productivas (id, predio_id, codigo, nombre, sector, capacidad_valor, unidad_medida, estado)
VALUES ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102', 'LOT-SC-S2', 'Lote Sur S2 · Pimentón California', 'hortalizas', 1800.00, 'm2', 'activo');

-- 3. CATÁLOGO CERRADO DE INSUMOS Y REGISTRO ICA (Cero texto libre - RF-10, RF-15)
INSERT INTO public.catalogo_insumos (id, codigo, nombre_comercial, categoria, ingrediente_activo, registro_ica, periodo_carencia_dias, unidad_stock, stock_actual, fecha_vencimiento)
VALUES ('33333333-3333-3333-3333-333333333301', 'INS-001', 'Dithane M-45 NT', 'agroquimico', 'Mancozeb 800 g/kg', 'ICA-4412', 15, 'kg', 12.50, '2027-08-15');

INSERT INTO public.catalogo_insumos (id, codigo, nombre_comercial, categoria, ingrediente_activo, registro_ica, periodo_carencia_dias, unidad_stock, stock_actual, fecha_vencimiento)
VALUES ('33333333-3333-3333-3333-333333333302', 'INS-002', 'Vertimec 1.8 EC', 'agroquimico', 'Abamectina 18 g/L', 'ICA-2890', 7, 'L', 3.20, '2026-12-05');

INSERT INTO public.catalogo_insumos (id, codigo, nombre_comercial, categoria, ingrediente_activo, registro_ica, periodo_carencia_dias, unidad_stock, stock_actual, fecha_vencimiento)
VALUES ('33333333-3333-3333-3333-333333333303', 'INS-003', 'Semilla Micelio Orellana Gris', 'semilla_micelio', 'Pleurotus ostreatus', NULL, 0, 'kg', 45.00, '2027-01-20');

INSERT INTO public.catalogo_insumos (id, codigo, nombre_comercial, categoria, ingrediente_activo, registro_ica, periodo_carencia_dias, unidad_stock, stock_actual, fecha_vencimiento)
VALUES ('33333333-3333-3333-3333-333333333304', 'INS-004', 'Sustrato Pulpa Café Pasteurizado', 'sustrato_hongos', 'Mezcla Orgánica Estéril', NULL, 0, 'bultos', 38.00, '2027-03-10');

-- 4. CATÁLOGO CERRADO DE LABORES CULTURALES (RF-10)
INSERT INTO public.catalogo_labores (codigo, nombre, sector_aplicable, requiere_epp)
VALUES ('poda_tutorado', 'Poda y Tutorado en Invernadero', 'hortalizas', FALSE);

INSERT INTO public.catalogo_labores (codigo, nombre, sector_aplicable, requiere_epp)
VALUES ('control_arvenses', 'Control Manual de Arvenses', 'hortalizas', FALSE);

INSERT INTO public.catalogo_labores (codigo, nombre, sector_aplicable, requiere_epp)
VALUES ('inoculacion_sustrato', 'Inoculación de Micelio en Sustrato', 'hongos', TRUE);

INSERT INTO public.catalogo_labores (codigo, nombre, sector_aplicable, requiere_epp)
VALUES ('revision_colmena', 'Revisión Sanitaria y Acústica de Colmena', 'apicultura', TRUE);

-- 5. CICLOS PRODUCTIVOS ACTIVOS (RF-03, RF-18)
INSERT INTO public.ciclos_productivos (id, unidad_id, codigo_ciclo, especie_variedad, fecha_inicio, fecha_cosecha_estimada, gdd_objetivo, meta_produccion_kg, estado)
VALUES ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', 'CIC-SG-2026-01', 'Pimentón Nathalie', '2026-09-01', '2026-11-28', 980.00, 4200.00, 'activo');

INSERT INTO public.ciclos_productivos (id, unidad_id, codigo_ciclo, especie_variedad, fecha_inicio, fecha_cosecha_estimada, gdd_objetivo, meta_produccion_kg, estado)
VALUES ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222202', 'CIC-SG-2026-02', 'Orellana Gris (Pleurotus)', '2026-10-12', '2026-11-16', 0.00, 340.00, 'activo');

INSERT INTO public.ciclos_productivos (id, unidad_id, codigo_ciclo, especie_variedad, fecha_inicio, fecha_cosecha_estimada, gdd_objetivo, meta_produccion_kg, estado)
VALUES ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222204', 'CIC-SC-2026-01', 'Pimentón California', '2026-08-15', '2026-11-14', 1210.00, 3100.00, 'activo');

-- 6. PERFILES DEL EQUIPO DE TRABAJO Y VIGENCIA DE EPP (RF-00A, RF-28)
INSERT INTO public.perfiles_usuarios (id, nombre_completo, correo, rol, fecha_vencimiento_epp, activo)
VALUES ('55555555-5555-5555-5555-555555555501', 'Juan Camilo López', 'juank.lopez@senaagro.edu.co', 'admin_productor', NULL, TRUE);

INSERT INTO public.perfiles_usuarios (id, nombre_completo, correo, rol, fecha_vencimiento_epp, activo)
VALUES ('55555555-5555-5555-5555-555555555502', 'Andrea Carolina Silva', 'andrea.silva@senaagro.edu.co', 'tecnico_agronomo', '2027-04-10', TRUE);

INSERT INTO public.perfiles_usuarios (id, nombre_completo, correo, rol, fecha_vencimiento_epp, activo)
VALUES ('55555555-5555-5555-5555-555555555503', 'Johan Javier Galvis', 'johan.galvis@senaagro.edu.co', 'operario_campo', '2026-11-18', TRUE);

INSERT INTO public.perfiles_usuarios (id, nombre_completo, correo, rol, fecha_vencimiento_epp, activo)
VALUES ('55555555-5555-5555-5555-555555555504', 'Edward Valderrama', 'edward.valderrama@senaagro.edu.co', 'operario_campo', '2027-02-28', TRUE);

-- 7. APLICACIÓN SANITARIA DE PRUEBA QUE ACTIVA BLOQUEO DE CARENCIA HASTA 2026-11-20 (RF-12, RF-26)
INSERT INTO public.aplicaciones_sanitarias (id, ciclo_id, insumo_id, operario_id, fecha_aplicacion, dosis_aplicada, unidad_dosis, fecha_liberacion_carencia, observaciones)
VALUES ('66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555503', '2026-11-05', 2.50, 'g/L', '2026-11-20', 'Aplicación preventiva en Lote N1 San Gil con EPP vigente.');
