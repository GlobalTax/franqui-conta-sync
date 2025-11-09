-- ============================================================================
-- Fix definitivo: Drop completo y recreación de funciones P&L con DATE
-- ============================================================================

-- Drop todas las sobrecargas posibles de consolidated y with_adjustments
DROP FUNCTION IF EXISTS calculate_pl_report_consolidated(text, text[], text, text) CASCADE;
DROP FUNCTION IF EXISTS calculate_pl_report_consolidated(text, text[], date, date) CASCADE;
DROP FUNCTION IF EXISTS calculate_pl_report_with_adjustments(text, uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS calculate_pl_report_with_adjustments(text, uuid, text, date, date) CASCADE;

-- ============================================================================
-- calculate_pl_report_consolidated con DATE (definitivo)
-- ============================================================================
CREATE FUNCTION calculate_pl_report_consolidated(
  p_template_code TEXT,
  p_centro_codes TEXT[],
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  is_total BOOLEAN,
  sign TEXT,
  amount NUMERIC,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH centro_reports AS (
    SELECT 
      r.rubric_code,
      r.rubric_name,
      r.parent_code,
      r.level,
      r.sort,
      r.is_total,
      r.sign,
      SUM(r.amount) as total_amount
    FROM UNNEST(p_centro_codes) AS centro_code
    CROSS JOIN LATERAL calculate_pl_report(
      p_template_code,
      NULL::UUID,
      centro_code,
      p_start_date,
      p_end_date
    ) AS r
    GROUP BY r.rubric_code, r.rubric_name, r.parent_code, r.level, r.sort, r.is_total, r.sign
  ),
  total_income AS (
    SELECT COALESCE(SUM(total_amount), 0) as amount
    FROM centro_reports
    WHERE rubric_code = 'ingresos'
  )
  SELECT 
    cr.rubric_code,
    cr.rubric_name,
    cr.parent_code,
    cr.level,
    cr.sort,
    cr.is_total,
    cr.sign,
    cr.total_amount as amount,
    CASE 
      WHEN ti.amount > 0 THEN ROUND((cr.total_amount / ti.amount) * 100, 2)
      ELSE 0
    END as percentage
  FROM centro_reports cr
  CROSS JOIN total_income ti
  ORDER BY cr.sort;
END;
$$;

-- ============================================================================
-- calculate_pl_report_with_adjustments con DATE (definitivo)
-- ============================================================================
CREATE FUNCTION calculate_pl_report_with_adjustments(
  p_template_code TEXT,
  p_company_id UUID,
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  is_total BOOLEAN,
  sign TEXT,
  amount_calculated NUMERIC,
  amount_adjustment NUMERIC,
  amount_final NUMERIC,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH base_report AS (
    SELECT * FROM calculate_pl_report(
      p_template_code,
      p_company_id,
      p_centro_code,
      p_start_date,
      p_end_date
    )
  ),
  adjustments AS (
    SELECT 
      pma.rubric_code,
      SUM(pma.adjustment_amount) as total_adjustment
    FROM pl_manual_adjustments pma
    JOIN pl_templates pt ON pt.id = pma.template_id
    WHERE pt.code = p_template_code
      AND (p_company_id IS NULL OR pma.company_id = p_company_id)
      AND (p_centro_code IS NULL OR pma.centro_code = p_centro_code)
      AND pma.period_start >= p_start_date
      AND pma.period_end <= p_end_date
    GROUP BY pma.rubric_code
  ),
  combined AS (
    SELECT 
      br.rubric_code,
      br.rubric_name,
      br.parent_code,
      br.level,
      br.sort,
      br.is_total,
      br.sign,
      br.amount as calculated,
      COALESCE(adj.total_adjustment, 0) as adjustment,
      br.amount + COALESCE(adj.total_adjustment, 0) as final_amount
    FROM base_report br
    LEFT JOIN adjustments adj ON adj.rubric_code = br.rubric_code
  ),
  total_sales AS (
    SELECT COALESCE(SUM(final_amount), 0) as amount
    FROM combined
    WHERE rubric_code = 'ingresos'
  )
  SELECT 
    c.rubric_code,
    c.rubric_name,
    c.parent_code,
    c.level,
    c.sort,
    c.is_total,
    c.sign,
    c.calculated,
    c.adjustment,
    c.final_amount,
    CASE 
      WHEN ts.amount > 0 THEN ROUND((c.final_amount / ts.amount) * 100, 2)
      ELSE 0
    END as percentage
  FROM combined c
  CROSS JOIN total_sales ts
  ORDER BY c.sort;
END;
$$;

-- ============================================================================
-- Permisos
-- ============================================================================
GRANT EXECUTE ON FUNCTION calculate_pl_report_consolidated(TEXT, TEXT[], DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pl_report_consolidated(TEXT, TEXT[], DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION calculate_pl_report_with_adjustments(TEXT, UUID, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pl_report_with_adjustments(TEXT, UUID, TEXT, DATE, DATE) TO anon;

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones P&L recreadas con tipos DATE:';
  RAISE NOTICE '  - calculate_pl_report_consolidated(text, text[], date, date)';
  RAISE NOTICE '  - calculate_pl_report_with_adjustments(text, uuid, text, date, date)';
END $$;