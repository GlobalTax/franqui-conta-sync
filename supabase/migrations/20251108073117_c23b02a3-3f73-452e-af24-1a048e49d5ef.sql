-- FASE 2: TESORERÍA - Tablas principales

-- Cuentas bancarias
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  iban TEXT NOT NULL UNIQUE,
  swift TEXT,
  currency TEXT DEFAULT 'EUR',
  current_balance NUMERIC(12,2) DEFAULT 0,
  account_code TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transacciones bancarias
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  reference TEXT,
  amount NUMERIC(12,2) NOT NULL,
  balance NUMERIC(12,2),
  status TEXT DEFAULT 'pending',
  matched_entry_id UUID REFERENCES public.accounting_entries(id),
  matched_invoice_id UUID,
  reconciliation_id UUID,
  import_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conciliaciones
CREATE TABLE IF NOT EXISTS public.reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  statement_balance NUMERIC(12,2) NOT NULL,
  book_balance NUMERIC(12,2) NOT NULL,
  difference NUMERIC(12,2) NOT NULL,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Matches de conciliación
CREATE TABLE IF NOT EXISTS public.reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  match_id UUID NOT NULL,
  confidence_score NUMERIC(3,2),
  matching_rules JSONB,
  status TEXT DEFAULT 'suggested',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON public.bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliations_account ON public.reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_transaction ON public.reconciliation_matches(transaction_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_accounts_updated_at();

-- RLS Policies
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_matches ENABLE ROW LEVEL SECURITY;

-- Policies para bank_accounts
CREATE POLICY "Admins can manage all bank accounts"
  ON public.bank_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view bank accounts for accessible centres"
  ON public.bank_accounts FOR SELECT
  USING (centro_code IN (
    SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create bank accounts for accessible centres"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (centro_code IN (
    SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update bank accounts for accessible centres"
  ON public.bank_accounts FOR UPDATE
  USING (centro_code IN (
    SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
  ));

-- Policies para bank_transactions
CREATE POLICY "Admins can manage all bank transactions"
  ON public.bank_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view bank transactions for accessible accounts"
  ON public.bank_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bank_accounts ba
    WHERE ba.id = bank_transactions.bank_account_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

CREATE POLICY "Users can create bank transactions for accessible accounts"
  ON public.bank_transactions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM bank_accounts ba
    WHERE ba.id = bank_transactions.bank_account_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

CREATE POLICY "Users can update bank transactions for accessible accounts"
  ON public.bank_transactions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM bank_accounts ba
    WHERE ba.id = bank_transactions.bank_account_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

-- Policies para reconciliations
CREATE POLICY "Admins can manage all reconciliations"
  ON public.reconciliations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view reconciliations for accessible accounts"
  ON public.reconciliations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bank_accounts ba
    WHERE ba.id = reconciliations.bank_account_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

CREATE POLICY "Users can create reconciliations for accessible accounts"
  ON public.reconciliations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM bank_accounts ba
    WHERE ba.id = reconciliations.bank_account_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

CREATE POLICY "Users can update reconciliations for accessible accounts"
  ON public.reconciliations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM bank_accounts ba
    WHERE ba.id = reconciliations.bank_account_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

-- Policies para reconciliation_matches
CREATE POLICY "Admins can manage all reconciliation matches"
  ON public.reconciliation_matches FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view reconciliation matches for accessible transactions"
  ON public.reconciliation_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bank_transactions bt
    JOIN bank_accounts ba ON ba.id = bt.bank_account_id
    WHERE bt.id = reconciliation_matches.transaction_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

CREATE POLICY "Users can create reconciliation matches for accessible transactions"
  ON public.reconciliation_matches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM bank_transactions bt
    JOIN bank_accounts ba ON ba.id = bt.bank_account_id
    WHERE bt.id = reconciliation_matches.transaction_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));

CREATE POLICY "Users can update reconciliation matches for accessible transactions"
  ON public.reconciliation_matches FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM bank_transactions bt
    JOIN bank_accounts ba ON ba.id = bt.bank_account_id
    WHERE bt.id = reconciliation_matches.transaction_id
      AND ba.centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
  ));