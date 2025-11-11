// ============================================================================
// CALCULATORS - Cálculos fiscales y redondeos
// ============================================================================

/**
 * Redondea a 2 decimales (estándar monetario)
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Redondea a 4 decimales (cálculos intermedios)
 */
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/**
 * Calcula IVA esperado para una base y tasa
 */
export function calculateExpectedVAT(base: number, rate: number): number {
  return round2(base * rate);
}

/**
 * Ajusta IVA si la diferencia es por redondeo (< 1€)
 */
export function autofixVATRounding(
  base: number,
  declaredVAT: number,
  rate: number,
  maxDiff: number = 1.0
): { fixed: boolean; correctedVAT: number; originalVAT: number } {
  const expected = calculateExpectedVAT(base, rate);
  const diff = Math.abs(expected - declaredVAT);
  
  if (diff > 0.01 && diff < maxDiff) {
    return { fixed: true, correctedVAT: expected, originalVAT: declaredVAT };
  }
  
  return { fixed: false, correctedVAT: declaredVAT, originalVAT: declaredVAT };
}

/**
 * Normaliza importes de credit_note (convertir a negativos)
 */
export function normalizeCreditNoteAmounts<T extends Record<string, any>>(
  totals: T
): T & { inverted: boolean } {
  if (totals.total > 0) {
    const inverted = { ...totals } as any;
    
    ['total', 'base_10', 'vat_10', 'base_21', 'vat_21'].forEach(key => {
      if (inverted[key] != null) {
        inverted[key] = -Math.abs(inverted[key]);
      }
    });
    
    return { ...inverted, inverted: true };
  }
  
  return { ...totals, inverted: false };
}
