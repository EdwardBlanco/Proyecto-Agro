-- ============================================================================
-- PROYECTO: SENAagro - Gerencia Agropecuaria Inteligente y Trazabilidad BPA
-- FASE 3 (Semanas 3 y 4): Triggers Transaccionales PL/pgSQL e Integridad ICA
-- MOTOR: PostgreSQL 15+ / Supabase (Requiere extensión pgcrypto)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TRIGGER RF-28: BLOQUEO DE APLICACIÓN QUÍMICA SI EL EPP ESTÁ VENCIDO
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validar_epp_aplicacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vencimiento_epp DATE;
  v_nombre_operario TEXT;
  v_rol TEXT;
BEGIN
  SELECT nombre_completo, fecha_vencimiento_epp, rol
    INTO v_nombre_operario, v_vencimiento_epp, v_rol
    FROM public.perfiles_usuarios
   WHERE id = NEW.operario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operario no encontrado en el sistema.';
  END IF;

  IF v_rol IN ('operario_campo', 'tecnico_agronomo') THEN
    IF v_vencimiento_epp IS NULL OR v_vencimiento_epp < NEW.fecha_aplicacion THEN
      RAISE EXCEPTION 'BLOQUEO BPA (RF-28): El operario % tiene el kit EPP vencido (vigencia: %). Renueve dotación antes de aplicar agroquímicos.',
        v_nombre_operario, COALESCE(v_vencimiento_epp::TEXT, 'SIN REGISTRO');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_epp_antes_aplicacion ON public.aplicaciones_sanitarias;
CREATE TRIGGER trg_validar_epp_antes_aplicacion
  BEFORE INSERT ON public.aplicaciones_sanitarias
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_epp_aplicacion();


-- ----------------------------------------------------------------------------
-- 2. TRIGGER RF-26: BLOQUEO DE COSECHA POR PERIODO DE CARENCIA ICA ACTIVO
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validar_periodo_carencia_cosecha()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_liberacion DATE;
  v_insumo_nombre TEXT;
BEGIN
  SELECT a.fecha_liberacion_carencia, i.nombre_comercial
    INTO v_max_liberacion, v_insumo_nombre
    FROM public.aplicaciones_sanitarias a
    JOIN public.catalogo_insumos i ON i.id = a.insumo_id
   WHERE a.ciclo_id = NEW.ciclo_id
     AND a.fecha_liberacion_carencia >= NEW.fecha_cosecha
   ORDER BY a.fecha_liberacion_carencia DESC
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'BLOQUEO SANITARIO ICA (RF-26): Cosecha prohibida para el ciclo %. Existe Periodo de Carencia vigente por aplicación de % hasta el %.',
      NEW.ciclo_id, v_insumo_nombre, v_max_liberacion;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_cosecha_en_carencia ON public.cosechas_ventas;
CREATE TRIGGER trg_bloquear_cosecha_en_carencia
  BEFORE INSERT ON public.cosechas_ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_periodo_carencia_cosecha();


-- ----------------------------------------------------------------------------
-- 3. TRIGGER EJE FINANCIERO: CÁLCULO DE COSTO HÍDRICO Y ENERGÉTICO DE ACTUADORES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calcular_costo_actuador_iot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tarifa_kwh NUMERIC(10,2);
  v_tarifa_m3 NUMERIC(10,2);
  v_horas NUMERIC(10,4);
BEGIN
  SELECT p.tarifa_kwh_cop, p.tarifa_m3_agua_cop
    INTO v_tarifa_kwh, v_tarifa_m3
    FROM public.unidades_productivas u
    JOIN public.predios p ON p.id = u.predio_id
   WHERE u.id = NEW.unidad_id;

  v_horas := COALESCE(NEW.duracion_segundos, 0) / 3600.0;

  IF NEW.agua_consumida_m3 IS NULL THEN
    NEW.agua_consumida_m3 := ROUND((COALESCE(NEW.caudal_litros_seg, 0) * COALESCE(NEW.duracion_segundos, 0)) / 1000.0, 4);
  END IF;

  IF NEW.energia_consumida_kwh IS NULL THEN
    NEW.energia_consumida_kwh := ROUND(COALESCE(NEW.potencia_kw, 0) * v_horas, 4);
  END IF;

  NEW.costo_operativo_cop := ROUND(
    (NEW.agua_consumida_m3 * COALESCE(v_tarifa_m3, 0)) +
    (NEW.energia_consumida_kwh * COALESCE(v_tarifa_kwh, 0)),
    2
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_costo_actuador ON public.actuadores_eventos;
CREATE TRIGGER trg_calcular_costo_actuador
  BEFORE INSERT ON public.actuadores_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_calcular_costo_actuador_iot();


-- ----------------------------------------------------------------------------
-- 4. TRIGGER RNF-06: ENCADENAMIENTO CRIPTOGRÁFICO SHA-256 EN LIBRO OFICIAL ICA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_encadenar_hash_libro_ica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ultimo_hash TEXT;
  v_cadena_base TEXT;
BEGIN
  SELECT hash_actual
    INTO v_ultimo_hash
    FROM public.libro_oficial_ica
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  NEW.hash_anterior := COALESCE(v_ultimo_hash, 'GENESIS_SENAAGRO_ICA_2026');

  v_cadena_base := CONCAT_WS('|',
    NEW.hash_anterior,
    NEW.predio_id::TEXT,
    NEW.tipo_evento,
    NEW.fecha_evento::TEXT,
    COALESCE(NEW.detalle_normativo, '')
  );

  NEW.hash_actual := encode(digest(v_cadena_base, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_inmutable_ica ON public.libro_oficial_ica;
CREATE TRIGGER trg_hash_inmutable_ica
  BEFORE INSERT ON public.libro_oficial_ica
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_encadenar_hash_libro_ica();
