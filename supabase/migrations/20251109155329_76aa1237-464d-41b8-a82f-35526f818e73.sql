-- ============================================================================
-- BASE P&L SYSTEM: Tables, Views, RPCs, and Seeds for McD_QSR_v1
-- ============================================================================
-- 1) Core tables (if not exists)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pl_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pl_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pl_templates(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_code TEXT,
  level INTEGER NOT NULL,
  sort INTEGER NOT NULL,
  sign TEXT NOT NULL DEFAULT 'normal', -- 'normal' | 'invert'
  is_total BOOLEAN NOT NULL DEFAULT false,
  formula TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_rubric_per_template UNIQUE (template_id, code)
);

CREATE TABLE IF NOT EXISTS pl_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pl_templates(id) ON DELETE CASCADE,
  rubric_code TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  match_kind TEXT NOT NULL, -- 'account_exact' | 'account_like' | 'account_range' | 'group' | 'channel' | 'centre'
  account TEXT,
  account_like TEXT,
  account_from TEXT,
  account_to TEXT,
  group_code TEXT,
  channel TEXT,
  centre_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_pl_rubrics_template ON pl_rubrics(template_id);
CREATE INDEX IF NOT EXISTS idx_pl_rubrics_sort ON pl_rubrics(template_id, sort);
CREATE INDEX IF NOT EXISTS idx_pl_rules_template ON pl_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_pl_rules_priority ON pl_rules(template_id, priority DESC);

-- 2) RLS policies
-- ----------------------------------------------------------------------------
ALTER TABLE pl_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pl_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pl_rules ENABLE ROW LEVEL SECURITY;

-- Public read access (authenticated users)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pl_templates' AND policyname = 'Public read pl_templates'
  ) THEN
    CREATE POLICY "Public read pl_templates" ON pl_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pl_rubrics' AND policyname = 'Public read pl_rubrics'
  ) THEN
    CREATE POLICY "Public read pl_rubrics" ON pl_rubrics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pl_rules' AND policyname = 'Public read pl_rules'
  ) THEN
    CREATE POLICY "Public read pl_rules" ON pl_rules FOR SELECT USING (true);
  END IF;
END $$;

-- Admin manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pl_templates' AND policyname = 'Admins manage pl_templates'
  ) THEN
    CREATE POLICY "Admins manage pl_templates" ON pl_templates FOR ALL USING (has_role(auth.uid(),'admin'::app_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pl_rubrics' AND policyname = 'Admins manage pl_rubrics'
  ) THEN
    CREATE POLICY "Admins manage pl_rubrics" ON pl_rubrics FOR ALL USING (has_role(auth.uid(),'admin'::app_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pl_rules' AND policyname = 'Admins manage pl_rules'
  ) THEN
    CREATE POLICY "Admins manage pl_rules" ON pl_rules FOR ALL USING (has_role(auth.uid(),'admin'::app_role));
  END IF;
END $$;

-- 3) Updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pl_templates_updated_at') THEN
    CREATE TRIGGER trg_pl_templates_updated_at BEFORE UPDATE ON pl_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pl_rubrics_updated_at') THEN
    CREATE TRIGGER trg_pl_rubrics_updated_at BEFORE UPDATE ON pl_rubrics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pl_rules_updated_at') THEN
    CREATE TRIGGER trg_pl_rules_updated_at BEFORE UPDATE ON pl_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) Materialized view for monthly GL balances
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_gl_ledger_month AS
SELECT 
  c.company_id,
  e.centro_code,
  (DATE_TRUNC('month', e.entry_date))::DATE AS period_month,
  t.account_code,
  SUM(CASE WHEN t.movement_type = 'debit' THEN t.amount ELSE -t.amount END) AS amount
FROM accounting_transactions t
JOIN accounting_entries e ON e.id = t.entry_id
JOIN centres c ON c.codigo = e.centro_code
WHERE e.status IN ('posted','closed')
GROUP BY c.company_id, e.centro_code, (DATE_TRUNC('month', e.entry_date))::DATE, t.account_code;

-- Unique index for fast upserts/queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_gl_month_unique 
ON mv_gl_ledger_month(company_id, centro_code, period_month, account_code);
CREATE INDEX IF NOT EXISTS idx_mv_gl_month_period ON mv_gl_ledger_month(period_month);
CREATE INDEX IF NOT EXISTS idx_mv_gl_month_account ON mv_gl_ledger_month(account_code);

-- 5) Rule winner view (best priority per account/month)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pl_rule_winner AS
SELECT DISTINCT ON (r.template_id, l.company_id, l.centro_code, l.period_month, l.account_code)
  r.template_id,
  l.company_id,
  l.centro_code,
  l.period_month,
  l.account_code,
  r.rubric_code,
  r.priority
FROM mv_gl_ledger_month l
JOIN pl_rules r ON (
  (r.match_kind = 'account_exact' AND l.account_code = r.account) OR
  (r.match_kind = 'account_like' AND l.account_code LIKE r.account_like) OR
  (r.match_kind = 'account_range' AND l.account_code BETWEEN r.account_from AND r.account_to)
)
ORDER BY r.template_id, l.company_id, l.centro_code, l.period_month, l.account_code, r.priority DESC, r.created_at ASC;

-- 6) Monthly rubric amounts view
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pl_rubric_month AS
SELECT 
  w.template_id,
  w.company_id,
  w.centro_code,
  w.period_month,
  w.rubric_code,
  SUM(l.amount) AS amount
FROM v_pl_rule_winner w
JOIN mv_gl_ledger_month l ON 
  l.company_id = w.company_id AND
  l.centro_code = w.centro_code AND
  l.period_month = w.period_month AND
  l.account_code = w.account_code
GROUP BY w.template_id, w.company_id, w.centro_code, w.period_month, w.rubric_code;

-- 7) RPC: calculate_pl_report (base)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_pl_report(
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
  amount NUMERIC,
  percentage NUMERIC
) AS $$
DECLARE
  v_template_id UUID;
  v_start DATE;
  v_end DATE;
  v_total_sales NUMERIC := 0;
BEGIN
  SELECT id INTO v_template_id FROM pl_templates WHERE code = p_template_code;
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template % not found', p_template_code;
  END IF;

  v_start := COALESCE(p_start_date::DATE, CURRENT_DATE);
  v_end := COALESCE(p_end_date::DATE, CURRENT_DATE);

  RETURN QUERY
  WITH months AS (
    SELECT (DATE_TRUNC('month', gs::DATE))::DATE AS month
    FROM generate_series(DATE_TRUNC('month', v_start)::DATE, DATE_TRUNC('month', v_end)::DATE, INTERVAL '1 month') gs
  ),
  agg AS (
    SELECT
      vrm.rubric_code,
      SUM(vrm.amount) AS amount
    FROM v_pl_rubric_month vrm
    WHERE vrm.template_id = v_template_id
      AND vrm.period_month BETWEEN (SELECT MIN(month) FROM months) AND (SELECT MAX(month) FROM months)
      AND (p_company_id IS NULL OR vrm.company_id = p_company_id)
      AND (p_centro_code IS NULL OR vrm.centro_code = p_centro_code)
    GROUP BY vrm.rubric_code
  ),
  base AS (
    SELECT
      r.code AS rubric_code,
      r.name AS rubric_name,
      r.parent_code,
      r.level,
      r.sort,
      r.is_total,
      r.sign,
      COALESCE(a.amount, 0) AS amount
    FROM pl_rubrics r
    LEFT JOIN agg a ON a.rubric_code = r.code
    WHERE r.template_id = v_template_id
  ),
  sales AS (
    SELECT ABS(amount) AS total
    FROM base
    WHERE rubric_code ILIKE 'ventas%'
       OR rubric_code ILIKE 'sales%'
    ORDER BY sort
    LIMIT 1
  )
  SELECT 
    b.rubric_code,
    b.rubric_name,
    b.parent_code,
    b.level,
    b.sort,
    b.is_total,
    b.sign,
    b.amount,
    CASE WHEN (SELECT total FROM sales) IS NOT NULL AND (SELECT total FROM sales) <> 0
         THEN (b.amount / (SELECT total FROM sales)) * 100
         ELSE 0 END AS percentage
  FROM base b
  ORDER BY b.sort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION calculate_pl_report(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 8) RPC: calculate_pl_report_consolidated (multi-centres)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_pl_report_consolidated(
  p_template_code TEXT,
  p_centro_codes TEXT[],
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
  amount NUMERIC,
  percentage NUMERIC
) AS $$
DECLARE
  v_template_id UUID;
  v_start DATE;
  v_end DATE;
  v_total_sales NUMERIC := 0;
BEGIN
  IF p_centro_codes IS NULL OR array_length(p_centro_codes,1) IS NULL THEN
    RAISE EXCEPTION 'p_centro_codes is required';
  END IF;

  SELECT id INTO v_template_id FROM pl_templates WHERE code = p_template_code;
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template % not found', p_template_code;
  END IF;

  v_start := COALESCE(p_start_date::DATE, CURRENT_DATE);
  v_end := COALESCE(p_end_date::DATE, CURRENT_DATE);

  RETURN QUERY
  WITH months AS (
    SELECT (DATE_TRUNC('month', gs::DATE))::DATE AS month
    FROM generate_series(DATE_TRUNC('month', v_start)::DATE, DATE_TRUNC('month', v_end)::DATE, INTERVAL '1 month') gs
  ),
  agg AS (
    SELECT
      vrm.rubric_code,
      SUM(vrm.amount) AS amount
    FROM v_pl_rubric_month vrm
    WHERE vrm.template_id = v_template_id
      AND vrm.period_month BETWEEN (SELECT MIN(month) FROM months) AND (SELECT MAX(month) FROM months)
      AND vrm.centro_code = ANY(p_centro_codes)
    GROUP BY vrm.rubric_code
  ),
  base AS (
    SELECT
      r.code AS rubric_code,
      r.name AS rubric_name,
      r.parent_code,
      r.level,
      r.sort,
      r.is_total,
      r.sign,
      COALESCE(a.amount, 0) AS amount
    FROM pl_rubrics r
    LEFT JOIN agg a ON a.rubric_code = r.code
    WHERE r.template_id = v_template_id
  ),
  sales AS (
    SELECT ABS(amount) AS total
    FROM base
    WHERE rubric_code ILIKE 'ventas%'
       OR rubric_code ILIKE 'sales%'
    ORDER BY sort
    LIMIT 1
  )
  SELECT 
    b.rubric_code,
    b.rubric_name,
    b.parent_code,
    b.level,
    b.sort,
    b.is_total,
    b.sign,
    b.amount,
    CASE WHEN (SELECT total FROM sales) IS NOT NULL AND (SELECT total FROM sales) <> 0
         THEN (b.amount / (SELECT total FROM sales)) * 100
         ELSE 0 END AS percentage
  FROM base b
  ORDER BY b.sort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION calculate_pl_report_consolidated(TEXT, TEXT[], TEXT, TEXT) TO authenticated;

-- 9) Seed: P&L Template McD_QSR_v1 (rubrics)
-- ----------------------------------------------------------------------------
-- From supabase/seed_pl_template_mcd_qsr.sql
-- (inline to ensure execution during migration)

-- Insert template
INSERT INTO pl_templates (code, name, description, is_active)
VALUES (
  'McD_QSR_v1',
  'P&L McDonald''s / QSR',
  'Formato específico para restaurantes McDonald''s con métricas P.A.C., S.O.I. y Cash Flow',
  true
) ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Create rubrics
DO $$ 
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM pl_templates WHERE code = 'McD_QSR_v1';

  -- INGRESOS
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'ventas_netas', 'VENTAS NETAS', NULL, 0, 10, 'normal', false, NULL, 'Ingresos totales por ventas')
  ON CONFLICT (template_id, code) DO NOTHING;
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'valor_produccion', 'Valor de Producción', NULL, 0, 20, 'normal', true, 'ventas_netas', 'Igual a ventas netas para QSR')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- COSTES DIRECTOS
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'comida', 'Comida', 'ventas_netas', 1, 30, 'normal', false, NULL, 'Costo de alimentos'),
    (v_template_id, 'comida_empleados', 'Comida Empleados', 'ventas_netas', 1, 40, 'normal', false, NULL, 'Comidas del personal'),
    (v_template_id, 'desperdicios', 'Desperdicios', 'ventas_netas', 1, 50, 'normal', false, NULL, 'Mermas y desperdicios'),
    (v_template_id, 'papel', 'Papel', 'ventas_netas', 1, 60, 'normal', false, NULL, 'Embalajes y papel')
  ON CONFLICT (template_id, code) DO NOTHING;
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'total_coste_comida_papel', 'TOTAL COSTE COMIDA Y PAPEL', NULL, 2, 70, 'normal', true, 'SUM(comida, comida_empleados, desperdicios, papel)', 'Suma de costes directos')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- MARGEN
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'resultado_bruto_explotacion', 'RESULTADO BRUTO DE EXPLOTACIÓN', NULL, 0, 80, 'normal', true, 'ventas_netas - total_coste_comida_papel', 'Margen bruto')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- GASTOS CONTROLABLES
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'mano_obra', 'Mano de Obra', 'resultado_bruto_explotacion', 1, 90, 'normal', false, NULL, 'Salarios personal operativo'),
    (v_template_id, 'mano_obra_gerencia', 'Mano de Obra - Gerencia', 'resultado_bruto_explotacion', 1, 100, 'normal', false, NULL, 'Salarios gerencia'),
    (v_template_id, 'seguridad_social', 'Seguridad Social', 'resultado_bruto_explotacion', 1, 110, 'normal', false, NULL, 'Cotizaciones sociales'),
    (v_template_id, 'gastos_viajes', 'Gastos de Viajes', 'resultado_bruto_explotacion', 1, 120, 'normal', false, NULL, 'Viajes y desplazamientos'),
    (v_template_id, 'publicidad', 'Publicidad', 'resultado_bruto_explotacion', 1, 130, 'normal', false, NULL, 'Publicidad local'),
    (v_template_id, 'promocion', 'Promoción', 'resultado_bruto_explotacion', 1, 140, 'normal', false, NULL, 'Promociones y marketing'),
    (v_template_id, 'servicios_exteriores', 'Servicios Exteriores', 'resultado_bruto_explotacion', 1, 150, 'normal', false, NULL, 'Servicios contratados'),
    (v_template_id, 'uniformes', 'Uniformes', 'resultado_bruto_explotacion', 1, 160, 'normal', false, NULL, 'Uniformes personal'),
    (v_template_id, 'suministros_operacion', 'Suministros de Operación', 'resultado_bruto_explotacion', 1, 170, 'normal', false, NULL, 'Material operativo'),
    (v_template_id, 'reparacion_mantenimiento', 'Reparación y Mantenimiento', 'resultado_bruto_explotacion', 1, 180, 'normal', false, NULL, 'Mantenimiento local'),
    (v_template_id, 'luz_agua_telefono', 'Luz, Agua y Teléfono', 'resultado_bruto_explotacion', 1, 190, 'normal', false, NULL, 'Suministros básicos'),
    (v_template_id, 'gastos_oficina', 'Gastos de Oficina', 'resultado_bruto_explotacion', 1, 200, 'normal', false, NULL, 'Gastos administrativos'),
    (v_template_id, 'diferencias_caja', 'Diferencias de Caja', 'resultado_bruto_explotacion', 1, 210, 'normal', false, NULL, 'Descuadres de caja'),
    (v_template_id, 'varios_controlables', 'Varios Controlables', 'resultado_bruto_explotacion', 1, 220, 'normal', false, NULL, 'Otros gastos controlables')
  ON CONFLICT (template_id, code) DO NOTHING;
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'total_gastos_controlables', 'TOTAL GASTOS CONTROLABLES', NULL, 2, 230, 'normal', true, 'SUM(mano_obra, mano_obra_gerencia, seguridad_social, gastos_viajes, publicidad, promocion, servicios_exteriores, uniformes, suministros_operacion, reparacion_mantenimiento, luz_agua_telefono, gastos_oficina, diferencias_caja, varios_controlables)', 'Suma de gastos controlables')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- PAC
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'pac', 'P.A.C. (Profit After Controllables)', NULL, 0, 240, 'normal', true, 'resultado_bruto_explotacion - total_gastos_controlables', 'Beneficio después de gastos controlables')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- GASTOS NO CONTROLABLES
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'renta', 'Renta', 'pac', 1, 250, 'normal', false, NULL, 'Alquiler del local'),
    (v_template_id, 'renta_adicional', 'Renta Adicional', 'pac', 1, 260, 'normal', false, NULL, 'Alquiler variable'),
    (v_template_id, 'royalty', 'Royalty', 'pac', 1, 270, 'normal', false, NULL, 'Royalty franquicia'),
    (v_template_id, 'oficina_legal', 'Oficina y Legal', 'pac', 1, 280, 'normal', false, NULL, 'Asesoría legal y contable'),
    (v_template_id, 'seguros', 'Seguros', 'pac', 1, 290, 'normal', false, NULL, 'Seguros del local'),
    (v_template_id, 'tasas_licencias', 'Tasas y Licencias', 'pac', 1, 300, 'normal', false, NULL, 'Tasas municipales'),
    (v_template_id, 'depreciaciones', 'Depreciaciones', 'pac', 1, 310, 'normal', false, NULL, 'Amortizaciones'),
    (v_template_id, 'intereses', 'Intereses', 'pac', 1, 320, 'normal', false, NULL, 'Gastos financieros'),
    (v_template_id, 'perdidas_venta_equipos', 'Pérdidas por Venta de Equipos', 'pac', 1, 330, 'normal', false, NULL, 'Pérdidas por desinversión'),
    (v_template_id, 'varios_no_controlables', 'Varios No Controlables', 'pac', 1, 340, 'normal', false, NULL, 'Otros gastos no controlables')
  ON CONFLICT (template_id, code) DO NOTHING;
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'total_gastos_no_controlables', 'TOTAL GASTOS NO CONTROLABLES', NULL, 2, 350, 'normal', true, 'SUM(renta, renta_adicional, royalty, oficina_legal, seguros, tasas_licencias, depreciaciones, intereses, perdidas_venta_equipos, varios_no_controlables)', 'Suma de gastos no controlables')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- NO PRODUCTO
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'ventas_no_producto', 'Ventas No Producto', 'pac', 1, 360, 'normal', false, NULL, 'Ingresos extraordinarios'),
    (v_template_id, 'costo_no_producto', 'Costo No Producto', 'pac', 1, 370, 'normal', false, NULL, 'Costos extraordinarios')
  ON CONFLICT (template_id, code) DO NOTHING;
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'neto_no_producto', 'NETO NO PRODUCTO', NULL, 2, 380, 'normal', true, 'ventas_no_producto - costo_no_producto', 'Neto de operaciones no producto')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- SOI
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'soi', 'S.O.I. (Store Operating Income)', NULL, 0, 390, 'normal', true, 'pac - total_gastos_no_controlables + neto_no_producto', 'Beneficio operativo del restaurante')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- AJUSTES FINALES
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'draw_salary', 'Draw Salary', 'soi', 1, 400, 'normal', false, NULL, 'Salario propietario/socio'),
    (v_template_id, 'gastos_generales', 'Gastos Generales', 'soi', 1, 410, 'normal', false, NULL, 'Gastos generales corporativos')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- RESULTADO NETO
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'resultado_neto', 'RESULTADO NETO', NULL, 0, 420, 'normal', true, 'soi - draw_salary - gastos_generales', 'Resultado neto final')
  ON CONFLICT (template_id, code) DO NOTHING;

  -- CASH FLOW
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'cuota_prestamo', 'Cuota Préstamo', 'resultado_neto', 1, 430, 'normal', false, NULL, 'Amortización de préstamos'),
    (v_template_id, 'depreciaciones_cf', 'Depreciaciones (CF)', 'resultado_neto', 1, 440, 'normal', false, NULL, 'Ajuste no monetario'),
    (v_template_id, 'gastos_intereses_cf', 'Gastos Intereses (CF)', 'resultado_neto', 1, 450, 'normal', false, NULL, 'Ajuste no monetario')
  ON CONFLICT (template_id, code) DO NOTHING;
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'cash_flow', 'CASH FLOW', NULL, 2, 460, 'normal', true, 'resultado_neto + cuota_prestamo + depreciaciones_cf + gastos_intereses_cf', 'Flujo de caja antes de deuda'),
    (v_template_id, 'cash_flow_socio', 'CASH FLOW SOCIO', NULL, 2, 470, 'normal', true, 'cash_flow - cuota_prestamo', 'Flujo de caja disponible para socio'),
    (v_template_id, 'inversiones_fondos_propios', 'Inversiones / Fondos Propios', 'cash_flow_socio', 1, 480, 'normal', false, NULL, 'Inversiones realizadas')
  ON CONFLICT (template_id, code) DO NOTHING;
END $$;

-- 10) Seed: Mapping rules McD_QSR_v1
-- ----------------------------------------------------------------------------
-- From supabase/seed_pl_rules_mcd_qsr.sql
DO $$ 
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM pl_templates WHERE code = 'McD_QSR_v1';
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Plantilla McD_QSR_v1 no encontrada. (seed de plantilla debe ejecutarse primero)';
  END IF;

  -- Limpiar reglas existentes de esta plantilla
  DELETE FROM pl_rules WHERE template_id = v_template_id;

  -- Reglas de ejemplo completas (principales)
  -- VENTAS NETAS
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'ventas_netas', 10, 'account_like', '70%', 'Ventas de mercaderías y servicios'),
    (v_template_id, 'ventas_netas', 15, 'account_like', '705%', 'Prestaciones de servicios');

  -- COMIDA
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'comida', 10, 'account_like', '600%', 'Compras de alimentos'),
    (v_template_id, 'comida', 15, 'account_like', '601%', 'Compras de materias primas'),
    (v_template_id, 'comida', 20, 'account_like', '602%', 'Compras otros aprovisionamientos');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'comida_empleados', 10, 'account_like', '627%', 'Comidas para empleados'),
    (v_template_id, 'comida_empleados', 15, 'account_like', '6291%', 'Atenciones al personal');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'desperdicios', 10, 'account_like', '6110%', 'Variación de existencias - Mermas'),
    (v_template_id, 'desperdicios', 15, 'account_like', '659%', 'Otras pérdidas de gestión');

  -- PAPEL Y EMBALAJES
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'papel', 5, 'account_like', '606%', 'Embalajes y papel'),
    (v_template_id, 'papel', 10, 'account_like', '6060%', 'Envases desechables');

  -- MANO DE OBRA
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'mano_obra', 10, 'account_like', '640%', 'Sueldos y salarios'),
    (v_template_id, 'mano_obra', 15, 'account_like', '6400%', 'Salarios personal operativo');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'mano_obra_gerencia', 8, 'account_like', '641%', 'Salarios gerencia'),
    (v_template_id, 'mano_obra_gerencia', 10, 'account_like', '6410%', 'Indemnizaciones');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'seguridad_social', 5, 'account_like', '642%', 'Seguridad social a cargo empresa'),
    (v_template_id, 'seguridad_social', 10, 'account_like', '6420%', 'Cotizaciones sociales');

  -- GASTOS DE VIAJES
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'gastos_viajes', 5, 'account_like', '625%', 'Primas de seguros de personal'),
    (v_template_id, 'gastos_viajes', 10, 'account_like', '6270%', 'Gastos de viaje');

  -- PUBLICIDAD Y PROMOCIÓN
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'publicidad', 10, 'account_like', '627%', 'Publicidad, propaganda y RRPP'),
    (v_template_id, 'publicidad', 15, 'account_like', '6271%', 'Publicidad local');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'promocion', 5, 'account_like', '6272%', 'Promociones y marketing'),
    (v_template_id, 'promocion', 10, 'account_like', '6273%', 'Eventos promocionales');

  -- SERVICIOS EXTERIORES
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'servicios_exteriores', 10, 'account_like', '622%', 'Reparaciones y conservación'),
    (v_template_id, 'servicios_exteriores', 15, 'account_like', '623%', 'Servicios profesionales independientes'),
    (v_template_id, 'servicios_exteriores', 20, 'account_like', '626%', 'Servicios bancarios'),
    (v_template_id, 'servicios_exteriores', 25, 'account_like', '629%', 'Otros servicios');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'uniformes', 5, 'account_like', '6011%', 'Uniformes personal'),
    (v_template_id, 'uniformes', 10, 'account_like', '6290%', 'Vestuario');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'suministros_operacion', 5, 'account_like', '628%', 'Suministros'),
    (v_template_id, 'suministros_operacion', 10, 'account_like', '6280%', 'Material de limpieza');

  -- REPARACIÓN Y MANTENIMIENTO
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'reparacion_mantenimiento', 5, 'account_like', '6220%', 'Reparaciones y conservación'),
    (v_template_id, 'reparacion_mantenimiento', 10, 'account_like', '6221%', 'Mantenimiento equipos');

  -- SUMINISTROS (Luz, Agua, Teléfono)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'luz_agua_telefono', 5, 'account_like', '6281%', 'Energía eléctrica'),
    (v_template_id, 'luz_agua_telefono', 10, 'account_like', '6282%', 'Agua'),
    (v_template_id, 'luz_agua_telefono', 15, 'account_like', '6283%', 'Gas'),
    (v_template_id, 'luz_agua_telefono', 20, 'account_like', '6284%', 'Teléfono e internet');

  -- GASTOS DE OFICINA
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'gastos_oficina', 10, 'account_like', '6290%', 'Material de oficina'),
    (v_template_id, 'gastos_oficina', 15, 'account_like', '6291%', 'Otros gastos de oficina');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'diferencias_caja', 5, 'account_like', '678%', 'Gastos excepcionales - Diferencias'),
    (v_template_id, 'diferencias_caja', 10, 'account_like', '6780%', 'Descuadres de caja');

  -- RENTA / ALQUILER
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'renta', 5, 'account_like', '621%', 'Arrendamientos y cánones'),
    (v_template_id, 'renta', 10, 'account_like', '6210%', 'Alquiler local fijo');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'renta_adicional', 5, 'account_like', '6211%', 'Alquiler variable sobre ventas');

  -- ROYALTY
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'royalty', 3, 'account_like', '6230%', 'Royalty franquicia'),
    (v_template_id, 'royalty', 5, 'account_like', '623%', 'Servicios profesionales - Royalty');

  -- OFICINA Y LEGAL
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'oficina_legal', 5, 'account_like', '6231%', 'Asesoría jurídica'),
    (v_template_id, 'oficina_legal', 10, 'account_like', '6232%', 'Asesoría contable y fiscal');

  -- SEGUROS
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'seguros', 5, 'account_like', '625%', 'Primas de seguros'),
    (v_template_id, 'seguros', 10, 'account_like', '6250%', 'Seguro local y responsabilidad civil');

  -- TASAS Y LICENCIAS
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'tasas_licencias', 5, 'account_like', '631%', 'Otros tributos'),
    (v_template_id, 'tasas_licencias', 10, 'account_like', '6310%', 'Tasas municipales y licencias');

  -- DEPRECIACIONES / AMORTIZACIONES
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'depreciaciones', 5, 'account_like', '68%', 'Dotaciones para amortizaciones'),
    (v_template_id, 'depreciaciones', 10, 'account_like', '681%', 'Amortización inmovilizado material');

  -- INTERESES Y GASTOS FINANCIEROS
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'intereses', 5, 'account_like', '66%', 'Gastos financieros'),
    (v_template_id, 'intereses', 10, 'account_like', '662%', 'Intereses de deudas'),
    (v_template_id, 'intereses', 15, 'account_like', '6620%', 'Intereses préstamos');

  -- PÉRDIDAS POR VENTA DE EQUIPOS
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'perdidas_venta_equipos', 5, 'account_like', '671%', 'Pérdidas procedentes del inmovilizado'),
    (v_template_id, 'perdidas_venta_equipos', 10, 'account_like', '6710%', 'Pérdidas venta equipos');

  -- INGRESOS NO PRODUCTO
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'ventas_no_producto', 5, 'account_like', '75%', 'Otros ingresos de gestión'),
    (v_template_id, 'ventas_no_producto', 10, 'account_like', '76%', 'Ingresos financieros'),
    (v_template_id, 'ventas_no_producto', 15, 'account_like', '771%', 'Beneficios venta inmovilizado');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'costo_no_producto', 10, 'account_like', '678%', 'Gastos excepcionales'),
    (v_template_id, 'costo_no_producto', 15, 'account_like', '679%', 'Gastos y pérdidas de ejercicios anteriores');

  -- DRAW SALARY
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'draw_salary', 5, 'account_like', '649%', 'Otros gastos sociales - Socio'),
    (v_template_id, 'draw_salary', 10, 'account_like', '6490%', 'Retribución socio-gerente');

  -- GASTOS GENERALES CORPORATIVOS
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'gastos_generales', 10, 'account_like', '6299%', 'Gastos generales diversos'),
    (v_template_id, 'gastos_generales', 15, 'account_like', '624%', 'Transportes corporativos');

  -- CASH FLOW - PRÉSTAMOS
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'cuota_prestamo', 5, 'account_like', '170%', 'Deudas a largo plazo - Amortización'),
    (v_template_id, 'cuota_prestamo', 10, 'account_like', '520%', 'Deudas a corto plazo - Amortización');

  -- Cash flow adjustments duplication
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'depreciaciones_cf', 5, 'account_like', '68%', 'Mismo que depreciaciones (ajuste CF)'),
    (v_template_id, 'gastos_intereses_cf', 5, 'account_like', '66%', 'Mismo que intereses (ajuste CF)');

  -- INVERSIONES
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'inversiones_fondos_propios', 5, 'account_like', '21%', 'Inmovilizado material - Inversiones'),
    (v_template_id, 'inversiones_fondos_propios', 10, 'account_like', '22%', 'Inversiones inmobiliarias');
END $$;

-- Confirmation notices
DO $$ BEGIN
  RAISE NOTICE 'Sistema P&L base creado. Plantilla y reglas McD_QSR_v1 cargadas.';
END $$;