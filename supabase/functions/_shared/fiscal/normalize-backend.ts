// ============================================================================
// NORMALIZE BACKEND - Versión backend con autofixes y confidence
// Usa core library compartida con frontend
// ============================================================================

// @ts-ignore - Deno import maps
import {
  validateSpanishVAT,
  validateTotals,
  calculateExpectedVAT,
  autofixVATRounding,
  normalizeCreditNoteAmounts,
  FISCAL_RULES
} from '../../../../src/lib/fiscal/core/index.ts';

import type { EnhancedInvoiceData } from '../ocr/types.ts';

export interface NormalizeBackendResult {
  normalized: EnhancedInvoiceData;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  autofix_applied: string[];
}

/**
 * Normalización BACKEND con autofixes agresivos
 * - Migración de IVA desde other_taxes
 * - Autocorrección de redondeos
 * - Inferencia de receiver
 * - Ajuste de signos en credit_note
 * - Cálculo de confidence score
 */
export function normalizeBackend(
  extractedData: EnhancedInvoiceData,
  rawText: string,
  companyVATIds: string[]
): NormalizeBackendResult {
  
  const normalized = structuredClone(extractedData);
  const autofixApplied: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // ========================================================================
  // 1. MIGRAR IVA DE OTHER_TAXES
  // ========================================================================
  
  const remainingOtherTaxes: typeof normalized.totals.other_taxes = [];
  
  for (const tax of normalized.totals.other_taxes) {
    if (tax.type.includes('21%') || tax.type.includes('21')) {
      if (normalized.totals.base_21 === null) {
        normalized.totals.base_21 = tax.base;
        normalized.totals.vat_21 = tax.quota;
        autofixApplied.push(`migrar-iva-21: base ${tax.base}€, cuota ${tax.quota}€`);
      }
    } else if (tax.type.includes('10%') || tax.type.includes('10')) {
      if (normalized.totals.base_10 === null) {
        normalized.totals.base_10 = tax.base;
        normalized.totals.vat_10 = tax.quota;
        autofixApplied.push(`migrar-iva-10: base ${tax.base}€, cuota ${tax.quota}€`);
      }
    } else {
      remainingOtherTaxes.push(tax);
    }
  }
  
  normalized.totals.other_taxes = remainingOtherTaxes;
  
  // ========================================================================
  // 2. AUTOCORREGIR REDONDEOS DE IVA
  // ========================================================================
  
  if (normalized.totals.base_21 !== null && normalized.totals.vat_21 !== null) {
    const fix = autofixVATRounding(
      normalized.totals.base_21,
      normalized.totals.vat_21,
      FISCAL_RULES.VAT_RATES.STANDARD
    );
    
    if (fix.fixed) {
      normalized.totals.vat_21 = fix.correctedVAT;
      autofixApplied.push(
        `ajustar-redondeo-iva-21: ${fix.originalVAT}€ → ${fix.correctedVAT}€`
      );
    }
  }
  
  if (normalized.totals.base_10 !== null && normalized.totals.vat_10 !== null) {
    const fix = autofixVATRounding(
      normalized.totals.base_10,
      normalized.totals.vat_10,
      FISCAL_RULES.VAT_RATES.REDUCED
    );
    
    if (fix.fixed) {
      normalized.totals.vat_10 = fix.correctedVAT;
      autofixApplied.push(
        `ajustar-redondeo-iva-10: ${fix.originalVAT}€ → ${fix.correctedVAT}€`
      );
    }
  }
  
  // ========================================================================
  // 3. VALIDAR TOTALES
  // ========================================================================
  
  const totalsCheck = validateTotals({
    base_10: normalized.totals.base_10,
    vat_10: normalized.totals.vat_10,
    base_21: normalized.totals.base_21,
    vat_21: normalized.totals.vat_21,
    total: normalized.totals.total,
    other_taxes: normalized.totals.other_taxes,
    tolerance: FISCAL_RULES.TOLERANCE.TOTALS
  });
  
  if (totalsCheck.difference > FISCAL_RULES.TOLERANCE.TOTALS && totalsCheck.difference < 1.0) {
    // Autofix: ajustar total
    const oldTotal = normalized.totals.total;
    normalized.totals.total = totalsCheck.calculated;
    autofixApplied.push(
      `ajustar-total: ${oldTotal.toFixed(2)}€ → ${totalsCheck.calculated.toFixed(2)}€`
    );
  } else if (!totalsCheck.valid) {
    errors.push(totalsCheck.error!);
  }
  
  // ========================================================================
  // 4. VALIDAR NIF/CIF
  // ========================================================================
  
  if (normalized.issuer.vat_id) {
    const vatResult = validateSpanishVAT(normalized.issuer.vat_id);
    normalized.issuer.vat_id = vatResult.normalized!;
    
    if (!vatResult.valid) {
      warnings.push(`NIF/CIF emisor inválido: ${vatResult.normalized}`);
    }
  } else {
    errors.push('NIF/CIF emisor obligatorio');
  }
  
  // ========================================================================
  // 5. INFERIR RECEIVER
  // ========================================================================
  
  if (!normalized.receiver.vat_id) {
    for (const companyVAT of companyVATIds) {
      if (rawText.toUpperCase().includes(companyVAT.toUpperCase())) {
        normalized.receiver.vat_id = companyVAT;
        normalized.receiver.name = "Nuestra empresa";
        autofixApplied.push(`inferir-receiver: detectado NIF ${companyVAT}`);
        break;
      }
    }
  }
  
  // ========================================================================
  // 6. AJUSTAR CREDIT_NOTE
  // ========================================================================
  
  if (normalized.document_type === 'credit_note' && normalized.totals.total > 0) {
    const invertedTotals = normalizeCreditNoteAmounts(normalized.totals);
    normalized.totals = invertedTotals;
    
    normalized.lines = normalized.lines.map((line: any) => ({
      ...line,
      amount: -Math.abs(line.amount)
    }));
    
    autofixApplied.push('invertir-signos-abono: convertido a negativo');
  }
  
  // ========================================================================
  // 7. CALCULAR CONFIDENCE
  // ========================================================================
  
  const confidenceResult = calculateConfidence(normalized);
  normalized.confidence_score = confidenceResult.score;
  normalized.confidence_notes = confidenceResult.notes;
  
  return {
    normalized,
    validation: {
      ok: errors.length === 0,
      errors,
      warnings
    },
    autofix_applied: autofixApplied
  };
}

function calculateConfidence(data: EnhancedInvoiceData): { score: number; notes: string[] } {
  let score = 100;
  const notes: string[] = [];
  
  const totalsCheck = validateTotals({
    base_10: data.totals.base_10,
    vat_10: data.totals.vat_10,
    base_21: data.totals.base_21,
    vat_21: data.totals.vat_21,
    total: data.totals.total,
    other_taxes: data.totals.other_taxes
  });
  
  if (!totalsCheck.valid) {
    score -= 25;
    notes.push('Totales no cuadran (-25)');
  }
  
  const vatResult = validateSpanishVAT(data.issuer.vat_id);
  if (!vatResult.valid) {
    score -= 20;
    notes.push('NIF/CIF inválido (-20)');
  }
  
  if (!data.issue_date || !data.issue_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    score -= 15;
    notes.push('Fecha no fiable (-15)');
  }
  
  if (data.lines.length === 0) {
    score -= 10;
    notes.push('Sin líneas (-10)');
  }
  
  if (!data.invoice_number || data.invoice_number.trim() === '') {
    score -= 5;
    notes.push('Número vacío (-5)');
  }
  
  return { score: Math.max(0, score), notes };
}
