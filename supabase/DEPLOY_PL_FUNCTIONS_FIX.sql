-- ============================================================================
-- SCRIPT DE DESPLIEGUE COMPLETO: Funciones P&L con tipos DATE consistentes
-- ============================================================================
-- Ejecutar este script COMPLETO en Supabase SQL Editor
-- Corrige inconsistencias de tipos TEXT → DATE en todas las funciones P&L
-- ============================================================================

-- ============================================================================
-- 1. DROP funciones existentes para evitar conflictos de firma
-- ============================================================================

DROP FUNCTION IF EXISTS calculate_pl_report_with_adjustments(TEXT, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS calculate_pl_report_consolidated(TEXT, TEXT[], TEXT, TEXT);
DROP FUNCTION IF EXISTS calculate_pl_report_accumulated(TEXT, UUID, TEXT, DATE, BOOLEAN);

-- ============================================================================
-- 2. RECREAR: calculate_pl_report_with_adjustments (con DATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pl_report_with_adjustments(
  p_template_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
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
        period_date BETWEEN p_start_date AND p_end_date
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

GRANT EXECUTE ON FUNCTION calculate_pl_report_with_adjustments(TEXT, UUID, TEXT, DATE, DATE) TO authenticated;

COMMENT ON FUNCTION calculate_pl_report_with_adjustments IS 
  'Calcula P&L incluyendo ajustes manuales. Devuelve columnas: Calculado, A Sumar, Importe Final';

-- ============================================================================
-- 3. RECREAR: calculate_pl_report_consolidated (con DATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pl_report_consolidated(
  p_template_code TEXT,
  p_centro_codes TEXT[],
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
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
AS $$
DECLARE
  v_template_id UUID;
  v_iteration INT := 0;
  v_max_iterations INT := 100;
  v_total_sales NUMERIC := 0;
BEGIN
  -- Validar template
  SELECT id INTO v_template_id
  FROM pl_templates
  WHERE code = p_template_code AND is_active = true;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template % no encontrado', p_template_code;
  END IF;

  -- Validar centros
  IF p_centro_codes IS NULL OR array_length(p_centro_codes, 1) = 0 THEN
    RAISE EXCEPTION 'Debe proporcionar al menos un centro';
  END IF;

  RETURN QUERY
  WITH RECURSIVE pl_calculation AS (
    -- ========================================================================
    -- PASO 1: Calcular rubros sin fórmula (mapeo directo)
    -- ========================================================================
    SELECT 
      r.code AS rubric_code,
      r.name AS rubric_name,
      r.parent_code,
      r.level,
      r.sort,
      r.is_total,
      r.sign,
      COALESCE(SUM(
        CASE 
          WHEN r.sign = 'invert' THEN -t.amount
          ELSE t.amount
        END
      ), 0) AS amount,
      0 AS iteration
    FROM pl_rubrics r
    LEFT JOIN pl_rules rl ON rl.rubric_code = r.code AND rl.template_id = v_template_id
    LEFT JOIN transactions t ON (
      -- Filtros de periodo y centros
      (p_start_date IS NULL OR t.posting_date >= p_start_date) AND
      (p_end_date IS NULL OR t.posting_date <= p_end_date) AND
      t.centro_code = ANY(p_centro_codes) AND
      -- Aplicar reglas de matching
      (
        (rl.match_kind = 'account_exact' AND t.account_code = rl.account) OR
        (rl.match_kind = 'account_like' AND t.account_code LIKE rl.account_like) OR
        (rl.match_kind = 'account_range' AND t.account_code BETWEEN rl.account_from AND rl.account_to) OR
        (rl.match_kind = 'group' AND LEFT(t.account_code, LENGTH(rl.group_code)) = rl.group_code) OR
        (rl.match_kind = 'channel' AND t.dim_channel = rl.channel) OR
        (rl.match_kind = 'centre' AND t.centro_code = ANY(p_centro_codes))
      )
    )
    WHERE r.template_id = v_template_id
      AND (r.formula IS NULL OR r.formula = '')
    GROUP BY r.code, r.name, r.parent_code, r.level, r.sort, r.is_total, r.sign

    UNION ALL

    -- ========================================================================
    -- PASO 2: Calcular rubros con fórmula (iterativo)
    -- ========================================================================
    SELECT 
      r.code AS rubric_code,
      r.name AS rubric_name,
      r.parent_code,
      r.level,
      r.sort,
      r.is_total,
      r.sign,
      evaluate_pl_formula(
        r.formula,
        (SELECT jsonb_object_agg(pc.rubric_code, pc.amount)
         FROM pl_calculation pc
         WHERE pc.iteration = pl_calculation.iteration)
      ) AS amount,
      pl_calculation.iteration + 1
    FROM pl_rubrics r
    CROSS JOIN (
      SELECT DISTINCT iteration
      FROM pl_calculation
      WHERE iteration = (SELECT MAX(iteration) FROM pl_calculation)
    ) pl_calculation
    WHERE r.template_id = v_template_id
      AND r.formula IS NOT NULL
      AND r.formula != ''
      AND NOT EXISTS (
        SELECT 1 FROM pl_calculation pc2
        WHERE pc2.rubric_code = r.code
      )
      AND pl_calculation.iteration < v_max_iterations
  ),
  final_results AS (
    SELECT DISTINCT ON (rubric_code)
      rubric_code,
      rubric_name,
      parent_code,
      level,
      sort,
      is_total,
      sign,
      amount
    FROM pl_calculation
    ORDER BY rubric_code, iteration DESC
  ),
  sales_total AS (
    SELECT ABS(amount) AS total
    FROM final_results
    WHERE rubric_code LIKE 'ventas_netas%' OR rubric_code LIKE 'net_sales%'
    LIMIT 1
  )
  SELECT 
    fr.rubric_code,
    fr.rubric_name,
    fr.parent_code,
    fr.level,
    fr.sort,
    fr.is_total,
    fr.sign,
    fr.amount,
    CASE 
      WHEN (SELECT total FROM sales_total) > 0
      THEN (fr.amount / (SELECT total FROM sales_total)) * 100
      ELSE 0
    END AS percentage
  FROM final_results fr
  ORDER BY fr.sort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_pl_report_consolidated(TEXT, TEXT[], DATE, DATE) TO authenticated;

COMMENT ON FUNCTION calculate_pl_report_consolidated IS 
  'Calcula P&L consolidado para múltiples centros. Suma transacciones de todos los centros especificados.';

-- ============================================================================
-- 4. RECREAR: calculate_pl_report_accumulated (con DATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pl_report_accumulated(
  p_template_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
  p_period_date DATE, -- Fecha del mes a consultar
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
      v_period_start,
      v_period_end
    )
  ),
  ytd_data AS (
    -- Calcular P&L acumulado año
    SELECT * FROM calculate_pl_report(
      p_template_code,
      p_company_id,
      p_centro_code,
      v_ytd_start,
      v_ytd_end
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

GRANT EXECUTE ON FUNCTION calculate_pl_report_accumulated(TEXT, UUID, TEXT, DATE, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION calculate_pl_report_accumulated IS 
'Calcula P&L con vista dual: periodo mensual + acumulado año (YTD). 
Devuelve columnas separadas para amounts y percentages de ambos periodos.';

-- ============================================================================
-- 5. VERIFICACIÓN: Confirmar firmas correctas
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Funciones P&L desplegadas correctamente con tipos DATE';
  RAISE NOTICE '📋 Verificar firmas con: SELECT routine_name, string_agg(parameter_name || '':'' || udt_name, '', '') FROM information_schema.parameters WHERE routine_name LIKE ''calculate_pl%'' GROUP BY routine_name;';
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
