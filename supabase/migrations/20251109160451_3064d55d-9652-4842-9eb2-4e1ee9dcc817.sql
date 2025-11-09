-- ============================================================================
-- MIGRATION: Add calculate_pl_report_accumulated RPC for dual view (Period + YTD)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pl_report_accumulated(
  p_template_code TEXT,
  p_period_date DATE, -- Fecha del mes a consultar (required, moved before optional params)
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
  p_show_accumulated BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  is_total BOOLEAN,
  sign TEXT,
  amount_period NUMERIC, -- Importe del mes
  amount_ytd NUMERIC, -- Importe acumulado año
  percentage_period NUMERIC, -- % sobre ventas del mes
  percentage_ytd NUMERIC -- % sobre ventas acumuladas
)
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_ytd_start DATE;
  v_ytd_end DATE;
BEGIN
  -- Extraer año y mes
  v_year := EXTRACT(YEAR FROM p_period_date);
  v_month := EXTRACT(MONTH FROM p_period_date);
  
  -- Periodo mensual
  v_period_start := DATE_TRUNC('month', p_period_date);
  v_period_end := (DATE_TRUNC('month', p_period_date) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Periodo acumulado (desde enero hasta fin del mes seleccionado)
  v_ytd_start := MAKE_DATE(v_year, 1, 1);
  v_ytd_end := v_period_end;

  RETURN QUERY
  WITH period_data AS (
    -- Calcular P&L del periodo mensual
    SELECT * FROM calculate_pl_report(
      p_template_code,
      p_company_id,
      p_centro_code,
      v_period_start::TEXT,
      v_period_end::TEXT
    )
  ),
  ytd_data AS (
    -- Calcular P&L acumulado año
    SELECT * FROM calculate_pl_report(
      p_template_code,
      p_company_id,
      p_centro_code,
      v_ytd_start::TEXT,
      v_ytd_end::TEXT
    )
  )
  SELECT 
    p.rubric_code,
    p.rubric_name,
    p.parent_code,
    p.level,
    p.sort,
    p.is_total,
    p.sign,
    p.amount AS amount_period,
    y.amount AS amount_ytd,
    p.percentage AS percentage_period,
    y.percentage AS percentage_ytd
  FROM period_data p
  LEFT JOIN ytd_data y ON p.rubric_code = y.rubric_code
  ORDER BY p.sort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_pl_report_accumulated(TEXT, DATE, UUID, TEXT, BOOLEAN) TO authenticated;

-- Comment
COMMENT ON FUNCTION calculate_pl_report_accumulated IS 
'Calcula P&L con vista dual: periodo mensual + acumulado año (YTD). 
Devuelve columnas separadas para amounts y percentages de ambos periodos.';