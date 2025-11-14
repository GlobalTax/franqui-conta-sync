// ============================================================================
// OPENAI ADAPTER - Normalizes and validates OpenAI Vision responses
// ============================================================================

import type { EnhancedInvoiceData, OpenAIExtractionResult } from "./types.ts";
import { validateSpanishVAT, normalizeNIF, validateDateFormat } from "./validators.ts";

/**
 * Adapta respuesta de OpenAI al formato estándar con validación robusta
 * Similar a Mindee adapter pero con tax aggregation post-LLM
 */
export function adaptOpenAIToStandard(
  rawResponse: any
): OpenAIExtractionResult {
  
  console.log('[OpenAI Adapter] Processing response...');
  
  // Parse JSON con try/catch robusto
  let extracted: any;
  try {
    const content = rawResponse.choices[0].message.content;
    extracted = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (error) {
    console.error('[OpenAI Adapter] JSON parsing failed:', error);
    throw new Error('OpenAI response is not valid JSON');
  }

  // Destructuring de campos principales (soporte ambos formatos: issuer/receiver y supplier/customer)
  const data = extracted.data || extracted;
  const issuer = data.issuer || data.supplier || {};
  const receiver = data.recipient || data.receiver || data.customer || {};
  const invoice = data.invoice || {};
  const fees = data.fees || {};
  const totals_by_vat = data.totals_by_vat || [];
  const totals_by_group = data.totals_by_group || [];
  const lines = data.lines || [];
  const totals = data.totals || {};
  
  const supplierName = issuer.name || '';
  const supplierVAT = normalizeNIF(issuer.vat_id || issuer.tax_id) || null;
  const invoiceNumber = invoice.number || data.invoice_number || '';
  const issueDate = invoice.issue_date || data.issue_date || '';
  const dueDate = invoice.due_date || data.due_date || null;
  const deliveryDate = invoice.delivery_date || data.delivery_date || null;
  const totalAmount = parseFloat(data.grand_total || totals.total || '0');

  // Detectar tipo de documento (credit notes)
  let documentType: "invoice" | "credit_note" | "ticket" = data.document_type || "invoice";
  const invNumberLower = invoiceNumber.toLowerCase();
  if (invNumberLower.includes('abono') || 
      invNumberLower.includes('credit') ||
      invNumberLower.includes('nc-') ||
      invNumberLower.includes('a-') ||
      invNumberLower.includes('ab-')) {
    documentType = "credit_note";
  }

  // TAX AGGREGATION from enhanced schema (totals_by_vat array)
  let base10 = totals.base_10 || 0;
  let vat10 = totals.vat_10 || 0;
  let base21 = totals.base_21 || 0;
  let vat21 = totals.vat_21 || 0;
  const otherTaxes: Array<{ type: string; base: number; quota: number }> = 
    totals.other_taxes || [];

  // Parse totals_by_vat array from enhanced schema
  if (totals_by_vat && totals_by_vat.length > 0) {
    for (const vatEntry of totals_by_vat) {
      const rate = vatEntry.rate || vatEntry.code || '';
      const base = parseFloat(vatEntry.base || '0');
      const tax = parseFloat(vatEntry.tax || '0');
      
      if (rate.includes('10')) {
        base10 += base;
        vat10 += tax;
      } else if (rate.includes('21')) {
        base21 += base;
        vat21 += tax;
      } else if (rate.includes('4')) {
        // IVA reducido 4% → other_taxes
        otherTaxes.push({
          type: `IVA ${rate}%`,
          base,
          quota: tax
        });
      }
    }
  }

  // Si el LLM puso IVA 10% o 21% en other_taxes, moverlos a campos principales
  const remaining: Array<{ type: string; base: number; quota: number }> = [];
  
  for (const tax of otherTaxes) {
    const typeLower = tax.type.toLowerCase();
    if (typeLower.includes('10') || typeLower.includes('diez')) {
      base10 += tax.base || 0;
      vat10 += tax.quota || 0;
    } else if (typeLower.includes('21') || typeLower.includes('veintiuno')) {
      base21 += tax.base || 0;
      vat21 += tax.quota || 0;
    } else {
      remaining.push(tax);
    }
  }

  // Convertir 0 a null para campos de IVA no presentes
  const finalBase10 = base10 > 0 ? Math.round(base10 * 100) / 100 : null;
  const finalVat10 = vat10 > 0 ? Math.round(vat10 * 100) / 100 : null;
  const finalBase21 = base21 > 0 ? Math.round(base21 * 100) / 100 : null;
  const finalVat21 = vat21 > 0 ? Math.round(vat21 * 100) / 100 : null;
  
  // Extract green_point fee if present
  const greenPoint = fees.green_point ? parseFloat(fees.green_point) : null;

  // Validar que base + IVA ≈ total (tolerancia ±1€)
  const calculatedTotal = (finalBase10 || 0) + (finalVat10 || 0) + 
                          (finalBase21 || 0) + (finalVat21 || 0) +
                          remaining.reduce((sum, t) => sum + t.base + t.quota, 0);
  const totalDiscrepancy = Math.abs(calculatedTotal - totalAmount);
  
  if (totalDiscrepancy > 1) {
    console.warn(`[OpenAI Adapter] Tax total discrepancy: ${totalDiscrepancy.toFixed(2)}€`);
  }

  // VALIDACIÓN DE NIF
  const nifValid = validateSpanishVAT(supplierVAT);
  const nifConfidence = nifValid ? 95 : (supplierVAT ? 30 : 0);
  
  if (!nifValid && supplierVAT) {
    console.warn(`[OpenAI Adapter] Invalid NIF: ${supplierVAT}`);
  }

  // VALIDACIÓN DE FECHA
  const dateValid = validateDateFormat(issueDate);
  const dateConfidence = dateValid ? 95 : (issueDate ? 40 : 0);
  
  if (!dateValid && issueDate) {
    console.warn(`[OpenAI Adapter] Invalid date format: ${issueDate}`);
  }

  // Normalizar lines con campos extendidos
  const normalizedLines = lines.map((line: any) => ({
    description: line.description || line.name || '',
    quantity: line.quantity || line.qty || null,
    unit_price: line.unit_price || line.price || null,
    amount: line.amount || line.total || 0,
    uom: line.uom || line.unit || null,
    group: line.group || line.category || null,
    vat_code: line.vat_code || line.tax_code || null
  }));

  // CALCULAR CONFIDENCE_BY_FIELD basado en validación real
  const hasInvoiceNumber = invoiceNumber.length > 0;
  const hasTotal = totalAmount > 0;
  const hasLines = normalizedLines.length > 0;

  const confidenceByField: Record<string, number> = {
    'issuer.vat_id': nifConfidence,
    'issuer.name': supplierName.length > 0 ? 85 : 0,
    'invoice_number': hasInvoiceNumber ? 90 : 0,
    'issue_date': dateConfidence,
    'totals.total': hasTotal ? 95 : 0
  };

  // Confidence global: promedio ponderado de campos críticos
  const criticalFields = [
    nifConfidence,
    hasInvoiceNumber ? 90 : 0,
    dateConfidence,
    hasTotal ? 95 : 0
  ];

  const avgConfidence = criticalFields.reduce((sum, c) => sum + c, 0) / criticalFields.length;
  const confidenceScore = Math.round(avgConfidence);

  console.log(`[OpenAI Adapter] Final confidence: ${confidenceScore}%`);

  // Construir resultado final con campos extendidos
  const finalData: EnhancedInvoiceData = {
    document_type: documentType,
    issuer: {
      name: supplierName,
      vat_id: supplierVAT
    },
    receiver: {
      name: receiver.name || null,
      vat_id: normalizeNIF(receiver.vat_id) || null,
      address: receiver.address || null
    },
    invoice_number: invoiceNumber,
    issue_date: issueDate,
    due_date: dueDate,
    totals: {
      currency: 'EUR',
      base_10: finalBase10,
      vat_10: finalVat10,
      base_21: finalBase21,
      vat_21: finalVat21,
      other_taxes: remaining,
      total: totalAmount
    },
    lines: normalizedLines,
    centre_hint: data.centre_hint || null,
    payment_method: data.payment_method || null,
    confidence_notes: [],
    confidence_score: confidenceScore,
    discrepancies: [],
    proposed_fix: null
  };

  // Extract usage data
  const usage = rawResponse.usage || {};
  const tokensIn = usage.prompt_tokens || 0;
  const tokensOut = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || tokensIn + tokensOut;
  
  const costPer1kTokens = 0.00015;
  const estimatedCostEur = (totalTokens / 1000) * costPer1kTokens;

  return {
    data: finalData,
    confidence_score: confidenceScore,
    confidence_by_field: confidenceByField,
    raw_response: rawResponse,
    usage: {
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      total_tokens: totalTokens,
      estimated_cost_eur: estimatedCostEur
    }
  };
}
