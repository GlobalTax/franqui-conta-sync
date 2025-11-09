-- ============================================================================
-- Seed: Plantilla PGC Oficial 2025
-- ============================================================================

-- Insertar plantilla
INSERT INTO public.pl_templates (code, name, description, is_active)
VALUES (
  'PGC_2025',
  'P&L PGC Oficial 2025',
  'Cuenta de pérdidas y ganancias según Plan General Contable español',
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Obtener ID de plantilla
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM pl_templates WHERE code = 'PGC_2025';

  -- ============================================================================
  -- RUBROS (13 líneas principales del P&L)
  -- ============================================================================

  -- Nivel 0: Ingresos
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'ingresos', 'Importe neto de la cifra de negocios', 0, 10, 'invert', false);

  -- Nivel 0: Compras y variación existencias
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'compras', 'Aprovisionamientos', 0, 20, 'normal', false);

  -- Nivel 0: Margen Bruto
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'margen_bruto', 'Margen Bruto', 0, 30, 'normal', true);

  -- Nivel 0: Gastos de personal
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'gastos_personal', 'Gastos de personal', 0, 40, 'normal', false);

  -- Nivel 0: Otros gastos de explotación
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'otros_gastos', 'Otros gastos de explotación', 0, 50, 'normal', false);

  -- Nivel 0: EBITDA
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'ebitda', 'EBITDA', 0, 60, 'normal', true);

  -- Nivel 0: Amortización del inmovilizado
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'amortizacion', 'Amortización del inmovilizado', 0, 70, 'normal', false);

  -- Nivel 0: EBIT (Resultado de explotación)
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'ebit', 'Resultado de explotación (EBIT)', 0, 80, 'normal', true);

  -- Nivel 0: Ingresos financieros
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'ingresos_financieros', 'Ingresos financieros', 0, 90, 'invert', false);

  -- Nivel 0: Gastos financieros
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'gastos_financieros', 'Gastos financieros', 0, 100, 'normal', false);

  -- Nivel 0: Resultado financiero
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'resultado_financiero', 'Resultado financiero', 0, 110, 'normal', true);

  -- Nivel 0: Resultado antes de impuestos
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'resultado_antes_impuestos', 'Resultado antes de impuestos', 0, 120, 'normal', true);

  -- Nivel 0: Impuesto sobre beneficios
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'impuestos', 'Impuesto sobre beneficios', 0, 130, 'normal', false);

  -- Nivel 0: Resultado del ejercicio
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'resultado_neto', 'Resultado del ejercicio', 0, 140, 'normal', true);

  -- ============================================================================
  -- REGLAS DE MAPEO (PGC → rubros)
  -- ============================================================================

  -- Ingresos: Grupo 7 (Ventas e ingresos)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'ingresos', 10, 'account_like', '70%', 'Ventas de mercaderías, productos, servicios');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'ingresos', 20, 'account_like', '71%', 'Variación de existencias');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'ingresos', 30, 'account_like', '73%', 'Trabajos realizados para la empresa');

  -- Compras: Grupo 60-61 (Aprovisionamientos)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'compras', 10, 'account_like', '60%', 'Compras');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'compras', 20, 'account_like', '61%', 'Variación de existencias');

  -- Gastos de personal: Grupo 64
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'gastos_personal', 10, 'account_like', '64%', 'Sueldos, salarios y seguridad social');

  -- Otros gastos de explotación: Grupo 62
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'otros_gastos', 10, 'account_like', '62%', 'Servicios exteriores');

  -- Amortización: Grupo 68
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'amortizacion', 10, 'account_like', '68%', 'Dotaciones para amortizaciones');

  -- Ingresos financieros: Grupo 76
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'ingresos_financieros', 10, 'account_like', '76%', 'Ingresos financieros');

  -- Gastos financieros: Grupo 66
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'gastos_financieros', 10, 'account_like', '66%', 'Gastos financieros');

  -- Impuestos: Grupo 63
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'impuestos', 10, 'account_like', '63%', 'Tributos');

  RAISE NOTICE 'Plantilla PGC_2025 creada con éxito';
END $$;
