// ============================================================================
// OCR ORCHESTRATOR - Multi-Engine with Intelligent Merge + Circuit Breaker
// ============================================================================

import { extractWithOpenAI } from "./openai-client.ts";
import { extractWithMindee } from "./mindee-client.ts";
import { validateSpanishVAT } from "../fiscal/normalize-es.ts";
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
const CONFIDENCE_THRESHOLD_FALLBACK = 70;  // < 70 → fallback a Mindee
const CONFIDENCE_THRESHOLD_AUTO_POST = 85; // ≥ 85 → auto-post elegible
const CRITICAL_FIELDS = ['issuer.vat_id', 'invoice_number', 'totals.total'];

function getFieldValue(obj: any, path: string): any {
  const parts = path.split('.');
  let value = obj;
  for (const part of parts) {
    value = value?.[part];
  }
  return value;
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

  const addLog = (stage: string, action: string, decision?: string, reason?: string, metrics?: any) => {
    const log: OrchestratorLog = {
      timestamp: Date.now(),
      stage,
      action,
      decision,
      reason,
      metrics
    };
    orchestratorLogs.push(log);
    console.log(`[Orchestrator::${stage}] ${action}${decision ? ` → ${decision}` : ''}${reason ? ` (${reason})` : ''}`);
  };

  const performanceMarkers: Record<string, number> = {};
  const markStart = (marker: string) => {
    performanceMarkers[`${marker}_start`] = Date.now();
  };
  const markEnd = (marker: string) => {
    const start = performanceMarkers[`${marker}_start`];
    if (start) {
      const duration = Date.now() - start;
      return duration;
    }
    return 0;
  };

  addLog('INIT', 'Starting OCR', `Engine: ${preferredEngine}`, 'User preference');
  console.log(`[Orchestrator] Starting OCR orchestration with preferred engine: ${preferredEngine}...`);

  let openaiResult: OpenAIExtractionResult | null = null;
  let mindeeResult: MindeeExtractionResult | null = null;

  // OPCIÓN A: Usuario prefiere Mindee explícitamente
  if (preferredEngine === 'mindee') {
    // Verificar circuit breaker
    const mindeeAvailable = await isEngineAvailable('mindee');
    
    if (!mindeeAvailable) {
      addLog('ROUTING', 'Mindee circuit breaker OPEN', 'Skipping Mindee', 'Circuit breaker protection');
      mergeNotes.push('⚠️ Mindee temporalmente no disponible (circuit breaker)');
      console.log('[Orchestrator] ⚠️ Mindee circuit breaker is OPEN, falling back to OpenAI...');
    } else {
      addLog('ROUTING', 'User prefers Mindee', 'Executing Mindee first', 'User explicitly selected Mindee engine');
      console.log('[Orchestrator] Using Mindee as preferred engine...');
      
      try {
        markStart('mindee_extraction');
        const startMindee = Date.now();
        mindeeResult = await extractWithMindee(fileBlob || base64Content);
        ms_mindee = Date.now() - startMindee;
        markEnd('mindee_extraction');
      
      rawResponses.mindee = mindeeResult;
      console.log(`[Orchestrator] Mindee completed: ${mindeeResult.confidence_score}% confidence in ${ms_mindee}ms`);
      
      addLog('EXECUTION', 'Mindee completed', `Confidence: ${mindeeResult.confidence_score}%`, undefined, {
        duration_ms: ms_mindee,
        confidence: mindeeResult.confidence_score,
        engine: 'mindee'
      });
      
      const status: InvoiceStatus = mindeeResult.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
        ? 'processed_ok'
        : 'needs_review';
        
      addLog('DECISION', 'Using Mindee result', 'No fallback needed', `Confidence ${mindeeResult.confidence_score}% meets threshold`, {
        confidence: mindeeResult.confidence_score,
        threshold: CONFIDENCE_THRESHOLD_AUTO_POST,
        status
      });
      
        console.log(`[Orchestrator] ✅ Using Mindee result (confidence: ${mindeeResult.confidence_score}%, status: ${status})`);
        mergeNotes.push(`✅ Mindee usado (confidence ${mindeeResult.confidence_score}%)`);
        mergeNotes.push(`📊 Estado final: ${status}`);
        
        // Registrar éxito en circuit breaker
        await recordSuccess('mindee');
        
        return {
          ocr_engine: 'mindee',
          final_invoice_json: mindeeResult.data,
          confidence_final: mindeeResult.confidence_score,
          status,
          merge_notes: mergeNotes,
          orchestrator_logs: orchestratorLogs,
          raw_responses: rawResponses,
          timing: { ms_openai, ms_mindee }
        };
      } catch (error) {
        console.error('[Orchestrator] Mindee failed, falling back to OpenAI:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        // Registrar fallo en circuit breaker
        await recordFailure('mindee', error as Error);
        
        addLog('EXECUTION', 'Mindee failed', 'Falling back to OpenAI', errorMsg);
        mergeNotes.push(`⚠️ Mindee falló: ${errorMsg}, intentando OpenAI como fallback`);
      }
    }
  }

  // OPCIÓN B: Usuario prefiere OpenAI o merged, O Mindee falló
  // Verificar circuit breaker para OpenAI
  const openaiAvailable = await isEngineAvailable('openai');
  
  if (!openaiAvailable) {
    addLog('ROUTING', 'OpenAI circuit breaker OPEN', 'Skipping OpenAI', 'Circuit breaker protection');
    mergeNotes.push('⚠️ OpenAI temporalmente no disponible (circuit breaker)');
    console.log('[Orchestrator] ⚠️ OpenAI circuit breaker is OPEN, skipping...');
  } else {
    addLog('ROUTING', 'Attempting OpenAI Vision', preferredEngine === 'openai' ? 'User preference' : 'Fallback from Mindee');
    console.log('[Orchestrator] Attempting OpenAI Vision...');
    
    try {
      markStart('openai_extraction');
      const startOpenAI = Date.now();
      openaiResult = await extractWithOpenAI(base64Content, mimeType);
      ms_openai = Date.now() - startOpenAI;
      markEnd('openai_extraction');
      
      rawResponses.openai = openaiResult;
      console.log(`[Orchestrator] OpenAI completed: ${openaiResult.confidence_score}% confidence in ${ms_openai}ms`);
      
      // Registrar éxito en circuit breaker
      await recordSuccess('openai');
      
      addLog('EXECUTION', 'OpenAI completed', `Confidence: ${openaiResult.confidence_score}%`, undefined, {
        duration_ms: ms_openai,
        confidence: openaiResult.confidence_score,
        engine: 'openai'
      });
    } catch (error) {
      console.error('[Orchestrator] OpenAI Vision failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Registrar fallo en circuit breaker
      await recordFailure('openai', error as Error);
      
      addLog('EXECUTION', 'OpenAI failed', 'ERROR', errorMsg);
      mergeNotes.push(`⚠️ OpenAI Vision falló: ${errorMsg}`);
    }
  }

  // Validar campos críticos
  const criticalFieldsOK = openaiResult && CRITICAL_FIELDS.every(field => {
    const value = getFieldValue(openaiResult!.data, field);
    return value !== null && value !== undefined && value !== '';
  });
  
  if (!criticalFieldsOK && openaiResult) {
    const missingFields = CRITICAL_FIELDS.filter(field => {
      const value = getFieldValue(openaiResult!.data, field);
      return !value || value === '' || value === null || value === undefined;
    });
    addLog('VALIDATION', 'Critical fields check', 'FAILED', `Missing: ${missingFields.join(', ')}`);
    console.log(`[Orchestrator] ⚠️ Critical fields missing: ${missingFields.join(', ')}`);
  } else if (openaiResult) {
    addLog('VALIDATION', 'Critical fields check', 'PASSED', 'All critical fields present');
  }

  // Decidir si usar OpenAI o hacer fallback a Mindee
  if (openaiResult && 
      openaiResult.confidence_score >= CONFIDENCE_THRESHOLD_FALLBACK && 
      criticalFieldsOK) {
    const status: InvoiceStatus = openaiResult.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
      ? 'processed_ok'
      : 'needs_review';
      
    addLog('DECISION', 'Using OpenAI result', status, `Confidence ${openaiResult.confidence_score}% + critical fields OK`, {
      confidence: openaiResult.confidence_score,
      critical_fields_ok: true,
      status,
      threshold_fallback: CONFIDENCE_THRESHOLD_FALLBACK,
      threshold_auto_post: CONFIDENCE_THRESHOLD_AUTO_POST
    });
    
    console.log(`[Orchestrator] ✅ Using OpenAI result (confidence: ${openaiResult.confidence_score}%, status: ${status})`);
    mergeNotes.push(`✅ OpenAI Vision usado (confidence ${openaiResult.confidence_score}%)`);
    mergeNotes.push(`📊 Estado final: ${status}`);
    
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

  // Fallback a Mindee
  console.log('[Orchestrator] OpenAI insufficient or not preferred, trying Mindee (fallback)...');
  mergeNotes.push(
    openaiResult 
      ? `⚠️ OpenAI confianza baja (${openaiResult.confidence_score}%) o campos críticos faltantes`
      : '⚠️ OpenAI no disponible'
  );

  if (!mindeeResult) {
    // Verificar circuit breaker para Mindee
    const mindeeAvailable = await isEngineAvailable('mindee');
    
    if (!mindeeAvailable) {
      addLog('ROUTING', 'Mindee circuit breaker OPEN', 'Cannot use as fallback', 'Circuit breaker protection');
      mergeNotes.push('⚠️ Mindee no disponible como fallback (circuit breaker)');
      console.log('[Orchestrator] ⚠️ Mindee circuit breaker is OPEN, cannot use as fallback');
    } else {
      addLog('ROUTING', 'Attempting Mindee as fallback', 'OpenAI insufficient');
      try {
        markStart('mindee_extraction');
        const startMindee = Date.now();
        mindeeResult = await extractWithMindee(fileBlob || base64Content);
        ms_mindee = Date.now() - startMindee;
        markEnd('mindee_extraction');
        
        rawResponses.mindee = mindeeResult;
        console.log(`[Orchestrator] Mindee completed: ${mindeeResult.confidence_score}% confidence in ${ms_mindee}ms`);
        
        // Registrar éxito en circuit breaker
        await recordSuccess('mindee');
        
        addLog('EXECUTION', 'Mindee completed', `Confidence: ${mindeeResult.confidence_score}%`, undefined, {
          duration_ms: ms_mindee,
          confidence: mindeeResult.confidence_score,
          engine: 'mindee'
        });
      } catch (error) {
        console.error('[Orchestrator] Mindee failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        // Registrar fallo en circuit breaker
        await recordFailure('mindee', error as Error);
        
        addLog('EXECUTION', 'Mindee failed', 'ERROR', errorMsg);
        mergeNotes.push(`⚠️ Mindee también falló: ${errorMsg}`);
      }
    }
  }

  // Fusión Inteligente (si tenemos ambos resultados)
  if (openaiResult && mindeeResult) {
    addLog('MERGE', 'Starting intelligent merge', 'Both engines available', undefined, {
      openai_confidence: openaiResult.confidence_score,
      mindee_confidence: mindeeResult.confidence_score
    });
    console.log('[Orchestrator] 🔀 Performing intelligent merge...');
    
    // Consultar historial del proveedor
    let supplierHistory = null;
    const supplierVat = mindeeResult.data.issuer.vat_id || openaiResult.data.issuer.vat_id;
    
    if (supplierVat) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: history } = await supabase
          .from('invoices_received')
          .select('ocr_engine, confidence_score')
          .eq('supplier_vat_id', supplierVat)
          .gte('confidence_score', 70)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (history && history.length > 0) {
          supplierHistory = history;
          const mindeeCount = history.filter(h => h.ocr_engine === 'mindee' || h.ocr_engine === 'merged').length;
          const mindeeWinRate = mindeeCount / history.length;
          
          addLog('MERGE', 'Supplier history check', `Mindee win rate: ${(mindeeWinRate * 100).toFixed(0)}%`,
            `Based on ${history.length} previous invoices`, {
              total_invoices: history.length,
              mindee_wins: mindeeCount,
              win_rate: mindeeWinRate
            });
          
          console.log(`[Orchestrator] 📊 Supplier history: ${history.length} invoices, Mindee rate: ${(mindeeWinRate * 100).toFixed(0)}%`);
          
          if (mindeeWinRate > 0.6) {
            mergeNotes.push(`🎯 Proveedor recurrente con historial favorable a Mindee (${(mindeeWinRate * 100).toFixed(0)}% en ${history.length} facturas)`);
          }
        }
      } catch (error) {
        console.error('[Orchestrator] Failed to fetch supplier history:', error);
        addLog('MERGE', 'Supplier history lookup failed', 'ERROR', error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    markStart('intelligent_merge');
    const merged = intelligentMerge(openaiResult, mindeeResult, mergeNotes, supplierHistory);
    const mergeDuration = markEnd('intelligent_merge');
    
    const status: InvoiceStatus = merged.confidence >= CONFIDENCE_THRESHOLD_AUTO_POST
      ? 'processed_ok'
      : merged.confidence >= CONFIDENCE_THRESHOLD_FALLBACK
        ? 'needs_review'
        : 'needs_review';
    
    addLog('MERGE', 'Merge completed', `Final confidence: ${merged.confidence}%`, `Status: ${status}`, {
      confidence: merged.confidence,
      status,
      duration_ms: mergeDuration,
      openai_weight: '40%',
      mindee_weight: '60%'
    });
    
    console.log(`[Orchestrator] 🔀 Merge completed: confidence ${merged.confidence}%, status: ${status}`);
    mergeNotes.push(`📊 Estado final: ${status} (confidence: ${merged.confidence}%)`);
    
    return {
      ocr_engine: 'merged',
      final_invoice_json: merged.data,
      confidence_final: merged.confidence,
      status,
      merge_notes: mergeNotes,
      orchestrator_logs: orchestratorLogs,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // Usar el mejor disponible
  if (mindeeResult && mindeeResult.confidence_score >= CONFIDENCE_THRESHOLD_FALLBACK) {
    const status: InvoiceStatus = mindeeResult.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
      ? 'processed_ok'
      : 'needs_review';
      
    addLog('DECISION', 'Using Mindee result', status, `Best available: confidence ${mindeeResult.confidence_score}%`, {
      confidence: mindeeResult.confidence_score,
      status
    });
    
    console.log(`[Orchestrator] ✅ Using Mindee result (confidence: ${mindeeResult.confidence_score}%, status: ${status})`);
    mergeNotes.push(`✅ Mindee usado (confidence ${mindeeResult.confidence_score}%)`);
    mergeNotes.push(`📊 Estado final: ${status}`);
    
    return {
      ocr_engine: 'mindee',
      final_invoice_json: mindeeResult.data,
      confidence_final: mindeeResult.confidence_score,
      status,
      merge_notes: mergeNotes,
      orchestrator_logs: orchestratorLogs,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  if (openaiResult && openaiResult.confidence_score >= 40) {
    addLog('DECISION', 'Using OpenAI result', 'needs_review', `Low confidence ${openaiResult.confidence_score}% but best available`, {
      confidence: openaiResult.confidence_score,
      status: 'needs_review'
    });
    
    console.log('[Orchestrator] ⚠️ Using OpenAI result (best available but low confidence)');
    mergeNotes.push(`⚠️ Usando OpenAI con confianza baja (${openaiResult.confidence_score}%)`);
    mergeNotes.push(`📊 Estado final: needs_review (confidence < ${CONFIDENCE_THRESHOLD_FALLBACK}%)`);
    
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

  // Todos los motores fallaron
  addLog('DECISION', 'All engines failed', 'manual_review', 'All OCR engines returned insufficient results', {
    confidence: 0,
    status: 'needs_review'
  });
  
  console.log('[Orchestrator] ❌ All OCR engines failed, flagging for manual review');
  mergeNotes.push('❌ Todos los motores OCR fallaron. Se requiere revisión manual.');
  mergeNotes.push('📊 Estado final: needs_review (confidence: 0%)');
  
  return {
    ocr_engine: 'manual_review',
    final_invoice_json: openaiResult?.data || mindeeResult?.data || createEmptyInvoiceData(),
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
