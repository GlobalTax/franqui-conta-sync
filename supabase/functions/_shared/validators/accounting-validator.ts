// ============================================================================
// ACCOUNTING VALIDATOR - Validación contable avanzada con reglas fiscales ES
// ============================================================================

const TOLERANCE = 0.02; // ±2 céntimos (redondeo contable estándar)

export interface AccountingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    sum_bases: number;
    sum_taxes: number;
    declared_base: number;
    declared_tax: number;
    declared_total: number;
    calculated_total: number;
    diff_bases: number;
    diff_taxes: number;
    diff_total: number;
  };
}

/**
 * Convierte string a céntimos (evita problemas de precisión con floats)
 */
function toCents(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Math.round(num * 100);
}

/**
 * Valida coherencia contable de una factura según reglas españolas
 * 
 * Reglas validadas:
 * 1. ∑(bases por IVA) = base_total_plus_fees (±0.02€)
 * 2. ∑(cuotas por IVA) = tax_total (±0.02€)
 * 3. base_total + tax_total = grand_total (±0.02€)
 * 4. Cada línea de IVA: base + tax = gross (±0.02€)
 * 
 * @param data - Datos de factura extraídos por OCR
 * @returns Resultado de validación con errores y warnings
 */
export function validateAccountingRules(data: any): AccountingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ========================================================================
  // EXTRAER DATOS (convertir a céntimos para evitar errores de precisión)
  // ========================================================================

  const totalsVAT = data?.totals_by_vat || [];
  const declaredBase = toCents(data?.base_total_plus_fees);
  const declaredTax = toCents(data?.tax_total);
  const declaredTotal = toCents(data?.grand_total);
  const greenPoint = toCents(data?.fees?.green_point);

  // ========================================================================
  // REGLA 1: Validar suma de bases por IVA
  // ========================================================================

  let sumBases = 0;
  for (const line of totalsVAT) {
    const base = toCents(line.base);
    sumBases += base;

    // Validar coherencia interna de la línea (base + tax = gross)
    const tax = toCents(line.tax);
    const gross = toCents(line.gross);
    const calculatedGross = base + tax;
    const diffGross = Math.abs(calculatedGross - gross);

    if (diffGross > 2) { // 2 céntimos de tolerancia
      warnings.push(
        `Línea IVA ${line.code || '?'}: Base+Cuota (${(calculatedGross/100).toFixed(2)}€) ≠ Bruto declarado (${(gross/100).toFixed(2)}€). Diff: ${(diffGross/100).toFixed(2)}€`
      );
    }
  }

  const diffBases = Math.abs(sumBases - declaredBase);
  if (diffBases > 2) {
    errors.push(
      `∑Bases IVA (${(sumBases/100).toFixed(2)}€) ≠ Base Total declarada (${(declaredBase/100).toFixed(2)}€). Diferencia: ${(diffBases/100).toFixed(2)}€`
    );
  }

  // ========================================================================
  // REGLA 2: Validar suma de cuotas de IVA
  // ========================================================================

  let sumTaxes = 0;
  for (const line of totalsVAT) {
    sumTaxes += toCents(line.tax);
  }

  const diffTaxes = Math.abs(sumTaxes - declaredTax);
  if (diffTaxes > 2) {
    errors.push(
      `∑Cuotas IVA (${(sumTaxes/100).toFixed(2)}€) ≠ Total IVA declarado (${(declaredTax/100).toFixed(2)}€). Diferencia: ${(diffTaxes/100).toFixed(2)}€`
    );
  }

  // ========================================================================
  // REGLA 3: Validar total general (Base + IVA = Total)
  // ========================================================================

  const calculatedTotal = declaredBase + declaredTax;
  const diffTotal = Math.abs(calculatedTotal - declaredTotal);
  
  if (diffTotal > 2) {
    errors.push(
      `Base+IVA (${(calculatedTotal/100).toFixed(2)}€) ≠ Total declarado (${(declaredTotal/100).toFixed(2)}€). Diferencia: ${(diffTotal/100).toFixed(2)}€`
    );
  }

  // ========================================================================
  // WARNINGS ADICIONALES
  // ========================================================================

  // Punto verde presente pero no incluido en base
  if (greenPoint !== 0 && diffBases > 2) {
    warnings.push(
      `Punto verde (${(greenPoint/100).toFixed(2)}€) puede no estar incluido en la base total`
    );
  }

  // Total sospechosamente bajo
  if (declaredTotal < 0) {
    warnings.push('Total negativo detectado (posible nota de crédito)');
  }

  // Sin líneas de IVA
  if (totalsVAT.length === 0) {
    warnings.push('No se encontraron líneas de IVA en la factura');
  }

  // ========================================================================
  // RESULTADO
  // ========================================================================

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    details: {
      sum_bases: sumBases / 100,
      sum_taxes: sumTaxes / 100,
      declared_base: declaredBase / 100,
      declared_tax: declaredTax / 100,
      declared_total: declaredTotal / 100,
      calculated_total: calculatedTotal / 100,
      diff_bases: diffBases / 100,
      diff_taxes: diffTaxes / 100,
      diff_total: diffTotal / 100
    }
  };
}

/**
 * Genera un resumen legible de la validación
 */
export function formatValidationSummary(result: AccountingValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return '✓ Validación contable aprobada';
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`✗ ${result.errors.length} error(es) crítico(s):`);
    result.errors.forEach(err => parts.push(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    parts.push(`⚠ ${result.warnings.length} advertencia(s):`);
    result.warnings.forEach(warn => parts.push(`  - ${warn}`));
  }

  return parts.join('\n');
}
