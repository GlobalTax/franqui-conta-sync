-- Tabla para gestión de vencimientos y efectos comerciales
CREATE TABLE IF NOT EXISTS payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  invoice_id UUID,
  invoice_type TEXT CHECK (invoice_type IN ('issued', 'received')),
  concept TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('factura', 'pagare', 'letra', 'transferencia', 'efectivo', 'tarjeta')),
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial', 'remitted')),
  paid_amount NUMERIC DEFAULT 0,
  paid_date DATE,
  bank_account_id UUID REFERENCES bank_accounts(id),
  remittance_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para remesas bancarias (SEPA)
CREATE TABLE IF NOT EXISTS bank_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  remittance_type TEXT NOT NULL CHECK (remittance_type IN ('cobro', 'pago')),
  remittance_number TEXT NOT NULL,
  remittance_date DATE NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'processed')),
  sepa_file_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para inmovilizado y activos fijos
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  description TEXT NOT NULL,
  account_code TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  acquisition_value NUMERIC NOT NULL,
  residual_value NUMERIC DEFAULT 0,
  useful_life_years INTEGER NOT NULL,
  depreciation_method TEXT NOT NULL DEFAULT 'linear' CHECK (depreciation_method IN ('linear', 'declining', 'units')),
  accumulated_depreciation NUMERIC DEFAULT 0,
  current_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
  disposal_date DATE,
  disposal_value NUMERIC,
  location TEXT,
  supplier_id UUID,
  invoice_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centro_code, asset_code)
);

-- Tabla para amortizaciones del inmovilizado
CREATE TABLE IF NOT EXISTS asset_depreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  depreciation_amount NUMERIC NOT NULL,
  accumulated_depreciation NUMERIC NOT NULL,
  book_value NUMERIC NOT NULL,
  accounting_entry_id UUID REFERENCES accounting_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, period_year, period_month)
);

-- Tabla para contabilidad analítica (centros de coste)
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES cost_centers(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centro_code, code)
);

-- Añadir centro de coste a transacciones contables
ALTER TABLE accounting_transactions 
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id);

-- Tabla para proyectos/obras (contabilidad analítica)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  start_date DATE,
  end_date DATE,
  budget_amount NUMERIC,
  actual_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centro_code, code)
);

-- Añadir proyecto a transacciones contables
ALTER TABLE accounting_transactions 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Tabla para configuración de modelos fiscales
CREATE TABLE IF NOT EXISTS tax_model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  model_number TEXT NOT NULL CHECK (model_number IN ('303', '347', '349', '390', '111', '115', '190', '180')),
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  auto_generate BOOLEAN DEFAULT false,
  last_generated_period TEXT,
  config_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centro_code, model_number)
);

-- Enable RLS
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_depreciations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_model_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies para payment_terms
CREATE POLICY "Users can view payment terms for accessible centres"
  ON payment_terms FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage payment terms for accessible centres"
  ON payment_terms FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

-- RLS Policies para bank_remittances
CREATE POLICY "Users can view remittances for accessible centres"
  ON bank_remittances FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage remittances for accessible centres"
  ON bank_remittances FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

-- RLS Policies para fixed_assets
CREATE POLICY "Users can view assets for accessible centres"
  ON fixed_assets FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage assets for accessible centres"
  ON fixed_assets FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

-- RLS Policies para cost_centers
CREATE POLICY "Users can view cost centers for accessible centres"
  ON cost_centers FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage cost centers for accessible centres"
  ON cost_centers FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

-- RLS Policies para projects
CREATE POLICY "Users can view projects for accessible centres"
  ON projects FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage projects for accessible centres"
  ON projects FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
    OR centro_code IN (SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid())
  );

-- Create indexes
CREATE INDEX idx_payment_terms_centro ON payment_terms(centro_code);
CREATE INDEX idx_payment_terms_due_date ON payment_terms(due_date);
CREATE INDEX idx_payment_terms_status ON payment_terms(status);
CREATE INDEX idx_bank_remittances_centro ON bank_remittances(centro_code);
CREATE INDEX idx_fixed_assets_centro ON fixed_assets(centro_code);
CREATE INDEX idx_cost_centers_centro ON cost_centers(centro_code);
CREATE INDEX idx_projects_centro ON projects(centro_code);

-- Triggers
CREATE TRIGGER update_payment_terms_updated_at
  BEFORE UPDATE ON payment_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_remittances_updated_at
  BEFORE UPDATE ON bank_remittances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_assets_updated_at
  BEFORE UPDATE ON fixed_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();