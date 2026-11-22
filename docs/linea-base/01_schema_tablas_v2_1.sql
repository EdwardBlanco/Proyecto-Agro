-- ============================================================================
-- PROYECTO: SENAagro - Gerencia Agropecuaria Inteligente y Trazabilidad BPA
-- LÍNEA BASE v2.1.1 (DDL MAESTRO DEFINITIVO - SIN RESTRICCIONES FANTASMA)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS public.libro_oficial_ica CASCADE;
DROP TABLE IF EXISTS public.actuadores_eventos CASCADE;
DROP TABLE IF EXISTS public.telemetria_lecturas CASCADE;
DROP TABLE IF EXISTS public.cosechas_ventas CASCADE;
DROP TABLE IF EXISTS public.aplicaciones_sanitarias CASCADE;
DROP TABLE IF EXISTS public.labores_culturales CASCADE;
DROP TABLE IF EXISTS public.ciclos_productivos CASCADE;
DROP TABLE IF EXISTS public.catalogo_labores CASCADE;
DROP TABLE IF EXISTS public.catalogo_insumos CASCADE;
DROP TABLE IF EXISTS public.unidades_productivas CASCADE;
DROP TABLE IF EXISTS public.lotes CASCADE;
DROP TABLE IF EXISTS public.usuarios_predios CASCADE;
DROP TABLE IF EXISTS public.usuario_predios CASCADE;
DROP TABLE IF EXISTS public.perfiles_usuarios CASCADE;
DROP TABLE IF EXISTS public.predios CASCADE;

CREATE TABLE public.predios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  municipio TEXT NOT NULL,
  vereda TEXT,
  departamento TEXT DEFAULT 'Santander',
  altitud_msnm INTEGER,
  tarifa_kwh_cop NUMERIC(10,2) DEFAULT 850.00,
  tarifa_m3_agua_cop NUMERIC(10,2) DEFAULT 2200.00,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.perfiles_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre_completo TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin_productor', 'tecnico_agronomo', 'operario_campo')),
  fecha_vencimiento_epp DATE,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.usuarios_predios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.perfiles_usuarios(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES public.perfiles_usuarios(id) ON DELETE CASCADE,
  predio_id UUID NOT NULL REFERENCES public.predios(id) ON DELETE CASCADE,
  asignado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.unidades_productivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predio_id UUID NOT NULL REFERENCES public.predios(id) ON DELETE CASCADE,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  sector TEXT NOT NULL,
  capacidad_valor NUMERIC(10,2) NOT NULL,
  unidad_medida TEXT NOT NULL,
  estado TEXT DEFAULT 'activo',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.catalogo_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre_comercial TEXT NOT NULL,
  categoria TEXT NOT NULL,
  ingrediente_activo TEXT,
  registro_ica TEXT UNIQUE,
  periodo_carencia_dias INTEGER NOT NULL DEFAULT 0,
  unidad_stock TEXT DEFAULT 'ml',
  stock_actual NUMERIC(10,2) DEFAULT 0,
  fecha_vencimiento DATE,
  costo_unitario_cop NUMERIC(12,2) DEFAULT 0,
  precio_unitario_cop NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE public.catalogo_labores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  sector_aplicable TEXT NOT NULL,
  requiere_epp BOOLEAN DEFAULT true,
  epp_requerido TEXT NOT NULL DEFAULT 'Kit básico de campo: botas de caucho, guantes de carnaza y protección solar',
  costo_jornal_referencia_cop NUMERIC(12,2) DEFAULT 55000
);

CREATE TABLE public.ciclos_productivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades_productivas(id) ON DELETE CASCADE,
  codigo_ciclo TEXT UNIQUE NOT NULL,
  especie_variedad TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_cosecha_estimada DATE NOT NULL,
  gdd_objetivo INTEGER,
  meta_produccion_kg NUMERIC(10,2),
  estado TEXT DEFAULT 'en_curso',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.labores_culturales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_productivos(id) ON DELETE CASCADE,
  labor_id UUID REFERENCES public.catalogo_labores(id),
  labor_codigo TEXT REFERENCES public.catalogo_labores(codigo),
  operario_id UUID NOT NULL REFERENCES public.perfiles_usuarios(id),
  fecha_ejecucion DATE DEFAULT CURRENT_DATE,
  horas_trabajadas NUMERIC(5,2) DEFAULT 4.0,
  costo_mano_obra_cop NUMERIC(12,2) DEFAULT 0,
  observaciones TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.aplicaciones_sanitarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_productivos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.catalogo_insumos(id),
  operario_id UUID NOT NULL REFERENCES public.perfiles_usuarios(id),
  fecha_aplicacion DATE DEFAULT CURRENT_DATE,
  dosis_aplicada NUMERIC(10,3) NOT NULL,
  unidad_dosis TEXT NOT NULL,
  fecha_liberacion_carencia DATE NOT NULL,
  observaciones TEXT,
  costo_insumo_cop NUMERIC(12,2) DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cosechas_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_productivos(id) ON DELETE CASCADE,
  operario_id UUID NOT NULL REFERENCES public.perfiles_usuarios(id),
  fecha_cosecha DATE DEFAULT CURRENT_DATE,
  cantidad_kg NUMERIC(10,2) NOT NULL,
  calidad TEXT DEFAULT 'Primera',
  precio_venta_kg_cop NUMERIC(12,2) DEFAULT 0,
  precio_unitario_cop NUMERIC(12,2) DEFAULT 0,
  observaciones TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.telemetria_lecturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades_productivas(id) ON DELETE CASCADE,
  ciclo_id UUID REFERENCES public.ciclos_productivos(id) ON DELETE SET NULL,
  tipo_sensor TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  unidad TEXT NOT NULL,
  alerta_disparada BOOLEAN DEFAULT false,
  registrado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.actuadores_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades_productivas(id) ON DELETE CASCADE,
  ciclo_id UUID REFERENCES public.ciclos_productivos(id) ON DELETE SET NULL,
  tipo_actuador TEXT NOT NULL,
  duracion_minutos INTEGER NOT NULL,
  consumo_litros NUMERIC(10,2) DEFAULT 0,
  consumo_kwh NUMERIC(10,3) DEFAULT 0,
  costo_operativo_cop NUMERIC(12,2) DEFAULT 0,
  ejecutado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.libro_oficial_ica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predio_id UUID NOT NULL REFERENCES public.predios(id) ON DELETE CASCADE,
  ciclo_id UUID REFERENCES public.ciclos_productivos(id),
  tipo_evento TEXT NOT NULL,
  referencia_tabla TEXT NOT NULL,
  referencia_id UUID NOT NULL,
  payload_json JSONB NOT NULL,
  hash_anterior TEXT NOT NULL,
  hash_actual TEXT UNIQUE NOT NULL,
  registrado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.predios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_predios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_productivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_labores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_productivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labores_culturales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicaciones_sanitarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosechas_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetria_lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actuadores_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libro_oficial_ica ENABLE ROW LEVEL SECURITY;
