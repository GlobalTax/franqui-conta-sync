// ============================================================================
// NORMALIZE LITE - Versión ligera para validación rápida en UI
// Basado en la función normalizeES del usuario, mejorada con core library
// ============================================================================

import {
  validateSpanishVAT,
  validateTotals,
  round2,
  FISCAL_RULES
} from '../core';
import type { NormalizeLiteResult } from '../types';

/**
 * Normalización LITE - Rápida para feedback en UI
 * - Redondeo a 2 decimales
 * - Validación básica de NIF
 * - Validación de totales
 * - SIN autofixes complejos (mantiene velocidad)
 */
export function normalizeLite(json: any): NormalizeLiteResult {
  const out = structuredClone(json || {});
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // ========================================================================
  // 1. MONEDA Y REDONDEO
  // ========================================================================
  
  out.totals = out.totals || { currency: FISCAL_RULES.DEFAULT_CURRENCY };
  out.totals.currency = out.totals.currency || FISCAL_RULES.DEFAULT_CURRENCY;
  
  // Redondear importes
  ['base_10', 'vat_10', 'base_21', 'vat_21', 'total'].forEach(k => {
    if (out.totals[k] != null) {
      out.totals[k] = round2(Number(out.totals[k]));
    }
  });
  
  // ========================================================================
  // 2. NIF/CIF
  // ========================================================================
  
  out.issuer = out.issuer || {};
  
  if (out.issuer.vat_id) {
    const vatResult = validateSpanishVAT(out.issuer.vat_id);
    out.issuer.vat_id = vatResult.normalized;
    
    if (!vatResult.valid) {
      warnings.push(`NIF/CIF ${vatResult.normalized} potencialmente inválido`);
    }
  } else {
    errors.push('NIF/CIF del emisor obligatorio');
  }
  
  // ========================================================================
  // 3. VALIDAR TOTALES
  // ========================================================================
  
  if (out.totals.total != null) {
    const totalsCheck = validateTotals({
      base_10: out.totals.base_10,
      vat_10: out.totals.vat_10,
      base_21: out.totals.base_21,
      vat_21: out.totals.vat_21,
      total: out.totals.total,
      other_taxes: out.totals.other_taxes,
      tolerance: FISCAL_RULES.TOLERANCE.TOTALS
    });
    
    if (!totalsCheck.valid) {
      errors.push(totalsCheck.error!);
    }
  }
  
  // ========================================================================
  // RETORNAR
  // ========================================================================
  
  return {
    normalized: out,
    validation: {
      ok: errors.length === 0,
      errors,
      warnings
    }
  };
}
