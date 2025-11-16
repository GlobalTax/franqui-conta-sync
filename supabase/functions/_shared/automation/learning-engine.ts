// ============================================================================
// LEARNING ENGINE - Aprende de correcciones para mejorar mapping
// ============================================================================

export interface CorrectionInput {
  invoice_id: string;
  supplier_id: string | null;
  supplier_vat: string | null;
  invoice_description: string;
  invoice_total: number;
  
  original_expense_account: string | null;
  original_tax_account: string | null;
  original_ap_account: string | null;
  original_confidence: number;
  
  corrected_expense_account: string;
  corrected_tax_account: string;
  corrected_ap_account: string;
  
  corrected_by: string;
  correction_reason?: string;
}

export async function recordCorrection(
  correction: CorrectionInput,
  supabase: any
): Promise<{ success: boolean; pattern_detected?: boolean; pattern_id?: string }> {
  
  try {
    const { data, error } = await supabase
      .from('ap_learning_corrections')
      .insert({
        invoice_id: correction.invoice_id,
        supplier_id: correction.supplier_id,
        supplier_vat: correction.supplier_vat,
        invoice_description: correction.invoice_description,
        invoice_total: correction.invoice_total,
        
        original_expense_account: correction.original_expense_account,
        original_tax_account: correction.original_tax_account,
        original_ap_account: correction.original_ap_account,
        original_confidence: correction.original_confidence,
        
        corrected_expense_account: correction.corrected_expense_account,
        corrected_tax_account: correction.corrected_tax_account,
        corrected_ap_account: correction.corrected_ap_account,
        
        corrected_by: correction.corrected_by,
        correction_reason: correction.correction_reason,
      })
      .select('id, pattern_detected, pattern_id')
      .single();
    
    if (error) throw error;
    
    console.log('[Learning] Correction recorded:', {
      correction_id: data.id,
      pattern_detected: data.pattern_detected,
    });
    
    return {
      success: true,
      pattern_detected: data.pattern_detected,
      pattern_id: data.pattern_id,
    };
    
  } catch (error) {
    console.error('[Learning] Error:', error);
    return { success: false };
  }
}

export async function getLearnedPatterns(
  supplierId: string,
  supabase: any
): Promise<any[]> {
  
  const { data, error } = await supabase
    .from('ap_learned_patterns')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .order('confidence_score', { ascending: false });
  
  if (error) {
    console.error('[Learning] Error fetching patterns:', error);
    return [];
  }
  
  return data || [];
}

export async function applyLearnedPatterns(
  supplierId: string,
  invoiceAmount: number,
  supabase: any
): Promise<{
  account_suggestion: string;
  tax_account: string;
  ap_account: string;
  confidence_score: number;
  rationale: string;
} | null> {
  
  const patterns = await getLearnedPatterns(supplierId, supabase);
  
  if (patterns.length === 0) {
    return null;
  }
  
  const matchingPattern = patterns.find(p => {
    if (p.amount_range_min && p.amount_range_max) {
      return invoiceAmount >= p.amount_range_min && invoiceAmount <= p.amount_range_max;
    }
    return true;
  });
  
  const selectedPattern = matchingPattern || patterns[0];
  
  return {
    account_suggestion: selectedPattern.learned_expense_account,
    tax_account: selectedPattern.learned_tax_account,
    ap_account: selectedPattern.learned_ap_account,
    confidence_score: selectedPattern.confidence_score,
    rationale: `🧠 Patrón aprendido (${selectedPattern.occurrence_count} correcciones)`,
  };
}
