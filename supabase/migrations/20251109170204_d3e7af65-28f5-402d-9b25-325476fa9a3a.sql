-- ============================================================================
-- Seed: Plantilla PGC Oficial 2025 (Fix)
-- ============================================================================

-- Insertar plantilla PGC_2025
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
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verificar creación
DO $$
DECLARE
  v_template_id UUID;
  v_rubrics_count INTEGER;
  v_rules_count INTEGER;
BEGIN
  SELECT id INTO v_template_id FROM pl_templates WHERE code = 'PGC_2025';
  
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template PGC_2025 no fue creado';
  END IF;

  -- Limpiar rubrics y rules existentes
  DELETE FROM pl_rules WHERE template_id = v_template_id;
  DELETE FROM pl_rubrics WHERE template_id = v_template_id;

  -- ============================================================================
  -- RUBROS (13 líneas principales del P&L)
  -- ============================================================================

  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total) VALUES
  (v_template_id, 'ingresos', 'Importe neto de la cifra de negocios', 0, 10, 'invert', false),
  (v_template_id, 'compras', 'Aprovisionamientos', 0, 20, 'normal', false),
  (v_template_id, 'margen_bruto', 'Margen Bruto', 0, 30, 'normal', true),
  (v_template_id, 'gastos_personal', 'Gastos de personal', 0, 40, 'normal', false),
  (v_template_id, 'otros_gastos', 'Otros gastos de explotación', 0, 50, 'normal', false),
  (v_template_id, 'ebitda', 'EBITDA', 0, 60, 'normal', true),
  (v_template_id, 'amortizacion', 'Amortización del inmovilizado', 0, 70, 'normal', false),
  (v_template_id, 'ebit', 'Resultado de explotación (EBIT)', 0, 80, 'normal', true),
  (v_template_id, 'ingresos_financieros', 'Ingresos financieros', 0, 90, 'invert', false),
  (v_template_id, 'gastos_financieros', 'Gastos financieros', 0, 100, 'normal', false),
  (v_template_id, 'resultado_financiero', 'Resultado financiero', 0, 110, 'normal', true),
  (v_template_id, 'resultado_antes_impuestos', 'Resultado antes de impuestos', 0, 120, 'normal', true),
  (v_template_id, 'impuestos', 'Impuesto sobre beneficios', 0, 130, 'normal', false),
  (v_template_id, 'resultado_neto', 'Resultado del ejercicio', 0, 140, 'normal', true);

  -- ============================================================================
  -- REGLAS DE MAPEO (PGC → rubros)
  -- ============================================================================

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes) VALUES
  (v_template_id, 'ingresos', 10, 'account_like', '70%', 'Ventas de mercaderías, productos, servicios'),
  (v_template_id, 'ingresos', 20, 'account_like', '71%', 'Variación de existencias'),
  (v_template_id, 'ingresos', 30, 'account_like', '73%', 'Trabajos realizados para la empresa'),
  (v_template_id, 'compras', 10, 'account_like', '60%', 'Compras'),
  (v_template_id, 'compras', 20, 'account_like', '61%', 'Variación de existencias'),
  (v_template_id, 'gastos_personal', 10, 'account_like', '64%', 'Sueldos, salarios y seguridad social'),
  (v_template_id, 'otros_gastos', 10, 'account_like', '62%', 'Servicios exteriores'),
  (v_template_id, 'amortizacion', 10, 'account_like', '68%', 'Dotaciones para amortizaciones'),
  (v_template_id, 'ingresos_financieros', 10, 'account_like', '76%', 'Ingresos financieros'),
  (v_template_id, 'gastos_financieros', 10, 'account_like', '66%', 'Gastos financieros'),
  (v_template_id, 'impuestos', 10, 'account_like', '63%', 'Tributos');

  SELECT COUNT(*) INTO v_rubrics_count FROM pl_rubrics WHERE template_id = v_template_id;
  SELECT COUNT(*) INTO v_rules_count FROM pl_rules WHERE template_id = v_template_id;

  RAISE NOTICE '✅ PGC_2025 creado: % rubrics, % rules', v_rubrics_count, v_rules_count;
END $$;