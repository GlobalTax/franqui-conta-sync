// ============================================================================
// BUILDERS - Construcción de asientos contables
// ============================================================================

import type { JournalLine } from './validators';
import type { AccountMappingResult } from '../types';

/**
 * Totales de factura
 */
export interface InvoiceTotals {
  base_10?: number | null;
  vat_10?: number | null;
  base_21?: number | null;
  vat_21?: number | null;
  total: number;
}

/**
 * Construye preview de asiento AP (Accounts Payable)
 * 
 * Estructura estándar:
 * - DEBE: Cuenta de gasto (base imponible)
 * - DEBE: IVA soportado
 * - HABER: Proveedor (total factura)
 */
export function buildAPJournalPreview(
  totals: InvoiceTotals,
  mapping: AccountMappingResult
): JournalLine[] {
  // Calcular base imponible total
  const base = (totals.base_10 || 0) + (totals.base_21 || 0);
  
  // Calcular IVA total
  const vat = (totals.vat_10 || 0) + (totals.vat_21 || 0);
  
  // Total factura
  const total = totals.total || 0;
  
  return [
    {
      account: mapping.account_suggestion,
      debit: base,
      credit: 0,
      centre_id: mapping.centre_id
    },
    {
      account: mapping.tax_account,
      debit: vat,
      credit: 0
    },
    {
      account: mapping.ap_account,
      debit: 0,
      credit: total
    }
  ];
}
