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

  // Extraer campos principales
  const supplierName = extract(prediction.supplier_name);
  const supplierVAT = extract(prediction.supplier_company_registrations?.[0]);
  const invoiceNumber = extract(prediction.invoice_number);
  const invoiceDate = extract(prediction.invoice_date);
  const dueDate = extract(prediction.due_date);
  const totalAmount = extract(prediction.total_amount);
  const totalNet = extract(prediction.total_net);
  const totalTax = extract(prediction.total_tax);

  // Detectar tipo de documento
  let documentType: "invoice" | "credit_note" | "ticket" = "invoice";
  if (invoiceNumber.value?.toLowerCase().includes('abono') || 
      invoiceNumber.value?.toLowerCase().includes('credit')) {
    documentType = "credit_note";
  }

  // Extraer desglose de IVA (taxes)
  const taxes = prediction.taxes || [];
  let base10 = null;
  let vat10 = null;
  let base21 = null;
  let vat21 = null;
  const otherTaxes: Array<{ type: string; base: number; quota: number }> = [];

  for (const tax of taxes) {
    const rate = tax.rate?.value ?? 0;
    const taxBase = tax.base?.value ?? 0;
    const taxValue = tax.value?.value ?? 0;
    
    if (Math.abs(rate - 10) < 0.5) {
      base10 = taxBase;
      vat10 = taxValue;
    } else if (Math.abs(rate - 21) < 0.5) {
      base21 = taxBase;
      vat21 = taxValue;
    } else if (rate > 0) {
      otherTaxes.push({
        type: `IVA ${rate}%`,
        base: taxBase,
        quota: taxValue
      });
    }
  }

  // Extraer líneas
  const lines: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    amount: number;
  }> = [];

  const lineItems = prediction.line_items || [];
  for (const item of lineItems) {
    const desc = item.description?.value ?? 'Sin descripción';
    const qty = item.quantity?.value ?? null;
    const price = item.unit_price?.value ?? null;
    const amount = item.total_amount?.value ?? 0;
    
    lines.push({
      description: desc,
      quantity: qty,
      unit_price: price,
      amount
    });
  }

  // Calcular confidence global
  const confidenceByField: Record<string, number> = {
    'issuer.vat_id': supplierVAT.confidence * 100,
    'issuer.name': supplierName.confidence * 100,
    'invoice_number': invoiceNumber.confidence * 100,
    'issue_date': invoiceDate.confidence * 100,
    'totals.total': totalAmount.confidence * 100
  };

  const criticalFields = [
    supplierVAT.confidence,
    invoiceNumber.confidence,
    invoiceDate.confidence,
    totalAmount.confidence
  ];

  const avgConfidence = criticalFields.reduce((sum, c) => sum + c, 0) / criticalFields.length;
  const confidenceScore = Math.round(avgConfidence * 100);

  console.log(`[Mindee Adapter] Confidence: ${confidenceScore}%`);

  // Construir resultado final
  const data: EnhancedInvoiceData = {
    document_type: documentType,
    issuer: {
      name: supplierName.value || '',
      vat_id: supplierVAT.value
    },
    receiver: {
      name: null,
      vat_id: null,
      address: null
    },
    invoice_number: invoiceNumber.value || '',
    issue_date: invoiceDate.value || '',
    due_date: dueDate.value,
    totals: {
      currency: 'EUR',
      base_10: base10,
      vat_10: vat10,
      base_21: base21,
      vat_21: vat21,
      other_taxes: otherTaxes,
      total: totalAmount.value || 0
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
