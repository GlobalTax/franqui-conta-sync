-- ============================================================
-- RPC: get_pl_rubric_breakdown
-- Obtiene desglose de una rúbrica por cuenta con YoY opcional
-- ============================================================
-- 
-- INSTRUCCIONES:
-- Ejecutar este script en el SQL Editor de Supabase Dashboard
-- para crear la función RPC necesaria para el drill-down de P&L
-- ============================================================

CREATE OR REPLACE FUNCTION get_pl_rubric_breakdown(
  p_template_code TEXT,
  p_rubric_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_compare_yoy BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  amount_current NUMERIC,
  amount_yoy NUMERIC,
  variance_amount NUMERIC,
  variance_percent NUMERIC,
  match_rule TEXT,
  match_kind TEXT
) AS $$
DECLARE
  v_template_id UUID;
  v_yoy_start DATE;
  v_yoy_end DATE;
BEGIN
  -- Obtener template_id
  SELECT id INTO v_template_id FROM pl_templates WHERE code = p_template_code;
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template % not found', p_template_code;
  END IF;

  -- Calcular fechas YoY
  IF p_compare_yoy THEN
    v_yoy_start := p_start_date - INTERVAL '1 year';
    v_yoy_end := p_end_date - INTERVAL '1 year';
  END IF;

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      w.account_code,
      MAX(a.name) AS account_name,
      SUM(l.amount) AS amount,
      MAX(r.notes) AS match_rule,
      MAX(r.match_kind::TEXT) AS match_kind
    FROM v_pl_rule_winner w
    JOIN mv_gl_ledger_month l 
      ON l.account_code = w.account_code 
      AND l.period_month = w.period_month
      AND l.company_id = w.company_id
      AND l.centro_code = w.centro_code
    LEFT JOIN accounts a 
      ON a.code = w.account_code 
      AND (a.centro_code = w.centro_code OR a.centro_code IS NULL)
    LEFT JOIN pl_rules r 
      ON r.template_id = w.template_id 
      AND r.rubric_code = w.rubric_code
    WHERE w.template_id = v_template_id
      AND w.rubric_code = p_rubric_code
      AND w.period_month >= p_start_date
      AND w.period_month <= p_end_date
      AND (p_company_id IS NULL OR w.company_id = p_company_id)
      AND (p_centro_code IS NULL OR w.centro_code = p_centro_code)
    GROUP BY w.account_code
  ),
  yoy_period AS (
    SELECT 
      w.account_code,
      SUM(l.amount) AS amount
    FROM v_pl_rule_winner w
    JOIN mv_gl_ledger_month l 
      ON l.account_code = w.account_code 
      AND l.period_month = w.period_month
      AND l.company_id = w.company_id
      AND l.centro_code = w.centro_code
    WHERE p_compare_yoy = TRUE
      AND w.template_id = v_template_id
      AND w.rubric_code = p_rubric_code
      AND w.period_month >= v_yoy_start
      AND w.period_month <= v_yoy_end
      AND (p_company_id IS NULL OR w.company_id = p_company_id)
      AND (p_centro_code IS NULL OR w.centro_code = p_centro_code)
    GROUP BY w.account_code
  )
  SELECT 
    cp.account_code,
    cp.account_name,
    cp.amount AS amount_current,
    COALESCE(yp.amount, 0) AS amount_yoy,
    (cp.amount - COALESCE(yp.amount, 0)) AS variance_amount,
    CASE 
      WHEN COALESCE(yp.amount, 0) <> 0 
      THEN ((cp.amount - COALESCE(yp.amount, 0)) / ABS(yp.amount)) * 100
      ELSE NULL 
    END AS variance_percent,
    cp.match_rule,
    cp.match_kind
  FROM current_period cp
  LEFT JOIN yoy_period yp ON yp.account_code = cp.account_code
  ORDER BY ABS(cp.amount) DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_pl_rubric_breakdown(TEXT, TEXT, UUID, TEXT, DATE, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pl_rubric_breakdown(TEXT, TEXT, UUID, TEXT, DATE, DATE, BOOLEAN) TO anon;

-- Verification
SELECT 'RPC get_pl_rubric_breakdown created successfully!' AS status;
