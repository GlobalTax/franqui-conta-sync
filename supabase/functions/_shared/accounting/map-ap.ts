// ============================================================================
// MAP AP - Mapeo automático de cuentas contables (Accounts Payable)
// Refactorización modular de la función mapAP original
// ============================================================================

import {
  mapBySupplier,
  mapByLineKeywords,
  getDefaultAccount,
  getDefaultTaxAccount,
  getDefaultAPAccount
} from './core/index.ts';

/**
 * Resultado del mapeo de cuentas AP
 */
export interface AccountMappingResult {
  account_suggestion: string;     // Cuenta de gasto sugerida (Grupo 6)
  tax_account: string;            // Cuenta IVA soportado (Grupo 47)
  ap_account: string;             // Cuenta de proveedores (Grupo 41)
  centre_id: string | null;       // Centro/restaurante
  rationale: string;              // Explicación de la regla aplicada
}

/**
 * Input para mapeo AP
 */
export interface InvoiceForMapping {
  issuer?: {
    name?: string;
    vat_id?: string;
  };
  lines?: Array<{
    description?: string;
  }>;
  centre_id?: string | null;
}

/**
 * Mapea factura a cuentas PGC sugeridas
 * 
 * Estrategia de prioridad:
 * 1. Keywords en líneas (más específico)
 * 2. Proveedor (menos específico)
 * 3. Fallback (genérico)
 * 
 * @param invoice - Datos de factura extraídos
 * @returns Sugerencia de cuentas + rationale
 */
export function mapAP(invoice: InvoiceForMapping): AccountMappingResult {
  let account: string | null = null;
  let rationale = '';
  
  // ========================================================================
  // ESTRATEGIA 1: Mapeo por proveedor
  // ========================================================================
  
  const supplierMatch = mapBySupplier(invoice?.issuer?.name);
  
  if (supplierMatch) {
    account = supplierMatch;
    rationale = `Proveedor: ${invoice.issuer?.name}`;
  }
  
  // ========================================================================
  // ESTRATEGIA 2: Mapeo por keywords de líneas (OVERRIDE proveedor)
  // ========================================================================
  
  const keywordMatch = mapByLineKeywords(invoice?.lines || []);
  
  if (keywordMatch) {
    account = keywordMatch;
    rationale = `Keywords en líneas (override proveedor)`;
  }
  
  // ========================================================================
  // ESTRATEGIA 3: Fallback
  // ========================================================================
  
  if (!account) {
    account = getDefaultAccount();
    rationale = 'Cuenta genérica (sin match)';
  }
  
  // ========================================================================
  // RETORNAR RESULTADO
  // ========================================================================
  
  return {
    account_suggestion: account,
    tax_account: getDefaultTaxAccount(),
    ap_account: getDefaultAPAccount(),
    centre_id: invoice?.centre_id || null,
    rationale
  };
}
