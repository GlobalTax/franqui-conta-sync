// ============================================================================
// GL VALIDATOR - Invoice entry validation for posting
// ============================================================================

import type { EnhancedInvoiceData } from "../ocr/types.ts";
import type { APMappingResult } from "../ap/mapping-engine.ts";

export interface EntryPreviewLine {
  account: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string;
  centre_id?: string;
  line_number: number;
}

export interface InvoiceEntryValidationResult {
  ready_to_post: boolean;
  blocking_issues: string[];
  warnings: string[];
  confidence_score: number;
  post_preview: EntryPreviewLine[];
  validation_details: {
    invoice_data_valid: boolean;
    totals_match: boolean;
    ap_suggestions_valid: boolean;
    preview_balanced: boolean;
    fiscal_year_open: boolean;
  };
}

export function validateInvoiceEntry(input: {
  normalized_invoice: EnhancedInvoiceData;
  ap_mapping: APMappingResult;
  centro_code: string;
}): InvoiceEntryValidationResult {
  
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  let confidenceScore = 100;
  
  // Validar campos obligatorios
  if (!input.normalized_invoice.issuer.vat_id) {
    blockingIssues.push('NIF/CIF del emisor es obligatorio');
    confidenceScore -= 30;
  }
  
  if (!input.normalized_invoice.invoice_number || input.normalized_invoice.invoice_number.trim() === '') {
    blockingIssues.push('Número de factura es obligatorio');
    confidenceScore -= 20;
  }
  
  if (!input.normalized_invoice.issue_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.normalized_invoice.issue_date)) {
    blockingIssues.push('Fecha de emisión obligatoria (formato YYYY-MM-DD)');
    confidenceScore -= 20;
  }
  
  if (input.normalized_invoice.totals.total <= 0) {
    blockingIssues.push('El total de la factura debe ser mayor a 0');
    confidenceScore -= 25;
  }
  
  // Validar cálculos fiscales
  const totals = input.normalized_invoice.totals;
  const calculatedTotal = 
    (totals.base_10 || 0) + 
    (totals.vat_10 || 0) + 
    (totals.base_21 || 0) + 
    (totals.vat_21 || 0) + 
    totals.other_taxes.reduce((sum, t) => sum + t.base + t.quota, 0);
  
  const diff = Math.abs(calculatedTotal - totals.total);
  
  if (diff > 0.01) {
    blockingIssues.push(
      `Los totales no cuadran: calculado ${calculatedTotal.toFixed(2)}€, ` +
      `declarado ${totals.total.toFixed(2)}€ (diferencia: ${diff.toFixed(2)}€)`
    );
    confidenceScore -= 25;
  } else if (diff > 0.001 && diff <= 0.01) {
    warnings.push(`Pequeña diferencia de redondeo: ${diff.toFixed(3)}€`);
    confidenceScore -= 2;
  }
  
  // Validar sugerencias AP
  if (input.ap_mapping.invoice_level.confidence_score < 50) {
    warnings.push(
      'Baja confianza en la sugerencia de cuenta AP ' +
      `(${input.ap_mapping.invoice_level.confidence_score}%)`
    );
    confidenceScore -= 15;
  } else if (input.ap_mapping.invoice_level.confidence_score < 80) {
    warnings.push(
      'Confianza media en la sugerencia de cuenta AP ' +
      `(${input.ap_mapping.invoice_level.confidence_score}%)`
    );
    confidenceScore -= 10;
  }
  
  const expenseAccount = input.ap_mapping.invoice_level.account_suggestion;
  if (!expenseAccount || !expenseAccount.startsWith('6')) {
    blockingIssues.push(
      `Cuenta de gasto inválida: ${expenseAccount || 'vacía'} (debe ser 6xx)`
    );
    confidenceScore -= 20;
  }
  
  // Generar preview del asiento
  const preview: EntryPreviewLine[] = [];
  let lineNumber = 1;
  
  const isInvoice = input.normalized_invoice.document_type === 'invoice';
  
  // Gastos (Bases)
  const baseTotal = 
    (totals.base_10 || 0) + 
    (totals.base_21 || 0) + 
    totals.other_taxes.filter(t => !t.type.toLowerCase().includes('irpf')).reduce((sum, t) => sum + t.base, 0);
  
  if (baseTotal !== 0) {
    preview.push({
      account: expenseAccount,
      account_name: input.ap_mapping.invoice_level.rationale,
      debit: isInvoice ? baseTotal : 0,
      credit: isInvoice ? 0 : Math.abs(baseTotal),
      description: `Compras - ${input.normalized_invoice.issuer.name || 'Proveedor'}`,
      centre_id: input.ap_mapping.invoice_level.centre_id || undefined,
      line_number: lineNumber++
    });
  }
  
  // IVA Soportado
  const vatTotal = 
    (totals.vat_10 || 0) + 
    (totals.vat_21 || 0) + 
    totals.other_taxes.filter(t => !t.type.toLowerCase().includes('irpf')).reduce((sum, t) => sum + t.quota, 0);
  
  if (vatTotal !== 0) {
    preview.push({
      account: input.ap_mapping.invoice_level.tax_account,
      account_name: 'IVA Soportado',
      debit: isInvoice ? vatTotal : 0,
      credit: isInvoice ? 0 : Math.abs(vatTotal),
      description: 'IVA soportado',
      line_number: lineNumber++
    });
  }
  
  // IRPF si existe
  const irpfTaxes = totals.other_taxes.filter(t => t.type.toLowerCase().includes('irpf'));
  const irpfTotal = irpfTaxes.reduce((sum, t) => sum + t.quota, 0);
  
  if (irpfTotal !== 0) {
    preview.push({
      account: '4730000',
      account_name: 'HP retenciones practicadas',
      debit: isInvoice ? 0 : Math.abs(irpfTotal),
      credit: isInvoice ? irpfTotal : 0,
      description: 'IRPF retenido',
      line_number: lineNumber++
    });
  }
  
  // Proveedores
  const netPayable = totals.total - irpfTotal;
  preview.push({
    account: input.ap_mapping.invoice_level.ap_account,
    account_name: 'Proveedores',
    debit: isInvoice ? 0 : Math.abs(netPayable),
    credit: isInvoice ? netPayable : 0,
    description: `${input.normalized_invoice.issuer.name || 'Proveedor'} - ${input.normalized_invoice.invoice_number}`,
    line_number: lineNumber++
  });
  
  // Validar cuadre del preview
  const totalDebit = preview.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = preview.reduce((sum, line) => sum + line.credit, 0);
  const previewDiff = Math.abs(totalDebit - totalCredit);
  const previewBalanced = previewDiff < 0.01;
  
  if (!previewBalanced) {
    blockingIssues.push(
      `Preview del asiento no cuadrado: Debe ${totalDebit.toFixed(2)}€, ` +
      `Haber ${totalCredit.toFixed(2)}€ (diferencia: ${previewDiff.toFixed(2)}€)`
    );
    confidenceScore -= 30;
  }
  
  const readyToPost = blockingIssues.length === 0 && previewBalanced && confidenceScore >= 50;
  
  return {
    ready_to_post: readyToPost,
    blocking_issues: blockingIssues,
    warnings,
    confidence_score: Math.max(0, Math.min(100, confidenceScore)),
    post_preview: preview,
    validation_details: {
      invoice_data_valid: !blockingIssues.some(i => i.includes('obligatorio') || i.includes('formato')),
      totals_match: diff <= 0.01,
      ap_suggestions_valid: input.ap_mapping.invoice_level.confidence_score >= 50,
      preview_balanced: previewBalanced,
      fiscal_year_open: true
    }
  };
}
