import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VIESRequest {
  countryCode: string;
  vatNumber: string;
}

interface VIESResponse {
  valid: boolean;
  name?: string;
  address?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[VIES] Request received');
    
    const { countryCode, vatNumber }: VIESRequest = await req.json();
    
    // Validaciones básicas
    if (!countryCode || !vatNumber) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Faltan parámetros requeridos: countryCode y vatNumber' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Pre-validación de formato básico
    const cleanVatNumber = vatNumber.trim().toUpperCase().replace(/\s/g, '');
    const cleanCountryCode = countryCode.trim().toUpperCase();
    
    if (!/^[A-Z]{2}$/.test(cleanCountryCode)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Código de país inválido. Debe ser 2 letras (ej: DE, FR)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!/^[\w]{4,12}$/.test(cleanVatNumber)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Formato de VAT inválido. Debe tener entre 4 y 12 caracteres alfanuméricos' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[VIES] Validating ${cleanCountryCode}${cleanVatNumber}`);

    // Construir petición SOAP
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Body>
    <tns1:checkVat>
      <tns1:countryCode>${cleanCountryCode}</tns1:countryCode>
      <tns1:vatNumber>${cleanVatNumber}</tns1:vatNumber>
    </tns1:checkVat>
  </soap:Body>
</soap:Envelope>`;

    // Llamar a VIES con timeout de 10 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let viesResponse: Response;
    try {
      viesResponse = await fetch(
        'https://ec.europa.eu/taxation_customs/vies/services/checkVatService',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '',
          },
          body: soapRequest,
          signal: controller.signal,
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if ((fetchError as Error).name === 'AbortError') {
        console.error('[VIES] Timeout after 10 seconds');
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: '⏱️ Timeout: El servicio VIES tardó demasiado en responder. Intenta de nuevo.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 504 }
        );
      }
      
      console.error('[VIES] Network error:', fetchError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: '⚠️ Error de conexión con VIES. Verifica tu conexión a internet.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }
    
    clearTimeout(timeoutId);

    if (!viesResponse.ok) {
      console.error(`[VIES] HTTP error: ${viesResponse.status}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `⚠️ Servicio VIES no disponible (HTTP ${viesResponse.status})` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Parsear respuesta XML
    const xmlText = await viesResponse.text();
    console.log('[VIES] Response received:', xmlText.substring(0, 200));

    // Detectar errores SOAP
    if (xmlText.includes('INVALID_INPUT')) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Formato inválido para ${cleanCountryCode}. Verifica el número.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (xmlText.includes('SERVICE_UNAVAILABLE') || xmlText.includes('MS_UNAVAILABLE')) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `⚠️ Servicio de validación no disponible para ${cleanCountryCode}. Intenta más tarde.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    if (xmlText.includes('TIMEOUT')) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: '⏱️ Timeout del servicio VIES. Intenta de nuevo.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 504 }
      );
    }

    // Extraer valores del XML usando regex (más simple que un parser XML completo)
    const validMatch = xmlText.match(/<valid>(\w+)<\/valid>/);
    const nameMatch = xmlText.match(/<name>([^<]*)<\/name>/);
    const addressMatch = xmlText.match(/<address>([^<]*)<\/address>/);

    const isValid = validMatch?.[1] === 'true';
    const companyName = nameMatch?.[1] || undefined;
    const companyAddress = addressMatch?.[1] || undefined;

    console.log(`[VIES] Result: valid=${isValid}, name=${companyName}`);

    const result: VIESResponse = {
      valid: isValid,
      name: companyName,
      address: companyAddress,
    };

    if (!isValid) {
      result.error = `CIF/VAT no registrado en el sistema VIES de la UE`;
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VIES] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: '⚠️ Error interno al validar. Contacta con soporte si persiste.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
