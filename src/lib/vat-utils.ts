// ============================================================================
// VAT UTILITIES - Validación de coherencia fiscal IVA España
// ============================================================================

export interface VATCheckResult {
  valid: boolean;
  reason?: string;
  expectedTotal?: number;
  detectedRatio?: number;
}

/**
 * Valida coherencia fiscal: Base + IVA = Total
 * @param subtotal - Base imponible total
 * @param taxTotal - IVA total
 * @param total - Total factura (debe ser subtotal + taxTotal)
 * @returns Resultado de validación con motivo si falla
 */
export function validateVATCoherence(
  subtotal: number,
  taxTotal: number,
  total: number
): VATCheckResult {
  const tolerance = 0.02; // ±2 céntimos (redondeo contable)
  const expectedTotal = subtotal + taxTotal;
  const diff = Math.abs(total - expectedTotal);

  // 1. Validar que Total = Base + IVA (±2 céntimos)
  if (diff > tolerance) {
    return {
      valid: false,
      reason: `Total (${total.toFixed(2)}€) no cuadra con Base+IVA (${expectedTotal.toFixed(2)}€). Diferencia: ${diff.toFixed(2)}€`,
      expectedTotal
    };
  }

  // 2. Validar ratios de IVA comunes en España (4%, 10%, 21%)
  // Solo si hay base imponible
  if (subtotal > 0) {
    const detectedRatio = taxTotal / subtotal;
    const standardRatios = [0.04, 0.10, 0.21, 0]; // 4%, 10%, 21%, exento

    const matchesStandardRate = standardRatios.some(rate => 
      Math.abs(detectedRatio - rate) < 0.005 // Tolerancia 0.5%
    );

    if (!matchesStandardRate) {
      return {
        valid: false,
        reason: `Ratio IVA ${(detectedRatio * 100).toFixed(1)}% no es estándar (4%, 10%, 21%, 0%)`,
        detectedRatio,
      };
    }
  }

  return { valid: true };
}

/**
 * Valida cálculo de IVA por tipo (10% o 21%)
 * @param base - Base imponible
 * @param vat - Cuota IVA
 * @param rate - Tipo de IVA (0.10 o 0.21)
 * @returns Resultado de validación
 */
export function validateVATCalculation(
  base: number,
  vat: number,
  rate: number
): VATCheckResult {
  const tolerance = 0.02; // ±2 céntimos
  const expectedVAT = Math.round(base * rate * 100) / 100;
  const diff = Math.abs(expectedVAT - vat);

  if (diff > tolerance) {
    return {
      valid: false,
      reason: `IVA ${(rate * 100)}% calculado incorrectamente: esperado ${expectedVAT.toFixed(2)}€, actual ${vat.toFixed(2)}€`,
      expectedTotal: expectedVAT
    };
  }

  return { valid: true };
}

/**
 * Detecta el tipo de IVA aplicado (para facturas sin tipo explícito)
 * @param base - Base imponible
 * @param vat - Cuota IVA
 * @returns Tipo de IVA detectado (0.04, 0.10, 0.21) o null si no coincide
 */
export function detectVATRate(base: number, vat: number): number | null {
  if (base <= 0) return null;

  const ratio = vat / base;
  const standardRates = [0.04, 0.10, 0.21];

  for (const rate of standardRates) {
    if (Math.abs(ratio - rate) < 0.005) {
      return rate;
    }
  }

  return null;
}

/**
 * Valida estructura completa de IVA (múltiples bases/cuotas)
 * @param vatBreakdown - Desglose de bases y cuotas por tipo
 * @param total - Total factura
 * @returns Resultado de validación
 */
export function validateVATBreakdown(
  vatBreakdown: Array<{ base: number; vat: number; rate: number }>,
  total: number
): VATCheckResult {
  const tolerance = 0.02;
  
  // Sumar todas las bases y cuotas
  const totalBase = vatBreakdown.reduce((sum, item) => sum + item.base, 0);
  const totalVAT = vatBreakdown.reduce((sum, item) => sum + item.vat, 0);
  const expectedTotal = totalBase + totalVAT;
  
  const diff = Math.abs(total - expectedTotal);

  if (diff > tolerance) {
    return {
      valid: false,
      reason: `Total (${total.toFixed(2)}€) no cuadra con suma de bases+IVA (${expectedTotal.toFixed(2)}€)`,
      expectedTotal
    };
  }

  // Validar cada cálculo de IVA individual
  for (const item of vatBreakdown) {
    const checkResult = validateVATCalculation(item.base, item.vat, item.rate);
    if (!checkResult.valid) {
      return checkResult;
    }
  }

  return { valid: true };
}
