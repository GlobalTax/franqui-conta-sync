// ============================================================================
// FISCAL RULES - Constantes y reglas fiscales españolas
// ============================================================================

export const FISCAL_RULES = {
  // Tasas de IVA vigentes en España
  VAT_RATES: {
    STANDARD: 0.21,   // Tipo general
    REDUCED: 0.10,    // Tipo reducido
    SUPER_REDUCED: 0.04, // Tipo superreducido
    EXEMPT: 0.00      // Exento
  },
  
  // Tolerancias de cálculo
  TOLERANCE: {
    TOTALS: 0.02,        // ±2 céntimos en totales
    LINE_AMOUNT: 0.02,   // ±2 céntimos por línea
    VAT_AUTOFIX: 1.00    // Autocorregir si diff < 1€
  },
  
  // Validación de fechas
  DATE_RANGE_YEARS: 5,   // ±5 años desde hoy
  
  // Moneda por defecto
  DEFAULT_CURRENCY: 'EUR',
  
  // Tipos de documento
  DOCUMENT_TYPES: {
    INVOICE: 'invoice',
    CREDIT_NOTE: 'credit_note',
    TICKET: 'ticket'
  } as const,
  
  // Confidence thresholds
  CONFIDENCE: {
    HIGH: 85,
    MEDIUM: 70,
    LOW: 50
  }
} as const;

export type DocumentType = typeof FISCAL_RULES.DOCUMENT_TYPES[keyof typeof FISCAL_RULES.DOCUMENT_TYPES];
