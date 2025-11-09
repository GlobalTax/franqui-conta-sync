-- ============================================================================
-- FIX: calculate_pl_report_accumulated con tipos DATE y % internos
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_pl_report_accumulated(text, uuid, text, date, boolean);
DROP FUNCTION IF EXISTS public.calculate_pl_report_accumulated(text, date, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.calculate_pl_report_accumulated(
  p_template_code text,
  p_period_date date,
  p_company_id uuid DEFAULT NULL::uuid,
  p_centro_code text DEFAULT NULL::text,
  p_show_accumulated boolean DEFAULT true
)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_ytd_start DATE;
  v_ytd_end DATE;
BEGIN
  -- Año y mes de la fecha de periodo
  v_year := EXTRACT(YEAR FROM p_period_date);
  v_month := EXTRACT(MONTH FROM p_period_date);

  -- Rango mensual
  v_period_start := DATE_TRUNC('month', p_period_date)::date;
  v_period_end := (DATE_TRUNC('month', p_period_date) + INTERVAL '1 month - 1 day')::date;

  -- Rango YTD
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
    -- Ventas del mes (admite 'ingresos' o 'revenue' según plantilla)
    SELECT COALESCE(ABS(SUM(amount)), 0) AS amount
    FROM period_data
    WHERE rubric_code IN ('ingresos','revenue','ventas','sales')
  ),
  ytd_sales AS (
    -- Ventas acumuladas YTD (admite 'ingresos' o 'revenue')
    SELECT COALESCE(ABS(SUM(amount)), 0) AS amount
    FROM ytd_data
    WHERE rubric_code IN ('ingresos','revenue','ventas','sales')
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
    COALESCE(y.amount, 0) AS amount_ytd,
    CASE WHEN ps.amount > 0 THEN ROUND((p.amount / ps.amount) * 100, 2) ELSE 0 END AS percentage_period,
    CASE WHEN ys.amount > 0 THEN ROUND((COALESCE(y.amount,0) / ys.amount) * 100, 2) ELSE 0 END AS percentage_ytd
  FROM period_data p
  LEFT JOIN ytd_data y ON y.rubric_code = p.rubric_code
  CROSS JOIN period_sales ps
  CROSS JOIN ytd_sales ys
  ORDER BY p.sort;
END;
$function$;

-- Asegurar privilegios
GRANT EXECUTE ON FUNCTION public.calculate_pl_report_accumulated(text, date, uuid, text, boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_pl_report_accumulated(text, date, uuid, text, boolean) TO authenticated;

-- Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.calculate_pl_report_accumulated IS 
'Calcula P&L con vista dual: periodo mensual + acumulado año (YTD). 
Corregido: usa DATE en lugar de TEXT, calcula porcentajes internamente sobre ventas.';
