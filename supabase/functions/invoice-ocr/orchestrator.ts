// ============================================================================
// OCR ORCHESTRATOR - Multi-Engine with Intelligent Merge
// ============================================================================

import { extractWithOpenAI, type OpenAIExtractionResult } from "./extractors/openai-vision.ts";
import { extractWithMindee, type MindeeExtractionResult } from "./extractors/mindee.ts";

interface EnhancedInvoiceData {
  document_type: "invoice" | "credit_note" | "ticket";
  issuer: {
    name: string;
    vat_id: string | null;
  };
  receiver: {
    name: string | null;
    vat_id: string | null;
    address: string | null;
  };
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  totals: {
    currency: string;
    base_10: number | null;
    vat_10: number | null;
    base_21: number | null;
    vat_21: number | null;
    other_taxes: Array<{
      type: string;
      base: number;
      quota: number;
    }>;
    total: number;
  };
  lines: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    amount: number;
  }>;
  centre_hint: string | null;
  payment_method: "transfer" | "card" | "cash" | null;
  confidence_notes: string[];
  confidence_score: number;
  discrepancies: string[];
  proposed_fix: {
    what: string;
    why: string;
  } | null;
}

export interface OrchestratorResult {
  ocr_engine: "openai" | "mindee" | "merged" | "manual_review";
  final_invoice_json: EnhancedInvoiceData;
  confidence_final: number;
  merge_notes: string[];
  raw_responses: {
    openai?: OpenAIExtractionResult;
    mindee?: MindeeExtractionResult;
  };
  timing: {
    ms_openai: number;
    ms_mindee: number;
  };
}

const CONFIDENCE_THRESHOLD = 70;
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
  mimeType: string,
  centroCode: string
): Promise<OrchestratorResult> {
  
  const mergeNotes: string[] = [];
  const rawResponses: any = {};
  
  // ⭐ Tracking de tiempos por motor
  let ms_openai = 0;
  let ms_mindee = 0;

  console.log('[Orchestrator] Starting OCR orchestration...');

  // ========================================================================
  // PASO 1: Intentar con OpenAI Vision (motor primario)
  // ========================================================================
  
  console.log('[Orchestrator] Attempting OpenAI Vision (primary engine)...');
  
  let openaiResult: OpenAIExtractionResult | null = null;
  try {
    const startOpenAI = Date.now();
    openaiResult = await extractWithOpenAI(base64Content, mimeType);
    ms_openai = Date.now() - startOpenAI;
    
    rawResponses.openai = openaiResult;
    console.log(`[Orchestrator] OpenAI completed: ${openaiResult.confidence_score}% confidence in ${ms_openai}ms`);
  } catch (error) {
    console.error('[Orchestrator] OpenAI Vision failed:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    mergeNotes.push(`⚠️ OpenAI Vision falló: ${errorMsg}`);
  }

  // Validar campos críticos de OpenAI
  const criticalFieldsOK = openaiResult && CRITICAL_FIELDS.every(field => {
    const value = getFieldValue(openaiResult!.data, field);
    return value !== null && value !== undefined && value !== '';
  });

  // ========================================================================
  // PASO 2: Decidir si usar OpenAI o intentar con Mindee
  // ========================================================================
  
  if (openaiResult && 
      openaiResult.confidence_score >= CONFIDENCE_THRESHOLD && 
      criticalFieldsOK) {
    // OpenAI es suficientemente bueno
    console.log('[Orchestrator] ✅ Using OpenAI result (high confidence + all critical fields)');
    mergeNotes.push(`✅ OpenAI Vision usado (confidence ${openaiResult.confidence_score}%)`);
    
    return {
      ocr_engine: 'openai',
      final_invoice_json: openaiResult.data,
      confidence_final: openaiResult.confidence_score,
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // ========================================================================
  // PASO 3: Fallback a Mindee
  // ========================================================================
  
  console.log('[Orchestrator] OpenAI insufficient, trying Mindee (fallback)...');
  mergeNotes.push(
    openaiResult 
      ? `⚠️ OpenAI confianza baja (${openaiResult.confidence_score}%) o campos críticos faltantes`
      : '⚠️ OpenAI no disponible'
  );

  let mindeeResult: MindeeExtractionResult | null = null;
  try {
    const startMindee = Date.now();
    mindeeResult = await extractWithMindee(base64Content);
    ms_mindee = Date.now() - startMindee;
    
    rawResponses.mindee = mindeeResult;
    console.log(`[Orchestrator] Mindee completed: ${mindeeResult.confidence_score}% confidence in ${ms_mindee}ms`);
  } catch (error) {
    console.error('[Orchestrator] Mindee failed:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    mergeNotes.push(`⚠️ Mindee también falló: ${errorMsg}`);
  }

  // ========================================================================
  // PASO 4: Fusión Inteligente (si tenemos ambos resultados)
  // ========================================================================
  
  if (openaiResult && mindeeResult) {
    console.log('[Orchestrator] 🔀 Performing intelligent merge...');
    
    const merged = intelligentMerge(openaiResult, mindeeResult, mergeNotes);
    
    return {
      ocr_engine: 'merged',
      final_invoice_json: merged.data,
      confidence_final: merged.confidence,
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // ========================================================================
  // PASO 5: Usar el mejor disponible o marcar para revisión manual
  // ========================================================================
  
  if (mindeeResult && mindeeResult.confidence_score >= 50) {
    console.log('[Orchestrator] ✅ Using Mindee result');
    mergeNotes.push(`✅ Mindee usado (confidence ${mindeeResult.confidence_score}%)`);
    return {
      ocr_engine: 'mindee',
      final_invoice_json: mindeeResult.data,
      confidence_final: mindeeResult.confidence_score,
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  if (openaiResult && openaiResult.confidence_score >= 40) {
    console.log('[Orchestrator] ⚠️ Using OpenAI result (best available)');
    mergeNotes.push(`⚠️ Usando OpenAI con confianza baja (${openaiResult.confidence_score}%)`);
    return {
      ocr_engine: 'openai',
      final_invoice_json: openaiResult.data,
      confidence_final: openaiResult.confidence_score,
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // ========================================================================
  // PASO 6: Todos los motores fallaron → manual_review
  // ========================================================================
  
  console.log('[Orchestrator] ❌ All OCR engines failed, flagging for manual review');
  mergeNotes.push('❌ Todos los motores OCR fallaron. Se requiere revisión manual.');
  
  return {
    ocr_engine: 'manual_review',
    final_invoice_json: openaiResult?.data || mindeeResult?.data || createEmptyInvoiceData(),
    confidence_final: 0,
    merge_notes: mergeNotes,
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
  mergeNotes: string[]
): { data: EnhancedInvoiceData; confidence: number } {
  
  console.log('[Merge] Starting intelligent merge...');
  const merged: EnhancedInvoiceData = JSON.parse(JSON.stringify(openaiResult.data));
  
  // Estrategia: Completar campos nulos con datos de Mindee
  // y resolver conflictos priorizando mayor confidence por campo
  
  // 1. Completar issuer.vat_id si está null
  if (!merged.issuer.vat_id && mindeeResult.data.issuer.vat_id) {
    merged.issuer.vat_id = mindeeResult.data.issuer.vat_id;
    mergeNotes.push('🔀 NIF emisor completado desde Mindee');
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
  
  // 5. Resolver conflicto de totales (priorizar el que cuadra mejor)
  if (Math.abs(merged.totals.total - mindeeResult.data.totals.total) > 0.01) {
    // Calcular qué total cuadra mejor con las líneas
    const openaiLinesTotal = openaiResult.data.lines.reduce((sum, l) => sum + l.amount, 0);
    const mindeeLinesTotal = mindeeResult.data.lines.reduce((sum, l) => sum + l.amount, 0);
    
    const openaiDiff = Math.abs(openaiLinesTotal - openaiResult.data.totals.total);
    const mindeeDiff = Math.abs(mindeeLinesTotal - mindeeResult.data.totals.total);
    
    if (mindeeDiff < openaiDiff) {
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
  
  // 7. Completar VAT breakdown si Mindee tiene más detalle
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
  
  // Calcular confidence final (promedio ponderado)
  const finalConfidence = Math.round(
    (openaiResult.confidence_score * 0.6) + (mindeeResult.confidence_score * 0.4)
  );
  
  console.log(`[Merge] ✅ Merge completed: final confidence ${finalConfidence}%`);
  mergeNotes.push(`🔀 Fusión completada: confidence final ${finalConfidence}%`);
  
  return {
    data: merged,
    confidence: finalConfidence
  };
}
