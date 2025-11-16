// ============================================================================
// MINDEE INVOICE OCR - Edge Function
// Procesa facturas usando Mindee Invoice API v4
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractWithMindee } from '../_shared/mindee/client.ts';
import { adaptMindeeToStandard, extractMindeeMetadata } from '../_shared/mindee/adapter.ts';
import { calculateMindeeCoste } from '../_shared/mindee/cost-calculator.ts';
import { normalizeBackend } from '../_shared/fiscal/normalize-backend.ts';
import { validateInvoiceEntry } from '../_shared/gl/validator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPANY_VAT_IDS = [
  'B87611099', // GRUPO JUANJO VALDIVIESO SL
  'B87750236', // VALDIVIESO RESTAURACIÓN SL
];

interface OCRRequest {
  invoice_id: string;
  documentPath: string;
  centroCode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();

  try {
    // Parse request
    const body: OCRRequest = await req.json();
    const { invoice_id, documentPath, centroCode } = body;

    console.log('[Mindee OCR] Iniciando procesamiento:', {
      invoice_id,
      documentPath,
      centroCode,
    });

    // Validate inputs
    if (!invoice_id || !documentPath || !centroCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Faltan parámetros: invoice_id, documentPath, centroCode',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get API key
    const MINDEE_API_KEY = Deno.env.get('MINDEE_API_KEY');
    if (!MINDEE_API_KEY) {
      console.error('[Mindee OCR] MINDEE_API_KEY no configurada');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MINDEE_API_KEY no configurada en el servidor',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Download PDF from storage
    console.log('[Mindee OCR] Descargando documento:', documentPath);
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(documentPath);

    if (downloadError || !fileData) {
      console.error('[Mindee OCR] Error descargando documento:', downloadError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error descargando documento: ${downloadError?.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    // 2. Call Mindee API
    console.log('[Mindee OCR] Enviando a Mindee API...');
    
    const mindeeResult = await extractWithMindee(
      {
        documentBase64: base64Content,
        fileName: documentPath.split('/').pop(),
      },
      { apiKey: MINDEE_API_KEY }
    );

    if (!mindeeResult.success) {
      console.error('[Mindee OCR] Error en Mindee:', mindeeResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: mindeeResult.error || 'Error desconocido de Mindee',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Adapt to internal format
    console.log('[Mindee OCR] Adaptando datos extraídos...');
    const extracted = adaptMindeeToStandard(mindeeResult.data);

    // 4. Normalize & Validate
    console.log('[Mindee OCR] Normalizando datos fiscales...');
    const normalized = normalizeBackend(extracted, '', COMPANY_VAT_IDS);

    console.log('[Mindee OCR] Resultado normalización:', {
      ok: normalized.validation.ok,
      errorsCount: normalized.validation.errors.length,
      warningsCount: normalized.validation.warnings.length,
      autofixCount: normalized.autofix_applied.length,
    });

    // 5. Check if supplier requires manual review
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('requires_manual_review, name')
      .eq('tax_id', extracted.issuer.vat_id)
      .maybeSingle();

    const needsManualReview = supplier?.requires_manual_review === true;

    if (needsManualReview) {
      console.log('[Mindee OCR] ⚠️ Proveedor requiere revisión manual:', supplier.name);
    }

    // Calculate costs
    const mindeeCost = calculateMindeeCoste(mindeeResult.data);
    const mindeeMetadata = extractMindeeMetadata(mindeeResult.data);

    // 6. Update invoice in database
    console.log('[Mindee OCR] Actualizando factura en DB...');
    
    const { error: updateError } = await supabase
      .from('invoices_received')
      .update({
        mindee_document_id: mindeeMetadata.mindee_document_id,
        mindee_confidence: mindeeMetadata.mindee_confidence,
        mindee_raw_response: mindeeResult.data,
        mindee_processing_time_ms: mindeeResult.processing_time_ms,
        mindee_cost_eur: mindeeCost,
        ocr_provider: 'mindee',
        ocr_payload: normalized.normalized,
        ocr_confidence: mindeeMetadata.mindee_confidence,
        approval_status: needsManualReview ? 'ocr_review' : 'pending',
        supplier_tax_id: extracted.issuer.vat_id,
        supplier_name: extracted.issuer.name,
        invoice_number: extracted.invoice_number,
        invoice_date: extracted.issue_date,
        total: extracted.totals.total,
        currency: extracted.totals.currency,
        validation_errors: normalized.validation.errors.length > 0 
          ? normalized.validation.errors 
          : null,
        validation_warnings: normalized.validation.warnings.length > 0 
          ? normalized.validation.warnings 
          : null,
      })
      .eq('id', invoice_id);

    if (updateError) {
      console.error('[Mindee OCR] Error actualizando factura:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error actualizando factura: ${updateError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Log processing
    await supabase
      .from('ocr_processing_log')
      .insert({
        invoice_id,
        provider: 'mindee',
        mindee_document_id: mindeeMetadata.mindee_document_id,
        confidence: mindeeMetadata.mindee_confidence,
        processing_time_ms: mindeeResult.processing_time_ms,
        extracted_data: extracted,
        normalized_data: normalized.normalized,
        validation_errors: normalized.validation.errors.length > 0 
          ? normalized.validation.errors 
          : null,
        cost_eur: mindeeCost,
      });

    const totalTime = Date.now() - requestStartTime;

    console.log('[Mindee OCR] ✓ Procesamiento completado:', {
      invoice_id,
      documentId: mindeeMetadata.mindee_document_id,
      confidence: mindeeMetadata.mindee_confidence,
      cost: `${mindeeCost}€`,
      totalTime: `${totalTime}ms`,
      needsManualReview,
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        invoice_id,
        mindee_document_id: mindeeMetadata.mindee_document_id,
        mindee_confidence: mindeeMetadata.mindee_confidence,
        mindee_processing_time_ms: mindeeResult.processing_time_ms,
        mindee_cost_eur: mindeeCost,
        ocr_payload: normalized.normalized,
        approval_status: needsManualReview ? 'ocr_review' : 'pending',
        validation: {
          ok: normalized.validation.ok,
          errors: normalized.validation.errors,
          warnings: normalized.validation.warnings,
        },
        autofix_applied: normalized.autofix_applied,
        needs_manual_review: needsManualReview,
        supplier_name: supplier?.name || extracted.issuer.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Mindee OCR] Error fatal:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorDetails = (error as any).details || null;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
