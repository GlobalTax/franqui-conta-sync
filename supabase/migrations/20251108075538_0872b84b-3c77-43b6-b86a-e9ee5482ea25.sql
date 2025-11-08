-- Función 1: calculate_balance_sheet
CREATE OR REPLACE FUNCTION calculate_balance_sheet(
  p_centro_code TEXT,
  p_fecha_corte DATE
) RETURNS TABLE (
  grupo TEXT,
  nombre_grupo TEXT,
  balance NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH balances AS (
    SELECT 
      SUBSTRING(t.account_code, 1, 1) as grupo_code,
      CASE 
        WHEN t.account_code LIKE '1%' THEN 'PATRIMONIO NETO'
        WHEN t.account_code LIKE '2%' THEN 'ACTIVO NO CORRIENTE'
        WHEN t.account_code LIKE '3%' THEN 'EXISTENCIAS'
        WHEN t.account_code LIKE '4%' THEN 'ACREEDORES'
        WHEN t.account_code LIKE '5%' THEN 'CUENTAS FINANCIERAS'
        WHEN t.account_code LIKE '57%' THEN 'TESORERÍA'
        ELSE 'OTROS'
      END as grupo_nombre,
      SUM(CASE 
        WHEN t.movement_type = 'debit' THEN t.amount 
        ELSE -t.amount 
      END) as balance
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    WHERE e.centro_code = p_centro_code
      AND e.entry_date <= p_fecha_corte
      AND e.status IN ('posted', 'closed')
      AND SUBSTRING(t.account_code, 1, 1) IN ('1','2','3','4','5')
    GROUP BY SUBSTRING(t.account_code, 1, 1)
  )
  SELECT grupo_code, grupo_nombre, balance
  FROM balances
  WHERE balance != 0
  ORDER BY grupo_code;
END;
$$;

-- Función 2: get_general_ledger
CREATE OR REPLACE FUNCTION get_general_ledger(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_account_code TEXT DEFAULT NULL
) RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  entry_date DATE,
  entry_number INTEGER,
  description TEXT,
  debit NUMERIC,
  credit NUMERIC,
  balance NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH movimientos AS (
    SELECT 
      t.account_code,
      a.name as account_name,
      e.entry_date,
      e.entry_number,
      e.description,
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

-- Función 3: get_journal_book
CREATE OR REPLACE FUNCTION get_journal_book(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  entry_id UUID,
  entry_number INTEGER,
  entry_date DATE,
  description TEXT,
  account_code TEXT,
  account_name TEXT,
  line_number INTEGER,
  movement_type TEXT,
  amount NUMERIC,
  total_debit NUMERIC,
  total_credit NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.entry_number,
    e.entry_date,
    e.description,
    t.account_code,
    a.name as account_name,
    t.line_number,
    t.movement_type::TEXT,
    t.amount,
    e.total_debit,
    e.total_credit
  FROM accounting_entries e
  JOIN accounting_transactions t ON t.entry_id = e.id
  JOIN accounts a ON a.code = t.account_code
  WHERE e.centro_code = p_centro_code
    AND e.entry_date BETWEEN p_start_date AND p_end_date
    AND e.status IN ('posted', 'closed')
  ORDER BY e.entry_date, e.entry_number, t.line_number;
END;
$$;