// ============================================================================
// ACCOUNTING TYPES - Interfaces para mapeo contable
// ============================================================================

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
