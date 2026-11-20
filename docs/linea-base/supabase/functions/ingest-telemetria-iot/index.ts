// ============================================================================
// PROYECTO: SENAagro - Supabase Edge Function: ingest-telemetria-iot
// FASE 3 (Semanas 3 y 4): Ingesta ESP32 + Evaluación de Umbrales (RF-07, RF-08, RF-09)
// ============================================================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TelemetriaPayload {
  nodo_codigo: string;
  unidad_id: string;
  ciclo_id?: string;
  sector: "hortalizas" | "hongos" | "apicultura";
  lecturas: {
    humedad_suelo_pct?: number;     // Pimentón: umbral < 40%
    temperatura_c?: number;         // Orellanas / Colmena
    humedad_relativa_pct?: number;  // Orellanas: umbral < 75%
    frecuencia_hz?: number;         // Apicultura: alerta > 300 Hz
    decibeles_db?: number;
    latitud?: number;
    longitud?: number;
  };
  bateria_pct?: number;
  timestamp_origen?: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload: TelemetriaPayload = await req.json();
    const { unidad_id, ciclo_id, sector, lecturas } = payload;

    const { error: errLectura } = await supabase.from("telemetria_lecturas").insert({
      unidad_id,
      ciclo_id: ciclo_id ?? null,
      nodo_codigo: payload.nodo_codigo,
      humedad_suelo_pct: lecturas.humedad_suelo_pct ?? null,
      temperatura_c: lecturas.temperatura_c ?? null,
      humedad_relativa_pct: lecturas.humedad_relativa_pct ?? null,
      frecuencia_hz: lecturas.frecuencia_hz ?? null,
      decibeles_db: lecturas.decibeles_db ?? null,
      bateria_pct: payload.bateria_pct ?? 100,
      registrado_en: payload.timestamp_origen ?? new Date().toISOString(),
    });

    if (errLectura) throw errLectura;

    const comandosActuador: Array<Record<string, unknown>> = [];

    if (sector === "hortalizas" && typeof lecturas.humedad_suelo_pct === "number") {
      if (lecturas.humedad_suelo_pct < 40.0) {
        comandosActuador.push({
          actuador: "electrovalvula_riego",
          accion: "ENCENDER",
          motivo: `Humedad suelo crítica (${lecturas.humedad_suelo_pct}% < 40%)`,
          duracion_estimada_seg: 1200,
        });
      }
    }

    if (sector === "hongos") {
      if (typeof lecturas.temperatura_c === "number" && lecturas.temperatura_c > 26.0) {
        comandosActuador.push({
          actuador: "extractor_termico",
          accion: "ENCENDER",
          motivo: `Temperatura sala alta (${lecturas.temperatura_c}°C > 26°C)`,
          duracion_estimada_seg: 900,
        });
      }
      if (typeof lecturas.humedad_relativa_pct === "number" && lecturas.humedad_relativa_pct < 75.0) {
        comandosActuador.push({
          actuador: "nebulizador_humedad",
          accion: "ENCENDER",
          motivo: `Humedad relativa baja (${lecturas.humedad_relativa_pct}% < 75%)`,
          duracion_estimada_seg: 600,
        });
      }
    }

    if (sector === "apicultura" && typeof lecturas.frecuencia_hz === "number") {
      if (lecturas.frecuencia_hz > 300.0) {
        comandosActuador.push({
          actuador: "alerta_sonora_enjambrazon",
          accion: "ALERTA_CRITICA",
          motivo: `Frecuencia acústica anómala detectada (${lecturas.frecuencia_hz} Hz > 300 Hz)`,
        });
      }
    }

    for (const cmd of comandosActuador) {
      if (cmd.accion === "ENCENDER") {
        await supabase.from("actuadores_eventos").insert({
          unidad_id,
          ciclo_id: ciclo_id ?? null,
          tipo_actuador: cmd.actuador,
          origen_disparo: "automatico_iot",
          duracion_segundos: cmd.duracion_estimada_seg,
          caudal_litros_seg: cmd.actuador === "electrovalvula_riego" ? 1.5 : 0.2,
          potencia_kw: 0.75,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sector,
        comandos_actuador: comandosActuador,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
