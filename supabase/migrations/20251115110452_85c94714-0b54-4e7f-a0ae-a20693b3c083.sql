-- ============================================================================
-- HELPER FUNCTIONS FOR FISCAL YEAR CLOSING
-- Purpose: Calculate account balances for regularization and closing entries
-- ============================================================================

-- Function 1: Get account balances by group (6 or 7)
-- Returns all accounts in a group with their accumulated balance
CREATE OR REPLACE FUNCTION get_account_balances_by_group(
  p_centro_code TEXT,
  p_fiscal_year_id UUID,
  p_account_group TEXT
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.account_code,
    a.name AS account_name,
    SUM(
      CASE 
        WHEN t.movement_type = 'debit' THEN t.amount 
        ELSE -t.amount 
      END
    ) AS balance
  FROM accounting_transactions t
  JOIN accounting_entries e ON e.id = t.entry_id
  JOIN accounts a ON a.code = t.account_code AND a.centro_code = p_centro_code
  WHERE e.centro_code = p_centro_code
    AND e.fiscal_year_id = p_fiscal_year_id
    AND e.status IN ('posted', 'closed')
    AND t.account_code LIKE (p_account_group || '%')
  GROUP BY t.account_code, a.name
  HAVING ABS(SUM(
    CASE 
      WHEN t.movement_type = 'debit' THEN t.amount 
      ELSE -t.amount 
    END
  )) > 0.01
  ORDER BY t.account_code;
END;
$$;

-- Function 2: Get all account balances (for balance sheet)
-- Returns all accounts with their accumulated balance
CREATE OR REPLACE FUNCTION get_all_account_balances(
  p_centro_code TEXT,
  p_fiscal_year_id UUID
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.account_code,
    a.name AS account_name,
    SUM(
      CASE 
        WHEN t.movement_type = 'debit' THEN t.amount 
        ELSE -t.amount 
      END
    ) AS balance
  FROM accounting_transactions t
  JOIN accounting_entries e ON e.id = t.entry_id
  JOIN accounts a ON a.code = t.account_code AND a.centro_code = p_centro_code
  WHERE e.centro_code = p_centro_code
    AND e.fiscal_year_id = p_fiscal_year_id
    AND e.status IN ('posted', 'closed')
  GROUP BY t.account_code, a.name
  HAVING ABS(SUM(
    CASE 
      WHEN t.movement_type = 'debit' THEN t.amount 
      ELSE -t.amount 
    END
  )) > 0.01
  ORDER BY t.account_code;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_account_balances_by_group(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_account_balances(TEXT, UUID) TO authenticated;