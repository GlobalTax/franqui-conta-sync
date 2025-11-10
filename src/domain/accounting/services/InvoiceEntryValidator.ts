// ============================================================================
// SERVICIO DE DOMINIO: InvoiceEntryValidator
// Validación de facturas antes de generar asientos contables
// ============================================================================

import { validateVATCoherence, validateVATCalculation } from '@/lib/vat-utils';
import { validateSpanishVAT } from '@/lib/ocr-utils';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedInvoiceData {
  document_type: "invoice" | "credit_note" | "ticket";
  issuer: {
    name: string;
    vat_id: string | null;
  };
  receiver: {
    name: string | null;
    vat_id: string | null;
    address: string | null;
  };
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  totals: {
    currency: string;
    base_10: number | null;
    vat_10: number | null;
    base_21: number | null;
    vat_21: number | null;
    other_taxes: Array<{
      type: string;
      base: number;
      quota: number;
    }>;
    total: number;
  };
  lines: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    amount: number;
  }>;
  centre_hint: string | null;
  payment_method: "transfer" | "card" | "cash" | null;
  confidence_notes: string[];
  confidence_score: number;
  discrepancies: string[];
  proposed_fix: {
    what: string;
    why: string;
  } | null;
}

export interface APMappingSuggestion {
  account_suggestion: string;
  tax_account: string;
  ap_account: string;
  centre_id: string | null;
  confidence_score: number;
  rationale: string;
  matched_rule_id: string | null;
  matched_rule_name: string | null;
}

export interface APMappingResult {
  invoice_level: APMappingSuggestion;
  line_level: APMappingSuggestion[];
}

export interface InvoiceEntryValidationInput {
  normalized_invoice: EnhancedInvoiceData;
  ap_mapping: APMappingResult;
  centro_code: string;
  fiscal_year_id?: string;
}

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

/**
 * Validador de asientos contables generados desde facturas
 * Valida campos obligatorios, cálculos fiscales y genera preview
 */
export class InvoiceEntryValidator {
  
  /**
   * Valida una factura normalizada y genera el preview del asiento
   */
  static async validate(
    input: InvoiceEntryValidationInput
  ): Promise<InvoiceEntryValidationResult> {
    
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    let confidenceScore = 100;
    
    // ========================================================================
    // 1. Validar campos obligatorios de la factura
    // ========================================================================
    
    if (!input.normalized_invoice.issuer.vat_id) {
      blockingIssues.push('NIF/CIF del emisor es obligatorio');
      confidenceScore -= 30;
    } else if (!validateSpanishVAT(input.normalized_invoice.issuer.vat_id)) {
      blockingIssues.push(
        `NIF/CIF del emisor inválido: ${input.normalized_invoice.issuer.vat_id}`
      );
      confidenceScore -= 25;
    }
    
    if (!input.normalized_invoice.invoice_number || 
        input.normalized_invoice.invoice_number.trim() === '') {
      blockingIssues.push('Número de factura es obligatorio');
      confidenceScore -= 20;
    }
    
    if (!input.normalized_invoice.issue_date || 
        !/^\d{4}-\d{2}-\d{2}$/.test(input.normalized_invoice.issue_date)) {
      blockingIssues.push('Fecha de emisión obligatoria (formato YYYY-MM-DD)');
      confidenceScore -= 20;
    }
    
    if (input.normalized_invoice.totals.total <= 0) {
      blockingIssues.push('El total de la factura debe ser mayor a 0');
      confidenceScore -= 25;
    }
    
    // ========================================================================
    // 2. VALIDAR EJERCICIO FISCAL ABIERTO
    // ========================================================================
    
    let fiscalYearOpen = true;
    let fiscalYearInfo: any = null;
    
    try {
      // Llamar RPC manualmente (sin tipado estricto porque es nueva función)
      const { data: fyStatus, error } = await supabase
        .rpc('check_fiscal_year_status' as any, {
          p_date: input.normalized_invoice.issue_date,
          p_centro_code: input.centro_code
        });

      if (error) {
        warnings.push(`No se pudo validar ejercicio fiscal: ${error.message}`);
      } else if (fyStatus) {
        // Parsear JSON si viene como string
        const statusData = typeof fyStatus === 'string' ? JSON.parse(fyStatus) : fyStatus;
        fiscalYearInfo = statusData;
        fiscalYearOpen = !statusData.is_closed;

        if (statusData.is_closed) {
          blockingIssues.push(
            `PERIODO_CERRADO: ${statusData.message} (Ejercicio ${statusData.year})`
          );
          confidenceScore -= 30;
        }

        if (!statusData.exists) {
          warnings.push(
            `No existe ejercicio fiscal para ${statusData.year}. Crear ejercicio antes de contabilizar.`
          );
          confidenceScore -= 15;
        }
      }
    } catch (err: any) {
      warnings.push(`Error al validar ejercicio fiscal: ${err.message}`);
    }
    
    // ========================================================================
    // 3. Validar cálculos fiscales con validateVATCoherence
    // ========================================================================
    
    const totals = input.normalized_invoice.totals;
    
    // Calcular subtotal y total IVA
    const subtotal = 
      (totals.base_10 || 0) + 
      (totals.base_21 || 0) + 
      totals.other_taxes
        .filter(t => !t.type.toLowerCase().includes('irpf'))
        .reduce((sum, t) => sum + t.base, 0);
    
    const taxTotal = 
      (totals.vat_10 || 0) + 
      (totals.vat_21 || 0) + 
      totals.other_taxes
        .filter(t => !t.type.toLowerCase().includes('irpf'))
        .reduce((sum, t) => sum + t.quota, 0);
    
    // Validar coherencia fiscal con validateVATCoherence
    const vatCheck = validateVATCoherence(subtotal, taxTotal, totals.total);
    
    if (!vatCheck.valid) {
      blockingIssues.push(`IVA_INCOHERENTE: ${vatCheck.reason}`);
      confidenceScore -= 20;
    }
    
    // Validar cálculos individuales de IVA con validateVATCalculation
    if (totals.base_21 !== null && totals.vat_21 !== null) {
      const vat21Check = validateVATCalculation(totals.base_21, totals.vat_21, 0.21);
      
      if (!vat21Check.valid) {
        warnings.push(`IVA 21%: ${vat21Check.reason}`);
        confidenceScore -= 5;
      }
    }
    
    if (totals.base_10 !== null && totals.vat_10 !== null) {
      const vat10Check = validateVATCalculation(totals.base_10, totals.vat_10, 0.10);
      
      if (!vat10Check.valid) {
        warnings.push(`IVA 10%: ${vat10Check.reason}`);
        confidenceScore -= 5;
      }
    }
    
    // ========================================================================
    // 4. Validar sugerencias AP
    // ========================================================================
    
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
    
    // Validar que la cuenta sugerida es válida (6xx para gastos)
    const expenseAccount = input.ap_mapping.invoice_level.account_suggestion;
    if (!expenseAccount || !expenseAccount.startsWith('6')) {
      blockingIssues.push(
        `Cuenta de gasto inválida: ${expenseAccount || 'vacía'} (debe ser 6xx)`
      );
      confidenceScore -= 20;
    }
    
    // Validar que las cuentas de IVA y AP son válidas
    const taxAccount = input.ap_mapping.invoice_level.tax_account;
    if (!taxAccount || !taxAccount.startsWith('472')) {
      warnings.push(`Cuenta de IVA soportado inusual: ${taxAccount} (esperado 472xxxx)`);
      confidenceScore -= 5;
    }
    
    const apAccount = input.ap_mapping.invoice_level.ap_account;
    if (!apAccount || !apAccount.startsWith('410')) {
      warnings.push(`Cuenta de proveedores inusual: ${apAccount} (esperado 410xxxx)`);
      confidenceScore -= 5;
    }
    
    // ========================================================================
    // 5. Generar preview del asiento
    // ========================================================================
    
    const preview: EntryPreviewLine[] = [];
    let lineNumber = 1;
    
    // Tipo de documento: invoice vs credit_note
    const isInvoice = input.normalized_invoice.document_type === 'invoice';
    
    // DEBE (invoice) / HABER (credit_note): Gastos (Bases)
    const baseTotal = 
      (totals.base_10 || 0) + 
      (totals.base_21 || 0) + 
      totals.other_taxes
        .filter(t => !t.type.toLowerCase().includes('irpf'))
        .reduce((sum, t) => sum + t.base, 0);
    
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
    
    // DEBE (invoice) / HABER (credit_note): IVA Soportado
    const vatTotal = 
      (totals.vat_10 || 0) + 
      (totals.vat_21 || 0) + 
      totals.other_taxes
        .filter(t => !t.type.toLowerCase().includes('irpf'))
        .reduce((sum, t) => sum + t.quota, 0);
    
    if (vatTotal !== 0) {
      preview.push({
        account: taxAccount,
        account_name: 'IVA Soportado',
        debit: isInvoice ? vatTotal : 0,
        credit: isInvoice ? 0 : Math.abs(vatTotal),
        description: 'IVA soportado',
        line_number: lineNumber++
      });
    }
    
    // Si hay IRPF, crear línea HABER (invoice) / DEBE (credit_note)
    const irpfTaxes = totals.other_taxes.filter(t => 
      t.type.toLowerCase().includes('irpf')
    );
    
    if (irpfTaxes.length > 0) {
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
    }
    
    // HABER (invoice) / DEBE (credit_note): Proveedores
    // Ajustar por IRPF si existe
    const irpfTotal = irpfTaxes.reduce((sum, t) => sum + t.quota, 0);
    const netPayable = totals.total - irpfTotal;
    
    preview.push({
      account: apAccount,
      account_name: 'Proveedores',
      debit: isInvoice ? 0 : Math.abs(netPayable),
      credit: isInvoice ? netPayable : 0,
      description: `${input.normalized_invoice.issuer.name || 'Proveedor'} - ${input.normalized_invoice.invoice_number}`,
      line_number: lineNumber++
    });
    
    // ========================================================================
    // 6. Validar que el preview está cuadrado
    // ========================================================================
    
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
    
    // ========================================================================
    // 7. Calcular ready_to_post
    // ========================================================================
    
    const readyToPost = 
      blockingIssues.length === 0 && 
      previewBalanced &&
      confidenceScore >= 50;
    
    // ========================================================================
    // 8. Retornar resultado
    // ========================================================================
    
    return {
      ready_to_post: readyToPost,
      blocking_issues: blockingIssues,
      warnings,
      confidence_score: Math.max(0, Math.min(100, confidenceScore)),
      post_preview: preview,
      validation_details: {
        invoice_data_valid: !blockingIssues.some(i => 
          i.includes('obligatorio') || i.includes('formato') || i.includes('inválido')
        ),
        totals_match: vatCheck.valid,
        ap_suggestions_valid: input.ap_mapping.invoice_level.confidence_score >= 50,
        preview_balanced: previewBalanced,
        fiscal_year_open: fiscalYearOpen
      }
    };
  }
}
