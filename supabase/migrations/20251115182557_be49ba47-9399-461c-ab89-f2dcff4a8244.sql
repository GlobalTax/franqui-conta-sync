-- ============================================================================
-- FASE 1: Crear Estructura de Base de Datos para Templates de Balance
-- ============================================================================

-- Tabla de plantillas de balance
CREATE TABLE IF NOT EXISTS bs_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de rubros de balance
CREATE TABLE IF NOT EXISTS bs_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES bs_templates(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_code TEXT,
  level INTEGER NOT NULL,
  sort INTEGER NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('activo', 'pasivo', 'patrimonio_neto')),
  sign TEXT NOT NULL DEFAULT 'normal' CHECK (sign IN ('normal', 'invert')),
  is_total BOOLEAN NOT NULL DEFAULT false,
  formula TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_bs_rubric_per_template UNIQUE (template_id, code)
);

-- Tabla de reglas de mapeo
CREATE TABLE IF NOT EXISTS bs_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES bs_templates(id) ON DELETE CASCADE,
  rubric_code TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  match_kind TEXT NOT NULL CHECK (match_kind IN ('account_exact', 'account_like', 'account_range', 'group')),
  account TEXT,
  account_like TEXT,
  account_from TEXT,
  account_to TEXT,
  group_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_bs_rubrics_template ON bs_rubrics(template_id);
CREATE INDEX idx_bs_rubrics_sort ON bs_rubrics(template_id, sort);
CREATE INDEX idx_bs_rules_template ON bs_rules(template_id);
CREATE INDEX idx_bs_rules_priority ON bs_rules(template_id, priority DESC);

-- Row Level Security
ALTER TABLE bs_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bs_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bs_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bs_templates" ON bs_templates FOR SELECT USING (true);
CREATE POLICY "Public read bs_rubrics" ON bs_rubrics FOR SELECT USING (true);
CREATE POLICY "Public read bs_rules" ON bs_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage bs_templates" ON bs_templates FOR ALL USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage bs_rubrics" ON bs_rubrics FOR ALL USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage bs_rules" ON bs_rules FOR ALL USING (has_role(auth.uid(),'admin'::app_role));

-- ============================================================================
-- FASE 2: Crear RPCs para Cálculo de Balances Custom
-- ============================================================================

-- RPC para balance individual por template
CREATE OR REPLACE FUNCTION calculate_balance_sheet_custom(
  p_template_code TEXT,
  p_centro_code TEXT,
  p_fecha_corte DATE
)
RETURNS TABLE (
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  section TEXT,
  is_total BOOLEAN,
  amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Obtener template ID
  SELECT id INTO v_template_id
  FROM bs_templates
  WHERE code = p_template_code AND is_active = true;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template % no encontrado o inactivo', p_template_code;
  END IF;

  -- Calcular balances por rubro
  RETURN QUERY
  WITH account_balances AS (
    SELECT 
      a.code AS account_code,
      COALESCE(SUM(
        CASE 
          WHEN at.movement_type = 'debit' THEN at.amount
          WHEN at.movement_type = 'credit' THEN -at.amount
          ELSE 0
        END
      ), 0) AS balance
    FROM accounts a
    LEFT JOIN accounting_transactions at ON at.account_code = a.code
    LEFT JOIN accounting_entries ae ON ae.id = at.entry_id
      AND ae.entry_date <= p_fecha_corte
      AND ae.status = 'posted'
      AND ae.centro_code = p_centro_code
    WHERE a.centro_code = p_centro_code
      AND a.active = true
      AND a.account_type IN ('asset', 'liability', 'equity')
    GROUP BY a.code
  ),
  rubric_amounts AS (
    SELECT 
      r.code AS rubric_code,
      r.name AS rubric_name,
      r.parent_code,
      r.level,
      r.sort,
      r.section,
      r.is_total,
      r.sign,
      COALESCE(SUM(
        CASE 
          WHEN r.sign = 'invert' THEN -ab.balance
          ELSE ab.balance
        END
      ), 0) AS amount
    FROM bs_rubrics r
    LEFT JOIN bs_rules rl ON rl.template_id = v_template_id AND rl.rubric_code = r.code
    LEFT JOIN account_balances ab ON (
      (rl.match_kind = 'account_exact' AND ab.account_code = rl.account)
      OR (rl.match_kind = 'account_like' AND ab.account_code LIKE rl.account_like)
      OR (rl.match_kind = 'account_range' AND ab.account_code BETWEEN rl.account_from AND rl.account_to)
      OR (rl.match_kind = 'group' AND LEFT(ab.account_code, LENGTH(rl.group_code)) = rl.group_code)
    )
    WHERE r.template_id = v_template_id
      AND r.formula IS NULL
    GROUP BY r.code, r.name, r.parent_code, r.level, r.sort, r.section, r.is_total, r.sign
  )
  SELECT 
    ra.rubric_code,
    ra.rubric_name,
    ra.parent_code,
    ra.level,
    ra.sort,
    ra.section,
    ra.is_total,
    ra.amount
  FROM rubric_amounts ra
  ORDER BY ra.sort;
END;
$$;

-- RPC para balance consolidado
CREATE OR REPLACE FUNCTION calculate_balance_sheet_custom_consolidated(
  p_template_code TEXT,
  p_centro_codes TEXT[],
  p_fecha_corte DATE
)
RETURNS TABLE (
  rubric_code TEXT,
  rubric_name TEXT,
  parent_code TEXT,
  level INTEGER,
  sort INTEGER,
  section TEXT,
  is_total BOOLEAN,
  amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH all_centres AS (
    SELECT UNNEST(p_centro_codes) AS centro_code
  ),
  centre_balances AS (
    SELECT 
      bs.*
    FROM all_centres ac
    CROSS JOIN LATERAL calculate_balance_sheet_custom(
      p_template_code, 
      ac.centro_code, 
      p_fecha_corte
    ) bs
  )
  SELECT 
    cb.rubric_code,
    MAX(cb.rubric_name) AS rubric_name,
    MAX(cb.parent_code) AS parent_code,
    MAX(cb.level) AS level,
    MAX(cb.sort) AS sort,
    MAX(cb.section) AS section,
    MAX(cb.is_total) AS is_total,
    SUM(cb.amount) AS amount
  FROM centre_balances cb
  GROUP BY cb.rubric_code
  ORDER BY MAX(cb.sort);
END;
$$;

-- ============================================================================
-- FASE 3: Seed de Templates (PGC 2025 y McDonald's Simplificado)
-- ============================================================================

-- Template PGC Oficial 2025
INSERT INTO bs_templates (code, name, description, is_active)
VALUES ('PGC_2025', 'Balance PGC Oficial 2025', 'Balance de Situación según Plan General Contable español (ICAC)', true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Rubros PGC 2025
INSERT INTO bs_rubrics (template_id, code, name, parent_code, level, sort, section, is_total) VALUES
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'activo', 'ACTIVO', NULL, 1, 100, 'activo', true),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'activo_no_corriente', 'Activo No Corriente', 'activo', 2, 110, 'activo', false),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'activo_corriente', 'Activo Corriente', 'activo', 2, 120, 'activo', false),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'pasivo', 'PASIVO', NULL, 1, 200, 'pasivo', true),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'patrimonio_neto', 'Patrimonio Neto', 'pasivo', 2, 210, 'patrimonio_neto', false),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'pasivo_no_corriente', 'Pasivo No Corriente', 'pasivo', 2, 220, 'pasivo', false),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'pasivo_corriente', 'Pasivo Corriente', 'pasivo', 2, 230, 'pasivo', false)
ON CONFLICT (template_id, code) DO NOTHING;

-- Reglas PGC 2025
INSERT INTO bs_rules (template_id, rubric_code, priority, match_kind, group_code, notes) VALUES
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'activo_no_corriente', 10, 'group', '2', 'Inmovilizado'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'activo_corriente', 10, 'group', '3', 'Existencias'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'activo_corriente', 20, 'group', '4', 'Deudores'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'activo_corriente', 30, 'group', '5', 'Cuentas financieras'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'patrimonio_neto', 10, 'group', '1', 'Fondos propios'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'pasivo_no_corriente', 10, 'account_like', '17%', 'Deudas a largo plazo'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'pasivo_corriente', 10, 'account_like', '40%', 'Proveedores'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'pasivo_corriente', 20, 'account_like', '41%', 'Acreedores'),
((SELECT id FROM bs_templates WHERE code = 'PGC_2025'), 'pasivo_corriente', 30, 'account_like', '52%', 'Deudas a corto plazo')
ON CONFLICT DO NOTHING;

-- Template McDonald's Simplificado
INSERT INTO bs_templates (code, name, description, is_active)
VALUES ('McD_Simplified', 'Balance Simplificado McDonald''s', 'Balance de gestión simplificado para franquiciados', true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Rubros McDonald's
INSERT INTO bs_rubrics (template_id, code, name, parent_code, level, sort, section, is_total) VALUES
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'cash', 'Efectivo y Bancos', NULL, 1, 100, 'activo', false),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'receivables', 'Cuentas por Cobrar', NULL, 1, 110, 'activo', false),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'inventory', 'Inventario', NULL, 1, 120, 'activo', false),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'fixed_assets', 'Activos Fijos', NULL, 1, 130, 'activo', false),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'payables', 'Cuentas por Pagar', NULL, 1, 200, 'pasivo', false),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'loans', 'Préstamos', NULL, 1, 210, 'pasivo', false),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'equity', 'Capital y Reservas', NULL, 1, 300, 'patrimonio_neto', false)
ON CONFLICT (template_id, code) DO NOTHING;

-- Reglas McDonald's
INSERT INTO bs_rules (template_id, rubric_code, priority, match_kind, group_code, notes) VALUES
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'cash', 10, 'group', '57', 'Tesorería'),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'receivables', 10, 'account_like', '43%', 'Clientes'),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'inventory', 10, 'group', '3', 'Existencias'),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'fixed_assets', 10, 'group', '2', 'Inmovilizado'),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'payables', 10, 'account_like', '40%', 'Proveedores'),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'loans', 10, 'account_like', '17%', 'Préstamos LP'),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'loans', 20, 'account_like', '52%', 'Préstamos CP'),
((SELECT id FROM bs_templates WHERE code = 'McD_Simplified'), 'equity', 10, 'group', '1', 'Patrimonio neto')
ON CONFLICT DO NOTHING;