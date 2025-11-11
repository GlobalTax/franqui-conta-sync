// ============================================================================
// FISCAL NORMALIZER ES - Spanish fiscal validation and normalization
// ============================================================================

import type { EnhancedInvoiceData } from "../ocr/types.ts";

export interface NormalizedResponse {
  normalized: EnhancedInvoiceData;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  autofix_applied: string[];
}

// ============================================================================
// VALIDACIÓN NIF/CIF ESPAÑOL
// ============================================================================

export function validateSpanishVAT(vat: string | null): boolean {
  if (!vat) return false;
  
  const cleanVAT = vat.toUpperCase().replace(/[\s\-\.]/g, '');
  if (cleanVAT.length !== 9) return false;
  
  const firstChar = cleanVAT[0];
  
  // NIF/NIE validation
  if (/^[XYZ0-9]/.test(firstChar)) {
    const nieMap: { [key: string]: string } = { X: '0', Y: '1', Z: '2' };
    const numPart = nieMap[firstChar] 
      ? nieMap[firstChar] + cleanVAT.slice(1, 8) 
      : cleanVAT.slice(0, 8);
    
    if (!/^\d{8}$/.test(numPart)) return false;
    
    const letter = 'TRWAGMYFPDXBNJZSQVHLCKE'[parseInt(numPart) % 23];
    return letter === cleanVAT[8];
  }
  
  // CIF validation
  if (/^[ABCDEFGHJNPQRSUVW]/.test(firstChar)) {
    const numPart = cleanVAT.slice(1, 8);
    const controlChar = cleanVAT[8];
    
    if (!/^\d{7}$/.test(numPart)) return false;
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(numPart[i]);
      if (i % 2 === 0) {
        const doubled = digit * 2;
        sum += Math.floor(doubled / 10) + (doubled % 10);
      } else {
        sum += digit;
      }
    }
    
    const unitDigit = sum % 10;
    const controlDigit = unitDigit === 0 ? 0 : 10 - unitDigit;
    const controlLetter = 'JABCDEFGHI'[controlDigit];
    
    return controlChar === String(controlDigit) || controlChar === controlLetter;
  }
  
  return false;
}

// ============================================================================
// NORMALIZADOR FISCAL
// ============================================================================

export function fiscalNormalizerES(
  extractedData: EnhancedInvoiceData,
  rawText: string,
  companyVATIds: string[]
): NormalizedResponse {
  
  const normalized = JSON.parse(JSON.stringify(extractedData));
  const autofixApplied: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Migrar IVA de other_taxes a campos específicos
  const remainingOtherTaxes: typeof normalized.totals.other_taxes = [];
  
  for (const tax of normalized.totals.other_taxes) {
    if (tax.type.includes('21%') || tax.type.includes('21')) {
      if (normalized.totals.base_21 === null) {
        normalized.totals.base_21 = tax.base;
        normalized.totals.vat_21 = tax.quota;
        autofixApplied.push(`migrar-iva-21-from-other: base ${tax.base}€, cuota ${tax.quota}€`);
      }
    } else if (tax.type.includes('10%') || tax.type.includes('10')) {
      if (normalized.totals.base_10 === null) {
        normalized.totals.base_10 = tax.base;
        normalized.totals.vat_10 = tax.quota;
        autofixApplied.push(`migrar-iva-10-from-other: base ${tax.base}€, cuota ${tax.quota}€`);
      }
    } else {
      remainingOtherTaxes.push(tax);
    }
  }
  
  normalized.totals.other_taxes = remainingOtherTaxes;

  // Validar y corregir cálculos de IVA
  if (normalized.totals.base_21 !== null && normalized.totals.vat_21 !== null) {
    const expectedVAT21 = Math.round(normalized.totals.base_21 * 0.21 * 100) / 100;
    const diff = Math.abs(expectedVAT21 - normalized.totals.vat_21);
    
    if (diff > 0.01 && diff < 1.0) {
      normalized.totals.vat_21 = expectedVAT21;
      autofixApplied.push(`ajustar-redondeo-iva-21: ${normalized.totals.vat_21}€ → ${expectedVAT21}€`);
    }
  }

  if (normalized.totals.base_10 !== null && normalized.totals.vat_10 !== null) {
    const expectedVAT10 = Math.round(normalized.totals.base_10 * 0.10 * 100) / 100;
    const diff = Math.abs(expectedVAT10 - normalized.totals.vat_10);
    
    if (diff > 0.01 && diff < 1.0) {
      normalized.totals.vat_10 = expectedVAT10;
      autofixApplied.push(`ajustar-redondeo-iva-10: ${normalized.totals.vat_10}€ → ${expectedVAT10}€`);
    }
  }

  // Validar totales
  const sumComponents = 
    (normalized.totals.base_10 || 0) + 
    (normalized.totals.vat_10 || 0) + 
    (normalized.totals.base_21 || 0) + 
    (normalized.totals.vat_21 || 0);
  
  const totalDiff = Math.abs(sumComponents - normalized.totals.total);
  
  if (totalDiff > 0.01 && totalDiff < 1.0) {
    normalized.totals.total = Math.round(sumComponents * 100) / 100;
    autofixApplied.push(`ajustar-total: ${normalized.totals.total}€ → ${sumComponents.toFixed(2)}€`);
  } else if (totalDiff >= 1.0) {
    errors.push(`Total no cuadra: diferencia de ${totalDiff.toFixed(2)}€`);
  }

  // Validar NIF/CIF
  if (normalized.issuer.vat_id) {
    const isValid = validateSpanishVAT(normalized.issuer.vat_id);
    if (!isValid) {
      warnings.push(`NIF/CIF emisor inválido: ${normalized.issuer.vat_id}`);
    }
  } else {
    errors.push('NIF/CIF del emisor obligatorio');
  }

  // Inferir receiver si falta
  if (!normalized.receiver.vat_id) {
    for (const companyVAT of companyVATIds) {
      if (rawText.toUpperCase().includes(companyVAT.toUpperCase())) {
        normalized.receiver.vat_id = companyVAT;
        normalized.receiver.name = "Nuestra empresa";
        autofixApplied.push(`inferir-receiver: detectado NIF ${companyVAT} en texto`);
        break;
      }
    }
  }

  // Ajustar cantidades negativas para credit_note
  if (normalized.document_type === 'credit_note' && normalized.totals.total > 0) {
    normalized.totals.total = -normalized.totals.total;
    normalized.totals.base_10 = normalized.totals.base_10 ? -normalized.totals.base_10 : null;
    normalized.totals.vat_10 = normalized.totals.vat_10 ? -normalized.totals.vat_10 : null;
    normalized.totals.base_21 = normalized.totals.base_21 ? -normalized.totals.base_21 : null;
    normalized.totals.vat_21 = normalized.totals.vat_21 ? -normalized.totals.vat_21 : null;
    
    normalized.lines = normalized.lines.map((line: any) => ({
      ...line,
      amount: -Math.abs(line.amount)
    }));
    
    autofixApplied.push('invertir-signos-abono: cantidades convertidas a negativas');
  }

  // Calculate confidence
  const confidenceResult = calculateEnhancedConfidence(normalized);
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

function calculateEnhancedConfidence(data: EnhancedInvoiceData): { score: number; notes: string[] } {
  let score = 100;
  const notes: string[] = [];

  const calculatedTotal = 
    (data.totals.base_10 || 0) + 
    (data.totals.vat_10 || 0) + 
    (data.totals.base_21 || 0) + 
    (data.totals.vat_21 || 0);
  
  if (Math.abs(calculatedTotal - data.totals.total) > 0.01) {
    score -= 25;
    notes.push('Totales no cuadran (descuento -25)');
  }

  if (!validateSpanishVAT(data.issuer.vat_id)) {
    score -= 20;
    notes.push('NIF/CIF emisor inválido (descuento -20)');
  }

  if (!data.issue_date || !data.issue_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    score -= 15;
    notes.push('Fecha no fiable (descuento -15)');
  }

  if (data.lines.length === 0) {
    score -= 10;
    notes.push('Sin líneas de factura (descuento -10)');
  }

  if (!data.invoice_number || data.invoice_number.trim() === '') {
    score -= 5;
    notes.push('Número de factura vacío (descuento -5)');
  }

  return { score: Math.max(0, score), notes };
}
