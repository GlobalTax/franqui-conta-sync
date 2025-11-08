-- Función para calcular amortizaciones mensuales del inmovilizado
CREATE OR REPLACE FUNCTION calculate_monthly_depreciations(
  p_centro_code TEXT,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_asset RECORD;
  v_monthly_depreciation NUMERIC;
  v_accumulated NUMERIC;
  v_book_value NUMERIC;
  v_entry_id UUID;
  v_total_depreciation NUMERIC := 0;
  v_assets_processed INTEGER := 0;
BEGIN
  FOR v_asset IN 
    SELECT * FROM fixed_assets
    WHERE centro_code = p_centro_code
      AND status = 'active'
      AND acquisition_date < make_date(p_year, p_month, 1)
  LOOP
    -- Calcular amortización mensual según método lineal
    IF v_asset.depreciation_method = 'linear' THEN
      v_monthly_depreciation := (v_asset.acquisition_value - v_asset.residual_value) / 
                                 (v_asset.useful_life_years * 12);
    ELSE
      -- Por ahora solo soportamos lineal
      v_monthly_depreciation := (v_asset.acquisition_value - v_asset.residual_value) / 
                                 (v_asset.useful_life_years * 12);
    END IF;
    
    -- Calcular acumulado hasta la fecha
    v_accumulated := COALESCE(v_asset.accumulated_depreciation, 0) + v_monthly_depreciation;
    v_book_value := v_asset.acquisition_value - v_accumulated;
    
    -- No depreciar más allá del valor residual
    IF v_book_value < v_asset.residual_value THEN
      v_monthly_depreciation := v_asset.acquisition_value - v_asset.residual_value - 
                                 COALESCE(v_asset.accumulated_depreciation, 0);
      v_accumulated := v_asset.acquisition_value - v_asset.residual_value;
      v_book_value := v_asset.residual_value;
      
      -- Marcar como totalmente amortizado
      UPDATE fixed_assets
      SET status = 'fully_depreciated'
      WHERE id = v_asset.id;
    END IF;
    
    -- Insertar registro de amortización si no existe
    INSERT INTO asset_depreciations (
      asset_id,
      period_year,
      period_month,
      depreciation_amount,
      accumulated_depreciation,
      book_value
    ) VALUES (
      v_asset.id,
      p_year,
      p_month,
      v_monthly_depreciation,
      v_accumulated,
      v_book_value
    )
    ON CONFLICT (asset_id, period_year, period_month) DO NOTHING;
    
    -- Actualizar acumulado en activo
    UPDATE fixed_assets
    SET accumulated_depreciation = v_accumulated,
        current_value = v_book_value
    WHERE id = v_asset.id;
    
    v_total_depreciation := v_total_depreciation + v_monthly_depreciation;
    v_assets_processed := v_assets_processed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'assets_processed', v_assets_processed,
    'total_depreciation', v_total_depreciation,
    'message', format('Procesadas %s amortizaciones por %s€', v_assets_processed, 
                      ROUND(v_total_depreciation, 2))
  );
END;
$$;

-- Función para análisis de vencimientos
CREATE OR REPLACE FUNCTION get_payment_terms_analysis(
  p_centro_code TEXT,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE(
  due_status TEXT,
  total_amount NUMERIC,
  count_items INTEGER,
  avg_days_overdue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH classified_terms AS (
    SELECT 
      pt.*,
      CASE 
        WHEN pt.status = 'paid' THEN 'paid'
        WHEN pt.due_date < CURRENT_DATE THEN 'overdue'
        WHEN pt.due_date = CURRENT_DATE THEN 'due_today'
        WHEN pt.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_this_week'
        WHEN pt.due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_this_month'
        ELSE 'future'
      END as due_status_calc,
      CASE 
        WHEN pt.status != 'paid' AND pt.due_date < CURRENT_DATE 
        THEN CURRENT_DATE - pt.due_date
        ELSE 0
      END as days_overdue
    FROM payment_terms pt
    WHERE pt.centro_code = p_centro_code
      AND pt.due_date BETWEEN p_date_from AND p_date_to
  )
  SELECT 
    ct.due_status_calc as due_status,
    SUM(ct.amount - COALESCE(ct.paid_amount, 0)) as total_amount,
    COUNT(*)::INTEGER as count_items,
    AVG(ct.days_overdue) as avg_days_overdue
  FROM classified_terms ct
  GROUP BY ct.due_status_calc
  ORDER BY 
    CASE ct.due_status_calc
      WHEN 'overdue' THEN 1
      WHEN 'due_today' THEN 2
      WHEN 'due_this_week' THEN 3
      WHEN 'due_this_month' THEN 4
      WHEN 'future' THEN 5
      WHEN 'paid' THEN 6
    END;
END;
$$;

-- Función para generar datos del Modelo 303 (IVA trimestral)
CREATE OR REPLACE FUNCTION generate_modelo_303(
  p_centro_code TEXT,
  p_year INTEGER,
  p_quarter INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_iva_repercutido RECORD;
  v_iva_soportado RECORD;
  v_result JSONB;
BEGIN
  -- Calcular fechas del trimestre
  v_start_date := make_date(p_year, (p_quarter - 1) * 3 + 1, 1);
  v_end_date := (v_start_date + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
  
  -- IVA Repercutido (ventas) - Casillas 01-09
  SELECT 
    COALESCE(SUM(CASE WHEN il.tax_rate = 21 THEN il.subtotal ELSE 0 END), 0) as base_21,
    COALESCE(SUM(CASE WHEN il.tax_rate = 21 THEN il.tax_amount ELSE 0 END), 0) as cuota_21,
    COALESCE(SUM(CASE WHEN il.tax_rate = 10 THEN il.subtotal ELSE 0 END), 0) as base_10,
    COALESCE(SUM(CASE WHEN il.tax_rate = 10 THEN il.tax_amount ELSE 0 END), 0) as cuota_10,
    COALESCE(SUM(CASE WHEN il.tax_rate = 4 THEN il.subtotal ELSE 0 END), 0) as base_4,
    COALESCE(SUM(CASE WHEN il.tax_rate = 4 THEN il.tax_amount ELSE 0 END), 0) as cuota_4,
    COALESCE(SUM(il.tax_amount), 0) as total_cuota
  INTO v_iva_repercutido
  FROM invoices_issued ii
  JOIN invoice_lines il ON il.invoice_id = ii.id AND il.invoice_type = 'issued'
  WHERE ii.centro_code = p_centro_code
    AND ii.invoice_date BETWEEN v_start_date AND v_end_date
    AND ii.status IN ('sent', 'paid');
  
  -- IVA Soportado (compras) - Casillas 28-43
  SELECT 
    COALESCE(SUM(CASE WHEN il.tax_rate = 21 THEN il.subtotal ELSE 0 END), 0) as base_21,
    COALESCE(SUM(CASE WHEN il.tax_rate = 21 THEN il.tax_amount ELSE 0 END), 0) as cuota_21,
    COALESCE(SUM(CASE WHEN il.tax_rate = 10 THEN il.subtotal ELSE 0 END), 0) as base_10,
    COALESCE(SUM(CASE WHEN il.tax_rate = 10 THEN il.tax_amount ELSE 0 END), 0) as cuota_10,
    COALESCE(SUM(CASE WHEN il.tax_rate = 4 THEN il.subtotal ELSE 0 END), 0) as base_4,
    COALESCE(SUM(CASE WHEN il.tax_rate = 4 THEN il.tax_amount ELSE 0 END), 0) as cuota_4,
    COALESCE(SUM(il.tax_amount), 0) as total_cuota
  INTO v_iva_soportado
  FROM invoices_received ir
  JOIN invoice_lines il ON il.invoice_id = ir.id AND il.invoice_type = 'received'
  WHERE ir.centro_code = p_centro_code
    AND ir.invoice_date BETWEEN v_start_date AND v_end_date
    AND ir.status IN ('approved', 'paid');
  
  -- Construir resultado
  v_result := jsonb_build_object(
    'periodo', jsonb_build_object(
      'ejercicio', p_year,
      'trimestre', p_quarter,
      'fecha_inicio', v_start_date,
      'fecha_fin', v_end_date
    ),
    'iva_devengado', jsonb_build_object(
      'casilla_01_base_21', v_iva_repercutido.base_21,
      'casilla_02_cuota_21', v_iva_repercutido.cuota_21,
      'casilla_03_base_10', v_iva_repercutido.base_10,
      'casilla_04_cuota_10', v_iva_repercutido.cuota_10,
      'casilla_05_base_4', v_iva_repercutido.base_4,
      'casilla_06_cuota_4', v_iva_repercutido.cuota_4,
      'casilla_07_total_cuota', v_iva_repercutido.total_cuota
    ),
    'iva_deducible', jsonb_build_object(
      'casilla_28_base_21', v_iva_soportado.base_21,
      'casilla_29_cuota_21', v_iva_soportado.cuota_21,
      'casilla_30_base_10', v_iva_soportado.base_10,
      'casilla_31_cuota_10', v_iva_soportado.cuota_10,
      'casilla_32_base_4', v_iva_soportado.base_4,
      'casilla_33_cuota_4', v_iva_soportado.cuota_4,
      'casilla_43_total_cuota', v_iva_soportado.total_cuota
    ),
    'resultado', jsonb_build_object(
      'casilla_71_resultado', v_iva_repercutido.total_cuota - v_iva_soportado.total_cuota,
      'tipo', CASE 
        WHEN v_iva_repercutido.total_cuota > v_iva_soportado.total_cuota THEN 'a_ingresar'
        WHEN v_iva_repercutido.total_cuota < v_iva_soportado.total_cuota THEN 'a_compensar'
        ELSE 'sin_actividad'
      END
    )
  );
  
  RETURN v_result;
END;
$$;

-- Función para análisis por centros de coste
CREATE OR REPLACE FUNCTION get_cost_center_analysis(
  p_centro_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  cost_center_code TEXT,
  cost_center_name TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.code,
    cc.name,
    COALESCE(SUM(CASE WHEN at.movement_type = 'debit' THEN at.amount ELSE 0 END), 0) as total_debit,
    COALESCE(SUM(CASE WHEN at.movement_type = 'credit' THEN at.amount ELSE 0 END), 0) as total_credit,
    COALESCE(SUM(CASE WHEN at.movement_type = 'debit' THEN at.amount ELSE -at.amount END), 0) as balance
  FROM cost_centers cc
  LEFT JOIN accounting_transactions at ON at.cost_center_id = cc.id
  LEFT JOIN accounting_entries ae ON ae.id = at.entry_id
  WHERE cc.centro_code = p_centro_code
    AND cc.active = true
    AND (ae.entry_date BETWEEN p_start_date AND p_end_date OR ae.entry_date IS NULL)
    AND (ae.status IN ('posted', 'closed') OR ae.status IS NULL)
  GROUP BY cc.code, cc.name
  ORDER BY cc.code;
END;
$$;

-- Función para análisis por proyectos
CREATE OR REPLACE FUNCTION get_project_analysis(
  p_centro_code TEXT,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(
  project_code TEXT,
  project_name TEXT,
  budget_amount NUMERIC,
  actual_amount NUMERIC,
  variance NUMERIC,
  variance_percent NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH project_actuals AS (
    SELECT 
      p.id,
      COALESCE(SUM(CASE WHEN at.movement_type = 'debit' THEN at.amount ELSE -at.amount END), 0) as actual
    FROM projects p
    LEFT JOIN accounting_transactions at ON at.project_id = p.id
    LEFT JOIN accounting_entries ae ON ae.id = at.entry_id
    WHERE p.centro_code = p_centro_code
      AND (p_project_id IS NULL OR p.id = p_project_id)
      AND (ae.status IN ('posted', 'closed') OR ae.status IS NULL)
    GROUP BY p.id
  )
  SELECT 
    p.code,
    p.name,
    COALESCE(p.budget_amount, 0),
    pa.actual,
    COALESCE(p.budget_amount, 0) - pa.actual as variance,
    CASE 
      WHEN p.budget_amount > 0 
      THEN ((COALESCE(p.budget_amount, 0) - pa.actual) / p.budget_amount) * 100
      ELSE 0
    END as variance_percent,
    p.status
  FROM projects p
  JOIN project_actuals pa ON pa.id = p.id
  WHERE p.centro_code = p_centro_code
    AND (p_project_id IS NULL OR p.id = p_project_id)
  ORDER BY p.code;
END;
$$;