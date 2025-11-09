-- Create accounts table for Chart of Accounts (Plan General Contable)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES centres(codigo) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('A', 'P', 'PN', 'ING', 'GAS')),
  parent_code VARCHAR(10),
  level INTEGER NOT NULL DEFAULT 0,
  is_detail BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT accounts_code_centro_unique UNIQUE (code, centro_code),
  CONSTRAINT accounts_level_check CHECK (level >= 0 AND level <= 5)
);

-- Add foreign key for parent_code (self-referencing within same centro)
ALTER TABLE accounts
  ADD CONSTRAINT accounts_parent_code_fkey 
  FOREIGN KEY (parent_code, centro_code) 
  REFERENCES accounts(code, centro_code) 
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- Create indexes for performance
CREATE INDEX idx_accounts_centro ON accounts(centro_code);
CREATE INDEX idx_accounts_company ON accounts(company_id);
CREATE INDEX idx_accounts_code ON accounts(code);
CREATE INDEX idx_accounts_parent ON accounts(parent_code);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_active ON accounts(active);
CREATE INDEX idx_accounts_code_centro ON accounts(code, centro_code);

-- Add comment
COMMENT ON TABLE accounts IS 'Chart of Accounts (Plan General Contable) for each centre';
COMMENT ON COLUMN accounts.account_type IS 'A=Activo, P=Pasivo, PN=Patrimonio Neto, ING=Ingresos, GAS=Gastos';
COMMENT ON COLUMN accounts.is_detail IS 'TRUE if account accepts direct journal entries (cuenta de detalle)';
COMMENT ON COLUMN accounts.level IS 'Hierarchy level: 0=Group, 1=Subgroup, 2=Account, 3=Subaccount';

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all accounts
CREATE POLICY "Admins can manage all accounts"
  ON accounts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view accounts for accessible centres
CREATE POLICY "Users can view accounts for accessible centres"
  ON accounts
  FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code 
      FROM v_user_centres 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create accounts for accessible centres
CREATE POLICY "Users can create accounts for accessible centres"
  ON accounts
  FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code 
      FROM v_user_centres 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update accounts for accessible centres
CREATE POLICY "Users can update accounts for accessible centres"
  ON accounts
  FOR UPDATE
  USING (
    centro_code IN (
      SELECT centro_code 
      FROM v_user_centres 
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete accounts for accessible centres (soft delete recommended)
CREATE POLICY "Users can delete accounts for accessible centres"
  ON accounts
  FOR DELETE
  USING (
    centro_code IN (
      SELECT centro_code 
      FROM v_user_centres 
      WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();