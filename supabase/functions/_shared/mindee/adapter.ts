// ============================================================================
// MINDEE ADAPTER - Convierte respuesta Mindee → EnhancedInvoiceData
// ============================================================================

import type { MindeeAPIResponse, MindeePrediction, MindeeTax } from './types.ts';
import type { EnhancedInvoiceData } from '../ocr/types.ts';

/**
 * Extrae la base imponible de un tipo de IVA específico
 */
function extractVATBase(prediction: MindeePrediction, targetRate: number): number | null {
  const tax = prediction.taxes.find(t => 
    t.rate !== null && Math.abs(t.rate - targetRate) < 0.01
  );
  
  return tax?.base || null;
}

/**
 * Extrae la cuota de IVA de un tipo de IVA específico
 */
function extractVATAmount(prediction: MindeePrediction, targetRate: number): number | null {
  const tax = prediction.taxes.find(t => 
    t.rate !== null && Math.abs(t.rate - targetRate) < 0.01
  );
  
  return tax?.value || null;
}

/**
 * Extrae otros impuestos (que no sean IVA 10% o 21%)
 */
function extractOtherTaxes(prediction: MindeePrediction): Array<{
  type: string;
  base: number;
  quota: number;
}> {
  const otherTaxes: Array<{ type: string; base: number; quota: number }> = [];
  
  for (const tax of prediction.taxes) {
    const rate = tax.rate || 0;
    
    // Ignorar IVA 10% y 21% (ya procesados)
    if (Math.abs(rate - 10) < 0.01 || Math.abs(rate - 21) < 0.01) {
      continue;
    }
    
    // Agregar otros impuestos (IVA 4%, IGIC, IRPF, etc.)
    if (tax.base !== null && tax.value !== null) {
      otherTaxes.push({
        type: `${tax.code || 'IMP'} ${rate}%`,
        base: tax.base,
        quota: tax.value,
      });
    }
  }
  
  return otherTaxes;
}

/**
 * Normaliza NIF/CIF español extraído por Mindee
 */
function normalizeSpanishVAT(registrations: Array<{ value: string; type: string }>): string | null {
  for (const reg of registrations) {
    const value = reg.value?.trim().toUpperCase().replace(/\s/g, '');
    
    // Validar formato español (letra + 8 dígitos o 8 dígitos + letra)
    if (/^[A-Z]\d{8}$/.test(value) || /^\d{8}[A-Z]$/.test(value)) {
      return value;
    }
  }
  
  return registrations[0]?.value || null;
}

/**
 * Convierte respuesta de Mindee a formato interno EnhancedInvoiceData
 */
export function adaptMindeeToStandard(
  mindeeResponse: MindeeAPIResponse
): EnhancedInvoiceData {
  const prediction = mindeeResponse.document.inference.prediction;
  
  console.log('[Mindee Adapter] Adaptando respuesta:', {
    documentId: mindeeResponse.document.id,
    confidence: prediction.confidence,
    supplierName: prediction.supplier_name.value,
    totalAmount: prediction.total_amount.value,
  });

  // Extraer NIF/CIF del proveedor
  const supplierVatId = normalizeSpanishVAT(
    prediction.supplier_company_registrations || []
  );

  // Extraer NIF/CIF del cliente (receptor)
  const customerVatId = normalizeSpanishVAT(
    prediction.customer_company_registrations || []
  );

  // Calcular bases y cuotas de IVA
  const base_10 = extractVATBase(prediction, 10);
  const vat_10 = extractVATAmount(prediction, 10);
  const base_21 = extractVATBase(prediction, 21);
  const vat_21 = extractVATAmount(prediction, 21);

  // Extraer otros impuestos
  const other_taxes = extractOtherTaxes(prediction);

  // Adaptar líneas de detalle
  const lines = prediction.line_items?.map((item, idx) => ({
    description: item.description || `Línea ${idx + 1}`,
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    amount: item.total_amount || 0,
    tax_rate: item.tax_rate || null,
    tax_amount: item.tax_amount || null,
  })) || [];

  // Construir objeto EnhancedInvoiceData
  const adapted: EnhancedInvoiceData = {
    document_type: 'invoice', // Mindee no distingue automáticamente facturas vs. abonos
    
    invoice_number: prediction.invoice_number.value || 'SIN-NUMERO',
    issue_date: prediction.invoice_date.value || new Date().toISOString().split('T')[0],
    due_date: prediction.due_date.value || null,
    
    issuer: {
      name: prediction.supplier_name.value || 'PROVEEDOR DESCONOCIDO',
      vat_id: supplierVatId,
    },
    
    receiver: {
      name: prediction.customer_name.value || null,
      vat_id: customerVatId,
      address: prediction.customer_address.value || null,
    },
    
    totals: {
      currency: prediction.currency.value || 'EUR',
      total: prediction.total_amount.value || 0,
      base_10,
      vat_10,
      base_21,
      vat_21,
      other_taxes,
    },
    
    lines,
    
    centre_hint: null,
    payment_method: null,
    
    confidence_notes: [
      `Mindee confidence: ${prediction.confidence.toFixed(2)}%`,
      supplierVatId ? 'VAT ID extraído correctamente' : 'VAT ID no encontrado',
    ],
    confidence_score: prediction.confidence,
    discrepancies: [],
    proposed_fix: null,
  };

  console.log('[Mindee Adapter] ✓ Adaptación completada:', {
    invoiceNumber: adapted.invoice_number,
    supplierVatId: adapted.issuer.vat_id,
    total: adapted.totals.total,
    base_10: adapted.totals.base_10,
    vat_10: adapted.totals.vat_10,
    base_21: adapted.totals.base_21,
    vat_21: adapted.totals.vat_21,
    linesCount: adapted.lines.length,
  });

  return adapted;
}

/**
 * Extrae metadatos adicionales de Mindee para logging
 */
export function extractMindeeMetadata(mindeeResponse: MindeeAPIResponse) {
  return {
    mindee_document_id: mindeeResponse.document.id,
    mindee_confidence: mindeeResponse.document.inference.prediction.confidence,
    mindee_pages: mindeeResponse.document.n_pages,
    mindee_product_version: mindeeResponse.document.inference.product.version,
    mindee_started_at: mindeeResponse.document.inference.started_at,
    mindee_finished_at: mindeeResponse.document.inference.finished_at,
    mindee_processing_time: mindeeResponse.document.inference.processing_time,
  };
}
