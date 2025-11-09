import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyData {
  razon_social: string;
  tipo_sociedad: "SL" | "SA" | "SLU" | "SC" | "SLL" | "COOP" | "Otros";
  direccion_fiscal?: {
    via_completa: string;
    tipo_via?: string;
    nombre_via: string;
    numero?: string;
    escalera?: string;
    piso?: string;
    puerta?: string;
    codigo_postal: string;
    poblacion: string;
    provincia: string;
    pais_codigo: string;
  };
  contacto?: {
    telefono?: string;
    email?: string;
    web?: string;
  };
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
        JSON.stringify({ success: false, error: 'CIF es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedCIF = cif.trim().toUpperCase();

    // Initialize Supabase client with service role for cache operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check cache in database first
    const { data: cachedData, error: cacheError } = await supabase
      .from('company_enrichment_cache')
      .select('enriched_data, confidence, sources, search_count')
      .eq('cif', normalizedCIF)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedData && !cacheError) {
      console.log(`✅ Cache hit for CIF: ${normalizedCIF} (searches: ${cachedData.search_count})`);
      
      // Increment search counter
      await supabase.rpc('increment_cache_search_count', { p_cif: normalizedCIF });

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...cachedData.enriched_data,
            confidence: cachedData.confidence,
            sources: cachedData.sources
          },
          cached: true,
          cache_hits: cachedData.search_count + 1
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      );
    }

    console.log(`❌ Cache miss for CIF: ${normalizedCIF}, calling Lovable AI...`);

    // 2. Call Lovable AI if not in cache
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY no configurada');
      return new Response(
        JSON.stringify({ success: false, error: 'Servicio de IA no disponible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

FUENTES PRIORITARIAS (en orden):
1. Registro Mercantil Central de España (registradores.org)
2. BORME - Boletín Oficial del Registro Mercantil
3. Directorio de empresas del Gobierno (DIRCE)
4. Páginas web corporativas oficiales

IMPORTANTE: 
- Solo devuelve información si encuentras datos oficiales y verificables
- Si algún campo no está disponible, déjalo vacío
- Indica el nivel de confianza según la calidad de las fuentes
- Lista las fuentes consultadas`
          },
          {
            role: "user",
            content: `Busca información OFICIAL y VERIFICABLE sobre la empresa española con CIF/NIF: ${normalizedCIF}

INFORMACIÓN A EXTRAER:
1. Razón Social (nombre legal completo)
2. Tipo de Sociedad (SL, SA, SLU, SC, SLL, COOP, Otros)
3. Dirección Fiscal COMPLETA y estructurada:
   - Tipo de vía (Calle, Avenida, Plaza, etc.)
   - Nombre de la vía
   - Número, escalera, piso, puerta
   - Código postal (5 dígitos)
   - Población/Municipio
   - Provincia
   - País (código: ES)
4. Datos de contacto (si disponibles públicamente):
   - Teléfono
   - Email corporativo
   - Sitio web

Responde SOLO si encuentras información oficial y verificable.
Si no encuentras datos confiables o algún campo específico, indícalo.`
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
                  direccion_fiscal: {
                    type: "object",
                    description: "Dirección fiscal completa estructurada",
                    properties: {
                      via_completa: {
                        type: "string",
                        description: "Dirección completa en formato texto"
                      },
                      tipo_via: {
                        type: "string",
                        description: "Tipo de vía (CALLE, AVENIDA, PLAZA, etc.)"
                      },
                      nombre_via: {
                        type: "string",
                        description: "Nombre de la vía"
                      },
                      numero: {
                        type: "string",
                        description: "Número de la dirección"
                      },
                      escalera: {
                        type: "string",
                        description: "Escalera (opcional)"
                      },
                      piso: {
                        type: "string",
                        description: "Piso (opcional)"
                      },
                      puerta: {
                        type: "string",
                        description: "Puerta (opcional)"
                      },
                      codigo_postal: {
                        type: "string",
                        description: "Código postal (5 dígitos)"
                      },
                      poblacion: {
                        type: "string",
                        description: "Población o municipio"
                      },
                      provincia: {
                        type: "string",
                        description: "Provincia"
                      },
                      pais_codigo: {
                        type: "string",
                        description: "Código del país (ES para España)"
                      }
                    },
                    required: ["via_completa", "nombre_via", "codigo_postal", "poblacion", "provincia", "pais_codigo"]
                  },
                  contacto: {
                    type: "object",
                    description: "Datos de contacto si están disponibles públicamente",
                    properties: {
                      telefono: {
                        type: "string",
                        description: "Teléfono de contacto"
                      },
                      email: {
                        type: "string",
                        description: "Email corporativo"
                      },
                      web: {
                        type: "string",
                        description: "Sitio web corporativo"
                      }
                    }
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
          JSON.stringify({ success: false, error: 'Límite de búsquedas alcanzado. Intenta de nuevo en unos minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos de IA agotados. Contacta con soporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Error al buscar información de la empresa' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Respuesta de IA:', JSON.stringify(data, null, 2));

    // Extract tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'return_company_data') {
      console.error('No se recibió tool call esperado');
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontró información para este CIF' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyData: CompanyData = JSON.parse(toolCall.function.arguments);
    console.log('Datos de empresa extraídos:', companyData);

    // 3. Store in cache for future use
    try {
      const { error: insertError } = await supabase
        .from('company_enrichment_cache')
        .insert({
          cif: normalizedCIF,
          enriched_data: companyData,
          confidence: companyData.confidence,
          sources: companyData.sources || []
        });

      if (insertError) {
        console.error('⚠️ Error caching data:', insertError);
      } else {
        console.log(`✅ Data cached for CIF: ${normalizedCIF}`);
      }
    } catch (cacheInsertError) {
      console.error('⚠️ Cache insertion failed:', cacheInsertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: companyData,
        cached: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en search-company-data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
