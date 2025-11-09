-- ============================================================================
-- FASE 1: Sistema de P&L - Funciones SQL
-- ============================================================================

-- 1. Función para refrescar la vista materializada del mayor mensual
CREATE OR REPLACE FUNCTION public.refresh_gl_ledger_month()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gl_ledger_month;
END;
$$;

-- 2. Función para calcular el informe de P&L dinámicamente
CREATE OR REPLACE FUNCTION public.calculate_pl_report(
  p_template_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  is_total BOOLEAN,
  amount NUMERIC,
  sign TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Obtener ID de plantilla
  SELECT id INTO v_template_id
  FROM pl_templates
  WHERE code = p_template_code AND is_active = true;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Plantilla % no encontrada o inactiva', p_template_code;
  END IF;

  -- Retornar rubros con sus montos
  RETURN QUERY
  WITH rubric_amounts AS (
    SELECT
      r.rubric_code,
      SUM(r.amount) as total_amount
    FROM v_pl_rubric_month r
    WHERE r.template_id = v_template_id
      AND (p_company_id IS NULL OR r.company_id = p_company_id)
      AND (p_centro_code IS NULL OR r.centro_code = p_centro_code)
      AND (p_start_date IS NULL OR r.period_month >= p_start_date)
      AND (p_end_date IS NULL OR r.period_month <= p_end_date)
    GROUP BY r.rubric_code
  )
  SELECT
    rub.code as rubric_code,
    rub.name as rubric_name,
    rub.parent_code,
    rub.level,
    rub.sort,
    rub.is_total,
    COALESCE(ra.total_amount, 0) as amount,
    rub.sign
  FROM pl_rubrics rub
  LEFT JOIN rubric_amounts ra ON ra.rubric_code = rub.code
  WHERE rub.template_id = v_template_id
  ORDER BY rub.sort, rub.code;
END;
$$;

-- 3. Función para detectar cuentas sin mapear
CREATE OR REPLACE FUNCTION public.unmapped_accounts(
  p_template_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
  p_period_month DATE DEFAULT NULL
)
RETURNS TABLE(
  company_id UUID,
  centro_code TEXT,
  period_month DATE,
  account_code TEXT,
  account_name TEXT,
  amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Obtener ID de plantilla
  SELECT id INTO v_template_id
  FROM pl_templates
  WHERE code = p_template_code AND is_active = true;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Plantilla % no encontrada o inactiva', p_template_code;
  END IF;

  -- Retornar cuentas sin mapear
  RETURN QUERY
  SELECT
    l.company_id,
    l.centro_code,
    l.period_month,
    l.account_code,
    COALESCE(a.name, 'Cuenta desconocida') as account_name,
    l.amount
  FROM mv_gl_ledger_month l
  LEFT JOIN accounts a ON a.code = l.account_code AND a.centro_code = l.centro_code
  LEFT JOIN v_pl_rule_winner w 
    ON w.template_id = v_template_id
    AND w.company_id = l.company_id
    AND w.centro_code = l.centro_code
    AND w.period_month = l.period_month
    AND w.account_code = l.account_code
  WHERE w.rubric_code IS NULL
    AND (p_company_id IS NULL OR l.company_id = p_company_id)
    AND (p_centro_code IS NULL OR l.centro_code = p_centro_code)
    AND (p_period_month IS NULL OR l.period_month = p_period_month)
    AND l.amount != 0
  ORDER BY ABS(l.amount) DESC;
END;
$$;