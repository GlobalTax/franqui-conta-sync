// ============================================================================
// SERVICIO DE DOMINIO: InvoiceEntryValidator
// Validación de facturas antes de generar asientos contables
// ============================================================================

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
  static validate(
    input: InvoiceEntryValidationInput
  ): InvoiceEntryValidationResult {
    
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    let confidenceScore = 100;
    
    // ========================================================================
    // 1. Validar campos obligatorios de la factura
    // ========================================================================
    
    if (!input.normalized_invoice.issuer.vat_id) {
      blockingIssues.push('NIF/CIF del emisor es obligatorio');
      confidenceScore -= 30;
    } else if (!this.isValidSpanishVAT(input.normalized_invoice.issuer.vat_id)) {
      warnings.push(`NIF/CIF del emisor tiene formato inválido: ${input.normalized_invoice.issuer.vat_id}`);
      confidenceScore -= 10;
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
    // 2. Validar cálculos fiscales (bases + IVA = total)
    // ========================================================================
    
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
    
    // Validar que los cálculos de IVA sean correctos
    if (totals.base_21 !== null && totals.vat_21 !== null) {
      const expectedVAT21 = Math.round(totals.base_21 * 0.21 * 100) / 100;
      const vatDiff = Math.abs(expectedVAT21 - totals.vat_21);
      
      if (vatDiff > 0.02) {
        warnings.push(
          `IVA 21% calculado incorrectamente: esperado ${expectedVAT21.toFixed(2)}€, ` +
          `actual ${totals.vat_21.toFixed(2)}€`
        );
        confidenceScore -= 5;
      }
    }
    
    if (totals.base_10 !== null && totals.vat_10 !== null) {
      const expectedVAT10 = Math.round(totals.base_10 * 0.10 * 100) / 100;
      const vatDiff = Math.abs(expectedVAT10 - totals.vat_10);
      
      if (vatDiff > 0.02) {
        warnings.push(
          `IVA 10% calculado incorrectamente: esperado ${expectedVAT10.toFixed(2)}€, ` +
          `actual ${totals.vat_10.toFixed(2)}€`
        );
        confidenceScore -= 5;
      }
    }
    
    // ========================================================================
    // 3. Validar sugerencias AP
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
    // 4. Generar preview del asiento
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
    // 5. Validar que el preview está cuadrado
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
    // 6. Calcular ready_to_post
    // ========================================================================
    
    const readyToPost = 
      blockingIssues.length === 0 && 
      previewBalanced &&
      confidenceScore >= 50;
    
    // ========================================================================
    // 7. Retornar resultado
    // ========================================================================
    
    return {
      ready_to_post: readyToPost,
      blocking_issues: blockingIssues,
      warnings,
      confidence_score: Math.max(0, Math.min(100, confidenceScore)),
      post_preview: preview,
      validation_details: {
        invoice_data_valid: !blockingIssues.some(i => 
          i.includes('obligatorio') || i.includes('formato')
        ),
        totals_match: diff <= 0.01,
        ap_suggestions_valid: input.ap_mapping.invoice_level.confidence_score >= 50,
        preview_balanced: previewBalanced,
        fiscal_year_open: true // Por ahora asumimos que sí, se valida en backend
      }
    };
  }
  
  /**
   * Valida formato de NIF/CIF español (simplificado)
   */
  private static isValidSpanishVAT(vat: string): boolean {
    if (!vat) return false;
    
    const cleanVAT = vat.toUpperCase().replace(/[\s\-\.]/g, '');
    if (cleanVAT.length !== 9) return false;
    
    // Debe empezar con letra o número
    return /^[A-Z0-9]/.test(cleanVAT);
  }
}
