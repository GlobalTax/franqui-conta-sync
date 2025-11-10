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
  engine: 'openai' | 'mindee' | 'merged';
  cost_openai: number;
  cost_mindee: number;
  cost_total: number;
}

export function estimateOCRCost(params: {
  engine: 'openai' | 'mindee' | 'merged';
  pages?: number;
  tokens_in?: number;
  tokens_out?: number;
}): CostEstimate {
  const { engine, pages = 1, tokens_in = 0, tokens_out = 0 } = params;
  
  // Tarifas 2025 (según cost-calculator.ts)
  const RATES = {
    openai: {
      per_token_in: 0.0025 / 1000,   // $2.50/1M tokens input
      per_token_out: 0.01 / 1000,    // $10/1M tokens output
      avg_invoice: 0.08              // ~€0.08 promedio por factura
    },
    mindee: {
      per_page: 0.02                 // €0.02 por página
    }
  };

  let cost_openai = 0;
  let cost_mindee = 0;

  if (engine === 'openai' || engine === 'merged') {
    if (tokens_in > 0 || tokens_out > 0) {
      cost_openai = (tokens_in * RATES.openai.per_token_in) + (tokens_out * RATES.openai.per_token_out);
    } else {
      cost_openai = RATES.openai.avg_invoice;
    }
  }

  if (engine === 'mindee' || engine === 'merged') {
    cost_mindee = pages * RATES.mindee.per_page;
  }

  const cost_total = engine === 'merged' 
    ? Math.max(cost_openai, cost_mindee)
    : cost_openai + cost_mindee;

  return {
    engine,
    cost_openai,
    cost_mindee,
    cost_total
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
