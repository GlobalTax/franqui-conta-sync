import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descriptions } = await req.json();
    
    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      throw new Error('Se requiere un array de descripciones no vacío');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no está configurado");
    }

    const systemPrompt = `Eres un experto en análisis de transacciones bancarias y expresiones regulares.
Tu tarea es analizar un conjunto de descripciones de transacciones bancarias y generar un patrón regex óptimo que las capture todas.

Reglas:
- El regex debe ser lo más específico posible pero flexible
- Usa alternativas (|) para capturar variaciones
- Ignora números variables (fechas, importes, códigos únicos)
- Captura palabras clave estables
- El patrón debe funcionar en PostgreSQL (sintaxis POSIX)
- Usa ~* para case-insensitive matching`;

    const userPrompt = `Analiza estas descripciones de transacciones bancarias conciliadas:

${descriptions.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}

Genera un patrón regex óptimo que capture todas estas transacciones pero que sea lo suficientemente específico para no capturar transacciones no relacionadas.`;

    console.log('[AI Pattern Analyzer] Processing', descriptions.length, 'descriptions');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_regex_pattern",
            description: "Sugerir patrón regex para transacciones bancarias",
            parameters: {
              type: "object",
              properties: {
                regex_pattern: { 
                  type: "string",
                  description: "Patrón regex optimizado (sintaxis PostgreSQL POSIX)"
                },
                explanation: { 
                  type: "string",
                  description: "Explicación de qué captura el patrón"
                },
                key_terms: {
                  type: "array",
                  items: { type: "string" },
                  description: "Palabras clave identificadas"
                },
                confidence: {
                  type: "number",
                  description: "Nivel de confianza del patrón (0-100)"
                }
              },
              required: ["regex_pattern", "explanation", "key_terms", "confidence"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_regex_pattern" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('[AI Pattern Analyzer] Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Por favor intenta de nuevo más tarde." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        console.error('[AI Pattern Analyzer] Payment required');
        return new Response(
          JSON.stringify({ error: "Payment required. Por favor añade créditos a tu workspace de Lovable AI." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error('[AI Pattern Analyzer] AI gateway error:', response.status, errorText);
      throw new Error("Error en el gateway de IA");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('[AI Pattern Analyzer] No pattern generated');
      throw new Error("No se pudo generar un patrón");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    console.log('[AI Pattern Analyzer] Pattern generated:', result.regex_pattern);

    return new Response(
      JSON.stringify(result), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (e: any) {
    console.error('[AI Pattern Analyzer] Error:', e);
    return new Response(
      JSON.stringify({ 
        error: e.message || 'Error desconocido',
        details: e.toString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
