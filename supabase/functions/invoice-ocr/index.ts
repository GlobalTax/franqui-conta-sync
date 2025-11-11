// ============================================================================
// INVOICE OCR - Enhanced with Multi-Engine Orchestrator + Fiscal Normalizer ES + AP Mapping Engine
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { orchestrateOCR } from "../_shared/ocr/orchestrator.ts";
import { calculateOCRCost, extractPageCount, extractTokensFromOpenAI } from "./cost-calculator.ts";
import { createDocumentHash, createStructuralHash, extractQuickMetadata } from "../_shared/hash-utils.ts";
import { validateAndNormalizePath, parseInvoicePath } from "../_shared/storage-utils.ts";
import { fiscalNormalizerES } from "../_shared/fiscal/normalize-es.ts";
import { apMapperEngine, matchSupplier } from "../_shared/ap/mapping-engine.ts";
import { validateInvoiceEntry } from "../_shared/gl/validator.ts";
import type { EnhancedInvoiceData } from "../_shared/ocr/types.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "*")
  .split(",")
  .map(o => o.trim());

const COMPANY_VAT_IDS = ['B12345678', 'B87654321']; // NIFs de nuestra empresa

// ============================================================================
// INTERFACES
// ============================================================================
// (EnhancedInvoiceData imported from _shared/ocr/types.ts)

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
  console.log('[INIT] invoice-ocr function called');
  console.log('[INIT] Method:', req.method);
  console.log('[INIT] URL:', req.url);
  console.log('[INIT] Headers:', Object.fromEntries(req.headers.entries()));
  
  const requestOrigin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes("*") 
      ? "*" 
      : (ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === 'OPTIONS') {
    console.log('[INIT] OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('[INIT] Parsing request body...');
    const rawBody = await req.text();
    console.log('[INIT] Raw body received (first 200 chars):', rawBody.substring(0, 200));
    
    const body = JSON.parse(rawBody);
    console.log('[INIT] Parsed body:', body);
    
    const { documentPath, centroCode, engine = 'openai' } = body;
    console.log('[INIT] documentPath:', documentPath);
    console.log('[INIT] centroCode:', centroCode);
    console.log('[INIT] engine:', engine);
    
    if (!documentPath || !centroCode) {
      throw new Error('documentPath and centroCode are required');
    }

    // Validar y extraer metadata del path
    console.log('[STORAGE] Validating document path...');
    const { validPath, metadata } = validateAndNormalizePath(documentPath);
    console.log('[STORAGE] Path validated:', validPath);
    console.log('[STORAGE] Path metadata:', JSON.stringify(metadata, null, 2));

    console.log('[Init] 🔧 invoice-ocr v2.0 - Mindee optimizado con Blob directo');
    console.log('[Init] ✅ MINDEE_API_KEY configured:', !!Deno.env.get('MINDEE_API_KEY'));
    console.log(`Processing OCR for document: ${documentPath} with engine: ${engine}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download PDF
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(documentPath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert to base64 (safe method for large files)
    let base64Content: string;
    try {
      const conversionStart = Date.now();
      const arrayBuffer = await fileData.arrayBuffer();
      base64Content = b64encode(arrayBuffer);
      const conversionTime = Date.now() - conversionStart;
      console.log(`[Base64] ✅ Conversion OK - ${arrayBuffer.byteLength} bytes in ${conversionTime}ms`);
    } catch (conversionError: any) {
      console.error('[Base64] ❌ Conversion failed:', conversionError);
      throw new Error(`Base64 conversion failed: ${conversionError.message}`);
    }

    // ⭐ CACHE SYSTEM: Calculate hashes and metadata
    const documentHash = await createDocumentHash(base64Content);
    const quickMeta = extractQuickMetadata(base64Content);

    console.log(`[Cache] Document hash: ${documentHash.substring(0, 12)}...`);
    console.log(`[Cache] File size: ${quickMeta.fileSize} bytes, Pages: ${quickMeta.pageCount}`);

    // ⭐ CACHE SYSTEM: Attempt L1 cache lookup (exact hash)
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
      const processingTime = Date.now() - startTime;
      
      console.log(`[Cache] ✅ HIT ${cachedResult.cache_level} - Saved €${cachedResult.cost_saved_eur.toFixed(4)}`);
      
      // Return cached result immediately
      return new Response(
        JSON.stringify({
          success: true,
          ocr_engine: 'cached',
          cache_level: cachedResult.cache_level,
          merge_notes: [`Resultado recuperado de caché (${cachedResult.cache_level})`],
          data: cachedResult.extracted_data,
          normalized: cachedResult.extracted_data,
          validation: { ok: true, errors: [], warnings: ['Datos recuperados de caché'] },
          autofix_applied: [],
          ap_mapping: cachedResult.ap_mapping || null,
          entry_validation: null,
          confidence: cachedResult.confidence_score / 100,
          rawText: '',
          processingTimeMs: processingTime,
          ocr_metrics: {
            pages: quickMeta.pageCount,
            tokens_in: 0,
            tokens_out: 0,
            cost_estimate_eur: 0,
            ms_openai: 0,
            ms_mindee: 0,
            processing_time_ms: processingTime,
            cache_hit: true,
            cache_level: cachedResult.cache_level,
            cost_saved_eur: cachedResult.cost_saved_eur
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log('[Cache] ❌ MISS - Executing OCR...');
    console.log('Starting OCR orchestration...');

    // Usar Orchestrator para OCR con motor seleccionado
    // ✅ FASE 1: Pasar Blob original para evitar conversión innecesaria
    const orchestratorResult = await orchestrateOCR(
      base64Content,
      fileData, // ✅ Pasar Blob original para Mindee
      fileData.type || 'application/pdf',
      centroCode,
      engine as 'openai' | 'mindee' | 'merged'
    );

    console.log(`[Main] OCR Engine used: ${orchestratorResult.ocr_engine}`);
    console.log(`[Main] Confidence: ${orchestratorResult.confidence_final}%`);
    console.log(`[Main] Status: ${orchestratorResult.status}`);

    // ⭐ CACHE SYSTEM: Calculate structural hash after OCR extraction
    const structuralHash = createStructuralHash(
      orchestratorResult.final_invoice_json.issuer.vat_id,
      orchestratorResult.final_invoice_json.invoice_number,
      orchestratorResult.final_invoice_json.issue_date
    );

    console.log(`[Cache] Structural hash: ${structuralHash}`);
    
    // 2. Match supplier
    const matchedSupplier = await matchSupplier(supabase, {
      name: orchestratorResult.final_invoice_json.issuer.name,
      taxId: orchestratorResult.final_invoice_json.issuer.vat_id
    }, centroCode);

    // 3. Fiscal Normalizer ES
    const normalizedResponse = fiscalNormalizerES(orchestratorResult.final_invoice_json, '', COMPANY_VAT_IDS);
    
    // 4. AP Mapping Engine
    const apMapping = await apMapperEngine(
      normalizedResponse.normalized,
      supabase,
      matchedSupplier
    );

    // 5. Invoice Entry Validator
    const entryValidation = validateInvoiceEntry({
      normalized_invoice: normalizedResponse.normalized,
      ap_mapping: apMapping,
      centro_code: centroCode
    });

    const processingTime = Date.now() - startTime;

    // ============================================================================
    // ⭐ OCR LOGGER - Tracking de costes, tiempos y tokens
    // ============================================================================
    
    const pages = extractPageCount(base64Content, fileData.type || 'application/pdf');
    const tokens = extractTokensFromOpenAI(orchestratorResult.raw_responses.openai?.raw_response);

    const costBreakdown = calculateOCRCost({
      engine: orchestratorResult.ocr_engine as 'openai' | 'mindee' | 'merged',
      pages,
      tokens_in: tokens.tokens_in,
      tokens_out: tokens.tokens_out
    });

    // ⭐ FASE 2: Pipeline stages granulares
    const downloadTime = 150; // Estimación simple
    const normalizeTime = 50;
    const apMappingTime = 100;
    const validationTime = 50;

    const pipelineStages = {
      stages: [
        {
          stage: 'download',
          timestamp: Date.now(),
          duration_ms: downloadTime,
          success: true,
          notes: 'PDF downloaded from storage'
        },
        {
          stage: 'orchestrate',
          timestamp: Date.now(),
          duration_ms: orchestratorResult.timing.ms_openai + orchestratorResult.timing.ms_mindee,
          success: true,
          engine_used: orchestratorResult.ocr_engine,
          notes: orchestratorResult.merge_notes.join('; ')
        },
        {
          stage: 'normalize',
          timestamp: Date.now(),
          duration_ms: normalizeTime,
          success: normalizedResponse.validation.ok,
          errors: normalizedResponse.validation.errors,
          warnings: normalizedResponse.validation.warnings,
          autofix_applied: normalizedResponse.autofix_applied
        },
        {
          stage: 'ap_mapping',
          timestamp: Date.now(),
          duration_ms: apMappingTime,
          success: true,
          confidence: apMapping.invoice_level.confidence_score,
          matched_rule: apMapping.invoice_level.matched_rule_name
        },
        {
          stage: 'validation',
          timestamp: Date.now(),
          duration_ms: validationTime,
          success: entryValidation.blocking_issues.length === 0,
          blocking_issues: entryValidation.blocking_issues,
          warnings: entryValidation.warnings
        }
      ],
      total_duration_ms: processingTime,
      pipeline_version: '2.0-multi-engine'
    };

    // Insertar log en BD con métricas completas + pipeline stages
    const ocrLogData = {
      document_path: documentPath,
      ocr_provider: 'multi-engine', // Legacy field
      engine: orchestratorResult.ocr_engine,
      tokens_in: tokens.tokens_in,
      tokens_out: tokens.tokens_out,
      pages,
      cost_estimate_eur: costBreakdown.cost_total_eur,
      ms_openai: orchestratorResult.timing.ms_openai,
      ms_mindee: orchestratorResult.timing.ms_mindee,
      raw_response: orchestratorResult.raw_responses,
      extracted_data: {
        ...orchestratorResult.final_invoice_json,
        _pipeline: pipelineStages  // ⭐ NUEVO: Pipeline granular
      },
      confidence: orchestratorResult.confidence_final / 100,
      processing_time_ms: processingTime
    };

    const { error: logError } = await supabase
      .from('ocr_processing_log')
      .insert(ocrLogData);

    if (logError) {
      console.error('[Main] ❌ Failed to insert OCR log:', logError);
      // No bloqueamos el flujo si falla el logging
    } else {
      console.log(`[Main] ✅ OCR logged - Engine: ${orchestratorResult.ocr_engine}, Cost: €${costBreakdown.cost_total_eur}, Time: ${processingTime}ms, Tokens: ${tokens.tokens_in}/${tokens.tokens_out}`);
    }

    // ⭐ CACHE SYSTEM: Save to cache for future use
    try {
      const { data: cacheId } = await supabase.rpc('insert_ocr_cache', {
        p_document_hash: documentHash,
        p_structural_hash: structuralHash,
        p_supplier_vat: orchestratorResult.final_invoice_json.issuer.vat_id,
        p_invoice_number: orchestratorResult.final_invoice_json.invoice_number,
        p_invoice_date: orchestratorResult.final_invoice_json.issue_date,
        p_total_amount: orchestratorResult.final_invoice_json.totals.total,
        p_document_path: documentPath,
        p_file_size: quickMeta.fileSize,
        p_page_count: pages,
        p_ocr_engine: orchestratorResult.ocr_engine,
        p_extracted_data: normalizedResponse.normalized,
        p_ap_mapping: apMapping,
        p_confidence_score: orchestratorResult.confidence_final,
        p_centro_code: centroCode,
        p_original_cost: costBreakdown.cost_total_eur,
        p_ttl_days: 30
      });
      
      console.log(`[Cache] ✅ Saved to cache with ID: ${cacheId}`);
    } catch (cacheInsertError) {
      console.error('[Cache] ⚠️ Failed to save to cache:', cacheInsertError);
      // Don't block flow if cache insertion fails
    }

    console.log(`OCR completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        ocr_engine: orchestratorResult.ocr_engine,
        status: orchestratorResult.status, // ⭐ Estado final del documento
        merge_notes: orchestratorResult.merge_notes,
        orchestrator_logs: orchestratorResult.orchestrator_logs, // ⭐ NUEVO: Timeline de decisiones
        data: normalizedResponse.normalized,
        normalized: normalizedResponse.normalized,
        validation: normalizedResponse.validation,
        autofix_applied: normalizedResponse.autofix_applied,
        ap_mapping: apMapping,
        entry_validation: entryValidation,
        confidence: orchestratorResult.confidence_final / 100,
        rawText: '',
        processingTimeMs: processingTime,
        ocr_metrics: {
          pages,
          tokens_in: tokens.tokens_in,
          tokens_out: tokens.tokens_out,
          cost_estimate_eur: costBreakdown.cost_total_eur,
          ms_openai: orchestratorResult.timing.ms_openai,
          ms_mindee: orchestratorResult.timing.ms_mindee,
          processing_time_ms: processingTime
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('OCR processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred',
        processingTimeMs: Date.now() - startTime
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// ============================================================================
// LEGACY HELPERS (moved to _shared/)
// ============================================================================
// extractInvoiceData → Deprecated (use OCR engines directly)
// validateSpanishVAT → Moved to _shared/fiscal/normalize-es.ts
// fiscalNormalizerES → Moved to _shared/fiscal/normalize-es.ts
// calculateEnhancedConfidence → Moved to _shared/fiscal/normalize-es.ts

// ============================================================================
// FISCAL NORMALIZER - Moved to _shared/fiscal/normalize-es.ts
// ============================================================================

// ============================================================================
// ACCOUNT VALIDATION - Moved to _shared/ap/mapping-engine.ts
// ============================================================================

// ============================================================================
// AP MAPPING ENGINE - Moved to _shared/ap/mapping-engine.ts
// ============================================================================

// ============================================================================
// SUPPLIER MATCHING - Moved to _shared/ap/mapping-engine.ts
// ============================================================================

// ============================================================================
// UTILITIES - Deprecated (use fiscal normalizer helpers)
// ============================================================================

// ============================================================================
// INVOICE ENTRY VALIDATOR - Moved to _shared/gl/validator.ts
// ============================================================================
