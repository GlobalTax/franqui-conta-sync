// ============================================================================
// INVOICE CALCULATOR
// Funciones para cálculo de totales de factura
// ============================================================================

export interface InvoiceTaxLine {
  tax_rate: number;
  tax_base: number;
  tax_amount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax_total: number;
  total: number;
}

/**
 * Calcula los totales de una factura a partir de sus líneas de impuestos
 */
export function calculateInvoiceTotals(taxLines: InvoiceTaxLine[]): InvoiceTotals {
  const subtotal = taxLines.reduce((sum, line) => sum + (line.tax_base || 0), 0);
  const tax_total = taxLines.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
  const total = subtotal + tax_total;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax_total: parseFloat(tax_total.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

/**
 * Calcula el importe de IVA a partir de la base imponible y el tipo
 */
export function calculateTaxAmount(base: number, rate: number): number {
  const amount = (base * rate) / 100;
  return parseFloat(amount.toFixed(2));
}

/**
 * Valida que los vencimientos cuadren con el total
 */
export function validatePaymentTerms(
  paymentTermsTotal: number, 
  invoiceTotal: number, 
  tolerance: number = 0.01
): boolean {
  return Math.abs(paymentTermsTotal - invoiceTotal) <= tolerance;
}

/**
 * Valida que el balance contable esté cuadrado (Debe = Haber)
 */
export function validateAccountingBalance(
  debitTotal: number,
  creditTotal: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(debitTotal - creditTotal) <= tolerance;
}
