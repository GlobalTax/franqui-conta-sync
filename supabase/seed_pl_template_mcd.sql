-- ============================================================================
-- Seed: Plantilla McDonald's v1
-- ============================================================================

-- Insertar plantilla
INSERT INTO public.pl_templates (code, name, description, is_active)
VALUES (
  'McD_v1',
  'P&L McDonald''s v1',
  'Cuenta de resultados formato McDonald''s España',
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
  SELECT id INTO v_template_id FROM pl_templates WHERE code = 'McD_v1';

  -- ============================================================================
  -- RUBROS (11 líneas principales del P&L McDonald's)
  -- ============================================================================

  -- Nivel 0: Ventas netas
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'revenue', 'Ventas netas', 0, 10, 'invert', false);

  -- Nivel 0: Comida (Food)
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'food', 'Comida (Food)', 0, 20, 'normal', false);

  -- Nivel 0: Papel (Paper)
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'paper', 'Papel (Paper)', 0, 30, 'normal', false);

  -- Nivel 0: Margen Bruto
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'gross_margin', 'Margen Bruto', 0, 40, 'normal', true);

  -- Nivel 0: Coste laboral (Labor)
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'labor', 'Coste laboral (Labor)', 0, 50, 'normal', false);

  -- Nivel 0: Gastos operativos (OpEx)
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'opex', 'Gastos operativos (OpEx)', 0, 60, 'normal', false);

  -- Nivel 0: Royalty
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'royalty', 'Royalty', 0, 70, 'normal', false);

  -- Nivel 0: Marketing fee
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'marketing', 'Marketing fee', 0, 80, 'normal', false);

  -- Nivel 0: EBITDA
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'ebitda', 'EBITDA', 0, 90, 'normal', true);

  -- Nivel 0: Depreciación y amortización
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'depreciation', 'Depreciación y amortización', 0, 100, 'normal', false);

  -- Nivel 0: EBIT (Resultado operativo)
  INSERT INTO pl_rubrics (template_id, code, name, level, sort, sign, is_total)
  VALUES (v_template_id, 'ebit', 'Resultado operativo (EBIT)', 0, 110, 'normal', true);

  -- ============================================================================
  -- REGLAS DE MAPEO (PGC → rubros McDonald's)
  -- ============================================================================

  -- Revenue: Ventas (70)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'revenue', 10, 'account_like', '70%', 'Ventas totales');

  -- Food: Compras de comida (60 excepto 606)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'food', 20, 'account_like', '60%', 'Compras de alimentos y bebidas');

  -- Paper: Papel y embalajes (606)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'paper', 5, 'account_like', '606%', 'Papel, embalajes y otros suministros');

  -- Labor: Costes laborales (64)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'labor', 10, 'account_like', '64%', 'Sueldos, salarios y seguridad social');

  -- Royalty: Canon franquicia (626)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'royalty', 5, 'account_like', '626%', 'Canon de franquicia McDonald''s');

  -- Marketing: Publicidad (627)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'marketing', 5, 'account_like', '627%', 'Marketing fee y publicidad');

  -- OpEx: Resto de servicios exteriores (62 excepto 626, 627)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'opex', 90, 'account_like', '62%', 'Otros gastos operativos (alquileres, suministros, etc.)');

  -- Depreciation: Amortización (68)
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES (v_template_id, 'depreciation', 10, 'account_like', '68%', 'Amortización de inmovilizado');

  RAISE NOTICE 'Plantilla McD_v1 creada con éxito';
END $$;
