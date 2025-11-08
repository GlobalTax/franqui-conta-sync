// Vencimientos y efectos
export interface PaymentTerm {
  id: string;
  centro_code: string;
  invoice_id: string | null;
  invoice_type: 'issued' | 'received' | null;
  concept: string;
  document_type: 'factura' | 'pagare' | 'letra' | 'transferencia' | 'efectivo' | 'tarjeta';
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'remitted';
  paid_amount: number;
  paid_date: string | null;
  bank_account_id: string | null;
  remittance_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Remesas bancarias
export interface BankRemittance {
  id: string;
  centro_code: string;
  remittance_type: 'cobro' | 'pago';
  remittance_number: string;
  remittance_date: string;
  bank_account_id: string;
  total_amount: number;
  total_items: number;
  status: 'draft' | 'generated' | 'sent' | 'processed';
  sepa_file_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Activos fijos
export interface FixedAsset {
  id: string;
  centro_code: string;
  asset_code: string;
  description: string;
  account_code: string;
  acquisition_date: string;
  acquisition_value: number;
  residual_value: number;
  useful_life_years: number;
  depreciation_method: 'linear' | 'declining' | 'units';
  accumulated_depreciation: number;
  current_value: number | null;
  status: 'active' | 'disposed' | 'fully_depreciated';
  disposal_date: string | null;
  disposal_value: number | null;
  location: string | null;
  supplier_id: string | null;
  invoice_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Amortizaciones
export interface AssetDepreciation {
  id: string;
  asset_id: string;
  period_year: number;
  period_month: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  accounting_entry_id: string | null;
  created_at: string;
}

// Centros de coste
export interface CostCenter {
  id: string;
  centro_code: string;
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Proyectos
export interface Project {
  id: string;
  centro_code: string;
  code: string;
  name: string;
  description: string | null;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_amount: number | null;
  actual_amount: number;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  created_at: string;
  updated_at: string;
}

// Modelo 303
export interface Modelo303Data {
  periodo: {
    ejercicio: number;
    trimestre: number;
    fecha_inicio: string;
    fecha_fin: string;
  };
  iva_devengado: {
    casilla_01_base_21: number;
    casilla_02_cuota_21: number;
    casilla_03_base_10: number;
    casilla_04_cuota_10: number;
    casilla_05_base_4: number;
    casilla_06_cuota_4: number;
    casilla_07_total_cuota: number;
  };
  iva_deducible: {
    casilla_28_base_21: number;
    casilla_29_cuota_21: number;
    casilla_30_base_10: number;
    casilla_31_cuota_10: number;
    casilla_32_base_4: number;
    casilla_33_cuota_4: number;
    casilla_43_total_cuota: number;
  };
  resultado: {
    casilla_71_resultado: number;
    tipo: 'a_ingresar' | 'a_compensar' | 'sin_actividad';
  };
}

// Análisis de vencimientos
export interface PaymentTermsAnalysis {
  due_status: 'overdue' | 'due_today' | 'due_this_week' | 'due_this_month' | 'future' | 'paid';
  total_amount: number;
  count_items: number;
  avg_days_overdue: number;
}

// Análisis por centro de coste
export interface CostCenterAnalysis {
  cost_center_code: string;
  cost_center_name: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

// Análisis por proyecto
export interface ProjectAnalysis {
  project_code: string;
  project_name: string;
  budget_amount: number;
  actual_amount: number;
  variance: number;
  variance_percent: number;
  status: string;
}
