-- ============================================================================
-- PLANTILLA P&L McDONALD'S / QSR (Quick Service Restaurant)
-- ============================================================================
-- Esta plantilla replica el formato histórico usado por Grupo Eduardo Rosas
-- 45 rubros organizados jerárquicamente con fórmulas de cálculo
-- ============================================================================

-- Insertar plantilla principal
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

-- Variable para el ID de la plantilla
DO $$ 
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM pl_templates WHERE code = 'McD_QSR_v1';

  -- ============================================================================
  -- SECCIÓN: INGRESOS (Nivel 0-1)
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'ventas_netas', 'VENTAS NETAS', NULL, 0, 10, 'normal', false, NULL, 'Ingresos totales por ventas'),
    (v_template_id, 'valor_produccion', 'Valor de Producción', NULL, 0, 20, 'normal', true, 'ventas_netas', 'Igual a ventas netas para QSR');

  -- ============================================================================
  -- SECCIÓN: COSTES DIRECTOS (Nivel 1-2)
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'comida', 'Comida', 'ventas_netas', 1, 30, 'normal', false, NULL, 'Costo de alimentos'),
    (v_template_id, 'comida_empleados', 'Comida Empleados', 'ventas_netas', 1, 40, 'normal', false, NULL, 'Comidas del personal'),
    (v_template_id, 'desperdicios', 'Desperdicios', 'ventas_netas', 1, 50, 'normal', false, NULL, 'Mermas y desperdicios'),
    (v_template_id, 'papel', 'Papel', 'ventas_netas', 1, 60, 'normal', false, NULL, 'Embalajes y papel'),
    (v_template_id, 'total_coste_comida_papel', 'TOTAL COSTE COMIDA Y PAPEL', NULL, 2, 70, 'normal', true, 'SUM(comida, comida_empleados, desperdicios, papel)', 'Suma de costes directos');

  -- ============================================================================
  -- SECCIÓN: MARGEN (Nivel 0)
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'resultado_bruto_explotacion', 'RESULTADO BRUTO DE EXPLOTACIÓN', NULL, 0, 80, 'normal', true, 'ventas_netas - total_coste_comida_papel', 'Margen bruto');

  -- ============================================================================
  -- SECCIÓN: GASTOS CONTROLABLES (Nivel 1-2)
  -- ============================================================================
  
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
    (v_template_id, 'varios_controlables', 'Varios Controlables', 'resultado_bruto_explotacion', 1, 220, 'normal', false, NULL, 'Otros gastos controlables'),
    (v_template_id, 'total_gastos_controlables', 'TOTAL GASTOS CONTROLABLES', NULL, 2, 230, 'normal', true, 'SUM(mano_obra, mano_obra_gerencia, seguridad_social, gastos_viajes, publicidad, promocion, servicios_exteriores, uniformes, suministros_operacion, reparacion_mantenimiento, luz_agua_telefono, gastos_oficina, diferencias_caja, varios_controlables)', 'Suma de gastos controlables');

  -- ============================================================================
  -- KPI CRÍTICO: P.A.C. (Profit After Controllables) - Nivel 0
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'pac', 'P.A.C. (Profit After Controllables)', NULL, 0, 240, 'normal', true, 'resultado_bruto_explotacion - total_gastos_controlables', 'Beneficio después de gastos controlables');

  -- ============================================================================
  -- SECCIÓN: GASTOS NO CONTROLABLES (Nivel 1-2)
  -- ============================================================================
  
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
    (v_template_id, 'varios_no_controlables', 'Varios No Controlables', 'pac', 1, 340, 'normal', false, NULL, 'Otros gastos no controlables'),
    (v_template_id, 'total_gastos_no_controlables', 'TOTAL GASTOS NO CONTROLABLES', NULL, 2, 350, 'normal', true, 'SUM(renta, renta_adicional, royalty, oficina_legal, seguros, tasas_licencias, depreciaciones, intereses, perdidas_venta_equipos, varios_no_controlables)', 'Suma de gastos no controlables');

  -- ============================================================================
  -- SECCIÓN: NO PRODUCTO (Nivel 1-2)
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'ventas_no_producto', 'Ventas No Producto', 'pac', 1, 360, 'normal', false, NULL, 'Ingresos extraordinarios'),
    (v_template_id, 'costo_no_producto', 'Costo No Producto', 'pac', 1, 370, 'normal', false, NULL, 'Costos extraordinarios'),
    (v_template_id, 'neto_no_producto', 'NETO NO PRODUCTO', NULL, 2, 380, 'normal', true, 'ventas_no_producto - costo_no_producto', 'Neto de operaciones no producto');

  -- ============================================================================
  -- KPI CRÍTICO: S.O.I. (Store Operating Income) - Nivel 0
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'soi', 'S.O.I. (Store Operating Income)', NULL, 0, 390, 'normal', true, 'pac - total_gastos_no_controlables + neto_no_producto', 'Beneficio operativo del restaurante');

  -- ============================================================================
  -- SECCIÓN: AJUSTES FINALES (Nivel 1)
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'draw_salary', 'Draw Salary', 'soi', 1, 400, 'normal', false, NULL, 'Salario propietario/socio'),
    (v_template_id, 'gastos_generales', 'Gastos Generales', 'soi', 1, 410, 'normal', false, NULL, 'Gastos generales corporativos');

  -- ============================================================================
  -- RESULTADO FINAL (Nivel 0)
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'resultado_neto', 'RESULTADO NETO', NULL, 0, 420, 'normal', true, 'soi - draw_salary - gastos_generales', 'Resultado neto final');

  -- ============================================================================
  -- SECCIÓN: CASH FLOW (Informativo, Nivel 1-2)
  -- ============================================================================
  
  INSERT INTO pl_rubrics (template_id, code, name, parent_code, level, sort, sign, is_total, formula, notes)
  VALUES
    (v_template_id, 'cuota_prestamo', 'Cuota Préstamo', 'resultado_neto', 1, 430, 'normal', false, NULL, 'Amortización de préstamos'),
    (v_template_id, 'depreciaciones_cf', 'Depreciaciones (CF)', 'resultado_neto', 1, 440, 'normal', false, NULL, 'Ajuste no monetario'),
    (v_template_id, 'gastos_intereses_cf', 'Gastos Intereses (CF)', 'resultado_neto', 1, 450, 'normal', false, NULL, 'Ajuste no monetario'),
    (v_template_id, 'cash_flow', 'CASH FLOW', NULL, 2, 460, 'normal', true, 'resultado_neto + cuota_prestamo + depreciaciones_cf + gastos_intereses_cf', 'Flujo de caja antes de deuda'),
    (v_template_id, 'cash_flow_socio', 'CASH FLOW SOCIO', NULL, 2, 470, 'normal', true, 'cash_flow - cuota_prestamo', 'Flujo de caja disponible para socio'),
    (v_template_id, 'inversiones_fondos_propios', 'Inversiones / Fondos Propios', 'cash_flow_socio', 1, 480, 'normal', false, NULL, 'Inversiones realizadas');

END $$;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Plantilla McD_QSR_v1 creada con éxito: 45 rubros';
END $$;
