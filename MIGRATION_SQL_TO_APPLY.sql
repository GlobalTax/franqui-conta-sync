-- ============================================================================
-- ADVANCED ACCOUNTING VALIDATIONS - MIGRATION SQL
-- INSTRUCTIONS: Copy this SQL and run it manually in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. VALIDATE FISCAL YEAR BALANCE
-- Purpose: Verify total debit = total credit for entire fiscal year
-- Returns: valid, total_debit, total_credit, difference
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_fiscal_year_balance(
  p_fiscal_year_id UUID
)
RETURNS TABLE (
  valid BOOLEAN,
  total_debit NUMERIC,
  total_credit NUMERIC,
  difference NUMERIC,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (ABS(COALESCE(SUM(ae.total_debit), 0) - COALESCE(SUM(ae.total_credit), 0)) < 0.01) AS valid,
    COALESCE(SUM(ae.total_debit), 0) AS total_debit,
    COALESCE(SUM(ae.total_credit), 0) AS total_credit,
    ABS(COALESCE(SUM(ae.total_debit), 0) - COALESCE(SUM(ae.total_credit), 0)) AS difference,
    CASE 
      WHEN ABS(COALESCE(SUM(ae.total_debit), 0) - COALESCE(SUM(ae.total_credit), 0)) >= 0.01 
      THEN 'El balance global está descuadrado en ' || 
           ABS(COALESCE(SUM(ae.total_debit), 0) - COALESCE(SUM(ae.total_credit), 0))::TEXT || '€'
      ELSE NULL
    END AS error_message
  FROM accounting_entries ae
  WHERE ae.fiscal_year_id = p_fiscal_year_id
    AND ae.status = 'posted';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION validate_fiscal_year_balance TO authenticated;

-- ============================================================================
-- 2. VALIDATE TRIAL BALANCE
-- Purpose: Check account balances against expected PGC group behavior
-- Returns: account_code, balance, balance_type, expected_balance_type, is_valid, warning
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_trial_balance(
  p_fiscal_year_id UUID
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  balance NUMERIC,
  balance_type TEXT,
  expected_balance_type TEXT,
  is_valid BOOLEAN,
  warning TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH account_balances AS (
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
    JOIN accounting_entries e ON t.entry_id = e.id
    LEFT JOIN accounts a ON a.code = t.account_code AND a.centro_code = e.centro_code
    WHERE e.fiscal_year_id = p_fiscal_year_id
      AND e.status = 'posted'
    GROUP BY t.account_code, a.name
    HAVING ABS(SUM(
      CASE 
        WHEN t.movement_type = 'debit' THEN t.amount
        ELSE -t.amount
      END
    )) > 0.01
  )
  SELECT 
    ab.account_code,
    ab.account_name,
    ab.balance,
    CASE 
      WHEN ab.balance > 0 THEN 'deudor'
      WHEN ab.balance < 0 THEN 'acreedor'
      ELSE 'cero'
    END AS balance_type,
    CASE 
      WHEN LEFT(ab.account_code, 1) IN ('1', '2', '3', '5', '6', '8') THEN 'deudor'
      WHEN LEFT(ab.account_code, 1) IN ('4', '7', '9') THEN 'acreedor'
      ELSE 'desconocido'
    END AS expected_balance_type,
    CASE 
      WHEN LEFT(ab.account_code, 1) IN ('1', '2', '3', '5', '6', '8') AND ab.balance < 0 THEN FALSE
      WHEN LEFT(ab.account_code, 1) IN ('4', '7', '9') AND ab.balance > 0 THEN FALSE
      ELSE TRUE
    END AS is_valid,
    CASE 
      WHEN LEFT(ab.account_code, 1) IN ('1', '2', '3', '5', '6', '8') AND ab.balance < 0 
      THEN 'Cuenta de activo/gasto con saldo acreedor (atípico)'
      WHEN LEFT(ab.account_code, 1) IN ('4', '7', '9') AND ab.balance > 0 
      THEN 'Cuenta de pasivo/ingreso con saldo deudor (atípico)'
      ELSE NULL
    END AS warning
  FROM account_balances ab
  ORDER BY 
    CASE 
      WHEN LEFT(ab.account_code, 1) IN ('1', '2', '3', '5', '6', '8') AND ab.balance < 0 THEN 1
      WHEN LEFT(ab.account_code, 1) IN ('4', '7', '9') AND ab.balance > 0 THEN 1
      ELSE 2
    END,
    ab.account_code;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION validate_trial_balance TO authenticated;

-- ============================================================================
-- 3. VALIDATE VAT RECONCILIATION
-- Purpose: Verify IVA invoices match accounting transactions (477/472)
-- Returns: vat_type, vat_issued, vat_received, vat_transactions, difference, is_valid
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_vat_reconciliation(
  p_fiscal_year_id UUID,
  p_centro_code TEXT
)
RETURNS TABLE (
  vat_type TEXT,
  vat_rate NUMERIC,
  vat_issued NUMERIC,
  vat_received NUMERIC,
  vat_in_accounting NUMERIC,
  difference NUMERIC,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT start_date, end_date INTO v_start_date, v_end_date
  FROM fiscal_years
  WHERE id = p_fiscal_year_id;

  RETURN QUERY
  WITH vat_rates AS (
    SELECT UNNEST(ARRAY[21.0, 10.0, 4.0, 0.0]) AS rate
  ),
  vat_issued AS (
    SELECT 
      rate,
      COALESCE(SUM(tax_amount), 0) AS total
    FROM stg_iva_emitidas
    WHERE centro_code = p_centro_code
      AND invoice_date BETWEEN v_start_date AND v_end_date
    GROUP BY rate
  ),
  vat_received AS (
    SELECT 
      tax_rate AS rate,
      COALESCE(SUM(tax_amount), 0) AS total
    FROM stg_iva_recibidas
    WHERE centro_code = p_centro_code
      AND invoice_date BETWEEN v_start_date AND v_end_date
    GROUP BY tax_rate
  ),
  vat_accounting AS (
    SELECT 
      21.0 AS rate,
      COALESCE(SUM(
        CASE 
          WHEN t.account_code LIKE '477%' THEN -t.amount
          WHEN t.account_code LIKE '472%' THEN t.amount
          ELSE 0
        END
      ), 0) AS total
    FROM accounting_transactions t
    JOIN accounting_entries e ON t.entry_id = e.id
    WHERE e.fiscal_year_id = p_fiscal_year_id
      AND e.centro_code = p_centro_code
      AND e.status = 'posted'
      AND (t.account_code LIKE '477%' OR t.account_code LIKE '472%')
  )
  SELECT 
    vr.rate::TEXT || '%' AS vat_type,
    vr.rate AS vat_rate,
    COALESCE(vi.total, 0) AS vat_issued,
    COALESCE(vrc.total, 0) AS vat_received,
    COALESCE(va.total, 0) AS vat_in_accounting,
    ABS((COALESCE(vi.total, 0) - COALESCE(vrc.total, 0)) - COALESCE(va.total, 0)) AS difference,
    ABS((COALESCE(vi.total, 0) - COALESCE(vrc.total, 0)) - COALESCE(va.total, 0)) < 0.01 AS is_valid,
    CASE 
      WHEN ABS((COALESCE(vi.total, 0) - COALESCE(vrc.total, 0)) - COALESCE(va.total, 0)) >= 0.01 
      THEN 'IVA al ' || vr.rate::TEXT || '% no cuadra: diferencia de ' || 
           ABS((COALESCE(vi.total, 0) - COALESCE(vrc.total, 0)) - COALESCE(va.total, 0))::TEXT || '€'
      ELSE NULL
    END AS error_message
  FROM vat_rates vr
  LEFT JOIN vat_issued vi ON vi.rate = vr.rate
  LEFT JOIN vat_received vrc ON vrc.rate = vr.rate
  LEFT JOIN vat_accounting va ON va.rate = vr.rate
  WHERE COALESCE(vi.total, 0) + COALESCE(vrc.total, 0) + COALESCE(va.total, 0) > 0
  ORDER BY vr.rate DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION validate_vat_reconciliation TO authenticated;

-- ============================================================================
-- 4. VALIDATE ENTRY SEQUENCE
-- Purpose: Detect gaps and duplicates in entry_number
-- Returns: expected_count, actual_count, missing_numbers, duplicate_numbers, is_valid
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_entry_sequence(
  p_fiscal_year_id UUID
)
RETURNS TABLE (
  min_entry_number INTEGER,
  max_entry_number INTEGER,
  expected_count INTEGER,
  actual_count INTEGER,
  missing_numbers INTEGER[],
  duplicate_numbers INTEGER[],
  has_gaps BOOLEAN,
  has_duplicates BOOLEAN,
  is_valid BOOLEAN,
  warning_message TEXT
) AS $$
DECLARE
  v_min INTEGER;
  v_max INTEGER;
  v_expected INTEGER;
  v_actual INTEGER;
  v_missing INTEGER[];
  v_duplicates INTEGER[];
BEGIN
  SELECT MIN(entry_number), MAX(entry_number), COUNT(*)
  INTO v_min, v_max, v_actual
  FROM accounting_entries
  WHERE fiscal_year_id = p_fiscal_year_id
    AND status = 'posted';

  v_expected := v_max - v_min + 1;

  SELECT ARRAY_AGG(num)
  INTO v_missing
  FROM generate_series(v_min, v_max) num
  WHERE NOT EXISTS (
    SELECT 1 
    FROM accounting_entries
    WHERE fiscal_year_id = p_fiscal_year_id
      AND status = 'posted'
      AND entry_number = num
  );

  SELECT ARRAY_AGG(entry_number)
  INTO v_duplicates
  FROM (
    SELECT entry_number
    FROM accounting_entries
    WHERE fiscal_year_id = p_fiscal_year_id
      AND status = 'posted'
    GROUP BY entry_number
    HAVING COUNT(*) > 1
  ) dups;

  RETURN QUERY
  SELECT 
    v_min AS min_entry_number,
    v_max AS max_entry_number,
    v_expected AS expected_count,
    v_actual AS actual_count,
    COALESCE(v_missing, ARRAY[]::INTEGER[]) AS missing_numbers,
    COALESCE(v_duplicates, ARRAY[]::INTEGER[]) AS duplicate_numbers,
    COALESCE(array_length(v_missing, 1), 0) > 0 AS has_gaps,
    COALESCE(array_length(v_duplicates, 1), 0) > 0 AS has_duplicates,
    COALESCE(array_length(v_missing, 1), 0) = 0 
      AND COALESCE(array_length(v_duplicates, 1), 0) = 0 AS is_valid,
    CASE 
      WHEN COALESCE(array_length(v_missing, 1), 0) > 0 AND COALESCE(array_length(v_duplicates, 1), 0) > 0 
      THEN 'Hay ' || array_length(v_missing, 1)::TEXT || ' huecos y ' || 
           array_length(v_duplicates, 1)::TEXT || ' duplicados en la numeración'
      WHEN COALESCE(array_length(v_missing, 1), 0) > 0 
      THEN 'Hay ' || array_length(v_missing, 1)::TEXT || ' huecos en la numeración de asientos'
      WHEN COALESCE(array_length(v_duplicates, 1), 0) > 0 
      THEN 'Hay ' || array_length(v_duplicates, 1)::TEXT || ' números de asiento duplicados'
      ELSE NULL
    END AS warning_message;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION validate_entry_sequence TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION validate_fiscal_year_balance IS 'Validates total debit = total credit for fiscal year (CRITICAL)';
COMMENT ON FUNCTION validate_trial_balance IS 'Validates account balances against PGC groups (WARNING)';
COMMENT ON FUNCTION validate_vat_reconciliation IS 'Validates VAT invoices vs accounting (CRITICAL)';
COMMENT ON FUNCTION validate_entry_sequence IS 'Detects gaps and duplicates in entry numbers (WARNING)';
