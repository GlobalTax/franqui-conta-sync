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

export interface LearningPattern {
  id: string;
  supplier_id: string;
  learned_expense_account: string;
  learned_tax_account: string;
  learned_ap_account: string;
  occurrence_count: number;
  confidence_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
