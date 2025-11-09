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

export interface PLReportLineAccumulated extends Omit<PLReportLine, 'amount' | 'percentage'> {
  amount_period: number;     // Importe del mes
  amount_ytd: number;         // Importe acumulado año
  percentage_period: number;  // % sobre ventas del mes
  percentage_ytd: number;     // % sobre ventas acumuladas año
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
  centroCodes?: string[]; // Para consolidado multi-restaurante
  startDate?: string;
  endDate?: string;
  showAccumulated?: boolean; // Vista dual (mes + acumulado)
  periodDate?: string; // Fecha del mes para vista acumulada (YYYY-MM-DD)
  includeAdjustments?: boolean; // Vista con ajustes manuales
}

// Ajuste manual
export interface PLAdjustment {
  id: string;
  company_id?: string;
  centro_code: string;
  template_code: string;
  rubric_code: string;
  period_date: string; // YYYY-MM-DD
  adjustment_amount: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Línea de P&L con ajustes manuales
export interface PLReportLineWithAdjustments extends Omit<PLReportLine, 'amount'> {
  amount_calculated: number;  // Calculado automáticamente
  amount_adjustment: number;   // Ajuste manual (A Sumar)
  amount_final: number;        // Total final
  amount: number;              // Para compatibilidad (igual a amount_final)
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
