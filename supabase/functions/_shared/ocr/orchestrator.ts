// ============================================================================
// OCR ORCHESTRATOR - Multi-Engine with Intelligent Merge + Circuit Breaker
// ============================================================================

import { extractWithOpenAI } from "./openai-client.ts";
import { extractWithMindee } from "./mindee-client.ts";
import { validateSpanishVAT } from "./validators.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { isEngineAvailable, recordSuccess, recordFailure } from "./circuit-breaker.ts";
import type {
  EnhancedInvoiceData,
  InvoiceStatus,
  OrchestratorLog,
  OrchestratorResult,
  OpenAIExtractionResult,
  MindeeExtractionResult
} from "./types.ts";

// ============================================================================
// CONFIDENCE THRESHOLDS AND CRITICAL FIELDS
// ============================================================================
const CONFIDENCE_THRESHOLD_FALLBACK = 70;
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
  preferredEngine?: 'openai' | 'mindee'
): Promise<{
  engine: 'openai' | 'mindee' | 'merged' | 'manual_review';
  json: EnhancedInvoiceData | null;
  confidence: number;
  notes: string[];
  metrics?: {
    ms_openai?: number;
    ms_mindee?: number;
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
    preferredEngine || 'openai'
  );
  
  return {
    engine: result.ocr_engine,
    json: result.final_invoice_json,
    confidence: result.confidence_final,
    notes: result.merge_notes || [],
    metrics: {
      ms_openai: result.timing.ms_openai,
      ms_mindee: result.timing.ms_mindee,
      cost_estimate_eur: 0 // TODO: Extract from result
    }
  };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function orchestrateOCR(
  base64Content: string,
  fileBlob: Blob | null,
  mimeType: string,
  centroCode: string,
  preferredEngine: 'openai' | 'mindee' | 'merged' = 'openai'
): Promise<OrchestratorResult> {
  
  const mergeNotes: string[] = [];
  const rawResponses: any = {};
  const orchestratorLogs: OrchestratorLog[] = [];
  
  let ms_openai = 0;
  let ms_mindee = 0;

  // Simplified logging - only critical decisions
  const addLog = (stage: string, action: string, decision?: string, metrics?: any) => {
    const log: OrchestratorLog = {
      timestamp: Date.now(),
      stage,
      action,
      decision,
      metrics
    };
    orchestratorLogs.push(log);
    console.log(`[Orchestrator::${stage}] ${action}${decision ? ` → ${decision}` : ''}`);
  };

  // PDF Detection: OpenAI Vision CAN process PDFs via data URLs
  const isPdf = mimeType === 'application/pdf';
  const effectiveEngine = preferredEngine;
  
  if (isPdf) {
    console.log('[Orchestrator] ℹ️ PDF detected - OpenAI Vision can process PDFs via base64 data URLs');
  }
  
  addLog('INIT', 'Starting OCR', `Engine: ${effectiveEngine}`, { 
    preferred_engine: preferredEngine,
    effective_engine: effectiveEngine,
    is_pdf: isPdf
  });
  console.log(`[Orchestrator] Starting OCR with engine: ${effectiveEngine}`);

  // Helper function to try extraction with circuit breaker
  async function tryExtract(
    engine: 'openai' | 'mindee',
    extractFn: () => Promise<OpenAIExtractionResult | MindeeExtractionResult>
  ): Promise<{ result: any | null; duration: number }> {
    
    if (!(await isEngineAvailable(engine))) {
      mergeNotes.push(`⚠️ ${engine} circuit breaker OPEN, skipping`);
      console.log(`[Orchestrator] ${engine} circuit breaker OPEN`);
      return { result: null, duration: 0 };
    }
    
    const start = Date.now();
    try {
      const result = await extractFn();
      await recordSuccess(engine);
      const duration = Date.now() - start;
      console.log(`[Orchestrator] ${engine} ✅ ${result.confidence_score}% in ${duration}ms`);
      addLog('EXECUTION', `${engine} completed`, `${result.confidence_score}%`, {
        duration_ms: duration,
        confidence: result.confidence_score
      });
      return { result, duration };
    } catch (e: any) {
      await recordFailure(engine, e);
      const duration = Date.now() - start;
      mergeNotes.push(`⚠️ ${engine} error: ${e.message}`);
      console.error(`[Orchestrator] ${engine} ❌ Failed:`, e);
      addLog('EXECUTION', `${engine} failed`, 'ERROR', { error: e.message });
      return { result: null, duration };
    }
  }

  let openaiResult: OpenAIExtractionResult | null = null;
  let mindeeResult: MindeeExtractionResult | null = null;

  // Option A: Use Mindee (preferred or forced by PDF)
  if (effectiveEngine === 'mindee') {
    const { result, duration } = await tryExtract('mindee', 
      () => extractWithMindee(fileBlob || base64Content));
    
    if (result) {
      mindeeResult = result;
      ms_mindee = duration;
      rawResponses.mindee = result;
      
      const status: InvoiceStatus = result.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
        ? 'processed_ok' : 'needs_review';
        
      addLog('DECISION', 'Using Mindee result', status, { confidence: result.confidence_score });
      mergeNotes.push(`✅ Mindee ${result.confidence_score}% → ${status}`);
      
      return {
        ocr_engine: 'mindee',
        final_invoice_json: result.data,
        confidence_final: result.confidence_score,
        status,
        merge_notes: mergeNotes,
        orchestrator_logs: orchestratorLogs,
        raw_responses: rawResponses,
        timing: { ms_openai, ms_mindee }
      };
    }
  }

  // Option B: Try OpenAI (supports PDFs via base64 data URLs)
  if (effectiveEngine === 'openai' || effectiveEngine === 'merged') {
    console.log('[Orchestrator] Attempting OpenAI extraction (PDF support enabled)');
    const { result: oaiResult, duration: oaiDuration } = await tryExtract('openai',
      () => extractWithOpenAI(base64Content, mimeType));
    
    if (oaiResult) {
      openaiResult = oaiResult;
      ms_openai = oaiDuration;
      rawResponses.openai = oaiResult;
    }
  }

  // Use OpenAI if available and has critical fields
  if (openaiResult && hasCritical(openaiResult.data)) {
    
    const status: InvoiceStatus = openaiResult.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
      ? 'processed_ok' : 'needs_review';
      
    addLog('DECISION', 'Using OpenAI result', status, { confidence: openaiResult.confidence_score });
    mergeNotes.push(`✅ OpenAI ${openaiResult.confidence_score}% → ${status}`);
    
    return {
      ocr_engine: 'openai',
      final_invoice_json: openaiResult.data,
      confidence_final: openaiResult.confidence_score,
      status,
      merge_notes: mergeNotes,
      orchestrator_logs: orchestratorLogs,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // No fallback to Mindee - using OpenAI only
  console.log('[Orchestrator] OpenAI-only mode enabled, no Mindee fallback');

  // OpenAI-only mode: skip merge and Mindee-only results

  if (openaiResult && openaiResult.confidence_score >= 40) {
    addLog('DECISION', 'Using OpenAI result', 'needs_review', { confidence: openaiResult.confidence_score });
    mergeNotes.push(`⚠️ OpenAI low confidence (${openaiResult.confidence_score}%)`);
    
    return {
      ocr_engine: 'openai',
      final_invoice_json: openaiResult.data,
      confidence_final: openaiResult.confidence_score,
      status: 'needs_review',
      merge_notes: mergeNotes,
      orchestrator_logs: orchestratorLogs,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // Both failed
  console.error('[Orchestrator] All engines failed');
  addLog('DECISION', 'Manual review required', 'All engines failed');
  
  mergeNotes.push('❌ All engines failed or insufficient confidence');
  
  return {
    ocr_engine: 'manual_review',
    final_invoice_json: createEmptyInvoiceData(),
    confidence_final: 0,
    status: 'needs_review',
    merge_notes: mergeNotes,
    orchestrator_logs: orchestratorLogs,
    raw_responses: rawResponses,
    timing: { ms_openai, ms_mindee }
  };
}

// ============================================================================
// INTELLIGENT MERGE
// ============================================================================

function intelligentMerge(
  openaiResult: OpenAIExtractionResult,
  mindeeResult: MindeeExtractionResult,
  mergeNotes: string[],
  supplierHistory: Array<{ ocr_engine: string; confidence_score: number }> | null = null
): { data: EnhancedInvoiceData; confidence: number } {
  
  console.log('[Merge] Starting intelligent merge...');
  
  const mindeeHistoryScore = supplierHistory 
    ? supplierHistory.filter(h => h.ocr_engine === 'mindee' || h.ocr_engine === 'merged').length / supplierHistory.length
    : 0.5;
  
  const prioritizeMindee = mindeeHistoryScore > 0.6;
  
  if (prioritizeMindee) {
    console.log(`[Merge] 🎯 Prioritizing Mindee based on supplier history (${(mindeeHistoryScore * 100).toFixed(0)}% success rate)`);
  }
  
  const merged: EnhancedInvoiceData = JSON.parse(JSON.stringify(openaiResult.data));
  
  // 1. Completar issuer.vat_id si está null (con validación)
  if (!merged.issuer.vat_id && mindeeResult.data.issuer.vat_id) {
    const mindeeVat = mindeeResult.data.issuer.vat_id;
    
    if (validateSpanishVAT(mindeeVat)) {
      merged.issuer.vat_id = mindeeVat;
      mergeNotes.push('🔀 NIF emisor validado y completado desde Mindee ✓');
    } else {
      mergeNotes.push('⚠️ NIF de Mindee inválido, descartado');
      console.warn(`[Merge] Invalid NIF from Mindee: ${mindeeVat}`);
    }
  } else if (merged.issuer.vat_id && mindeeResult.data.issuer.vat_id && 
             merged.issuer.vat_id !== mindeeResult.data.issuer.vat_id) {
    const openaiValid = validateSpanishVAT(merged.issuer.vat_id);
    const mindeeValid = validateSpanishVAT(mindeeResult.data.issuer.vat_id);
    
    if (!openaiValid && mindeeValid) {
      merged.issuer.vat_id = mindeeResult.data.issuer.vat_id;
      mergeNotes.push('🔀 NIF corregido por Mindee (OpenAI inválido)');
    } else if (openaiValid && !mindeeValid) {
      mergeNotes.push('✅ NIF de OpenAI validado (Mindee inválido)');
    } else if (prioritizeMindee && mindeeValid) {
      merged.issuer.vat_id = mindeeResult.data.issuer.vat_id;
      mergeNotes.push('🎯 NIF de Mindee priorizado por historial del proveedor');
    }
  }
  
  // 2. Completar issuer.name si está vacío
  if (!merged.issuer.name && mindeeResult.data.issuer.name) {
    merged.issuer.name = mindeeResult.data.issuer.name;
    mergeNotes.push('🔀 Nombre emisor completado desde Mindee');
  }
  
  // 3. Completar invoice_number
  if (!merged.invoice_number && mindeeResult.data.invoice_number) {
    merged.invoice_number = mindeeResult.data.invoice_number;
    mergeNotes.push('🔀 Número factura completado desde Mindee');
  }
  
  // 4. Completar dates
  if (!merged.issue_date && mindeeResult.data.issue_date) {
    merged.issue_date = mindeeResult.data.issue_date;
    mergeNotes.push('🔀 Fecha emisión completada desde Mindee');
  }
  
  // 5. Resolver conflicto de totales
  if (Math.abs(merged.totals.total - mindeeResult.data.totals.total) > 0.01) {
    const openaiLinesTotal = openaiResult.data.lines.reduce((sum, l) => sum + l.amount, 0);
    const mindeeLinesTotal = mindeeResult.data.lines.reduce((sum, l) => sum + l.amount, 0);
    
    const openaiDiff = Math.abs(openaiLinesTotal - openaiResult.data.totals.total);
    const mindeeDiff = Math.abs(mindeeLinesTotal - mindeeResult.data.totals.total);
    
    const diffsAreSimilar = Math.abs(openaiDiff - mindeeDiff) / Math.max(openaiDiff, mindeeDiff) < 0.2;
    
    if (prioritizeMindee && diffsAreSimilar && mindeeDiff < 5) {
      merged.totals = mindeeResult.data.totals;
      mergeNotes.push(`🎯 Totales de Mindee priorizados por historial (diff ${mindeeDiff.toFixed(2)}€ vs ${openaiDiff.toFixed(2)}€)`);
    } else if (mindeeDiff < openaiDiff) {
      merged.totals = mindeeResult.data.totals;
      mergeNotes.push(`🔀 Totales de Mindee priorizados (mejor cuadre: diff ${mindeeDiff.toFixed(2)}€ vs ${openaiDiff.toFixed(2)}€)`);
    } else {
      mergeNotes.push(`✅ Totales de OpenAI validados (mejor cuadre)`);
    }
  }
  
  // 6. Combinar líneas si Mindee tiene más detalle
  if (mindeeResult.data.lines.length > merged.lines.length) {
    merged.lines = mindeeResult.data.lines;
    mergeNotes.push(`🔀 Líneas de factura de Mindee (${mindeeResult.data.lines.length} líneas vs ${openaiResult.data.lines.length})`);
  }
  
  // 7. Completar VAT breakdown
  if (!merged.totals.base_21 && mindeeResult.data.totals.base_21) {
    merged.totals.base_21 = mindeeResult.data.totals.base_21;
    merged.totals.vat_21 = mindeeResult.data.totals.vat_21;
    mergeNotes.push('🔀 Desglose IVA 21% completado desde Mindee');
  }
  
  if (!merged.totals.base_10 && mindeeResult.data.totals.base_10) {
    merged.totals.base_10 = mindeeResult.data.totals.base_10;
    merged.totals.vat_10 = mindeeResult.data.totals.vat_10;
    mergeNotes.push('🔀 Desglose IVA 10% completado desde Mindee');
  }
  
  // Calcular confidence final
  let finalConfidence = Math.round(
    (openaiResult.confidence_score * 0.6) + (mindeeResult.confidence_score * 0.4)
  );
  
  if (prioritizeMindee && mindeeResult.confidence_score >= 70) {
    finalConfidence = Math.min(95, finalConfidence + 5);
    mergeNotes.push('🎯 Confianza ajustada +5% por historial favorable del proveedor');
  }
  
  console.log(`[Merge] ✅ Merge completed: final confidence ${finalConfidence}%`);
  mergeNotes.push(`🔀 Fusión completada: confidence final ${finalConfidence}%`);
  
  return {
    data: merged,
    confidence: finalConfidence
  };
}
