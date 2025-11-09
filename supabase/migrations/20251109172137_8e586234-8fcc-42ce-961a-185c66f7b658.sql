-- ============================================================================
-- FIX v2: corregir orden de parámetros (no-defaults antes que defaults)
-- ============================================================================

-- Limpiar posibles restos
DROP FUNCTION IF EXISTS public.calculate_pl_report_accumulated(text, uuid, text, date, boolean);
DROP FUNCTION IF EXISTS public.calculate_pl_report_accumulated(text, date, uuid, text, boolean);

-- Crear con p_period_date antes de parámetros con DEFAULT
CREATE OR REPLACE FUNCTION public.calculate_pl_report_accumulated(
  p_template_code text,
  p_period_date date,
  p_company_id uuid DEFAULT NULL,
  p_centro_code text DEFAULT NULL,
  p_show_accumulated boolean DEFAULT true
)
RETURNS TABLE (
  rubric_code text,
  rubric_name text,
  parent_code text,
  level integer,
  sort integer,
  is_total boolean,
  sign text,
  amount_period numeric,
  amount_ytd numeric,
  percentage_period numeric,
  percentage_ytd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_year integer;
  v_period_start date;
  v_period_end date;
  v_ytd_start date;
  v_ytd_end date;
BEGIN
  v_year := EXTRACT(YEAR FROM p_period_date)::int;
  v_period_start := DATE_TRUNC('month', p_period_date)::date;
  v_period_end := (DATE_TRUNC('month', p_period_date) + INTERVAL '1 month - 1 day')::date;
  v_ytd_start := MAKE_DATE(v_year, 1, 1);
  v_ytd_end := v_period_end;

  RETURN QUERY
  WITH period_data AS (
    SELECT * FROM public.calculate_pl_report(
      p_template_code,
      p_company_id,
      p_centro_code,
      v_period_start,
      v_period_end
    )
  ),
  ytd_data AS (
    SELECT * FROM public.calculate_pl_report(
      p_template_code,
      p_company_id,
      p_centro_code,
      v_ytd_start,
      v_ytd_end
    )
  ),
  period_sales AS (
    SELECT COALESCE(ABS(SUM(pd.amount)), 0) AS amount
    FROM period_data pd
    WHERE pd.rubric_code IN ('ingresos','revenue','ventas','sales')
  ),
  ytd_sales AS (
    SELECT COALESCE(ABS(SUM(yd.amount)), 0) AS amount
    FROM ytd_data yd
    WHERE yd.rubric_code IN ('ingresos','revenue','ventas','sales')
  )
  SELECT 
    pd.rubric_code,
    pd.rubric_name,
    pd.parent_code,
    pd.level,
    pd.sort,
    pd.is_total,
    pd.sign,
    pd.amount AS amount_period,
    COALESCE(yd.amount, 0) AS amount_ytd,
    CASE WHEN ps.amount > 0 THEN ROUND((pd.amount / ps.amount) * 100, 2) ELSE 0 END AS percentage_period,
    CASE WHEN ys.amount > 0 THEN ROUND((COALESCE(yd.amount, 0) / ys.amount) * 100, 2) ELSE 0 END AS percentage_ytd
  FROM period_data pd
  LEFT JOIN ytd_data yd ON yd.rubric_code = pd.rubric_code
  CROSS JOIN period_sales ps
  CROSS JOIN ytd_sales ys
  ORDER BY pd.sort;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.calculate_pl_report_accumulated(text, date, uuid, text, boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_pl_report_accumulated(text, date, uuid, text, boolean) TO authenticated;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.calculate_pl_report_accumulated IS 
'P&L dual (mes + YTD) con alias explícitos y % sobre ventas.';