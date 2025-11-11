// ============================================================================
// VALIDATORS - Funciones puras de validación fiscal española
// ============================================================================

/**
 * Valida formato y dígito de control de NIF/CIF español
 * @returns { valid: boolean, type: 'NIF' | 'NIE' | 'CIF' | null, normalized: string | null }
 */
export function validateSpanishVAT(vat: string | null): {
  valid: boolean;
  type: 'NIF' | 'NIE' | 'CIF' | null;
  normalized: string | null;
} {
  if (!vat) return { valid: false, type: null, normalized: null };
  
  const clean = vat.toUpperCase().replace(/[\s\-\.]/g, '');
  if (clean.length !== 9) return { valid: false, type: null, normalized: clean };
  
  const first = clean[0];
  
  // NIF/NIE (personas físicas)
  if (/^[XYZ0-9]/.test(first)) {
    const nieMap: { [key: string]: string } = { X: '0', Y: '1', Z: '2' };
    const numPart = nieMap[first] ? nieMap[first] + clean.slice(1, 8) : clean.slice(0, 8);
    
    if (!/^\d{8}$/.test(numPart)) return { valid: false, type: null, normalized: clean };
    
    const letter = 'TRWAGMYFPDXBNJZSQVHLCKE'[parseInt(numPart) % 23];
    const isValid = letter === clean[8];
    
    return {
      valid: isValid,
      type: /^[XYZ]/.test(first) ? 'NIE' : 'NIF',
      normalized: clean
    };
  }
  
  // CIF (personas jurídicas)
  if (/^[ABCDEFGHJNPQRSUVW]/.test(first)) {
    const numPart = clean.slice(1, 8);
    const controlChar = clean[8];
    
    if (!/^\d{7}$/.test(numPart)) return { valid: false, type: null, normalized: clean };
    
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
    
    const isValid = controlChar === String(controlDigit) || controlChar === controlLetter;
    
    return { valid: isValid, type: 'CIF', normalized: clean };
  }
  
  return { valid: false, type: null, normalized: clean };
}

/**
 * Valida rango de fecha (±5 años)
 */
export function validateDateRange(dateStr: string): {
  valid: boolean;
  error?: string;
  parsed: Date | null;
} {
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: `Fecha inválida: ${dateStr}`, parsed: null };
  }
  
  const now = new Date();
  const yearDiff = Math.abs(date.getFullYear() - now.getFullYear());
  
  if (yearDiff > 5) {
    return {
      valid: false,
      error: `Fecha fuera de rango (±5 años): ${dateStr}`,
      parsed: date
    };
  }
  
  return { valid: true, parsed: date };
}

/**
 * Valida que due_date >= issue_date
 */
export function validateDueDateLogic(issueDate: string, dueDate: string): {
  valid: boolean;
  error?: string;
} {
  const issue = new Date(issueDate);
  const due = new Date(dueDate);
  
  if (due < issue) {
    return {
      valid: false,
      error: `Fecha vencimiento (${dueDate}) anterior a fecha emisión (${issueDate})`
    };
  }
  
  return { valid: true };
}

/**
 * Valida coherencia de totales (bases + IVAs = total)
 */
export function validateTotals(data: {
  base_10?: number | null;
  vat_10?: number | null;
  base_21?: number | null;
  vat_21?: number | null;
  total: number;
  other_taxes?: Array<{ base: number; quota: number }>;
  tolerance?: number; // Default: 0.02€
}): {
  valid: boolean;
  error?: string;
  calculated: number;
  difference: number;
} {
  const tolerance = data.tolerance ?? 0.02;
  
  const bases = (data.base_10 || 0) + (data.base_21 || 0);
  const vats = (data.vat_10 || 0) + (data.vat_21 || 0);
  const otherTaxes = data.other_taxes?.reduce(
    (sum, t) => sum + (t.base || 0) + (t.quota || 0),
    0
  ) || 0;
  
  const calculated = bases + vats + otherTaxes;
  const difference = Math.abs(calculated - data.total);
  
  if (difference > tolerance) {
    return {
      valid: false,
      error: `Totales no cuadran: calculado ${calculated.toFixed(2)}€ vs declarado ${data.total.toFixed(2)}€ (diferencia: ${difference.toFixed(2)}€)`,
      calculated,
      difference
    };
  }
  
  return { valid: true, calculated, difference };
}

/**
 * Valida coherencia de línea: quantity × unit_price ≈ amount
 */
export function validateLineAmount(
  quantity: number,
  unitPrice: number,
  amount: number,
  tolerance: number = 0.02
): {
  valid: boolean;
  error?: string;
  calculated: number;
  difference: number;
} {
  const calculated = Math.round(quantity * unitPrice * 100) / 100;
  const difference = Math.abs(calculated - amount);
  
  if (difference > tolerance) {
    return {
      valid: false,
      error: `Línea: cantidad×precio (${calculated.toFixed(2)}) no cuadra con importe (${amount.toFixed(2)})`,
      calculated,
      difference
    };
  }
  
  return { valid: true, calculated, difference };
}
