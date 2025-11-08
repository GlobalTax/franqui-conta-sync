-- ============================================================================
-- FASE 0: TABLAS DE CONTABILIDAD
-- ============================================================================

-- 1. CREAR ENUMS
CREATE TYPE accounting_entry_status AS ENUM ('draft', 'posted', 'closed');
CREATE TYPE movement_type AS ENUM ('debit', 'credit');

-- 2. TABLA: fiscal_years (Ejercicios Fiscales)
CREATE TABLE public.fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed'
  centro_code TEXT REFERENCES public.centres(codigo),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year, centro_code)
);

-- 3. TABLA: accounting_entries (Asientos Contables - Cabecera)
CREATE TABLE public.accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number INTEGER NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  centro_code TEXT REFERENCES public.centres(codigo) NOT NULL,
  fiscal_year_id UUID REFERENCES public.fiscal_years(id),
  status accounting_entry_status NOT NULL DEFAULT 'draft',
  total_debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entry_number, fiscal_year_id)
);

-- 4. TABLA: accounting_transactions (Movimientos - Líneas de Asiento)
CREATE TABLE public.accounting_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.accounting_entries(id) ON DELETE CASCADE NOT NULL,
  account_code TEXT NOT NULL,
  movement_type movement_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  document_ref TEXT,
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entry_id, line_number)
);

-- 5. INDICES para mejorar performance
CREATE INDEX idx_accounting_entries_centro ON accounting_entries(centro_code);
CREATE INDEX idx_accounting_entries_date ON accounting_entries(entry_date);
CREATE INDEX idx_accounting_entries_status ON accounting_entries(status);
CREATE INDEX idx_accounting_transactions_entry ON accounting_transactions(entry_id);
CREATE INDEX idx_accounting_transactions_account ON accounting_transactions(account_code);
CREATE INDEX idx_fiscal_years_centro ON fiscal_years(centro_code);

-- 6. TRIGGERS para updated_at
CREATE TRIGGER update_fiscal_years_updated_at
  BEFORE UPDATE ON fiscal_years
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_entries_updated_at
  BEFORE UPDATE ON accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNCTION: Actualizar totales del asiento cuando cambian transacciones
CREATE OR REPLACE FUNCTION update_accounting_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accounting_entries
  SET 
    total_debit = (
      SELECT COALESCE(SUM(amount), 0)
      FROM accounting_transactions
      WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        AND movement_type = 'debit'
    ),
    total_credit = (
      SELECT COALESCE(SUM(amount), 0)
      FROM accounting_transactions
      WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        AND movement_type = 'credit'
    )
  WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_entry_totals_on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_accounting_entry_totals();

-- 8. RLS POLICIES

-- fiscal_years
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all fiscal years"
  ON public.fiscal_years FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view fiscal years for accessible centres"
  ON public.fiscal_years FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- accounting_entries
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all accounting entries"
  ON public.accounting_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view accounting entries for accessible centres"
  ON public.accounting_entries FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create accounting entries for accessible centres"
  ON public.accounting_entries FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update draft entries for accessible centres"
  ON public.accounting_entries FOR UPDATE
  USING (
    status = 'draft' AND
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- accounting_transactions
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all accounting transactions"
  ON public.accounting_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view transactions for accessible entries"
  ON public.accounting_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounting_entries ae
      WHERE ae.id = accounting_transactions.entry_id
        AND ae.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can create transactions for accessible entries"
  ON public.accounting_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounting_entries ae
      WHERE ae.id = accounting_transactions.entry_id
        AND ae.status = 'draft'
        AND ae.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can update transactions for draft entries"
  ON public.accounting_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounting_entries ae
      WHERE ae.id = accounting_transactions.entry_id
        AND ae.status = 'draft'
        AND ae.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can delete transactions for draft entries"
  ON public.accounting_transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM accounting_entries ae
      WHERE ae.id = accounting_transactions.entry_id
        AND ae.status = 'draft'
        AND ae.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );