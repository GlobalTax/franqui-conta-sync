// ============================================================================
// TEMPLATE MAPPERS
// Funciones para mapear datos extraídos por template a formato EnhancedInvoiceData
// ============================================================================

import type { EnhancedInvoiceData } from './types.ts';

/**
 * Mapea datos extraídos por template al formato EnhancedInvoiceData
 */
export function mapTemplateToInvoiceData(
  templateData: Record<string, any>
): EnhancedInvoiceData {
  
  // Crear estructura base según types.ts
  const invoiceData: EnhancedInvoiceData = {
    document_type: 'invoice',
    invoice_number: templateData.invoice_number || '',
    issue_date: templateData.invoice_date || templateData.issue_date || '',
    due_date: templateData.due_date || null,
    
    issuer: {
      name: templateData.supplier_name || '',
      vat_id: templateData.supplier_vat || templateData.supplier_vat_id || null,
    },
    
    receiver: {
      name: templateData.customer_name || null,
      vat_id: templateData.customer_vat || null,
      address: templateData.customer_address || null,
    },
    
    totals: {
      currency: 'EUR',
      base_10: parseFloat(templateData.base_10) || null,
      vat_10: parseFloat(templateData.vat_10) || null,
      base_21: parseFloat(templateData.base_21) || null,
      vat_21: parseFloat(templateData.vat_21) || null,
      other_taxes: [],
      total: parseFloat(templateData.total || templateData.total_amount) || 0,
    },
    
    lines: [],
    
    centre_hint: null,
    payment_method: null,
    confidence_notes: ['Extracted using OCR template'],
    confidence_score: 85, // Se actualiza desde el template-extractor
    discrepancies: [],
    proposed_fix: null,
  };

  // Mapear líneas si existen en el template
  if (templateData.line_items && Array.isArray(templateData.line_items)) {
    invoiceData.lines = templateData.line_items.map((line: any) => ({
      description: line.description || '',
      quantity: parseFloat(line.quantity) || null,
      unit_price: parseFloat(line.unit_price) || null,
      amount: parseFloat(line.total_amount || line.amount) || 0,
    }));
  }

  return invoiceData;
}
