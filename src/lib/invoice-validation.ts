// ============================================================================
// INVOICE VALIDATION HELPERS
// Funciones auxiliares para validación de facturas antes de contabilizar
// ============================================================================

import { InvoiceQueries } from '@/infrastructure/persistence/supabase/queries/InvoiceQueries';
import { InvoiceEntryValidator, type InvoiceEntryValidationResult } from '@/domain/accounting/services/InvoiceEntryValidator';

/**
 * Valida una factura para contabilización usando InvoiceEntryValidator
 * Comprueba: centro asignado, balance Debe=Haber, periodo abierto, datos fiscales
 */
export async function validateInvoiceForPosting(
  invoiceId: string
): Promise<InvoiceEntryValidationResult> {
  // Obtener factura completa
  const invoice = await InvoiceQueries.findInvoiceReceivedById(invoiceId);
  
  if (!invoice) {
    throw new Error('Factura no encontrada');
  }

  // Validación básica pre-InvoiceEntryValidator
  if (!invoice.centroCode) {
    throw new Error('Centro no asignado');
  }

  if (!invoice.ocrExtractedData) {
    throw new Error('Datos OCR no disponibles');
  }

  // El ap_mapping está dentro de ocrExtractedData
  const ocrData = invoice.ocrExtractedData as any;
  if (!ocrData.ap_mapping && !ocrData.apMapping) {
    throw new Error('Mapeo contable no disponible');
  }

  // Validar con InvoiceEntryValidator (incluye balance, periodo, fiscales)
  const validation = await InvoiceEntryValidator.validate({
    normalized_invoice: ocrData.normalized_invoice || ocrData,
    ap_mapping: ocrData.ap_mapping || ocrData.apMapping || {},
    centro_code: invoice.centroCode,
  });

  return validation;
}
