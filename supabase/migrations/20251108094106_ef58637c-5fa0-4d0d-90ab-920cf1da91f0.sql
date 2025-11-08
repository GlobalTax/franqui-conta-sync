-- =====================================================
-- FASE 3: Libros Oficiales y Cierre de Ejercicio
-- =====================================================

-- 1. Mejorar función de Libro Diario con formato oficial
CREATE OR REPLACE FUNCTION public.get_journal_book_official(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  entry_id UUID,
  entry_number INTEGER,
  entry_date DATE,
  serie TEXT,
  description TEXT,
  account_code TEXT,
  account_name TEXT,
  line_number INTEGER,
  movement_type TEXT,
  amount NUMERIC,
  document_ref TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  posted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as entry_id,
    e.entry_number,
    e.entry_date,
    COALESCE(e.serie, 'GENERAL') as serie,
    e.description,
    t.account_code,
    a.name as account_name,
    t.line_number,
    t.movement_type::TEXT,
    t.amount,
    t.document_ref,
    e.total_debit,
    e.total_credit,
    e.posted_at
  FROM accounting_entries e
  JOIN accounting_transactions t ON t.entry_id = e.id
  JOIN accounts a ON a.code = t.account_code
  WHERE e.centro_code = p_centro_code
    AND e.entry_date BETWEEN p_start_date AND p_end_date
    AND e.status IN ('posted', 'closed')
  ORDER BY e.entry_date, e.entry_number, t.line_number;
END;
$$;

-- 2. Mejorar función de Libro Mayor con saldos acumulados
CREATE OR REPLACE FUNCTION public.get_general_ledger_official(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_account_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  entry_date DATE,
  entry_number INTEGER,
  serie TEXT,
  description TEXT,
  document_ref TEXT,
  debit NUMERIC,
  credit NUMERIC,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH movimientos AS (
    SELECT 
      t.account_code,
      a.name as account_name,
      e.entry_date,
      e.entry_number,
      COALESCE(e.serie, 'GENERAL') as serie,
      e.description,
      t.document_ref,
      CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE 0 END as debit,
      CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE 0 END as credit,
      SUM(CASE 
        WHEN t.movement_type = 'debit' THEN t.amount 
        ELSE -t.amount 
      END) OVER (
        PARTITION BY t.account_code 
        ORDER BY e.entry_date, e.entry_number, t.line_number
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) as running_balance
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    JOIN accounts a ON a.code = t.account_code
    WHERE e.centro_code = p_centro_code
      AND e.entry_date BETWEEN p_start_date AND p_end_date
      AND e.status IN ('posted', 'closed')
      AND (p_account_code IS NULL OR t.account_code = p_account_code)
  )
  SELECT * FROM movimientos
  ORDER BY account_code, entry_date, entry_number;
END;
$$;

-- 3. Función para generar asientos de regularización (cierre)
CREATE OR REPLACE FUNCTION public.generate_closing_entries(
  p_centro_code TEXT,
  p_fiscal_year_id UUID,
  p_closing_date DATE
)
RETURNS TABLE(
  entry_type TEXT,
  account_code TEXT,
  account_name TEXT,
  movement_type TEXT,
  amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_income NUMERIC := 0;
  v_total_expense NUMERIC := 0;
  v_result NUMERIC := 0;
BEGIN
  -- Calcular totales de ingresos (grupo 7)
  SELECT COALESCE(SUM(
    CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE -t.amount END
  ), 0)
  INTO v_total_income
  FROM accounting_transactions t
  JOIN accounting_entries e ON e.id = t.entry_id
  WHERE e.centro_code = p_centro_code
    AND e.fiscal_year_id = p_fiscal_year_id
    AND e.status IN ('posted', 'closed')
    AND t.account_code LIKE '7%';

  -- Calcular totales de gastos (grupo 6)
  SELECT COALESCE(SUM(
    CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE -t.amount END
  ), 0)
  INTO v_total_expense
  FROM accounting_transactions t
  JOIN accounting_entries e ON e.id = t.entry_id
  WHERE e.centro_code = p_centro_code
    AND e.fiscal_year_id = p_fiscal_year_id
    AND e.status IN ('posted', 'closed')
    AND t.account_code LIKE '6%';

  v_result := v_total_income - v_total_expense;

  -- Asiento de regularización: Saldar cuentas de gastos e ingresos
  RETURN QUERY
  -- Regularización de gastos (grupo 6 a 129)
  SELECT 
    'REGULARIZACION_GASTOS'::TEXT,
    t.account_code,
    a.name,
    CASE WHEN t.movement_type = 'debit' THEN 'credit' ELSE 'debit' END::TEXT,
    SUM(t.amount) as amount
  FROM accounting_transactions t
  JOIN accounting_entries e ON e.id = t.entry_id
  JOIN accounts a ON a.code = t.account_code
  WHERE e.centro_code = p_centro_code
    AND e.fiscal_year_id = p_fiscal_year_id
    AND e.status IN ('posted', 'closed')
    AND t.account_code LIKE '6%'
  GROUP BY t.account_code, a.name, t.movement_type
  HAVING SUM(t.amount) > 0

  UNION ALL

  -- Contrapartida de gastos (129 por el total)
  SELECT 
    'REGULARIZACION_GASTOS'::TEXT,
    '129'::TEXT,
    'Resultado del ejercicio'::TEXT,
    'debit'::TEXT,
    v_total_expense

  UNION ALL

  -- Regularización de ingresos (129 a grupo 7)
  SELECT 
    'REGULARIZACION_INGRESOS'::TEXT,
    '129'::TEXT,
    'Resultado del ejercicio'::TEXT,
    'credit'::TEXT,
    v_total_income

  UNION ALL

  -- Contrapartida de ingresos (grupo 7)
  SELECT 
    'REGULARIZACION_INGRESOS'::TEXT,
    t.account_code,
    a.name,
    CASE WHEN t.movement_type = 'credit' THEN 'debit' ELSE 'credit' END::TEXT,
    SUM(t.amount) as amount
  FROM accounting_transactions t
  JOIN accounting_entries e ON e.id = t.entry_id
  JOIN accounts a ON a.code = t.account_code
  WHERE e.centro_code = p_centro_code
    AND e.fiscal_year_id = p_fiscal_year_id
    AND e.status IN ('posted', 'closed')
    AND t.account_code LIKE '7%'
  GROUP BY t.account_code, a.name, t.movement_type
  HAVING SUM(t.amount) > 0;
END;
$$;

-- 4. Función para obtener saldos para asiento de apertura
CREATE OR REPLACE FUNCTION public.get_opening_balances(
  p_centro_code TEXT,
  p_fiscal_year_id UUID
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  balance NUMERIC,
  movement_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH account_balances AS (
    SELECT 
      t.account_code,
      a.name as account_name,
      SUM(CASE 
        WHEN t.movement_type = 'debit' THEN t.amount 
        ELSE -t.amount 
      END) as balance
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    JOIN accounts a ON a.code = t.account_code
    WHERE e.centro_code = p_centro_code
      AND e.fiscal_year_id = p_fiscal_year_id
      AND e.status IN ('posted', 'closed')
      -- Excluir cuentas de gastos e ingresos (ya regularizadas)
      AND NOT (t.account_code LIKE '6%' OR t.account_code LIKE '7%')
    GROUP BY t.account_code, a.name
    HAVING SUM(CASE 
      WHEN t.movement_type = 'debit' THEN t.amount 
      ELSE -t.amount 
    END) != 0
  )
  SELECT 
    ab.account_code,
    ab.account_name,
    ABS(ab.balance) as balance,
    CASE 
      WHEN ab.balance > 0 THEN 'debit'
      ELSE 'credit'
    END::TEXT as movement_type
  FROM account_balances ab
  ORDER BY ab.account_code;
END;
$$;

-- 5. Función auxiliar para obtener siguiente número de asiento
CREATE OR REPLACE FUNCTION public.get_next_entry_number(
  p_company_id UUID,
  p_centro_code TEXT,
  p_ejercicio INTEGER,
  p_serie TEXT DEFAULT 'GENERAL'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number INTEGER;
  v_serie_id UUID;
BEGIN
  -- Buscar o crear la serie
  INSERT INTO series_contables (company_id, centro_code, ejercicio, serie, next_number)
  VALUES (p_company_id, p_centro_code, p_ejercicio, p_serie, 1)
  ON CONFLICT (company_id, centro_code, ejercicio, serie) 
  DO NOTHING
  RETURNING id INTO v_serie_id;

  -- Obtener el siguiente número y actualizarlo
  UPDATE series_contables
  SET next_number = next_number + 1
  WHERE company_id = p_company_id
    AND centro_code = p_centro_code
    AND ejercicio = p_ejercicio
    AND serie = p_serie
  RETURNING next_number - 1 INTO v_next_number;

  RETURN v_next_number;
END;
$$;

-- 6. Añadir estado a fiscal_years para controlar cierre
ALTER TABLE public.fiscal_years
  ADD COLUMN IF NOT EXISTS closing_date DATE,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS closing_entry_id UUID REFERENCES accounting_entries(id);

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_accounting_entries_fiscal_year ON public.accounting_entries(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_serie ON public.accounting_entries(serie);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_status ON public.fiscal_years(status);

COMMENT ON FUNCTION public.get_journal_book_official IS 'Libro Diario oficial con formato legal';
COMMENT ON FUNCTION public.get_general_ledger_official IS 'Libro Mayor oficial con saldos acumulados';
COMMENT ON FUNCTION public.generate_closing_entries IS 'Genera asientos de regularización para cierre de ejercicio';
COMMENT ON FUNCTION public.get_opening_balances IS 'Obtiene saldos para asiento de apertura del siguiente ejercicio';
COMMENT ON FUNCTION public.get_next_entry_number IS 'Obtiene el siguiente número de asiento para una serie';