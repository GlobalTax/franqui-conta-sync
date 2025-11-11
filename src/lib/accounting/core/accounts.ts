// ============================================================================
// ACCOUNTS - Plan General Contable Español (PGC) - Cuentas principales
// ============================================================================

/**
 * Cuentas de Compras y Gastos (Grupo 6)
 */
export const PGC_ACCOUNTS = {
  // Compras de mercaderías y aprovisionamientos
  PURCHASES: {
    FOOD: '6000000',              // Compras alimentación (genérico)
    FOOD_MAKRO: '6000000',        // Compras alimentación Makro
    FOOD_EUROPASTRY: '6000001',   // Compras alimentación Europastry
    PAPER: '6060000',             // Material de oficina y packaging
    SERVICES: '6200000',          // Servicios profesionales (fallback)
  },
  
  // IVA y tributos (Grupo 47)
  VAT: {
    DEDUCTIBLE: '4720000',        // IVA soportado (deducible)
    PENDING: '4700000',           // IVA pendiente
  },
  
  // Proveedores (Grupo 41)
  SUPPLIERS: {
    PAYABLE: '4100000',           // Acreedores por prestaciones de servicios
    COMMERCIAL: '4000000',        // Proveedores comerciales
  }
} as const;

/**
 * Patrones de proveedor para mapeo automático
 */
export const SUPPLIER_PATTERNS = {
  MAKRO: /MAKRO/i,
  EUROPASTRY: /EUROPASTRY/i,
} as const;

/**
 * Patrones de keywords en líneas para clasificación
 */
export const LINE_KEYWORDS = {
  PAPER: /PAPEL|PACKAGING|ENVASE/i,
  FOOD: /COMIDA|ALIMENTO|FOOD/i,
  CLEANING: /LIMPIEZA|CLEANING|HYGIENE/i,
} as const;
