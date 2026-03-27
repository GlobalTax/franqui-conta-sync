/**
 * OCR Utilities - Funciones reutilizables para validación y normalización fiscal ES
 * Extraídas de supabase/functions/invoice-ocr/index.ts para reutilización en frontend
 */

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
// PARSING DE IMPORTES FORMATO ESPAÑOL
// ============================================================================

export function parseSpanishAmount(amount: string): number {
  // Formato español: "1.234,56" → 1234.56
  return parseFloat(amount.replace(/\./g, '').replace(',', '.'));
}

// ============================================================================
// FORMATO DE FECHA
// ============================================================================

export function formatDateES(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// ============================================================================
// ESTIMACIÓN DE COSTES OCR
// ============================================================================

interface CostEstimate {
  engine: 'claude';
  cost_claude: number;
  cost_total: number;
}

/**
 * Tarifas Claude Vision (2025):
 * - Claude claude-sonnet-4-20250514: $3/1M input + $15/1M output (~€0.01-0.03/factura)
 */
export function estimateOCRCost(params: {
  engine: 'claude';
  pages?: number;
  tokens_in?: number;
  tokens_out?: number;
}): CostEstimate {
  const { tokens_in = 0, tokens_out = 0 } = params;
  
  const RATES = {
    per_token_in: 0.003 / 1000,
    per_token_out: 0.015 / 1000,
    avg_invoice: 0.02
  };

  let cost_claude = 0;
  if (tokens_in > 0 || tokens_out > 0) {
    cost_claude = (tokens_in * RATES.per_token_in) + (tokens_out * RATES.per_token_out);
  } else {
    cost_claude = RATES.avg_invoice;
  }

  return {
    engine: 'claude',
    cost_claude,
    cost_total: cost_claude
  };
}

// ============================================================================
// NORMALIZACIÓN RÁPIDA (Versión simplificada para frontend)
// ============================================================================

export interface QuickNormalizeResult {
  vat_valid: boolean;
  has_invoice_number: boolean;
  has_date: boolean;
  has_total: boolean;
  estimated_confidence: number;
  warnings: string[];
}

export function quickValidateInvoice(data: {
  vat_id?: string | null;
  invoice_number?: string | null;
  issue_date?: string | null;
  total?: number | null;
}): QuickNormalizeResult {
  const warnings: string[] = [];
  let confidence = 100;

  const vat_valid = validateSpanishVAT(data.vat_id || null);
  if (!vat_valid) {
    warnings.push('NIF/CIF inválido o faltante');
    confidence -= 20;
  }

  const has_invoice_number = !!(data.invoice_number && data.invoice_number.length > 0);
  if (!has_invoice_number) {
    warnings.push('Número de factura faltante');
    confidence -= 25;
  }

  const has_date = !!(data.issue_date && data.issue_date.length > 0);
  if (!has_date) {
    warnings.push('Fecha de factura faltante');
    confidence -= 20;
  }

  const has_total = !!(data.total && data.total > 0);
  if (!has_total) {
    warnings.push('Importe total faltante');
    confidence -= 35;
  }

  return {
    vat_valid,
    has_invoice_number,
    has_date,
    has_total,
    estimated_confidence: Math.max(0, confidence),
    warnings
  };
}

// ============================================================================
// NORMALIZACIÓN RÁPIDA DE DATOS FISCALES
// ============================================================================

/**
 * Normaliza JSON de factura: moneda EUR, redondeo a 2 decimales
 * Útil para pre-procesamiento antes de guardar en DB
 * @param json - Objeto JSON con datos de factura (totals, lines, etc.)
 * @returns JSON normalizado con moneda EUR y decimales redondeados
 */
export function quickNormalizeES(json: any) {
  const j = structuredClone(json || {});
  
  // Normalizar totales
  j.totals = j.totals || {};
  if (!j.totals.currency) j.totals.currency = "EUR";
  
  const moneyFields = ["base_10", "vat_10", "base_21", "vat_21", "total"];
  moneyFields.forEach(k => {
    if (j.totals[k] != null) j.totals[k] = round2(j.totals[k]);
  });
  
  // Normalizar líneas
  if (j.lines && Array.isArray(j.lines)) {
    j.lines = j.lines.map((line: any) => ({
      ...line,
      quantity: line.quantity != null ? round2(line.quantity) : null,
      unit_price: line.unit_price != null ? round2(line.unit_price) : null,
      amount: line.amount != null ? round2(line.amount) : null,
    }));
  }
  
  return j;
}

// ============================================================================
// HELPERS DE REDONDEO
// ============================================================================

/**
 * Redondea a 2 decimales (para importes monetarios)
 */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Redondea a 4 decimales (para costes precisos)
 */
export const round4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;

// ============================================================================
// ALIAS PARA COMPATIBILIDAD
// ============================================================================

/**
 * Alias de validateSpanishVAT para código legacy y mayor claridad semántica
 * @see validateSpanishVAT
 */
export const validateNIF = validateSpanishVAT;
