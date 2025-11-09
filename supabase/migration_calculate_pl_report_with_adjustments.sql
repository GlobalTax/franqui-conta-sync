-- ============================================================================
-- MIGRATION: RPC para calcular P&L con Ajustes Manuales
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pl_report_with_adjustments(
  p_template_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL
)
RETURNS TABLE (
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  is_total BOOLEAN,
  sign TEXT,
  amount_calculated NUMERIC, -- Calculado automáticamente
  amount_adjustment NUMERIC,  -- Ajuste manual (A Sumar)
  amount_final NUMERIC,       -- Total final (Calculado + A Sumar)
  percentage NUMERIC
)
AS $$
DECLARE
  v_total_sales NUMERIC := 0;
BEGIN
  RETURN QUERY
  WITH base_calculation AS (
    -- Llamar a la función existente para obtener cálculo base
    SELECT * FROM calculate_pl_report(
      p_template_code,
      p_company_id,
      p_centro_code,
      p_start_date,
      p_end_date
    )
  ),
  adjustments AS (
    -- Obtener ajustes manuales para el periodo
    SELECT 
      rubric_code,
      SUM(adjustment_amount) AS adjustment_total
    FROM pl_manual_adjustments
    WHERE template_code = p_template_code
      AND (p_company_id IS NULL OR company_id = p_company_id)
      AND (p_centro_code IS NULL OR centro_code = p_centro_code)
      AND (
        p_start_date IS NULL OR 
        period_date BETWEEN p_start_date::DATE AND p_end_date::DATE
      )
    GROUP BY rubric_code
  ),
  calculated_with_adjustments AS (
    SELECT 
      b.rubric_code,
      b.rubric_name,
      b.parent_code,
      b.level,
      b.sort,
      b.is_total,
      b.sign,
      b.amount AS amount_calculated,
      COALESCE(a.adjustment_total, 0) AS amount_adjustment,
      b.amount + COALESCE(a.adjustment_total, 0) AS amount_final,
      b.percentage
    FROM base_calculation b
    LEFT JOIN adjustments a ON b.rubric_code = a.rubric_code
  ),
  sales_total AS (
    SELECT ABS(amount_final) AS total
    FROM calculated_with_adjustments
    WHERE rubric_code LIKE 'ventas%' OR rubric_code LIKE 'sales%'
    LIMIT 1
  )
  SELECT 
    cwa.rubric_code,
    cwa.rubric_name,
    cwa.parent_code,
    cwa.level,
    cwa.sort,
    cwa.is_total,
    cwa.sign,
    cwa.amount_calculated,
    cwa.amount_adjustment,
    cwa.amount_final,
    -- Recalcular porcentajes sobre ventas finales
    CASE 
      WHEN (SELECT total FROM sales_total) > 0
      THEN (cwa.amount_final / (SELECT total FROM sales_total)) * 100
      ELSE 0
    END AS percentage
  FROM calculated_with_adjustments cwa
  ORDER BY cwa.sort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_pl_report_with_adjustments IS 
  'Calcula P&L incluyendo ajustes manuales. Devuelve columnas: Calculado, A Sumar, Importe Final';
