// ============================================================================
// OCR ORCHESTRATOR - OpenAI-only with Circuit Breaker
// ============================================================================

import { extractWithOpenAI } from "./openai-client.ts";
import { validateSpanishVAT } from "./validators.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { isEngineAvailable, recordSuccess, recordFailure } from "./circuit-breaker.ts";
import type {
  EnhancedInvoiceData,
  InvoiceStatus,
  OrchestratorLog,
  OrchestratorResult,
  OpenAIExtractionResult
} from "./types.ts";

// ============================================================================
// CONFIDENCE THRESHOLDS AND CRITICAL FIELDS
// ============================================================================
const CONFIDENCE_THRESHOLD_AUTO_POST = 85;

// Helper: Check if invoice has critical fields
function hasCritical(data: any): boolean {
  return data?.issuer?.vat_id && data?.invoice_number && data?.totals?.total != null;
}

function createEmptyInvoiceData(): EnhancedInvoiceData {
  return {
    document_type: 'invoice',
    issuer: { name: '', vat_id: null },
    receiver: { name: null, vat_id: null, address: null },
    invoice_number: '',
    issue_date: '',
    due_date: null,
    totals: {
      currency: 'EUR',
      base_10: null,
      vat_10: null,
      base_21: null,
      vat_21: null,
      other_taxes: [],
      total: 0
    },
    lines: [],
    centre_hint: null,
    payment_method: null,
    confidence_notes: [],
    confidence_score: 0,
    discrepancies: [],
    proposed_fix: null
  };
}

// ============================================================================
// WRAPPER API - Simplified runOcr for external use
// ============================================================================

export async function runOcr(
  bytes: Uint8Array, 
  centroCode: string,
  preferredEngine?: 'openai',
  supplierHint?: string | null
): Promise<{
  engine: 'openai' | 'manual_review';
  json: EnhancedInvoiceData | null;
  confidence: number;
  notes: string[];
  metrics?: {
    ms_openai?: number;
    cost_estimate_eur?: number;
  };
}> {
  // Convert bytes to base64 for orchestrateOCR
  const base64 = btoa(String.fromCharCode(...bytes));
  const mimeType = 'application/pdf'; // Assume PDF by default
  
  const result = await orchestrateOCR(
    base64, 
    null, // No blob for this simplified API
    mimeType, 
    centroCode,
    supplierHint
  );
  
  return {
    engine: result.ocr_engine,
    json: result.final_invoice_json,
    confidence: result.confidence_final,
    notes: result.merge_notes || [],
    metrics: {
      ms_openai: result.timing.ms_openai,
      cost_estimate_eur: 0 // TODO: Extract from result
    }
  };
}

// ============================================================================
// MAIN ORCHESTRATOR - OpenAI Only
// ============================================================================

export async function orchestrateOCR(
  base64Content: string,
  fileBlob: Blob | null,
  mimeType: string,
  centroCode: string,
  supplierHint?: string | null
): Promise<OrchestratorResult> {
  
  const mergeNotes: string[] = [];
  const rawResponses: any = {};
  const orchestratorLogs: OrchestratorLog[] = [];
  
  let ms_openai = 0;
  
  console.log(`[Orchestrator] Starting OCR with OpenAI-only mode`);
  
  orchestratorLogs.push({
    timestamp: Date.now(),
    stage: 'init',
    action: 'orchestrator_start',
    decision: 'openai_only',
    reason: 'OpenAI-only mode active',
    metrics: { mime_type: mimeType }
  });

  // ============================================================================
  // 1. CIRCUIT BREAKER CHECK
  // ============================================================================
  
  const openaiAvailable = await isEngineAvailable('openai');
  
  if (!openaiAvailable) {
    console.error('[Orchestrator] OpenAI circuit breaker is OPEN - cannot process');
    mergeNotes.push('❌ OpenAI circuit breaker open - manual review required');
    
    return {
      ocr_engine: 'manual_review',
      final_invoice_json: createEmptyInvoiceData(),
      confidence_final: 0,
      status: 'needs_review',
      merge_notes: mergeNotes,
      orchestrator_logs: orchestratorLogs,
      raw_responses: {},
      timing: { ms_openai: 0 },
      pdf_converted: false
    };
  }

  // ============================================================================
  // 2. EXECUTE OPENAI EXTRACTION
  // ============================================================================
  
  console.log('[Orchestrator] Attempting OpenAI extraction (PDF support enabled)');
  
  let openaiResult: OpenAIExtractionResult | null = null;
  
  const t0 = performance.now();
  try {
    openaiResult = await extractWithOpenAI(base64Content, mimeType, undefined, supplierHint);
    ms_openai = Math.round(performance.now() - t0);
    
    console.log(`[Orchestrator] openai ✅ ${openaiResult.confidence_score}% in ${ms_openai}ms`);
    
    rawResponses.openai = openaiResult;
    
    orchestratorLogs.push({
      timestamp: Date.now(),
      stage: 'extraction',
      action: 'openai_completed',
      metrics: {
        duration_ms: ms_openai,
        confidence: openaiResult.confidence_score,
        has_critical: hasCritical(openaiResult.data)
      }
    });
    
    await recordSuccess('openai');
    
  } catch (error) {
    ms_openai = Math.round(performance.now() - t0);
    console.error('[Orchestrator] OpenAI extraction failed:', error);
    
    const errorType = error instanceof Error && error.message.includes('401') ? 'auth' :
                      error instanceof Error && error.message.includes('429') ? 'rate_limit' :
                      error instanceof Error && error.message.includes('timeout') ? 'timeout' : 
                      'server_error';
    
    await recordFailure('openai', errorType, error instanceof Error ? error.message : String(error));
    
    orchestratorLogs.push({
      timestamp: Date.now(),
      stage: 'extraction',
      action: 'openai_failed',
      reason: error instanceof Error ? error.message : String(error),
      metrics: { duration_ms: ms_openai }
    });
    
    mergeNotes.push(`❌ OpenAI extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // ============================================================================
  // 3. DETERMINE FINAL RESULT
  // ============================================================================
  
  if (!openaiResult) {
    console.error('[Orchestrator] No extraction succeeded - returning manual_review');
    
    return {
      ocr_engine: 'manual_review',
      final_invoice_json: createEmptyInvoiceData(),
      confidence_final: 0,
      status: 'needs_review',
      merge_notes: mergeNotes,
      orchestrator_logs: orchestratorLogs,
      raw_responses: rawResponses,
      timing: { ms_openai },
      pdf_converted: false
    };
  }

  // Use OpenAI result
  const finalData = openaiResult.data;
  const finalConfidence = openaiResult.confidence_score;
  
  mergeNotes.push(`✅ Using OpenAI result (${finalConfidence}% confidence)`);
  
  orchestratorLogs.push({
    timestamp: Date.now(),
    stage: 'merge',
    action: 'use_openai',
    decision: 'openai_result',
    metrics: {
      confidence: finalConfidence,
      has_critical: hasCritical(finalData)
    }
  });

  // ============================================================================
  // 4. VALIDATE AND DETERMINE STATUS
  // ============================================================================
  
  let status: InvoiceStatus = 'needs_review';
  
  // Auto-post si confianza alta y campos críticos completos
  if (finalConfidence >= CONFIDENCE_THRESHOLD_AUTO_POST && hasCritical(finalData)) {
    status = 'processed_ok';
    mergeNotes.push('✅ Auto-post enabled (high confidence + critical fields)');
  } else if (finalConfidence < 60) {
    mergeNotes.push('⚠️ Low confidence - manual review recommended');
  }
  
  // VAT validation
  if (finalData.issuer?.vat_id) {
    const vatValid = validateSpanishVAT(finalData.issuer.vat_id);
    if (!vatValid) {
      mergeNotes.push('⚠️ Spanish VAT validation failed');
      status = 'needs_review';
    }
  }
  
  orchestratorLogs.push({
    timestamp: Date.now(),
    stage: 'validation',
    action: 'status_determined',
    decision: status,
    metrics: {
      final_confidence: finalConfidence,
      has_critical: hasCritical(finalData)
    }
  });

  console.log(`[Orchestrator] Final status: ${status} (confidence: ${finalConfidence}%)`);

  return {
    ocr_engine: 'openai',
    final_invoice_json: finalData,
    confidence_final: finalConfidence,
    status,
    merge_notes: mergeNotes,
    orchestrator_logs: orchestratorLogs,
    raw_responses: rawResponses,
    timing: { ms_openai },
    pdf_converted: false
  };
}
