// ============================================================================
// FISCAL NORMALIZER (Stripper) - Normalización de datos fiscales ES
// ============================================================================

import { validateSpanishVAT, round2 } from './ocr-utils';

export interface NormalizationChange {
  field: string;
  before: any;
  after: any;
  rule: string;
}

export interface NormalizationResult {
  normalized: any;
  changes: NormalizationChange[];
  warnings: string[];
}

/**
 * Normaliza datos de factura OCR antes de guardar en DB
 * Aplica reglas fiscales españolas y limpieza de artefactos OCR
 * @param invoice - Objeto JSON con datos de factura
 * @returns Resultado con datos normalizados, cambios aplicados y warnings
 */
export function stripAndNormalize(invoice: any): NormalizationResult {
  const changes: NormalizationChange[] = [];
  const warnings: string[] = [];
  const normalized = structuredClone(invoice);

  // ========================================================================
  // 1. NORMALIZAR NIF/CIF (emisor y receptor)
  // ========================================================================

  // Emisor (proveedor en facturas recibidas)
  if (normalized.issuer?.vat_id) {
    const before = normalized.issuer.vat_id;
    const after = normalizeVATFormat(before);
    
    if (before !== after) {
      normalized.issuer.vat_id = after;
      changes.push({
        field: 'issuer.vat_id',
        before,
        after,
        rule: 'NORMALIZE_VAT_FORMAT'
      });
    }

    // Validar formato después de normalizar
    if (!validateSpanishVAT(after)) {
      warnings.push(`NIF/CIF emisor ${after} tiene formato inválido`);
    }
  } else {
    warnings.push('NIF/CIF del emisor faltante');
  }

  // Receptor (si aplica)
  if (normalized.receiver?.vat_id) {
    const before = normalized.receiver.vat_id;
    const after = normalizeVATFormat(before);
    
    if (before !== after) {
      normalized.receiver.vat_id = after;
      changes.push({
        field: 'receiver.vat_id',
        before,
        after,
        rule: 'NORMALIZE_VAT_FORMAT'
      });
    }

    if (!validateSpanishVAT(after)) {
      warnings.push(`NIF/CIF receptor ${after} tiene formato inválido`);
    }
  }

  // ========================================================================
  // 2. NORMALIZAR NÚMERO DE FACTURA
  // ========================================================================

  if (normalized.invoice_number) {
    const before = normalized.invoice_number;
    const after = normalizeInvoiceNumber(before);
    
    if (before !== after) {
      normalized.invoice_number = after;
      changes.push({
        field: 'invoice_number',
        before,
        after,
        rule: 'NORMALIZE_INVOICE_NUMBER'
      });
    }

    // Validar formato básico
    if (after.length < 1) {
      warnings.push('Número de factura vacío después de normalizar');
    }
  } else {
    warnings.push('Número de factura faltante');
  }

  // ========================================================================
  // 3. NORMALIZAR FECHAS
  // ========================================================================

  // Fecha de emisión
  if (normalized.issue_date) {
    const dateCheck = validateDateRange(normalized.issue_date);
    if (!dateCheck.valid) {
      warnings.push(dateCheck.warning!);
    }
  } else {
    warnings.push('Fecha de emisión faltante');
  }

  // Fecha de vencimiento
  if (normalized.due_date) {
    const dateCheck = validateDateRange(normalized.due_date);
    if (!dateCheck.valid) {
      warnings.push(dateCheck.warning!);
    }

    // Validar que due_date >= issue_date
    if (normalized.issue_date && normalized.due_date < normalized.issue_date) {
      warnings.push(`Fecha vencimiento (${normalized.due_date}) anterior a fecha emisión (${normalized.issue_date})`);
    }
  }

  // ========================================================================
  // 4. NORMALIZAR IMPORTES (redondeo 2 decimales, moneda EUR)
  // ========================================================================

  if (normalized.totals) {
    // Moneda
    if (!normalized.totals.currency) {
      normalized.totals.currency = 'EUR';
      changes.push({
        field: 'totals.currency',
        before: null,
        after: 'EUR',
        rule: 'DEFAULT_CURRENCY_EUR'
      });
    }

    // Redondear importes monetarios
    const moneyFields = ['base_10', 'vat_10', 'base_21', 'vat_21', 'total'];
    moneyFields.forEach(field => {
      if (normalized.totals[field] != null) {
        const before = normalized.totals[field];
        const after = round2(before);
        
        if (before !== after) {
          normalized.totals[field] = after;
          changes.push({
            field: `totals.${field}`,
            before,
            after,
            rule: 'ROUND_CURRENCY'
          });
        }
      }
    });

    // Normalizar other_taxes
    if (normalized.totals.other_taxes && Array.isArray(normalized.totals.other_taxes)) {
      normalized.totals.other_taxes = normalized.totals.other_taxes.map((tax: any, index: number) => {
        const normalizedTax = { ...tax };
        
        ['base', 'quota'].forEach(field => {
          if (tax[field] != null) {
            const before = tax[field];
            const after = round2(before);
            
            if (before !== after) {
              normalizedTax[field] = after;
              changes.push({
                field: `totals.other_taxes[${index}].${field}`,
                before,
                after,
                rule: 'ROUND_CURRENCY'
              });
            }
          }
        });
        
        return normalizedTax;
      });
    }
  }

  // ========================================================================
  // 5. NORMALIZAR LÍNEAS DE FACTURA
  // ========================================================================

  if (normalized.lines && Array.isArray(normalized.lines)) {
    normalized.lines = normalized.lines.map((line: any, index: number) => {
      const normalizedLine = { ...line };
      
      // Redondear quantity, unit_price, amount
      ['quantity', 'unit_price', 'amount'].forEach(field => {
        if (line[field] != null) {
          const before = line[field];
          const after = round2(before);
          
          if (before !== after) {
            normalizedLine[field] = after;
            changes.push({
              field: `lines[${index}].${field}`,
              before,
              after,
              rule: 'ROUND_CURRENCY'
            });
          }
        }
      });

      // Validar coherencia: quantity × unit_price ≈ amount
      if (normalizedLine.quantity && normalizedLine.unit_price && normalizedLine.amount) {
        const expected = round2(normalizedLine.quantity * normalizedLine.unit_price);
        const diff = Math.abs(expected - normalizedLine.amount);
        
        if (diff > 0.02) {
          warnings.push(
            `Línea ${index + 1}: cantidad×precio (${expected.toFixed(2)}) no cuadra con importe (${normalizedLine.amount.toFixed(2)})`
          );
        }
      }
      
      return normalizedLine;
    });
  }

  // ========================================================================
  // 6. NORMALIZAR RAZÓN SOCIAL (emisor y receptor)
  // ========================================================================

  // Emisor
  if (normalized.issuer?.name) {
    const before = normalized.issuer.name;
    const after = normalizeLegalName(before);
    
    if (before !== after) {
      // Guardar versión normalizada en campo auxiliar para búsqueda
      normalized.issuer.name_normalized = after;
      changes.push({
        field: 'issuer.name',
        before,
        after,
        rule: 'NORMALIZE_LEGAL_NAME'
      });
    }
  }

  // Receptor
  if (normalized.receiver?.name) {
    const before = normalized.receiver.name;
    const after = normalizeLegalName(before);
    
    if (before !== after) {
      normalized.receiver.name_normalized = after;
      changes.push({
        field: 'receiver.name',
        before,
        after,
        rule: 'NORMALIZE_LEGAL_NAME'
      });
    }
  }

  // ========================================================================
  // 7. DETECTAR HINTS DE CENTRO (si aplica)
  // ========================================================================

  if (normalized.centre_hint && normalized.centre_hint.trim() !== '') {
    // Intentar extraer código de centro de la descripción
    const centreCode = extractCentreCode(normalized.centre_hint);
    if (centreCode) {
      normalized.detected_centre_code = centreCode;
      changes.push({
        field: 'detected_centre_code',
        before: null,
        after: centreCode,
        rule: 'EXTRACT_CENTRE_CODE'
      });
    }
  }

  // ========================================================================
  // RETORNAR RESULTADO
  // ========================================================================

  return { normalized, changes, warnings };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Normaliza formato de NIF/CIF: uppercase, sin espacios/guiones
 */
function normalizeVATFormat(vat: string): string {
  return vat
    .toUpperCase()
    .replace(/[\s\-\.]/g, '')
    .trim();
}

/**
 * Normaliza número de factura: quita prefijos comunes OCR
 */
function normalizeInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber
    .replace(/^(Factura|Nº|N°|N\.?|#|Invoice|Bill|Núm\.)[:.\s]*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida rango de fechas (±5 años desde hoy)
 */
function validateDateRange(dateStr: string): { valid: boolean; warning?: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const yearDiff = Math.abs(date.getFullYear() - now.getFullYear());

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      warning: `Fecha ${dateStr} tiene formato inválido`
    };
  }

  if (yearDiff > 5) {
    return {
      valid: false,
      warning: `Fecha ${dateStr} fuera de rango razonable (±5 años)`
    };
  }

  return { valid: true };
}

/**
 * Normaliza razón social: quita S.A., S.L., etc. para matching
 */
function normalizeLegalName(name: string): string {
  return name
    .replace(/\s+(S\.?A\.?|S\.?L\.?|S\.?L\.?L\.?|C\.?B\.?|S\.?COOP\.?|S\.?COM\.?)$/i, '')
    .replace(/\s+(SOCIEDAD ANÓNIMA|SOCIEDAD LIMITADA|COMUNIDAD DE BIENES)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extrae código de centro de texto (ej. "Tienda M001 Madrid" → "M001")
 */
function extractCentreCode(text: string): string | null {
  // Patrones comunes: M001, MC-001, CENTRO-001, etc.
  const patterns = [
    /\b([A-Z]{1,2}\d{3,4})\b/,           // M001, MC001
    /\b([A-Z]+-\d{3,4})\b/,              // MC-001
    /\bCENTRO[:\s-]*(\d{3,4})\b/i,      // CENTRO 001
    /\bTIENDA[:\s-]*([A-Z0-9]{3,6})\b/i // TIENDA M001
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
