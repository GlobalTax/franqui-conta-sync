/**
 * Mindee Webhook Receiver
 * 
 * Purpose: Receive asynchronous processing results from Mindee API
 * 
 * Features:
 * - HMAC-SHA256 signature verification for security
 * - Idempotency via job_id to prevent duplicate processing
 * - Full webhook delivery logging
 * - Automatic invoice update with OCR results
 * - Conditional workflow execution (normalize + AP + GL draft)
 * 
 * Triggered by: Mindee API after async job completion
 * 
 * Request body:
 * {
 *   job: { id: string, status: 'completed' | 'failed' },
 *   document: { id: string, inference: { prediction: {...} } }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { adaptMindeeV4ToStandard } from '../_shared/ocr/mindee-adapter.ts';
import { normalizeBackend } from '../_shared/fiscal/normalize-backend.ts';
import { apMapperEngine, matchSupplier } from '../_shared/ap/mapping-engine.ts';
import { validateInvoiceEntry } from '../_shared/gl/validator.ts';

const COMPANY_VAT_IDS = ['B12345678', 'B87654321'];

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MINDEE_WEBHOOK_SECRET = Deno.env.get('MINDEE_WEBHOOK_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-mindee-signature',
};

interface MindeeWebhookPayload {
  job: {
    id: string;
    status: 'processing' | 'completed' | 'failed';
    error?: any;
  };
  document?: {
    id: string;
    inference: {
      prediction: any;
      pages: any[];
    };
  };
}

/**
 * Verify HMAC-SHA256 signature from Mindee
 * Mindee sends signature as: "sha256=<hex_digest>"
 */
async function verifyMindeeSignature(
  rawBody: ArrayBuffer,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    
    const expectedSig = await crypto.subtle.sign('HMAC', key, rawBody);
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Mindee sends signature as "sha256=xxx"
    const receivedHex = signature.replace(/^sha256=/i, '').toLowerCase();
    
    return expectedHex === receivedHex;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // 1. Read raw body for signature verification
    const rawBody = await req.arrayBuffer();
    const bodyText = new TextDecoder().decode(rawBody);
    
    // 2. Verify HMAC signature
    const signature = req.headers.get('X-Mindee-Signature') || '';
    
    if (!MINDEE_WEBHOOK_SECRET) {
      console.error('MINDEE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const isValidSignature = await verifyMindeeSignature(rawBody, signature, MINDEE_WEBHOOK_SECRET);
    
    if (!isValidSignature) {
      console.warn('Invalid webhook signature', { signature });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Parse payload
    const payload: MindeeWebhookPayload = JSON.parse(bodyText);
    const jobId = payload.job?.id || payload.document?.id;
    
    if (!jobId) {
      console.error('No job_id in webhook payload', payload);
      return new Response(
        JSON.stringify({ error: 'Missing job_id' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Webhook received', { jobId, status: payload.job?.status });
    
    // 4. Log webhook delivery (idempotency check)
    const { data: existingDelivery, error: checkError } = await supabase
      .from('ocr_webhook_deliveries')
      .select('id, status')
      .eq('job_id', jobId)
      .maybeSingle();
    
    if (existingDelivery) {
      console.log('Webhook already processed (idempotency)', { jobId });
      return new Response(
        JSON.stringify({ ok: true, message: 'Already processed' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 5. Insert webhook delivery log
    const headersObj = Object.fromEntries(req.headers.entries());
    await supabase.from('ocr_webhook_deliveries').insert({
      job_id: jobId,
      headers: headersObj,
      body: payload,
      signature_valid: true,
      status: 'received'
    });
    
    // 6. Handle failed jobs
    if (payload.job?.status === 'failed') {
      console.error('Mindee job failed', { jobId, error: payload.job?.error });
      
      await supabase
        .from('invoices_received')
        .update({
          status: 'ocr_failed',
          ocr_payload: { error: payload.job?.error }
        })
        .eq('job_id', jobId);
      
      return new Response(
        JSON.stringify({ ok: true, message: 'Job failed' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 7. Find invoice by job_id
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_received')
      .select('id, file_path, centro_code, supplier_id')
      .eq('job_id', jobId)
      .maybeSingle();
    
    if (invoiceError || !invoice) {
      console.error('Invoice not found for job_id', { jobId, error: invoiceError });
      await supabase
        .from('ocr_webhook_deliveries')
        .update({ status: 'invoice_not_found' })
        .eq('job_id', jobId);
      
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Processing invoice', { invoiceId: invoice.id, centroCode: invoice.centro_code });
    
    // 8. Adapt Mindee response to standard format
    const adapted = adaptMindeeV4ToStandard(payload);
    const ocrData = adapted.data;
    const confidence = adapted.confidence_score;
    
    // ✨ NUEVO: Extract advanced fields
    const rawText = (adapted as any).raw_text || null;
    const hasPolygons = (adapted as any).has_polygons || false;
    
    // 9. Determine status based on confidence
    let finalStatus = 'needs_review';
    if (confidence >= 85) {
      finalStatus = 'processed_ok';
    } else if (confidence < 70) {
      finalStatus = 'needs_manual_review';
    }
    
    // 10. Update invoice with OCR results
    const { error: updateError } = await supabase
      .from('invoices_received')
      .update({
        ocr_engine: 'mindee',
        ocr_payload: adapted,
        ocr_extracted_data: ocrData,
        confidence_score: confidence,
        status: finalStatus,
        // Extract key fields
        supplier_name: ocrData.issuer.name,
        supplier_vat_id: ocrData.issuer.vat_id,
        invoice_number: ocrData.invoice_number || 'PENDING',
        invoice_date: ocrData.issue_date || new Date().toISOString().split('T')[0],
        due_date: ocrData.due_date,
        subtotal: (ocrData.totals.base_10 || 0) + (ocrData.totals.base_21 || 0),
        tax_total: (ocrData.totals.vat_10 || 0) + (ocrData.totals.vat_21 || 0),
        total: ocrData.totals.total || 0,
        currency: ocrData.totals.currency,
        processed_at: new Date().toISOString(),
        // ✨ NUEVO: Guardar advanced features en metadata
        metadata: {
          raw_text_chars: rawText ? rawText.length : 0,
          has_polygons: hasPolygons,
          rag_enabled: true,
          ocr_version: 'mindee_v4_advanced'
        }
      })
      .eq('id', invoice.id);
    
    if (updateError) {
      console.error('Failed to update invoice', { invoiceId: invoice.id, error: updateError });
      throw updateError;
    }
    
    console.log('Invoice updated successfully', { invoiceId: invoice.id, confidence, status: finalStatus });
    
    // 11. Execute automatic workflow if high confidence
    if (finalStatus === 'processed_ok' && confidence >= 85) {
      console.log('Starting automatic workflow', { invoiceId: invoice.id });
      
      try {
        // Match supplier
        const matchedSupplier = await matchSupplier(supabase, {
          name: ocrData.issuer.name,
          taxId: ocrData.issuer.vat_id
        }, invoice.centro_code);
        
        // Normalize fiscal data (ES) - usando nueva arquitectura modular
        const normalizedResponse = normalizeBackend(ocrData, '', COMPANY_VAT_IDS);
        
        // Generate AP mapping suggestions
        const apMapping = await apMapperEngine(
          normalizedResponse.normalized,
          supabase,
          matchedSupplier
        );
        
        // Validate and generate GL entry preview
        const entryValidation = validateInvoiceEntry({
          normalized_invoice: normalizedResponse.normalized,
          ap_mapping: apMapping,
          centro_code: invoice.centro_code
        });
        
        // If ready to post, update to approved
        if (entryValidation.blocking_issues.length === 0) {
          await supabase
            .from('invoices_received')
            .update({ 
              status: 'approved',
              ap_mapping_suggestions: apMapping,
              gl_entry_preview: entryValidation.post_preview
            })
            .eq('id', invoice.id);
          
          console.log('Invoice auto-approved', { invoiceId: invoice.id });
        } else {
          console.log('Invoice needs review', { 
            invoiceId: invoice.id, 
            issues: entryValidation.blocking_issues 
          });
        }
      } catch (workflowError) {
        console.error('Workflow execution failed (non-critical)', { 
          invoiceId: invoice.id, 
          error: workflowError 
        });
        // Don't fail webhook if workflow fails
      }
    }
    
    // 12. Mark webhook as processed
    await supabase
      .from('ocr_webhook_deliveries')
      .update({ status: 'processed' })
      .eq('job_id', jobId);
    
    console.log('Webhook processing complete', { jobId, invoiceId: invoice.id });
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        invoice_id: invoice.id,
        confidence,
        status: finalStatus
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
