// ============================================================================
// INVOICE OCR TEST - Función minimalista para diagnosticar conectividad
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildInvoicePath, ensurePdfPath, parseInvoicePath, hashFilePath } from "../_shared/storage-utils.ts";

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
    
    // Test Storage Utilities
    console.log('Testing storage utilities...');
    const testPath = buildInvoicePath({
      invoiceType: 'received',
      centroCode: '1252',
      originalName: 'factura_test.pdf',
      date: new Date('2025-01-15')
    });
    console.log('Generated path:', testPath);
    
    const parsedMetadata = parseInvoicePath(testPath);
    console.log('Parsed metadata:', JSON.stringify(parsedMetadata, null, 2));
    
    const pathHash = await hashFilePath(testPath);
    console.log('Path hash (SHA-256):', pathHash);
    
    // Test validation
    let pdfValidation = { success: false, error: null };
    try {
      ensurePdfPath(testPath);
      pdfValidation.success = true;
    } catch (e: any) {
      pdfValidation.error = e.message;
    }
    
    let invalidFileTest = { success: false, error: null };
    try {
      ensurePdfPath('invalid.jpg');
    } catch (e: any) {
      invalidFileTest.success = true; // Expected to fail
      invalidFileTest.error = e.message;
    }
    
    const response = {
      success: true,
      message: '🎉 Test OK - Edge function funcionando correctamente',
      timestamp: new Date().toISOString(),
      received: body,
      environment: {
        supabase_url: !!Deno.env.get('SUPABASE_URL'),
        service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        openai_key: !!Deno.env.get('OPENAI_API_KEY')
      },
      storage_utils_tests: {
        buildInvoicePath: {
          input: {
            invoiceType: 'received',
            centroCode: '1252',
            originalName: 'factura_test.pdf',
            date: '2025-01-15'
          },
          output: testPath,
          format_valid: /^received\/1252\/2025\/01\/[a-f0-9-]{36}_factura_test\.pdf$/.test(testPath)
        },
        parseInvoicePath: {
          input: testPath,
          output: parsedMetadata,
          metadata_valid: parsedMetadata?.centroCode === '1252' && parsedMetadata?.year === 2025
        },
        hashFilePath: {
          input: testPath,
          output: pathHash,
          hash_valid: pathHash.length === 64 && /^[a-f0-9]+$/.test(pathHash)
        },
        ensurePdfPath: {
          valid_pdf: pdfValidation,
          invalid_file: invalidFileTest
        }
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
