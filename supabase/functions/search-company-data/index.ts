import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyData {
  razon_social: string;
  tipo_sociedad: "SL" | "SA" | "SLU" | "SC" | "SLL" | "COOP" | "Otros";
  confidence: "high" | "medium" | "low";
  sources?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cif } = await req.json();

    if (!cif || typeof cif !== 'string') {
      return new Response(
        JSON.stringify({ error: 'CIF es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY no configurada');
      return new Response(
        JSON.stringify({ error: 'Servicio de IA no disponible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Buscando información para CIF: ${cif}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un asistente especializado en buscar información de empresas españolas.
Tu tarea es buscar información oficial sobre empresas usando su CIF/NIF.
Debes buscar en fuentes públicas como:
- Registro Mercantil Central de España
- BORME (Boletín Oficial del Registro Mercantil)
- Bases de datos empresariales públicas españolas
- Información oficial gubernamental

IMPORTANTE: Solo devuelve información si encuentras datos oficiales y verificables.
Si no encuentras información confiable, indícalo claramente.`
          },
          {
            role: "user",
            content: `Busca información oficial sobre la empresa española con CIF/NIF: ${cif}

Necesito específicamente:
1. Razón Social completa (nombre legal de la empresa)
2. Tipo de Sociedad (SL, SA, SLU, SC, SLL, COOP, u Otros)

Responde SOLO si encuentras información oficial y verificable.
Si no encuentras datos confiables, dímelo claramente.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_company_data",
              description: "Devuelve información estructurada de la empresa española encontrada",
              parameters: {
                type: "object",
                properties: {
                  razon_social: {
                    type: "string",
                    description: "Razón social completa de la empresa"
                  },
                  tipo_sociedad: {
                    type: "string",
                    enum: ["SL", "SA", "SLU", "SC", "SLL", "COOP", "Otros"],
                    description: "Tipo de sociedad mercantil"
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Nivel de confianza en los datos encontrados"
                  },
                  sources: {
                    type: "array",
                    items: { type: "string" },
                    description: "Fuentes de donde se obtuvo la información"
                  }
                },
                required: ["razon_social", "tipo_sociedad", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_company_data" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de búsquedas alcanzado. Intenta de nuevo en unos minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA agotados. Contacta con soporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Error al buscar información de la empresa' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Respuesta de IA:', JSON.stringify(data, null, 2));

    // Extraer tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'return_company_data') {
      console.error('No se recibió tool call esperado');
      return new Response(
        JSON.stringify({ error: 'No se encontró información para este CIF' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyData: CompanyData = JSON.parse(toolCall.function.arguments);
    console.log('Datos de empresa extraídos:', companyData);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: companyData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en search-company-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
