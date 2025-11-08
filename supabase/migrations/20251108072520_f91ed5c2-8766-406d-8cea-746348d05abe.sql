-- Crear función calculate_pnl para calcular P&L desde accounting entries
CREATE OR REPLACE FUNCTION calculate_pnl(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  level INTEGER,
  debit_total NUMERIC,
  credit_total NUMERIC,
  balance NUMERIC
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
      a.account_type,
      a.level,
      COALESCE(SUM(CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE 0 END), 0) as debit_total,
      COALESCE(SUM(CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE 0 END), 0) as credit_total,
      -- Para gastos (grupo 6): debe - haber (positivo = gasto)
      -- Para ingresos (grupo 7): haber - debe (positivo = ingreso)
      CASE 
        WHEN a.account_type = 'expense' THEN 
          COALESCE(SUM(CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE 0 END), 0)
        WHEN a.account_type = 'income' THEN 
          COALESCE(SUM(CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE 0 END), 0)
        ELSE 0
      END as balance
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    JOIN accounts a ON a.code = t.account_code
    WHERE e.centro_code = p_centro_code
      AND e.entry_date BETWEEN p_start_date AND p_end_date
      AND e.status IN ('posted', 'closed')
      AND a.account_type IN ('income', 'expense')
    GROUP BY t.account_code, a.name, a.account_type, a.level
  )
  SELECT 
    ab.account_code,
    ab.account_name,
    ab.account_type,
    ab.level,
    ab.debit_total,
    ab.credit_total,
    ab.balance
  FROM account_balances ab
  WHERE ab.balance != 0
  ORDER BY ab.account_code;
END;
$$;