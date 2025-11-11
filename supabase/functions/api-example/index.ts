import { validateApiKey, createApiKeyResponse } from '../_shared/api-key-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar API key con scope requerido
    const validation = await validateApiKey(req, 'invoices:read');
    
    if (!validation.isValid) {
      return createApiKeyResponse(401, 'Invalid or missing API key');
    }

    // Verificar scope específico
    if (!validation.scopes?.includes('invoices:read')) {
      return createApiKeyResponse(403, 'Insufficient permissions. Required scope: invoices:read');
    }

    // Continuar con la lógica de la función
    console.log(`[API Example] Request from user: ${validation.userId}`);
    console.log(`[API Example] Centro: ${validation.centroCode}`);
    console.log(`[API Example] Scopes: ${validation.scopes?.join(', ')}`);

    // Tu lógica aquí...
    const response = {
      success: true,
      message: 'API Example endpoint working',
      user_id: validation.userId,
      centro_code: validation.centroCode,
      scopes: validation.scopes
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Example] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
