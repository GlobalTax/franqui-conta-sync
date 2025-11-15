-- ============================================================================
-- MIGRATION: Tablas de periodificaciones (accruals)
-- ============================================================================

-- Tabla principal de periodificaciones
CREATE TABLE IF NOT EXISTS public.accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES public.centres(codigo) ON DELETE CASCADE,
  accrual_type TEXT NOT NULL CHECK (accrual_type IN ('income', 'expense')),
  account_code TEXT NOT NULL,
  counterpart_account TEXT NOT NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
  description TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices_received(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de asientos periódicos generados
CREATE TABLE IF NOT EXISTS public.accrual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accrual_id UUID NOT NULL REFERENCES public.accruals(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  accounting_entry_id UUID REFERENCES public.accounting_entries(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(accrual_id, period_year, period_month)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_accruals_centro_code ON public.accruals(centro_code);
CREATE INDEX IF NOT EXISTS idx_accruals_status ON public.accruals(status);
CREATE INDEX IF NOT EXISTS idx_accruals_start_date ON public.accruals(start_date);
CREATE INDEX IF NOT EXISTS idx_accruals_end_date ON public.accruals(end_date);
CREATE INDEX IF NOT EXISTS idx_accrual_entries_accrual_id ON public.accrual_entries(accrual_id);
CREATE INDEX IF NOT EXISTS idx_accrual_entries_status ON public.accrual_entries(status);
CREATE INDEX IF NOT EXISTS idx_accrual_entries_period ON public.accrual_entries(period_year, period_month);

-- Trigger para updated_at
CREATE TRIGGER update_accruals_updated_at
  BEFORE UPDATE ON public.accruals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para accruals
ALTER TABLE public.accruals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all accruals"
  ON public.accruals
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view accruals for accessible centres"
  ON public.accruals
  FOR SELECT
  TO authenticated
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create accruals for accessible centres"
  ON public.accruals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update accruals for accessible centres"
  ON public.accruals
  FOR UPDATE
  TO authenticated
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete accruals for accessible centres"
  ON public.accruals
  FOR DELETE
  TO authenticated
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    ) AND status = 'active'
  );

-- RLS Policies para accrual_entries
ALTER TABLE public.accrual_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all accrual entries"
  ON public.accrual_entries
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view entries for accessible accruals"
  ON public.accrual_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accruals a
      WHERE a.id = accrual_entries.accrual_id
        AND a.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "System can insert accrual entries"
  ON public.accrual_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accruals a
      WHERE a.id = accrual_entries.accrual_id
        AND a.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can update entries for accessible accruals"
  ON public.accrual_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accruals a
      WHERE a.id = accrual_entries.accrual_id
        AND a.centro_code IN (
          SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
        )
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE public.accruals IS 'Periodificaciones de ingresos y gastos a distribuir en varios periodos';
COMMENT ON TABLE public.accrual_entries IS 'Asientos periódicos generados para cada periodificación';
COMMENT ON COLUMN public.accruals.accrual_type IS 'Tipo: income (ingreso a distribuir 485) o expense (gasto a distribuir 480)';
COMMENT ON COLUMN public.accruals.frequency IS 'Frecuencia: monthly, quarterly, annual';
COMMENT ON COLUMN public.accruals.status IS 'Estado: active, completed, cancelled';