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
} from '../core';

import type { AccountMappingResult, InvoiceForMapping } from '../types';

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
