// ============================================================================
// TIPOS TYPESCRIPT PARA SISTEMA DE P&L BASADO EN REGLAS
// ============================================================================

export interface PLTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PLRubric {
  id: string;
  template_id: string;
  code: string;
  name: string;
  parent_code?: string;
  level: number;
  sort: number;
  sign: 'normal' | 'invert';
  is_total: boolean;
  formula?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PLRuleMatchKind = 
  | 'account_exact' 
  | 'account_like' 
  | 'account_range' 
  | 'group' 
  | 'channel' 
  | 'centre';

export interface PLRule {
  id: string;
  template_id: string;
  rubric_code: string;
  priority: number;
  match_kind: PLRuleMatchKind;
  account?: string;
  account_like?: string;
  account_from?: string;
  account_to?: string;
  group_code?: string;
  channel?: string;
  centre_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PLReportLine {
  rubric_code: string;
  rubric_name: string;
  parent_code?: string;
  level: number;
  sort: number;
  is_total: boolean;
  amount: number;
  sign: 'normal' | 'invert';
  percentage?: number;
}

export interface PLReportSummary {
  totalIncome: number;
  totalExpenses: number;
  grossMargin: number;
  ebitda: number;
  ebit: number;
  netResult: number;
  grossMarginPercent: number;
  ebitdaMarginPercent: number;
  ebitMarginPercent: number;
  netMarginPercent: number;
}

export interface UnmappedAccount {
  company_id: string;
  centro_code: string;
  period_month: string;
  account_code: string;
  account_name: string;
  amount: number;
}

export interface PLReportParams {
  templateCode: string;
  companyId?: string;
  centroCode?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreatePLRuleInput {
  template_id: string;
  rubric_code: string;
  priority: number;
  match_kind: PLRuleMatchKind;
  account?: string;
  account_like?: string;
  account_from?: string;
  account_to?: string;
  group_code?: string;
  channel?: string;
  centre_id?: string;
  notes?: string;
}

export interface UpdatePLRuleInput extends Partial<CreatePLRuleInput> {
  id: string;
}
