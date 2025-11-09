-- ============================================================================
-- MIGRACIÓN: Crear calculate_pl_report_consolidated
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-11-09
-- Descripción: P&L consolidado para múltiples restaurantes/centros
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pl_report_consolidated(
  p_template_code TEXT,
  p_centro_codes TEXT[], -- Array de códigos de centro
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS TABLE(
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  is_total BOOLEAN,
  amount NUMERIC,
  sign TEXT,
  percentage NUMERIC
) AS $$
DECLARE
  v_template_id UUID;
  v_calculated_values JSONB := '{}'::jsonb;
  v_ventas_netas NUMERIC := 0;
  v_rubric RECORD;
  v_amount NUMERIC;
  v_max_iterations INTEGER := 10;
  v_iteration INTEGER := 0;
  v_pending_count INTEGER;
BEGIN
  -- Validar que hay centros
  IF p_centro_codes IS NULL OR array_length(p_centro_codes, 1) = 0 THEN
    RAISE EXCEPTION 'Al menos un centro debe ser especificado';
  END IF;
  
  -- Obtener template_id
  SELECT id INTO v_template_id
  FROM pl_templates
  WHERE code = p_template_code AND is_active = true;
  
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_code;
  END IF;
  
  -- ========================================================================
  -- PASO 1: Calcular líneas SIN fórmula (consolidar desde múltiples centros)
  -- ========================================================================
  FOR v_rubric IN
    SELECT 
      r.code,
      r.name,
      r.parent_code,
      r.level,
      r.sort,
      r.is_total,
      r.formula,
      r.sign
    FROM pl_rubrics r
    WHERE r.template_id = v_template_id
      AND (r.formula IS NULL OR r.formula = '')
    ORDER BY r.sort
  LOOP
    -- Calcular SUMA de todos los centros desde reglas de mapeo
    SELECT COALESCE(SUM(
      CASE 
        WHEN t.movement_type = 'debit' THEN t.amount
        ELSE -t.amount
      END
    ), 0) INTO v_amount
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    WHERE e.status IN ('posted', 'closed')
      AND e.centro_code = ANY(p_centro_codes) -- Consolidar múltiples centros
      AND (p_start_date IS NULL OR e.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR e.entry_date <= p_end_date)
      AND EXISTS (
        SELECT 1 FROM pl_rules rule
        WHERE rule.template_id = v_template_id
          AND rule.rubric_code = v_rubric.code
          AND (
            (rule.match_kind = 'account_exact' AND t.account_code = rule.account)
            OR (rule.match_kind = 'account_like' AND t.account_code LIKE rule.account_like)
            OR (rule.match_kind = 'account_range' 
                AND t.account_code >= rule.account_from 
                AND t.account_code <= rule.account_to)
          )
      );
    
    -- Aplicar signo si es necesario
    IF v_rubric.sign = 'invert' THEN
      v_amount := -v_amount;
    END IF;
    
    -- Guardar valor calculado consolidado
    v_calculated_values := jsonb_set(
      v_calculated_values,
      ARRAY[v_rubric.code],
      to_jsonb(v_amount)
    );
    
    -- Guardar ventas_netas consolidadas para cálculo de porcentajes
    IF v_rubric.code = 'ventas_netas' THEN
      v_ventas_netas := v_amount;
    END IF;
  END LOOP;
  
  -- ========================================================================
  -- PASO 2: Calcular líneas CON fórmula (evaluación recursiva)
  -- ========================================================================
  LOOP
    v_iteration := v_iteration + 1;
    v_pending_count := 0;
    
    FOR v_rubric IN
      SELECT 
        r.code,
        r.name,
        r.parent_code,
        r.level,
        r.sort,
        r.is_total,
        r.formula,
        r.sign
      FROM pl_rubrics r
      WHERE r.template_id = v_template_id
        AND r.formula IS NOT NULL 
        AND r.formula != ''
        AND NOT (v_calculated_values ? r.code)
      ORDER BY r.level, r.sort
    LOOP
      -- Intentar evaluar fórmula
      BEGIN
        v_amount := evaluate_pl_formula(v_rubric.formula, v_calculated_values);
        
        -- Aplicar signo si es necesario
        IF v_rubric.sign = 'invert' THEN
          v_amount := -v_amount;
        END IF;
        
        -- Guardar valor calculado
        v_calculated_values := jsonb_set(
          v_calculated_values,
          ARRAY[v_rubric.code],
          to_jsonb(v_amount)
        );
        
      EXCEPTION
        WHEN OTHERS THEN
          -- Si falla, contar como pendiente para siguiente iteración
          v_pending_count := v_pending_count + 1;
      END;
    END LOOP;
    
    -- Si no hay pendientes o alcanzamos límite, salir
    EXIT WHEN v_pending_count = 0 OR v_iteration >= v_max_iterations;
  END LOOP;
  
  -- ========================================================================
  -- PASO 3: Devolver resultados consolidados con porcentajes
  -- ========================================================================
  RETURN QUERY
  SELECT 
    r.code,
    r.name,
    r.parent_code,
    r.level,
    r.sort,
    r.is_total,
    COALESCE((v_calculated_values->>r.code)::NUMERIC, 0) as amount,
    r.sign::TEXT,
    CASE 
      WHEN v_ventas_netas > 0 THEN
        ROUND((COALESCE((v_calculated_values->>r.code)::NUMERIC, 0) / v_ventas_netas * 100), 2)
      ELSE 0
    END as percentage
  FROM pl_rubrics r
  WHERE r.template_id = v_template_id
  ORDER BY r.sort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Comentarios y notas
-- ============================================================================
COMMENT ON FUNCTION calculate_pl_report_consolidated IS 
'Genera P&L consolidado sumando datos de múltiples centros/restaurantes';

-- ============================================================================
-- Ejemplos de uso
-- ============================================================================
-- Consolidar 3 restaurantes para el año 2024:
-- SELECT * FROM calculate_pl_report_consolidated(
--   'McD_QSR_v1',
--   ARRAY['LORANCA', 'ISLAZUL', 'OTRO_CENTRO'],
--   '2024-01-01',
--   '2024-12-31'
-- );

-- ============================================================================
-- Instrucciones de instalación
-- ============================================================================
-- 1. Asegúrate de que migration_calculate_pl_report_formulas.sql ya está ejecutado
--    (necesita la función evaluate_pl_formula)
-- 2. Ejecutar este script completo en Supabase SQL Editor
-- 3. Verificar que no hay errores
