// ============================================================================
// VALIDATORS - Validación de asientos contables
// ============================================================================

/**
 * Línea de asiento contable
 */
export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
  centre_id?: string | null;
  description?: string;
}

/**
 * Valida que Debe = Haber en un asiento
 * @param lines - Líneas del asiento
 * @param tolerance - Tolerancia en céntimos (default: 0.01€)
 */
export function validateDoubleEntry(
  lines: JournalLine[],
  tolerance: number = 0.01
): {
  valid: boolean;
  debitSum: number;
  creditSum: number;
  difference: number;
} {
  const debitSum = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const creditSum = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const difference = Math.abs(debitSum - creditSum);
  
  return {
    valid: difference < tolerance,
    debitSum,
    creditSum,
    difference
  };
}

/**
 * Valida que existe un centro asignado
 */
export function validateCentreId(centreId: string | null | undefined): boolean {
  return !!centreId;
}

/**
 * Detecta issues que bloquean el posting
 */
export function detectBlockingIssues(
  lines: JournalLine[],
  centreId: string | null | undefined,
  tolerance: number = 0.01
): string[] {
  const issues: string[] = [];
  
  if (!validateCentreId(centreId)) {
    issues.push('Falta centro');
  }
  
  const doubleEntry = validateDoubleEntry(lines, tolerance);
  if (!doubleEntry.valid) {
    issues.push('Debe ≠ Haber');
  }
  
  return issues;
}
