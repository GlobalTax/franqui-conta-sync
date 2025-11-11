// ============================================================================
// MAPPERS - Funciones puras de mapeo contable
// ============================================================================

import { PGC_ACCOUNTS, SUPPLIER_PATTERNS, LINE_KEYWORDS } from './accounts';

/**
 * Mapea proveedor a cuenta de gasto
 * @returns cuenta PGC o null si no hay match
 */
export function mapBySupplier(supplierName: string | null | undefined): string | null {
  if (!supplierName) return null;
  
  const normalized = supplierName.toUpperCase();
  
  if (SUPPLIER_PATTERNS.MAKRO.test(normalized)) {
    return PGC_ACCOUNTS.PURCHASES.FOOD_MAKRO;
  }
  
  if (SUPPLIER_PATTERNS.EUROPASTRY.test(normalized)) {
    return PGC_ACCOUNTS.PURCHASES.FOOD_EUROPASTRY;
  }
  
  return null;
}

/**
 * Mapea keywords de líneas a cuenta de gasto
 * @returns cuenta PGC o null si no hay match
 */
export function mapByLineKeywords(lines: Array<{ description?: string }>): string | null {
  if (!lines || lines.length === 0) return null;
  
  // Concatenar todas las descripciones
  const allDescriptions = lines
    .map(line => String(line.description || '').toUpperCase())
    .join(' ');
  
  // Evaluar patrones (orden de prioridad)
  if (LINE_KEYWORDS.PAPER.test(allDescriptions)) {
    return PGC_ACCOUNTS.PURCHASES.PAPER;
  }
  
  return null;
}

/**
 * Obtiene cuenta fallback por defecto
 */
export function getDefaultAccount(): string {
  return PGC_ACCOUNTS.PURCHASES.SERVICES;
}

/**
 * Obtiene cuenta de IVA soportado estándar
 */
export function getDefaultTaxAccount(): string {
  return PGC_ACCOUNTS.VAT.DEDUCTIBLE;
}

/**
 * Obtiene cuenta de acreedores estándar
 */
export function getDefaultAPAccount(): string {
  return PGC_ACCOUNTS.SUPPLIERS.PAYABLE;
}
