// ============================================================================
// MINDEE ADAPTER - Convierte respuesta Mindee → EnhancedInvoiceData
// ============================================================================

import type { MindeeAPIResponse, MindeePrediction, MindeeTax } from './types.ts';
import type { EnhancedInvoiceData } from '../ocr/types.ts';
import {
  parseEuropeanNumber,
  extractCustomerDataFromRawText,
  extractTaxBreakdownFromText,
  calculateFieldConfidence,
  validateTotals,
  type TaxBreakdown,
} from './parsers.ts';

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
 * Integra parsers críticos europeos y fallbacks OCR
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

  // === CRITICAL PARSERS INTEGRATION ===
  
  // Flags de fallback
  let fallbackFlags = {
    europeanNumbers: false,
    customerFromOCR: false,
    taxBreakdownFromOCR: false,
  };

  // Extraer NIF/CIF del proveedor
  const supplierVatId = normalizeSpanishVAT(
    prediction.supplier_company_registrations || []
  );

  // PARSER 2: Customer data con fallback OCR
  let customerVatId = normalizeSpanishVAT(
    prediction.customer_company_registrations || []
  );
  let customerName = prediction.customer_name.value || null;

  // Fallback si Mindee no detectó customer
  if (!customerVatId && supplierVatId) {
    const customerFromOCR = extractCustomerDataFromRawText(mindeeResponse, supplierVatId);
    if (customerFromOCR.taxId) {
      customerVatId = customerFromOCR.taxId;
      customerName = customerFromOCR.name || customerName;
      fallbackFlags.customerFromOCR = true;
      
      console.log('[Mindee Adapter] ⚠️ Usando customer desde OCR fallback:', {
        taxId: customerVatId,
        name: customerName,
        confidence: customerFromOCR.confidence,
      });
    }
  }

  // PARSER 1: Corregir números europeos en totales
  let rawTotal = prediction.total_amount.value || 0;
  let rawNet = prediction.total_net?.value || 0;
  let rawTax = prediction.total_tax?.value || 0;

  const correctedTotal = parseEuropeanNumber(rawTotal);
  const correctedNet = parseEuropeanNumber(rawNet);
  const correctedTax = parseEuropeanNumber(rawTax);

  if (correctedTotal !== rawTotal || correctedNet !== rawNet || correctedTax !== rawTax) {
    fallbackFlags.europeanNumbers = true;
    console.log('[Mindee Adapter] ⚠️ Números europeos corregidos:', {
      total: { raw: rawTotal, corrected: correctedTotal },
      net: { raw: rawNet, corrected: correctedNet },
      tax: { raw: rawTax, corrected: correctedTax },
    });
  }

  // PARSER 3: Tax breakdown con fallback OCR
  let base_10 = parseEuropeanNumber(extractVATBase(prediction, 10));
  let vat_10 = parseEuropeanNumber(extractVATAmount(prediction, 10));
  let base_21 = parseEuropeanNumber(extractVATBase(prediction, 21));
  let vat_21 = parseEuropeanNumber(extractVATAmount(prediction, 21));
  let other_taxes = extractOtherTaxes(prediction);

  // Fallback si Mindee no detectó IVA correctamente
  if (!base_10 && !base_21 && prediction.taxes.length === 0) {
    const rawText = mindeeResponse?.document?.inference?.pages?.[0]?.extras?.full_text_ocr?.content || '';
    
    if (rawText) {
      const taxBreakdowns = extractTaxBreakdownFromText(rawText);
      
      if (taxBreakdowns.length > 0) {
        fallbackFlags.taxBreakdownFromOCR = true;
        
        console.log('[Mindee Adapter] ⚠️ Usando tax breakdown desde OCR fallback:', {
          linesFound: taxBreakdowns.length,
        });

        // Mapear a estructura other_taxes
        other_taxes = taxBreakdowns.map(b => ({
          type: `${b.tax_code} ${b.tax_rate}%`,
          base: b.tax_base,
          quota: b.tax_amount,
        }));

        // Separar IVA 10% y 21%
        const iva10 = taxBreakdowns.find(b => Math.abs(b.tax_rate - 10) < 0.01);
        const iva21 = taxBreakdowns.find(b => Math.abs(b.tax_rate - 21) < 0.01);
        
        if (iva10) {
          base_10 = iva10.tax_base;
          vat_10 = iva10.tax_amount;
          // Remover de other_taxes
          other_taxes = other_taxes.filter(t => !t.type.includes('10'));
        }
        
        if (iva21) {
          base_21 = iva21.tax_base;
          vat_21 = iva21.tax_amount;
          // Remover de other_taxes
          other_taxes = other_taxes.filter(t => !t.type.includes('21'));
        }
      }
    }
  }

  // Adaptar líneas de detalle (con parser europeo)
  const lines = prediction.line_items?.map((item, idx) => ({
    description: item.description || `Línea ${idx + 1}`,
    quantity: parseEuropeanNumber(item.quantity) || 1,
    unit_price: parseEuropeanNumber(item.unit_price) || 0,
    amount: parseEuropeanNumber(item.total_amount) || 0,
    tax_rate: item.tax_rate || null,
    tax_amount: parseEuropeanNumber(item.tax_amount) || null,
  })) || [];

  // Validar totales
  const totalFromLines = lines.reduce((sum, line) => sum + line.amount, 0);
  const totalFromTax = (base_10 || 0) + (vat_10 || 0) + (base_21 || 0) + (vat_21 || 0) +
    other_taxes.reduce((sum, t) => sum + t.base + t.quota, 0);
  
  const totalValidation = validateTotals(correctedTotal || 0, totalFromTax);

  // Construir confidence notes
  const confidenceNotes: string[] = [
    `Mindee confidence: ${prediction.confidence.toFixed(2)}%`,
    supplierVatId ? 'VAT ID proveedor extraído' : '⚠️ VAT ID proveedor no encontrado',
  ];

  if (fallbackFlags.europeanNumbers) {
    confidenceNotes.push('⚠️ Parser europeo aplicado a números');
  }
  if (fallbackFlags.customerFromOCR) {
    confidenceNotes.push('⚠️ Customer extraído desde OCR raw text');
  }
  if (fallbackFlags.taxBreakdownFromOCR) {
    confidenceNotes.push('⚠️ Tax breakdown extraído desde OCR raw text');
  }
  if (!totalValidation.isValid) {
    confidenceNotes.push(`⚠️ Discrepancia en total: ${totalValidation.discrepancy.toFixed(2)}€`);
  }

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
      name: customerName,
      vat_id: customerVatId,
      address: prediction.customer_address.value || null,
    },
    
    totals: {
      currency: prediction.currency.value || 'EUR',
      total: correctedTotal || 0,
      base_10: base_10 ?? null,
      vat_10: vat_10 ?? null,
      base_21: base_21 ?? null,
      vat_21: vat_21 ?? null,
      other_taxes,
    },
    
    lines,
    
    centre_hint: null,
    payment_method: null,
    
    confidence_notes: confidenceNotes,
    confidence_score: prediction.confidence,
    discrepancies: !totalValidation.isValid ? [
      `Total discrepancy: ${totalValidation.discrepancy.toFixed(2)}€`
    ] : [],
    proposed_fix: null,
  };

  console.log('[Mindee Adapter] ✓ Adaptación completada:', {
    invoiceNumber: adapted.invoice_number,
    supplierVatId: adapted.issuer.vat_id,
    customerVatId: adapted.receiver.vat_id,
    total: adapted.totals.total,
    base_10: adapted.totals.base_10,
    vat_10: adapted.totals.vat_10,
    base_21: adapted.totals.base_21,
    vat_21: adapted.totals.vat_21,
    linesCount: adapted.lines.length,
    fallbacks: fallbackFlags,
    totalValidation: totalValidation.isValid ? 'OK' : `⚠️ ${totalValidation.discrepancy.toFixed(2)}€`,
  });

  return adapted;
}

/**
 * Extrae metadata adicional de Mindee para BD
 * Incluye flags de fallback
 */
export function extractMindeeMetadataWithFallbacks(
  mindeeResponse: MindeeAPIResponse,
  fallbackUsed: boolean
) {
  return {
    ...extractMindeeMetadata(mindeeResponse),
    ocr_fallback_used: fallbackUsed,
    field_confidence_scores: {
      invoice_number: calculateFieldConfidence(
        mindeeResponse.document.inference.prediction.invoice_number.value,
        mindeeResponse.document.inference.prediction.invoice_number.confidence * 100,
        false
      ),
      total_amount: calculateFieldConfidence(
        mindeeResponse.document.inference.prediction.total_amount.value,
        mindeeResponse.document.inference.prediction.total_amount.confidence * 100,
        fallbackUsed
      ),
      supplier_name: calculateFieldConfidence(
        mindeeResponse.document.inference.prediction.supplier_name.value,
        mindeeResponse.document.inference.prediction.supplier_name.confidence * 100,
        false
      ),
    },
  };
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
