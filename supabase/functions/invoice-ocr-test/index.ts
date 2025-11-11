// ============================================================================
// INVOICE OCR TEST - Función minimalista para diagnosticar conectividad
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('========================================');
  console.log('✅ invoice-ocr-test EJECUTÁNDOSE');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('Parsing request body...');
    const body = await req.json();
    console.log('Body recibido:', JSON.stringify(body, null, 2));
    
    // Verificar variables de entorno
    console.log('Environment check:');
    console.log('- SUPABASE_URL:', !!Deno.env.get('SUPABASE_URL'));
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    console.log('- OPENAI_API_KEY:', !!Deno.env.get('OPENAI_API_KEY'));
    console.log('- MINDEE_API_KEY:', !!Deno.env.get('MINDEE_API_KEY'));
    
    const response = {
      success: true,
      message: '🎉 Test OK - Edge function funcionando correctamente',
      timestamp: new Date().toISOString(),
      received: body,
      environment: {
        supabase_url: !!Deno.env.get('SUPABASE_URL'),
        service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        openai_key: !!Deno.env.get('OPENAI_API_KEY'),
        mindee_key: !!Deno.env.get('MINDEE_API_KEY')
      }
    };
    
    console.log('Returning success response:', response);
    
    return new Response(
      JSON.stringify(response, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
