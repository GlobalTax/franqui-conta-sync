-- ============================================================================
-- MIGRACIÓN: Actualizar calculate_pl_report con soporte para fórmulas
-- ============================================================================
-- Versión: 2.0
-- Fecha: 2025-11-09
-- Descripción: Añade evaluación recursiva de fórmulas (SUM, restas, etc.)
-- ============================================================================

-- 1. Función auxiliar para evaluar fórmulas
CREATE OR REPLACE FUNCTION evaluate_pl_formula(
  p_formula TEXT,
  p_calculated_values JSONB
) RETURNS NUMERIC AS $$
DECLARE
  v_result NUMERIC := 0;
  v_formula_clean TEXT;
  v_parts TEXT[];
  v_part TEXT;
  v_code TEXT;
  v_value NUMERIC;
  v_operator TEXT := '+';
BEGIN
  -- Si no hay fórmula, devolver 0
  IF p_formula IS NULL OR p_formula = '' THEN
    RETURN 0;
  END IF;
  
  -- Limpiar espacios
  v_formula_clean := TRIM(p_formula);
  
  -- Manejar función SUM(code1, code2, ...)
  IF v_formula_clean ~* '^SUM\(' THEN
    -- Extraer contenido entre paréntesis
    v_formula_clean := SUBSTRING(v_formula_clean FROM 'SUM\((.*)\)');
    v_parts := string_to_array(v_formula_clean, ',');
    
    v_result := 0;
    FOREACH v_part IN ARRAY v_parts LOOP
      v_code := TRIM(v_part);
      v_value := COALESCE((p_calculated_values->>v_code)::NUMERIC, 0);
      v_result := v_result + v_value;
    END LOOP;
    
    RETURN v_result;
  END IF;
  
  -- Manejar operaciones aritméticas (code1 - code2, code1 + code2)
  IF v_formula_clean ~ '[-+]' THEN
    -- Separar por operadores manteniendo el operador
    v_parts := regexp_split_to_array(v_formula_clean, '\s*([-+])\s*');
    
    v_result := 0;
    FOR i IN 1..array_length(v_parts, 1) LOOP
      v_part := TRIM(v_parts[i]);
      
      -- Si es un operador, guardarlo para el siguiente
      IF v_part IN ('+', '-') THEN
        v_operator := v_part;
        CONTINUE;
      END IF;
      
      -- Si es un código de rúbrica
      IF v_part != '' THEN
        v_value := COALESCE((p_calculated_values->>v_part)::NUMERIC, 0);
        
        IF i = 1 THEN
          -- Primer valor siempre se suma
          v_result := v_value;
        ELSE
          -- Aplicar operador anterior
          IF v_operator = '+' THEN
            v_result := v_result + v_value;
          ELSIF v_operator = '-' THEN
            v_result := v_result - v_value;
          END IF;
        END IF;
      END IF;
    END LOOP;
    
    RETURN v_result;
  END IF;
  
  -- Si es un código simple, obtener su valor
  v_value := COALESCE((p_calculated_values->>v_formula_clean)::NUMERIC, 0);
  RETURN v_value;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error evaluating formula: % - %', p_formula, SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Actualizar función principal calculate_pl_report
CREATE OR REPLACE FUNCTION calculate_pl_report(
  p_template_code TEXT,
  p_company_id UUID DEFAULT NULL,
  p_centro_code TEXT DEFAULT NULL,
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
  -- Obtener template_id
  SELECT id INTO v_template_id
  FROM pl_templates
  WHERE code = p_template_code AND is_active = true;
  
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_code;
  END IF;
  
  -- ========================================================================
  -- PASO 1: Calcular líneas SIN fórmula (mapeadas desde cuentas)
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
    -- Calcular desde reglas de mapeo
    SELECT COALESCE(SUM(
      CASE 
        WHEN t.movement_type = 'debit' THEN t.amount
        ELSE -t.amount
      END
    ), 0) INTO v_amount
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    WHERE e.status IN ('posted', 'closed')
      AND (p_centro_code IS NULL OR e.centro_code = p_centro_code)
      AND (p_company_id IS NULL OR e.company_id = p_company_id)
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
    
    -- Guardar valor calculado
    v_calculated_values := jsonb_set(
      v_calculated_values,
      ARRAY[v_rubric.code],
      to_jsonb(v_amount)
    );
    
    -- Guardar ventas_netas para cálculo de porcentajes
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
  -- PASO 3: Devolver resultados ordenados con porcentajes
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
COMMENT ON FUNCTION evaluate_pl_formula IS 
'Evalúa fórmulas de P&L: SUM(code1,code2), code1-code2, etc.';

COMMENT ON FUNCTION calculate_pl_report IS 
'Genera P&L dinámico basado en reglas con evaluación de fórmulas recursivas';

-- ============================================================================
-- Instrucciones de uso
-- ============================================================================
-- 1. Ejecutar este script completo en Supabase SQL Editor
-- 2. Verificar que no hay errores
-- 3. Probar con: SELECT * FROM calculate_pl_report('McD_QSR_v1', NULL, 'TU_CENTRO', '2024-01-01', '2024-12-31');
