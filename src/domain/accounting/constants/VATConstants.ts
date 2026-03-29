/**
 * Tipos de IVA del Plan General Contable español.
 * Referencia: Ley 37/1992, de 28 de diciembre, del IVA.
 */

/** Tipos impositivos vigentes en España */
export const VAT_RATES = {
  /** IVA general - 21% */
  STANDARD: 21,
  /** IVA reducido - 10% (alimentación, transporte, hostelería) */
  REDUCED: 10,
  /** IVA superreducido - 4% (pan, leche, huevos, medicamentos, libros) */
  SUPER_REDUCED: 4,
  /** Exento - 0% (educación, sanidad, seguros) */
  EXEMPT: 0,
} as const;

export type VATRate = typeof VAT_RATES[keyof typeof VAT_RATES];

/** Tipos como fracciones decimales para cálculos */
export const VAT_RATE_FRACTIONS = {
  STANDARD: VAT_RATES.STANDARD / 100,
  REDUCED: VAT_RATES.REDUCED / 100,
  SUPER_REDUCED: VAT_RATES.SUPER_REDUCED / 100,
  EXEMPT: VAT_RATES.EXEMPT / 100,
} as const;

/** Lista de tipos válidos (para validación de formularios y facturas) */
export const VALID_VAT_RATES: readonly VATRate[] = [
  VAT_RATES.EXEMPT,
  VAT_RATES.SUPER_REDUCED,
  VAT_RATES.REDUCED,
  VAT_RATES.STANDARD,
];

/** Tolerancia para comparaciones de importes monetarios (IEEE 754 floating point) */
export const MONETARY_TOLERANCE = 0.01;
