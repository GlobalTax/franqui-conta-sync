// ============================================================================
// INVOICE OCR - Simplified OpenAI-only with Auto-Validation
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { orchestrateOCR } from "../_shared/ocr/orchestrator.ts";
import { calculateOCRCost, extractPageCount, extractTokensFromOpenAI } from "./cost-calculator.ts";
import { createDocumentHash, createStructuralHash, extractQuickMetadata } from "../_shared/hash-utils.ts";
import { validateAndNormalizePath, parseInvoicePath } from "../_shared/storage-utils.ts";
import { normalizeBackend } from "../_shared/fiscal/normalize-backend.ts";
import { apMapperEngine, matchSupplier } from "../_shared/ap/mapping-engine.ts";
import { validateInvoiceEntry } from "../_shared/gl/validator.ts";
import { validateAccountingRulesCompact, formatValidationSummary } from "../_shared/validators/accounting-validator.ts";
import type { EnhancedInvoiceData } from "../_shared/ocr/types.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "*")
  .split(",")
  .map(o => o.trim());

const COMPANY_VAT_IDS = ['B12345678', 'B87654321'];

// ============================================================================
// INTERFACES
// ============================================================================

interface NormalizedResponse {
  normalized: EnhancedInvoiceData;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  autofix_applied: string[];
}

interface APMappingSuggestion {
  account_suggestion: string;
  tax_account: string;
  ap_account: string;
  centre_id: string | null;
  confidence_score: number;
  rationale: string;
  matched_rule_id: string | null;
  matched_rule_name: string | null;
}

interface APMappingResult {
  invoice_level: APMappingSuggestion;
  line_level: APMappingSuggestion[];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  console.log('[INIT] ========================================');
  console.log('[INIT] invoice-ocr function called (OpenAI-only v3.0)');
  console.log('[INIT] Method:', req.method);
  
  const requestOrigin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes("*") 
      ? "*" 
      : (ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { 
      invoice_id, 
      documentPath, 
      centroCode,
      supplierHint 
    } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ============================================================================
    // MODE DETECTION
    // ============================================================================
    
    let actualDocumentPath: string;
    let actualCentroCode: string;
    let invoiceId: string | null = null;
    
    if (invoice_id) {
      console.log('[MODE] Invoice ID mode:', invoice_id);
      invoiceId = invoice_id;
      
      const { data: invoice, error: loadError } = await supabase
        .from('invoices_received')
        .select('id, file_path, centro_code')
        .eq('id', invoice_id)
        .single();
      
      if (loadError || !invoice) {
        throw new Error(`Invoice not found: ${invoice_id}`);
      }
      
      actualDocumentPath = invoice.file_path;
      actualCentroCode = invoice.centro_code;
      
      // Normalize path: remove duplicate .pdf extensions
      const originalPath = actualDocumentPath;
      actualDocumentPath = actualDocumentPath.replace(/\.pdf\.pdf$/i, '.pdf');
      
      if (originalPath !== actualDocumentPath) {
        console.warn(`[PATH] ⚠️ Normalized duplicate extension: "${originalPath}" → "${actualDocumentPath}"`);
      }

      console.log(`[PATH] ✓ Final document path: ${actualDocumentPath}`);
    } else if (documentPath && centroCode) {
      actualDocumentPath = documentPath;
      actualCentroCode = centroCode;
    } else {
      throw new Error('Either invoice_id OR (documentPath + centroCode) are required');
    }
    
    console.log('[INIT] Processing:', actualDocumentPath);
    console.log('[INIT] Centro:', actualCentroCode);

    // Validar path
    const { validPath } = validateAndNormalizePath(actualDocumentPath);
    console.log('[STORAGE] Path validated:', validPath);

    // Download PDF
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(actualDocumentPath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = b64encode(arrayBuffer);
    console.log(`[Base64] Converted ${arrayBuffer.byteLength} bytes`);

    // ============================================================================
    // CACHE SYSTEM
    // ============================================================================
    
    const documentHash = await createDocumentHash(base64Content);
    const quickMeta = extractQuickMetadata(base64Content);

    console.log(`[Cache] Hash: ${documentHash.substring(0, 12)}..., Pages: ${quickMeta.pageCount}`);

    // Check cache
    const { data: cacheHit, error: cacheError } = await supabase
      .rpc('search_ocr_cache', {
        p_document_hash: documentHash,
        p_structural_hash: null,
        p_supplier_vat: null,
        p_invoice_number: null,
        p_invoice_date: null,
        p_total_amount: null
      });

    if (!cacheError && cacheHit && cacheHit.length > 0) {
      const cachedResult = cacheHit[0];
      console.log('[Cache] ✅ HIT - Returning cached result');
      
      return new Response(
        JSON.stringify({
          success: true,
          ocr_engine: 'cached',
          cache_level: cachedResult.cache_level,
          data: cachedResult.extracted_data,
          normalized: cachedResult.extracted_data,
          validation: { ok: true, errors: [], warnings: ['Datos recuperados de caché'] },
          autofix_applied: [],
          ap_mapping: cachedResult.ap_mapping || null,
          confidence: cachedResult.confidence_score / 100,
          processing_time_ms: Date.now() - startTime,
          ocr_metrics: {
            pages: quickMeta.pageCount,
            cost_estimate_eur: 0,
            cache_hit: true,
            cache_level: cachedResult.cache_level,
            cost_saved_eur: cachedResult.cost_saved_eur
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Cache] ❌ MISS - Executing Orchestrator OCR...');

    const ocrStartTime = Date.now();
    const ocrResult = await orchestrateOCR(
      base64Content,
      fileData,
      'application/pdf',
      actualCentroCode,
      supplierHint
    );
    const ocrTime = Date.now() - ocrStartTime;

    console.log(`[OCR] ✅ ${ocrResult.ocr_engine} finished in ${ocrTime}ms`);
    console.log(`[OCR] Confidence: ${ocrResult.confidence_final}%`);

    // ============================================================================
    // FISCAL NORMALIZATION
    // ============================================================================
    
    const normalizeStart = Date.now();
    const normalizedResponse: NormalizedResponse = await normalizeBackend(
      ocrResult.final_invoice_json,
      '', // rawText not available from base64
      COMPANY_VAT_IDS
    );
    const normalizeTime = Date.now() - normalizeStart;

    console.log(`[Normalize] ✅ Complete in ${normalizeTime}ms`);
    console.log(`[Normalize] OK: ${normalizedResponse.validation.ok}`);
    if (!normalizedResponse.validation.ok) {
      console.log(`[Normalize] Errors:`, normalizedResponse.validation.errors);
    }

    // ============================================================================
    // ACCOUNTING VALIDATION (Double-check post OpenAI auto-validation)
    // ============================================================================
    
    const accountingValidation = validateAccountingRulesCompact(normalizedResponse.normalized);
    console.log(`[Accounting] Valid: ${accountingValidation.ok}`);
    console.log(`[Accounting] Diffs:`, accountingValidation.diffs);

    // ============================================================================
    // AP MAPPING
    // ============================================================================
    
    const apMappingStart = Date.now();
    
    // Match supplier
    const supplierData = await matchSupplier(
      supabase,
      { vat_id: normalizedResponse.normalized.issuer.vat_id },
      actualCentroCode
    );

    const apMapping: APMappingResult = await apMapperEngine(
      normalizedResponse.normalized,
      supabase,
      supplierData
    );
    
    const apMappingTime = Date.now() - apMappingStart;
    console.log(`[AP Mapping] ✅ Complete in ${apMappingTime}ms`);
    console.log(`[AP Mapping] Expense: ${apMapping.invoice_level.account_suggestion}`);

    // ============================================================================
    // ENTRY VALIDATION
    // ============================================================================
    
    const validationStart = Date.now();
    const entryValidation = validateInvoiceEntry({
      normalized_invoice: normalizedResponse.normalized,
      ap_mapping: apMapping,
      centro_code: actualCentroCode
    });
    const validationTime = Date.now() - validationStart;

    console.log(`[Entry Validation] ✅ Complete in ${validationTime}ms`);
    console.log(`[Entry Validation] Blocking issues: ${entryValidation.blocking_issues.length}`);

    // ============================================================================
    // CALCULATE COSTS & METRICS
    // ============================================================================
    
    const tokens = {
      tokens_in: ocrResult.raw_responses.openai?.usage?.tokens_in || 0,
      tokens_out: ocrResult.raw_responses.openai?.usage?.tokens_out || 0,
      total_tokens: ocrResult.raw_responses.openai?.usage?.total_tokens || 0
    };

    const pages = quickMeta.pageCount;
    const costBreakdown = calculateOCRCost({
      engine: 'openai',
      pages,
      tokens_in: tokens.tokens_in,
      tokens_out: tokens.tokens_out
    });

    console.log(`[Metrics] Cost: €${costBreakdown.cost_total_eur.toFixed(4)}`);
    console.log(`[Metrics] Tokens: ${tokens.tokens_in}/${tokens.tokens_out}`);

    // ============================================================================
    // SAVE OCR LOG
    // ============================================================================
    
    const ocrLogData = {
      document_path: actualDocumentPath,
      ocr_provider: ocrResult.ocr_engine,
      engine: ocrResult.ocr_engine,
      tokens_in: tokens.tokens_in,
      tokens_out: tokens.tokens_out,
      pages,
      cost_estimate_eur: costBreakdown.cost_total_eur,
      ms_openai: ocrResult.ocr_engine === 'openai' ? ocrTime : 0,
      raw_response: ocrResult.raw_responses,
      extracted_data: normalizedResponse.normalized,
      confidence: ocrResult.confidence_final / 100,
      processing_time_ms: Date.now() - startTime
    };

    const { error: logError } = await supabase
      .from('ocr_processing_log')
      .insert(ocrLogData);

    if (logError) {
      console.error('[Log] ❌ Failed to insert:', logError);
    }
    
    // ============================================================================
    // UPDATE INVOICE IF PROVIDED
    // ============================================================================
    
    if (invoiceId) {
      console.log('[Update] Updating invoice:', invoiceId);
      
      // Determine status
      let finalStatus: 'pending' | 'processed_ok' | 'needs_review' | 'needs_manual_review' | 'approved' = 'needs_review';
      
      const hasValidationErrors = (ocrResult.final_invoice_json.validation_errors?.length || 0) > 0;
      const hasAccountingErrors = !accountingValidation.ok;
      const hasBlockingIssues = entryValidation.blocking_issues.length > 0;
      const highConfidence = ocrResult.confidence_final >= 85;

      if (highConfidence && !hasValidationErrors && !hasAccountingErrors && !hasBlockingIssues) {
        finalStatus = 'processed_ok';
      } else if (ocrResult.confidence_final < 60 || hasValidationErrors) {
        finalStatus = 'needs_manual_review';
      }

      const { error: updateError } = await supabase
        .from('invoices_received')
        .update({
          status: finalStatus,
          ocr_engine: ocrResult.ocr_engine,
          supplier_name: normalizedResponse.normalized.issuer.name,
          supplier_vat: normalizedResponse.normalized.issuer.vat_id,
          invoice_number: normalizedResponse.normalized.invoice_number,
          invoice_date: normalizedResponse.normalized.issue_date,
          due_date: normalizedResponse.normalized.due_date,
          total_amount: normalizedResponse.normalized.totals.total,
          base_amount: (normalizedResponse.normalized.totals.base_10 || 0) + 
                      (normalizedResponse.normalized.totals.base_21 || 0),
          vat_amount: (normalizedResponse.normalized.totals.vat_10 || 0) + 
                     (normalizedResponse.normalized.totals.vat_21 || 0),
          confidence_score: ocrResult.confidence_final,
          ocr_data: normalizedResponse.normalized,
          ap_account_suggestion: apMapping.invoice_level.account_suggestion,
          processed_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('[Update] ❌ Failed:', updateError);
      } else {
        console.log('[Update] ✅ Invoice updated with status:', finalStatus);
      }

      // Auto-approve if meets criteria
      if (finalStatus === 'processed_ok') {
        try {
          const { data: glData } = await supabase.functions.invoke('gl-entry-draft', {
            body: {
              invoice_id: invoiceId,
              centro_code: actualCentroCode,
              invoice_data: normalizedResponse.normalized,
              ap_mapping: apMapping
            }
          });

          if (glData?.entry_id) {
            await supabase
              .from('invoices_received')
              .update({ status: 'approved', gl_entry_id: glData.entry_id })
              .eq('id', invoiceId);
            
            console.log('[Workflow] ✅ Auto-approved with GL entry:', glData.entry_id);
          }
        } catch (workflowError: any) {
          console.error('[Workflow] ❌ Auto-workflow failed:', workflowError);
        }
      }
    }

    // ============================================================================
    // SAVE TO CACHE
    // ============================================================================
    
    const structuralHash = await createStructuralHash(
      normalizedResponse.normalized.issuer.vat_id,
      normalizedResponse.normalized.invoice_number,
      String(normalizedResponse.normalized.totals.total)
    );
    
    try {
      await supabase.rpc('insert_ocr_cache', {
        p_document_hash: documentHash,
        p_structural_hash: structuralHash,
        p_supplier_vat: normalizedResponse.normalized.issuer.vat_id,
        p_invoice_number: normalizedResponse.normalized.invoice_number,
        p_invoice_date: normalizedResponse.normalized.issue_date,
        p_total_amount: normalizedResponse.normalized.totals.total,
        p_document_path: actualDocumentPath,
        p_file_size: quickMeta.fileSize,
        p_page_count: pages,
        p_ocr_engine: ocrResult.ocr_engine,
        p_extracted_data: normalizedResponse.normalized,
        p_ap_mapping: apMapping,
        p_confidence_score: ocrResult.confidence_final,
        p_centro_code: actualCentroCode,
        p_original_cost: costBreakdown.cost_total_eur,
        p_ttl_days: 30
      });
      
      console.log('[Cache] ✅ Saved to cache');
    } catch (cacheInsertError) {
      console.error('[Cache] ⚠️ Failed to save:', cacheInsertError);
    }

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================
    
    const processingTime = Date.now() - startTime;
    console.log(`[Complete] ✅ Total time: ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoiceId,
        ocr_engine: 'openai',
        status: 'processed',
        data: normalizedResponse.normalized,
        normalized: normalizedResponse.normalized,
        validation: normalizedResponse.validation,
        autofix_applied: normalizedResponse.autofix_applied,
        accounting_validation: accountingValidation,
        ap_mapping: apMapping,
        entry_validation: entryValidation,
        confidence: ocrResult.confidence_final / 100,
        processing_time_ms: processingTime,
        ocr_metrics: {
          pages,
          tokens_in: tokens.tokens_in,
          tokens_out: tokens.tokens_out,
          cost_estimate_eur: costBreakdown.cost_total_eur,
          processing_time_ms: processingTime,
          model_validation_errors: ocrResult.final_invoice_json.validation_errors || []
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[ERROR]', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred',
        processing_time_ms: Date.now() - startTime
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
