// ============================================================================
// MINDEE V4 ADAPTER - Converts Mindee V4 response to standard format
// ============================================================================

import type { EnhancedInvoiceData, MindeeExtractionResult } from "./types.ts";

/**
 * Adapta respuesta de Mindee API V4 al formato estándar EnhancedInvoiceData
 */
export function adaptMindeeV4ToStandard(
  mindeeResponse: any
): MindeeExtractionResult {
  
  const prediction = mindeeResponse.document.inference.prediction;
  
  console.log('[Mindee Adapter] Processing V4 response...');
  
  // Helper para extraer valor y confidence
  const extract = (field: any) => ({ 
    value: field?.value ?? null, 
    confidence: field?.confidence ?? 0 
  });

  // Extraer campos principales con destructuring
  const { value: supplierName, confidence: confSupplierName } = 
    extract(prediction.supplier_name);
  const { value: supplierVAT, confidence: confSupplierVAT } = 
    extract(prediction.supplier_company_registrations?.[0]);
  const { value: invoiceNumber, confidence: confInvoiceNumber } = 
    extract(prediction.invoice_number);
  const { value: invoiceDate, confidence: confInvoiceDate } = 
    extract(prediction.invoice_date);
  const { value: dueDate } = 
    extract(prediction.due_date);
  const { value: totalAmount, confidence: confTotalAmount } = 
    extract(prediction.total_amount);

  // Detectar tipo de documento
  let documentType: "invoice" | "credit_note" | "ticket" = "invoice";
  if (invoiceNumber?.toLowerCase().includes('abono') || 
      invoiceNumber?.toLowerCase().includes('credit') ||
      invoiceNumber?.toLowerCase().includes('nc-')) {
    documentType = "credit_note";
  }

  // Extraer desglose de IVA (taxes) con aggregation
  let base10 = 0, vat10 = 0, base21 = 0, vat21 = 0;
  const otherTaxes: Array<{ type: string; base: number; quota: number }> = [];

  for (const tax of prediction.taxes || []) {
    const rate = tax.rate?.value ?? 0;
    const taxBase = tax.base?.value ?? 0;
    const taxValue = tax.value?.value ?? 0;
    
    if (Math.abs(rate - 10) < 0.5) {
      base10 += taxBase;  // Sumar múltiples líneas con mismo tipo
      vat10 += taxValue;
    } else if (Math.abs(rate - 21) < 0.5) {
      base21 += taxBase;
      vat21 += taxValue;
    } else if (rate > 0) {
      otherTaxes.push({
        type: `IVA ${Math.round(rate)}%`,
        base: taxBase,
        quota: taxValue
      });
    }
  }

  // Extraer líneas (sintaxis simplificada)
  const lines = (prediction.line_items || []).map((item: any) => ({
    description: item.description?.value || 'Sin descripción',
    quantity: item.quantity?.value ?? null,
    unit_price: item.unit_price?.value ?? null,
    amount: item.total_amount?.value ?? 0
  }));

  // Calcular confidence global usando valores destructurados
  const confidenceByField: Record<string, number> = {
    'issuer.vat_id': confSupplierVAT * 100,
    'issuer.name': confSupplierName * 100,
    'invoice_number': confInvoiceNumber * 100,
    'issue_date': confInvoiceDate * 100,
    'totals.total': confTotalAmount * 100
  };

  const criticalFields = [
    confSupplierVAT,
    confInvoiceNumber,
    confInvoiceDate,
    confTotalAmount
  ];

  const avgConfidence = criticalFields.reduce((sum, c) => sum + c, 0) / criticalFields.length;
  const confidenceScore = Math.round(avgConfidence * 100);

  console.log(`[Mindee Adapter] Confidence: ${confidenceScore}%`);

  // Construir resultado final
  const data: EnhancedInvoiceData = {
    document_type: documentType,
    issuer: {
      name: supplierName || '',
      vat_id: supplierVAT
    },
    receiver: {
      name: null,
      vat_id: null,
      address: null
    },
    invoice_number: invoiceNumber || '',
    issue_date: invoiceDate || '',
    due_date: dueDate,
    totals: {
      currency: 'EUR',
      base_10: base10 > 0 ? base10 : null,
      vat_10: vat10 > 0 ? vat10 : null,
      base_21: base21 > 0 ? base21 : null,
      vat_21: vat21 > 0 ? vat21 : null,
      other_taxes: otherTaxes,
      total: totalAmount || 0
    },
    lines,
    centre_hint: null,
    payment_method: null,
    confidence_notes: [],
    confidence_score: confidenceScore,
    discrepancies: [],
    proposed_fix: null
  };

  return {
    data,
    confidence_score: confidenceScore,
    confidence_by_field: confidenceByField,
    raw_response: mindeeResponse
  };
}
