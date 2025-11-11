// ============================================================================
// NORMALIZE FULL - Versión completa con autofixes para UI avanzada
// Refactor de stripAndNormalize usando core library
// ============================================================================

import {
  validateSpanishVAT,
  validateDateRange,
  validateDueDateLogic,
  validateLineAmount,
  normalizeInvoiceNumber,
  normalizeLegalName,
  extractCentreCode,
  round2,
  FISCAL_RULES
} from '../core';
import type { NormalizeFullResult } from '../types';

/**
 * Normalización COMPLETA con tracking de cambios
 * Usa core library para máxima modularidad
 */
export function normalizeFull(invoice: any): NormalizeFullResult {
  const changes: any[] = [];
  const warnings: string[] = [];
  const normalized = structuredClone(invoice);
  
  // ========================================================================
  // 1. NIF/CIF (emisor y receptor)
  // ========================================================================
  
  if (normalized.issuer?.vat_id || normalized.supplier_tax_id) {
    const vatField = normalized.issuer?.vat_id ? 'issuer.vat_id' : 'supplier_tax_id';
    const before = normalized.issuer?.vat_id || normalized.supplier_tax_id;
    const vatResult = validateSpanishVAT(before);
    const after = vatResult.normalized!;
    
    if (before !== after) {
      if (normalized.issuer?.vat_id) {
        normalized.issuer.vat_id = after;
      } else {
        normalized.supplier_tax_id = after;
      }
      changes.push({ field: vatField, before, after, rule: 'NORMALIZE_VAT_FORMAT' });
    }
    
    if (!vatResult.valid) {
      warnings.push(`NIF/CIF emisor ${after} inválido`);
    }
  } else {
    warnings.push('NIF/CIF emisor faltante');
  }
  
  if (normalized.receiver?.vat_id) {
    const before = normalized.receiver.vat_id;
    const vatResult = validateSpanishVAT(before);
    const after = vatResult.normalized!;
    
    if (before !== after) {
      normalized.receiver.vat_id = after;
      changes.push({ field: 'receiver.vat_id', before, after, rule: 'NORMALIZE_VAT_FORMAT' });
    }
    
    if (!vatResult.valid) {
      warnings.push(`NIF/CIF receptor ${after} inválido`);
    }
  }
  
  // ========================================================================
  // 2. NÚMERO DE FACTURA
  // ========================================================================
  
  if (normalized.invoice_number) {
    const before = normalized.invoice_number;
    const after = normalizeInvoiceNumber(before);
    
    if (before !== after) {
      normalized.invoice_number = after;
      changes.push({ field: 'invoice_number', before, after, rule: 'NORMALIZE_INVOICE_NUMBER' });
    }
    
    if (after.length < 1) {
      warnings.push('Número de factura vacío');
    }
  } else {
    warnings.push('Número de factura faltante');
  }
  
  // ========================================================================
  // 3. FECHAS
  // ========================================================================
  
  const dateField = normalized.issue_date || normalized.invoice_date;
  if (dateField) {
    const dateCheck = validateDateRange(dateField);
    if (!dateCheck.valid) {
      warnings.push(dateCheck.error!);
    }
  } else {
    warnings.push('Fecha emisión faltante');
  }
  
  if (normalized.due_date) {
    const dateCheck = validateDateRange(normalized.due_date);
    if (!dateCheck.valid) {
      warnings.push(dateCheck.error!);
    }
    
    const issueDate = normalized.issue_date || normalized.invoice_date;
    if (issueDate) {
      const logicCheck = validateDueDateLogic(issueDate, normalized.due_date);
      if (!logicCheck.valid) {
        warnings.push(logicCheck.error!);
      }
    }
  }
  
  // ========================================================================
  // 4. IMPORTES (redondeo y moneda)
  // ========================================================================
  
  // Detectar estructura de datos (OCR style vs form style)
  const hasOCRStructure = normalized.totals;
  const hasFormStructure = normalized.subtotal !== undefined;
  
  if (hasOCRStructure && normalized.totals) {
    if (!normalized.totals.currency) {
      normalized.totals.currency = FISCAL_RULES.DEFAULT_CURRENCY;
      changes.push({
        field: 'totals.currency',
        before: null,
        after: FISCAL_RULES.DEFAULT_CURRENCY,
        rule: 'DEFAULT_CURRENCY'
      });
    }
    
    ['base_10', 'vat_10', 'base_21', 'vat_21', 'total'].forEach(field => {
      if (normalized.totals[field] != null) {
        const before = normalized.totals[field];
        const after = round2(before);
        
        if (before !== after) {
          normalized.totals[field] = after;
          changes.push({ field: `totals.${field}`, before, after, rule: 'ROUND_CURRENCY' });
        }
      }
    });
  }
  
  if (hasFormStructure) {
    ['subtotal', 'tax_total', 'total'].forEach(field => {
      if (normalized[field] != null) {
        const before = normalized[field];
        const after = round2(before);
        
        if (before !== after) {
          normalized[field] = after;
          changes.push({ field, before, after, rule: 'ROUND_CURRENCY' });
        }
      }
    });
  }
  
  // ========================================================================
  // 5. LÍNEAS
  // ========================================================================
  
  if (normalized.lines && Array.isArray(normalized.lines)) {
    normalized.lines = normalized.lines.map((line: any, index: number) => {
      const normalizedLine = { ...line };
      
      ['quantity', 'unit_price', 'amount'].forEach(field => {
        if (line[field] != null) {
          const before = line[field];
          const after = round2(before);
          
          if (before !== after) {
            normalizedLine[field] = after;
            changes.push({ field: `lines[${index}].${field}`, before, after, rule: 'ROUND_CURRENCY' });
          }
        }
      });
      
      if (normalizedLine.quantity && normalizedLine.unit_price && normalizedLine.amount) {
        const lineCheck = validateLineAmount(
          normalizedLine.quantity,
          normalizedLine.unit_price,
          normalizedLine.amount
        );
        
        if (!lineCheck.valid) {
          warnings.push(`Línea ${index + 1}: ${lineCheck.error}`);
        }
      }
      
      return normalizedLine;
    });
  }
  
  // ========================================================================
  // 6. RAZÓN SOCIAL
  // ========================================================================
  
  if (normalized.issuer?.name || normalized.supplier_name) {
    const nameField = normalized.issuer?.name ? 'issuer.name' : 'supplier_name';
    const before = normalized.issuer?.name || normalized.supplier_name;
    const after = normalizeLegalName(before);
    
    if (before !== after) {
      if (normalized.issuer) {
        normalized.issuer.name_normalized = after;
      }
      changes.push({ field: nameField, before, after, rule: 'NORMALIZE_LEGAL_NAME' });
    }
  }
  
  if (normalized.receiver?.name) {
    const before = normalized.receiver.name;
    const after = normalizeLegalName(before);
    
    if (before !== after) {
      normalized.receiver.name_normalized = after;
      changes.push({ field: 'receiver.name', before, after, rule: 'NORMALIZE_LEGAL_NAME' });
    }
  }
  
  // ========================================================================
  // 7. DETECTAR CENTRO
  // ========================================================================
  
  if (normalized.centre_hint) {
    const centreCode = extractCentreCode(normalized.centre_hint);
    if (centreCode) {
      normalized.detected_centre_code = centreCode;
      changes.push({ field: 'detected_centre_code', before: null, after: centreCode, rule: 'EXTRACT_CENTRE_CODE' });
    }
  }
  
  return { normalized, changes, warnings };
}
