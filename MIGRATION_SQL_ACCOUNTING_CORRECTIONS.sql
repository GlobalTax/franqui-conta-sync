-- ============================================================================
-- MIGRATION: Correcciones Críticas Sistema Contable
-- Crea tabla closing_periods + 4 RPCs de validación
-- ============================================================================

-- ============================================================================
-- PARTE 1: TABLA closing_periods
-- Registra cierres contables mensuales y anuales por centro
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.closing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación del período
  centro_code TEXT NOT NULL REFERENCES centres(codigo) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'annual')),
  period_year INTEGER NOT NULL,
  period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
  
  -- Estado del cierre
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closing_date DATE,
  
  -- Referencias a asientos contables
  closing_entry_id UUID REFERENCES accounting_entries(id) ON DELETE SET NULL,
  regularization_entry_id UUID REFERENCES accounting_entries(id) ON DELETE SET NULL,
  
  -- Auditoría
  closed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Restricciones de negocio
  CONSTRAINT unique_period_per_centre 
    UNIQUE (centro_code, period_year, period_month),
  
  CONSTRAINT check_month_for_monthly 
    CHECK (
      (period_type = 'annual' AND period_month IS NULL) 
      OR (period_type = 'monthly' AND period_month IS NOT NULL)
    )
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_closing_periods_centro ON closing_periods(centro_code);
CREATE INDEX IF NOT EXISTS idx_closing_periods_year ON closing_periods(period_year);
CREATE INDEX IF NOT EXISTS idx_closing_periods_status ON closing_periods(status);

-- Trigger de actualización
CREATE TRIGGER update_closing_periods_updated_at
  BEFORE UPDATE ON closing_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RLS POLICIES para closing_periods
-- ============================================================================

ALTER TABLE closing_periods ENABLE ROW LEVEL SECURITY;

-- Admins pueden todo
CREATE POLICY admin_all_closing_periods 
  ON closing_periods FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Usuarios pueden ver períodos de centros accesibles
CREATE POLICY select_closing_periods 
  ON closing_periods FOR SELECT
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  );

-- Usuarios con permiso pueden crear cierres
CREATE POLICY insert_closing_periods 
  ON closing_periods FOR INSERT
  WITH CHECK (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
    AND has_permission(auth.uid(), 'accounting.close_period')
  );

-- Usuarios con permiso pueden actualizar períodos abiertos
CREATE POLICY update_closing_periods 
  ON closing_periods FOR UPDATE
  USING (
    centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
    AND status = 'open'
    AND has_permission(auth.uid(), 'accounting.close_period')
  );

COMMENT ON TABLE closing_periods IS 'Registro de cierres contables mensuales y anuales';
COMMENT ON COLUMN closing_periods.period_type IS 'Tipo: monthly (mensual) o annual (ejercicio completo)';
COMMENT ON COLUMN closing_periods.status IS 'Estado: open (abierto, modificable) o closed (cerrado, inmutable)';

-- ============================================================================
-- PARTE 2: RPC validate_fiscal_year_balance
-- Valida que Debe = Haber en un ejercicio fiscal
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_fiscal_year_balance(
  p_fiscal_year_id UUID
)
RETURNS TABLE(
  is_valid BOOLEAN,
  total_debit NUMERIC,
  total_credit NUMERIC,
  difference NUMERIC,
  message TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
  v_diff NUMERIC;
BEGIN
  -- Calcular totales del ejercicio
  SELECT 
    COALESCE(SUM(ae.total_debit), 0),
    COALESCE(SUM(ae.total_credit), 0)
  INTO v_total_debit, v_total_credit
  FROM accounting_entries ae
  WHERE ae.fiscal_year_id = p_fiscal_year_id
    AND ae.status IN ('posted', 'closed');
  
  v_diff := ABS(v_total_debit - v_total_credit);
  
  RETURN QUERY SELECT
    (v_diff < 0.01)::BOOLEAN as is_valid,
    v_total_debit,
    v_total_credit,
    v_diff,
    CASE 
      WHEN v_diff < 0.01 THEN 'Balance cuadrado'
      ELSE format('Descuadre de %s€', ROUND(v_diff, 2))
    END::TEXT as message;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_fiscal_year_balance TO authenticated;

COMMENT ON FUNCTION validate_fiscal_year_balance IS 
  'Valida que el total de Debe = Haber en un ejercicio fiscal';

-- ============================================================================
-- PARTE 3: RPC validate_trial_balance
-- Verifica balance de sumas y saldos por cuenta
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_trial_balance(
  p_fiscal_year_id UUID
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  balance NUMERIC,
  balance_type TEXT,
  expected_balance_type TEXT,
  is_valid BOOLEAN,
  warning TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH account_movements AS (
    SELECT 
      t.account_code,
      a.name as account_name,
      LEFT(t.account_code, 1) as account_group,
      SUM(CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE 0 END) as debit,
      SUM(CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE 0 END) as credit
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    JOIN accounts a ON a.code = t.account_code
    WHERE e.fiscal_year_id = p_fiscal_year_id
      AND e.status IN ('posted', 'closed')
    GROUP BY t.account_code, a.name
  ),
  balances AS (
    SELECT 
      am.account_code,
      am.account_name,
      am.debit,
      am.credit,
      am.debit - am.credit as balance,
      CASE 
        WHEN am.debit > am.credit THEN 'deudor'
        WHEN am.credit > am.debit THEN 'acreedor'
        ELSE 'saldado'
      END as balance_type,
      -- Naturaleza esperada según PGC
      CASE 
        WHEN am.account_group IN ('1','2','3','5','6') THEN 'deudor'
        WHEN am.account_group IN ('4','7','8','9') THEN 'acreedor'
        ELSE 'variable'
      END as expected_balance_type
    FROM account_movements am
    WHERE ABS(am.debit - am.credit) >= 0.01
  )
  SELECT 
    b.account_code,
    b.account_name,
    b.debit,
    b.credit,
    b.balance,
    b.balance_type,
    b.expected_balance_type,
    (b.balance_type = b.expected_balance_type OR b.expected_balance_type = 'variable')::BOOLEAN as is_valid,
    CASE 
      WHEN b.balance_type != b.expected_balance_type AND b.expected_balance_type != 'variable'
      THEN format('Saldo %s atípico (esperado: %s)', b.balance_type, b.expected_balance_type)
      ELSE NULL
    END::TEXT as warning
  FROM balances b
  ORDER BY b.account_code;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_trial_balance TO authenticated;

COMMENT ON FUNCTION validate_trial_balance IS 
  'Verifica balance de sumas y saldos, detectando saldos atípicos según PGC';

-- ============================================================================
-- PARTE 4: RPC validate_vat_reconciliation
-- Reconcilia IVA repercutido vs soportado con contabilidad
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_vat_reconciliation(
  p_fiscal_year_id UUID,
  p_centro_code TEXT
)
RETURNS TABLE(
  vat_type TEXT,
  rate NUMERIC,
  issued_amount NUMERIC,
  received_amount NUMERIC,
  accounting_amount NUMERIC,
  difference NUMERIC,
  is_valid BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_fiscal_start DATE;
  v_fiscal_end DATE;
BEGIN
  -- Obtener fechas del ejercicio fiscal
  SELECT start_date, end_date 
  INTO v_fiscal_start, v_fiscal_end
  FROM fiscal_years 
  WHERE id = p_fiscal_year_id;

  RETURN QUERY
  WITH vat_issued AS (
    -- IVA repercutido (ventas) agrupado por tipo
    SELECT 
      'repercutido'::TEXT as vat_type,
      COALESCE(ii.tax_rate, 21) as rate,
      SUM(ii.tax_total) as amount
    FROM invoices_issued ii
    WHERE ii.centro_code = p_centro_code
      AND ii.invoice_date BETWEEN v_fiscal_start AND v_fiscal_end
      AND ii.status IN ('sent', 'paid')
    GROUP BY ii.tax_rate
  ),
  vat_received AS (
    -- IVA soportado (compras) agrupado por tipo
    SELECT 
      'soportado'::TEXT as vat_type,
      COALESCE(ir.tax_rate, 21) as rate,
      SUM(ir.tax_total) as amount
    FROM invoices_received ir
    WHERE ir.centro_code = p_centro_code
      AND ir.invoice_date BETWEEN v_fiscal_start AND v_fiscal_end
      AND ir.status IN ('approved', 'paid')
    GROUP BY ir.tax_rate
  ),
  vat_accounting AS (
    -- IVA en contabilidad (cuentas 477x repercutido, 472x soportado)
    SELECT 
      CASE 
        WHEN t.account_code LIKE '477%' THEN 'repercutido'
        WHEN t.account_code LIKE '472%' THEN 'soportado'
        ELSE 'otro'
      END::TEXT as vat_type,
      -- Extraer tasa del código de cuenta (ej: 4770 = 0%, 4771 = 4%, 4772 = 10%, 4775 = 21%)
      CASE 
        WHEN t.account_code LIKE '%0' THEN 0
        WHEN t.account_code LIKE '%1' THEN 4
        WHEN t.account_code LIKE '%2' THEN 10
        WHEN t.account_code LIKE '%5' THEN 21
        ELSE 21
      END::NUMERIC as rate,
      SUM(CASE WHEN t.movement_type = 'credit' THEN t.amount ELSE -t.amount END) as amount
    FROM accounting_transactions t
    JOIN accounting_entries e ON e.id = t.entry_id
    WHERE e.fiscal_year_id = p_fiscal_year_id
      AND e.centro_code = p_centro_code
      AND e.status IN ('posted', 'closed')
      AND (t.account_code LIKE '477%' OR t.account_code LIKE '472%')
    GROUP BY 
      CASE 
        WHEN t.account_code LIKE '477%' THEN 'repercutido'
        WHEN t.account_code LIKE '472%' THEN 'soportado'
        ELSE 'otro'
      END,
      CASE 
        WHEN t.account_code LIKE '%0' THEN 0
        WHEN t.account_code LIKE '%1' THEN 4
        WHEN t.account_code LIKE '%2' THEN 10
        WHEN t.account_code LIKE '%5' THEN 21
        ELSE 21
      END
  )
  SELECT 
    COALESCE(vi.vat_type, vr.vat_type, va.vat_type) as vat_type,
    COALESCE(vi.rate, vr.rate, va.rate) as rate,
    COALESCE(vi.amount, 0) as issued_amount,
    COALESCE(vr.amount, 0) as received_amount,
    COALESCE(va.amount, 0) as accounting_amount,
    ABS(
      COALESCE(vi.amount, 0) + COALESCE(vr.amount, 0) - COALESCE(va.amount, 0)
    ) as difference,
    (
      ABS(COALESCE(vi.amount, 0) + COALESCE(vr.amount, 0) - COALESCE(va.amount, 0)) < 1.0
    )::BOOLEAN as is_valid,
    CASE 
      WHEN ABS(COALESCE(vi.amount, 0) + COALESCE(vr.amount, 0) - COALESCE(va.amount, 0)) < 1.0
      THEN 'IVA reconciliado'
      ELSE format('Diferencia de %s€', ROUND(ABS(COALESCE(vi.amount, 0) + COALESCE(vr.amount, 0) - COALESCE(va.amount, 0)), 2))
    END::TEXT as message
  FROM vat_issued vi
  FULL OUTER JOIN vat_received vr ON vi.rate = vr.rate
  FULL OUTER JOIN vat_accounting va ON COALESCE(vi.rate, vr.rate) = va.rate 
    AND COALESCE(vi.vat_type, vr.vat_type) = va.vat_type
  ORDER BY vat_type, rate;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_vat_reconciliation TO authenticated;

COMMENT ON FUNCTION validate_vat_reconciliation IS 
  'Reconcilia IVA de facturas con IVA contabilizado por tipo y tasa';

-- ============================================================================
-- PARTE 5: RPC validate_entry_sequence
-- Detecta huecos y duplicados en numeración de asientos
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_entry_sequence(
  p_fiscal_year_id UUID
)
RETURNS TABLE(
  min_number INTEGER,
  max_number INTEGER,
  expected_count INTEGER,
  actual_count INTEGER,
  missing_numbers INTEGER[],
  duplicate_numbers INTEGER[],
  has_gaps BOOLEAN,
  has_duplicates BOOLEAN,
  is_valid BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_min INTEGER;
  v_max INTEGER;
  v_count INTEGER;
  v_expected INTEGER;
  v_missing INTEGER[];
  v_duplicates INTEGER[];
BEGIN
  -- Obtener estadísticas básicas
  SELECT 
    MIN(entry_number), 
    MAX(entry_number),
    COUNT(*)
  INTO v_min, v_max, v_count
  FROM accounting_entries
  WHERE fiscal_year_id = p_fiscal_year_id;
  
  -- Si no hay asientos, retornar válido
  IF v_count = 0 THEN
    RETURN QUERY SELECT
      0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER,
      ARRAY[]::INTEGER[], ARRAY[]::INTEGER[],
      false::BOOLEAN, false::BOOLEAN, true::BOOLEAN,
      'No hay asientos en este ejercicio'::TEXT;
    RETURN;
  END IF;
  
  v_expected := v_max - v_min + 1;
  
  -- Detectar números faltantes
  SELECT ARRAY_AGG(n)
  INTO v_missing
  FROM generate_series(v_min, v_max) n
  WHERE NOT EXISTS (
    SELECT 1 FROM accounting_entries
    WHERE fiscal_year_id = p_fiscal_year_id
      AND entry_number = n
  );
  
  -- Detectar números duplicados
  SELECT ARRAY_AGG(entry_number)
  INTO v_duplicates
  FROM accounting_entries
  WHERE fiscal_year_id = p_fiscal_year_id
  GROUP BY entry_number
  HAVING COUNT(*) > 1;
  
  RETURN QUERY SELECT
    v_min,
    v_max,
    v_expected,
    v_count,
    COALESCE(v_missing, ARRAY[]::INTEGER[]),
    COALESCE(v_duplicates, ARRAY[]::INTEGER[]),
    (COALESCE(array_length(v_missing, 1), 0) > 0)::BOOLEAN as has_gaps,
    (COALESCE(array_length(v_duplicates, 1), 0) > 0)::BOOLEAN as has_duplicates,
    (
      COALESCE(array_length(v_missing, 1), 0) = 0 
      AND COALESCE(array_length(v_duplicates, 1), 0) = 0
    )::BOOLEAN as is_valid,
    CASE 
      WHEN COALESCE(array_length(v_missing, 1), 0) = 0 
           AND COALESCE(array_length(v_duplicates, 1), 0) = 0 
      THEN 'Secuencia correcta'
      ELSE format('Encontrados %s huecos y %s duplicados', 
                   COALESCE(array_length(v_missing, 1), 0),
                   COALESCE(array_length(v_duplicates, 1), 0))
    END::TEXT as message;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_entry_sequence TO authenticated;

COMMENT ON FUNCTION validate_entry_sequence IS 
  'Detecta huecos y duplicados en la numeración de asientos contables';

-- ============================================================================
-- DATOS DE PRUEBA (Opcional - comentar si no se necesita)
-- ============================================================================

-- Descomentar para insertar datos de ejemplo
/*
INSERT INTO closing_periods (centro_code, period_type, period_year, period_month, status)
VALUES 
  ('CENTRO_001', 'monthly', 2024, 1, 'closed'),
  ('CENTRO_001', 'monthly', 2024, 2, 'closed'),
  ('CENTRO_001', 'monthly', 2024, 3, 'open')
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
  -- Verificar tabla
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'closing_periods') THEN
    RAISE EXCEPTION 'Tabla closing_periods no se creó correctamente';
  END IF;
  
  -- Verificar funciones
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_fiscal_year_balance') THEN
    RAISE EXCEPTION 'Función validate_fiscal_year_balance no se creó';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_trial_balance') THEN
    RAISE EXCEPTION 'Función validate_trial_balance no se creó';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_vat_reconciliation') THEN
    RAISE EXCEPTION 'Función validate_vat_reconciliation no se creó';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_entry_sequence') THEN
    RAISE EXCEPTION 'Función validate_entry_sequence no se creó';
  END IF;
  
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '   - Tabla closing_periods creada';
  RAISE NOTICE '   - 4 RPCs de validación creados';
  RAISE NOTICE '   - Políticas RLS aplicadas';
END $$;
