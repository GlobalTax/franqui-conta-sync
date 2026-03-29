// ============================================================================
// CLAUDE ASSISTANT EDGE FUNCTION
// Multi-mode AI assistant powered by Anthropic Claude
// Modes: chat, document-analysis, report-generation, mapping-enhancement
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { logger } from '../_shared/logger.ts';
import { corsHeaders } from '../_shared/cors.ts';

type AssistantMode = "chat" | "document-analysis" | "report-generation" | "mapping-enhancement";

interface RequestBody {
  mode: AssistantMode;
  messages?: Array<{ role: string; content: string }>;
  context?: Record<string, unknown>;
  stream?: boolean;
}

const SYSTEM_PROMPTS: Record<AssistantMode, string> = {
  chat: `Eres un asistente contable experto en el Plan General Contable Español (PGC) y especializado en franquicias McDonald's.
Tu rol es ayudar con:
- Consultas sobre cuentas PGC (grupos 1-9, subcuentas de 7 dígitos)
- Asientos contables, periodificaciones, provisiones, amortizaciones
- Interpretación de P&L (Profit & Loss) estilo McDonald's
- Cierres contables mensuales y anuales
- Conciliación bancaria y Norma 43
- Libros IVA (repercutido y soportado), Modelo 303
- Gestión multicentro y multisociedad

Responde siempre en español. Sé conciso pero preciso. Usa ejemplos con cuentas PGC reales cuando sea útil.
Formatea las respuestas con markdown para mejor legibilidad.`,

  "document-analysis": `Eres un experto en análisis de documentos contables y facturas.
Analiza el contenido proporcionado y extrae:
- Datos clave (importes, fechas, NIF/CIF, conceptos)
- Cuentas PGC sugeridas para la contabilización
- Posibles errores o inconsistencias
- Desglose de IVA (bases, tipos, cuotas)
Responde siempre en español con formato estructurado.`,

  "report-generation": `Eres un experto en reporting financiero para franquicias McDonald's.
Genera informes profesionales basados en los datos proporcionados:
- Análisis de P&L con variaciones y tendencias
- Resúmenes ejecutivos de cierres mensuales
- Comparativas entre centros/periodos
- Recomendaciones de gestión basadas en los datos
Usa formato markdown con tablas cuando sea apropiado. Responde en español.`,

  "mapping-enhancement": `Eres un experto en mapeo de cuentas del Plan General Contable (PGC).
Tu rol es mejorar el mapeo automático de facturas a cuentas contables:
- Analiza la descripción, proveedor e importe de líneas de factura
- Sugiere la cuenta PGC más apropiada (7 dígitos)
- Explica la justificación del mapeo
- Indica nivel de confianza (0-100)
Responde en JSON estructurado cuando se pida. Responde en español.`,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY no está configurada");
    }

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { mode = "chat", messages = [], context = {}, stream = false } = body;

    if (!SYSTEM_PROMPTS[mode]) {
      return new Response(JSON.stringify({ error: `Modo no válido: ${mode}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context-enriched system prompt
    let systemPrompt = SYSTEM_PROMPTS[mode];
    if (context && Object.keys(context).length > 0) {
      systemPrompt += `\n\nContexto adicional del usuario:\n${JSON.stringify(context, null, 2)}`;
    }

    // Build messages for Claude
    const claudeMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    if (claudeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Se requiere al menos un mensaje" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeBody = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages,
      stream,
    };

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(claudeBody),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      logger.error('claude-assistant', 'Claude API error', { status: claudeResponse.status, errorText });
      
      if (claudeResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de requests excedido. Intenta de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Error al comunicar con Claude AI" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming mode
    if (stream) {
      return new Response(claudeResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Non-streaming mode
    const data = await claudeResponse.json();
    const content = data.content?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({
        success: true,
        content,
        model: data.model,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error('claude-assistant', 'Claude assistant error', error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
