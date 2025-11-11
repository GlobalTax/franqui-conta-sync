// ============================================================================
// OCR ORCHESTRATOR - Multi-Engine with Intelligent Merge
// ============================================================================

import { extractWithOpenAI, type OpenAIExtractionResult } from "./extractors/openai-vision.ts";
import { extractWithMindee, type MindeeExtractionResult } from "./extractors/mindee.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// ============================================================================
// NIF VALIDATION (Spanish VAT validation)
// ============================================================================

function validateSpanishNIF(nif: string): boolean {
  if (!nif) return false;
  
  const normalized = nif.toUpperCase().trim().replace(/[\s\-\.]/g, '');
  
  // NIF/NIE format: 8 digits + letter
  if (/^[0-9]{8}[A-Z]$/.test(normalized)) {
    const digits = normalized.slice(0, 8);
    const letter = normalized.charAt(8);
    const expectedLetter = 'TRWAGMYFPDXBNJZSQVHLCKE'.charAt(parseInt(digits) % 23);
    return letter === expectedLetter;
  }
  
  // NIE format: X/Y/Z + 7 digits + letter
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(normalized)) {
    const niePrefix = { 'X': '0', 'Y': '1', 'Z': '2' };
    const prefix = niePrefix[normalized.charAt(0) as 'X' | 'Y' | 'Z'];
    const digits = prefix + normalized.slice(1, 8);
    const letter = normalized.charAt(8);
    const expectedLetter = 'TRWAGMYFPDXBNJZSQVHLCKE'.charAt(parseInt(digits) % 23);
    return letter === expectedLetter;
  }
  
  // CIF format: Letter + 7 digits + control character
  if (/^[A-W][0-9]{7}[0-9A-J]$/.test(normalized)) {
    const cifType = normalized.charAt(0);
    const digits = normalized.slice(1, 8);
    const control = normalized.charAt(8);
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(digits.charAt(i));
      if (i % 2 === 0) {
        const doubled = digit * 2;
        sum += Math.floor(doubled / 10) + (doubled % 10);
      } else {
        sum += digit;
      }
    }
    
    const unitDigit = sum % 10;
    const controlDigit = unitDigit === 0 ? 0 : 10 - unitDigit;
    const controlLetter = 'JABCDEFGHI'.charAt(controlDigit);
    
    // NPQ: solo letra, ABEH: solo número, resto: cualquiera
    const onlyLetter = ['N', 'P', 'Q', 'S', 'W'];
    const onlyNumber = ['A', 'B', 'E', 'H'];
    
    if (onlyLetter.includes(cifType)) return control === controlLetter;
    if (onlyNumber.includes(cifType)) return control === String(controlDigit);
    return control === controlLetter || control === String(controlDigit);
  }
  
  return false;
}

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

export type InvoiceStatus = "processed_ok" | "needs_review" | "posted";

export interface OrchestratorResult {
  ocr_engine: "openai" | "mindee" | "merged" | "manual_review";
  final_invoice_json: EnhancedInvoiceData;
  confidence_final: number;
  status: InvoiceStatus; // ⭐ Estado final del documento
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
  mimeType: string,
  centroCode: string,
  preferredEngine: 'openai' | 'mindee' | 'merged' = 'openai'
): Promise<OrchestratorResult> {
  
  const mergeNotes: string[] = [];
  const rawResponses: any = {};
  
  // ⭐ Tracking de tiempos por motor
  let ms_openai = 0;
  let ms_mindee = 0;

  console.log(`[Orchestrator] Starting OCR orchestration with preferred engine: ${preferredEngine}...`);

  // ========================================================================
  // PASO 1: Ejecutar motores según preferencia del usuario
  // ========================================================================
  
  let openaiResult: OpenAIExtractionResult | null = null;
  let mindeeResult: MindeeExtractionResult | null = null;

  // Si el usuario prefiere Mindee explícitamente, usamos solo Mindee
  if (preferredEngine === 'mindee') {
    console.log('[Orchestrator] Using Mindee as preferred engine...');
    
    try {
      const startMindee = Date.now();
      mindeeResult = await extractWithMindee(base64Content);
      ms_mindee = Date.now() - startMindee;
      
      rawResponses.mindee = mindeeResult;
      console.log(`[Orchestrator] Mindee completed: ${mindeeResult.confidence_score}% confidence in ${ms_mindee}ms`);
      
      // Si Mindee tuvo éxito y es el preferido, devolvemos directamente
      const status: InvoiceStatus = mindeeResult.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
        ? 'processed_ok'
        : 'needs_review';
        
      console.log(`[Orchestrator] ✅ Using Mindee result (confidence: ${mindeeResult.confidence_score}%, status: ${status})`);
      mergeNotes.push(`✅ Mindee usado (confidence ${mindeeResult.confidence_score}%)`);
      mergeNotes.push(`📊 Estado final: ${status}`);
      
      return {
        ocr_engine: 'mindee',
        final_invoice_json: mindeeResult.data,
        confidence_final: mindeeResult.confidence_score,
        status,
        merge_notes: mergeNotes,
        raw_responses: rawResponses,
        timing: { ms_openai, ms_mindee }
      };
    } catch (error) {
      console.error('[Orchestrator] Mindee failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      mergeNotes.push(`⚠️ Mindee falló: ${errorMsg}`);
    }
  }

  // Si el usuario prefiere OpenAI o merged, intentamos OpenAI
  if (preferredEngine === 'openai' || preferredEngine === 'merged') {
    console.log('[Orchestrator] Attempting OpenAI Vision...');
    
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
  }

  // ========================================================================
  // VALIDACIÓN DE CAMPOS CRÍTICOS
  // ========================================================================
  // Campos críticos: issuer.vat_id, invoice_number, totals.total
  const criticalFieldsOK = openaiResult && CRITICAL_FIELDS.every(field => {
    const value = getFieldValue(openaiResult!.data, field);
    return value !== null && value !== undefined && value !== '';
  });
  
  if (!criticalFieldsOK && openaiResult) {
    const missingFields = CRITICAL_FIELDS.filter(field => {
      const value = getFieldValue(openaiResult!.data, field);
      return !value || value === '' || value === null || value === undefined;
    });
    console.log(`[Orchestrator] ⚠️ Critical fields missing: ${missingFields.join(', ')}`);
  }

  // ========================================================================
  // PASO 2: Decidir si usar OpenAI o intentar con Mindee
  // ========================================================================
  
  // ========================================================================
  // DECISIÓN: ¿Usar OpenAI o hacer fallback a Mindee?
  // ========================================================================
  if (openaiResult && 
      openaiResult.confidence_score >= CONFIDENCE_THRESHOLD_FALLBACK && 
      criticalFieldsOK) {
    // OpenAI es suficientemente bueno (≥ 70 + campos críticos)
    const status: InvoiceStatus = openaiResult.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
      ? 'processed_ok'    // ≥ 85 → elegible para auto-post
      : 'needs_review';   // 70-84 → requiere revisión
      
    console.log(`[Orchestrator] ✅ Using OpenAI result (confidence: ${openaiResult.confidence_score}%, status: ${status})`);
    mergeNotes.push(`✅ OpenAI Vision usado (confidence ${openaiResult.confidence_score}%)`);
    mergeNotes.push(`📊 Estado final: ${status}`);
    
    return {
      ocr_engine: 'openai',
      final_invoice_json: openaiResult.data,
      confidence_final: openaiResult.confidence_score,
      status,
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // ========================================================================
  // PASO 3: Fallback a Mindee
  // ========================================================================
  
  console.log('[Orchestrator] OpenAI insufficient or not preferred, trying Mindee (fallback)...');
  mergeNotes.push(
    openaiResult 
      ? `⚠️ OpenAI confianza baja (${openaiResult.confidence_score}%) o campos críticos faltantes`
      : '⚠️ OpenAI no disponible'
  );

  // Solo ejecutar Mindee si aún no se ha ejecutado (por preferredEngine)
  if (!mindeeResult) {
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
  }

  // ========================================================================
  // PASO 4: Fusión Inteligente (si tenemos ambos resultados)
  // ========================================================================
  
  if (openaiResult && mindeeResult) {
    console.log('[Orchestrator] 🔀 Performing intelligent merge...');
    
    // ⭐ Consultar historial del proveedor para priorización inteligente
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
          console.log(`[Orchestrator] 📊 Supplier history: ${history.length} invoices, Mindee rate: ${(mindeeWinRate * 100).toFixed(0)}%`);
          
          if (mindeeWinRate > 0.6) {
            mergeNotes.push(`🎯 Proveedor recurrente con historial favorable a Mindee (${(mindeeWinRate * 100).toFixed(0)}% en ${history.length} facturas)`);
          }
        }
      } catch (error) {
        console.error('[Orchestrator] Failed to fetch supplier history:', error);
      }
    }
    
    const merged = intelligentMerge(openaiResult, mindeeResult, mergeNotes, supplierHistory);
    
    // ⭐ Determinar estado basado en confidence final del merge
    const status: InvoiceStatus = merged.confidence >= CONFIDENCE_THRESHOLD_AUTO_POST
      ? 'processed_ok'    // ≥ 85 → elegible para auto-post
      : merged.confidence >= CONFIDENCE_THRESHOLD_FALLBACK
        ? 'needs_review'  // 70-84 → requiere revisión
        : 'needs_review'; // < 70 → requiere revisión
    
    console.log(`[Orchestrator] 🔀 Merge completed: confidence ${merged.confidence}%, status: ${status}`);
    mergeNotes.push(`📊 Estado final: ${status} (confidence: ${merged.confidence}%)`);
    
    return {
      ocr_engine: 'merged',
      final_invoice_json: merged.data,
      confidence_final: merged.confidence,
      status,
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // ========================================================================
  // PASO 5: Usar el mejor disponible o marcar para revisión manual
  // ========================================================================
  
  // ========================================================================
  // PASO 5: Determinar el mejor resultado disponible
  // ========================================================================
  
  if (mindeeResult && mindeeResult.confidence_score >= CONFIDENCE_THRESHOLD_FALLBACK) {
    const status: InvoiceStatus = mindeeResult.confidence_score >= CONFIDENCE_THRESHOLD_AUTO_POST
      ? 'processed_ok'
      : 'needs_review';
      
    console.log(`[Orchestrator] ✅ Using Mindee result (confidence: ${mindeeResult.confidence_score}%, status: ${status})`);
    mergeNotes.push(`✅ Mindee usado (confidence ${mindeeResult.confidence_score}%)`);
    mergeNotes.push(`📊 Estado final: ${status}`);
    
    return {
      ocr_engine: 'mindee',
      final_invoice_json: mindeeResult.data,
      confidence_final: mindeeResult.confidence_score,
      status,
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  if (openaiResult && openaiResult.confidence_score >= 40) {
    console.log('[Orchestrator] ⚠️ Using OpenAI result (best available but low confidence)');
    mergeNotes.push(`⚠️ Usando OpenAI con confianza baja (${openaiResult.confidence_score}%)`);
    mergeNotes.push(`📊 Estado final: needs_review (confidence < ${CONFIDENCE_THRESHOLD_FALLBACK}%)`);
    
    return {
      ocr_engine: 'openai',
      final_invoice_json: openaiResult.data,
      confidence_final: openaiResult.confidence_score,
      status: 'needs_review',
      merge_notes: mergeNotes,
      raw_responses: rawResponses,
      timing: { ms_openai, ms_mindee }
    };
  }

  // ========================================================================
  // PASO 6: Todos los motores fallaron → manual_review
  // ========================================================================
  
  // ========================================================================
  // PASO 6: Todos los motores fallaron → needs_review
  // ========================================================================
  
  console.log('[Orchestrator] ❌ All OCR engines failed, flagging for manual review');
  mergeNotes.push('❌ Todos los motores OCR fallaron. Se requiere revisión manual.');
  mergeNotes.push('📊 Estado final: needs_review (confidence: 0%)');
  
  return {
    ocr_engine: 'manual_review',
    final_invoice_json: openaiResult?.data || mindeeResult?.data || createEmptyInvoiceData(),
    confidence_final: 0,
    status: 'needs_review',
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
  mergeNotes: string[],
  supplierHistory: Array<{ ocr_engine: string; confidence_score: number }> | null = null
): { data: EnhancedInvoiceData; confidence: number } {
  
  console.log('[Merge] Starting intelligent merge...');
  
  // ⭐ Calcular peso de priorización basado en historial
  const mindeeHistoryScore = supplierHistory 
    ? supplierHistory.filter(h => h.ocr_engine === 'mindee' || h.ocr_engine === 'merged').length / supplierHistory.length
    : 0.5; // Neutro si no hay historial
  
  const prioritizeMindee = mindeeHistoryScore > 0.6;
  
  if (prioritizeMindee) {
    console.log(`[Merge] 🎯 Prioritizing Mindee based on supplier history (${(mindeeHistoryScore * 100).toFixed(0)}% success rate)`);
  }
  
  const merged: EnhancedInvoiceData = JSON.parse(JSON.stringify(openaiResult.data));
  
  // Estrategia: Completar campos nulos con datos de Mindee
  // y resolver conflictos priorizando mayor confidence por campo
  
  // 1. Completar issuer.vat_id si está null (con validación)
  if (!merged.issuer.vat_id && mindeeResult.data.issuer.vat_id) {
    const mindeeVat = mindeeResult.data.issuer.vat_id;
    
    if (validateSpanishNIF(mindeeVat)) {
      merged.issuer.vat_id = mindeeVat;
      mergeNotes.push('🔀 NIF emisor validado y completado desde Mindee ✓');
    } else {
      mergeNotes.push('⚠️ NIF de Mindee inválido, descartado');
      console.warn(`[Merge] Invalid NIF from Mindee: ${mindeeVat}`);
    }
  } else if (merged.issuer.vat_id && mindeeResult.data.issuer.vat_id && 
             merged.issuer.vat_id !== mindeeResult.data.issuer.vat_id) {
    // Conflicto: ambos tienen NIF diferentes
    const openaiValid = validateSpanishNIF(merged.issuer.vat_id);
    const mindeeValid = validateSpanishNIF(mindeeResult.data.issuer.vat_id);
    
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
  
  // 5. Resolver conflicto de totales (priorizar el que cuadra mejor + historial)
  if (Math.abs(merged.totals.total - mindeeResult.data.totals.total) > 0.01) {
    // Calcular qué total cuadra mejor con las líneas
    const openaiLinesTotal = openaiResult.data.lines.reduce((sum, l) => sum + l.amount, 0);
    const mindeeLinesTotal = mindeeResult.data.lines.reduce((sum, l) => sum + l.amount, 0);
    
    const openaiDiff = Math.abs(openaiLinesTotal - openaiResult.data.totals.total);
    const mindeeDiff = Math.abs(mindeeLinesTotal - mindeeResult.data.totals.total);
    
    // ⭐ Considerar historial si los diffs son similares (±20%)
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
  
  // Calcular confidence final (promedio ponderado con ajuste por historial)
  let finalConfidence = Math.round(
    (openaiResult.confidence_score * 0.6) + (mindeeResult.confidence_score * 0.4)
  );
  
  // ⭐ Boost de confianza si el historial favorece al motor usado
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
