-- ============================================================================
-- REGLAS DE MAPEO P&L McDONALD'S / QSR
-- ============================================================================
-- Mapeo de cuentas PGC a rubros específicos de McDonald's
-- Prioridades: números más bajos = mayor prioridad
-- ============================================================================

DO $$ 
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM pl_templates WHERE code = 'McD_QSR_v1';

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Plantilla McD_QSR_v1 no encontrada. Ejecuta seed_pl_template_mcd_qsr.sql primero.';
  END IF;

  -- Limpiar reglas existentes de esta plantilla
  DELETE FROM pl_rules WHERE template_id = v_template_id;

  -- ============================================================================
  -- VENTAS NETAS (Grupo 7)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'ventas_netas', 10, 'account_like', '70%', 'Ventas de mercaderías y servicios'),
    (v_template_id, 'ventas_netas', 15, 'account_like', '705%', 'Prestaciones de servicios');

  -- ============================================================================
  -- COMIDA (Grupo 60)
  -- ============================================================================
  
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

  -- ============================================================================
  -- PAPEL Y EMBALAJES (Grupo 606)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'papel', 5, 'account_like', '606%', 'Embalajes y papel'),
    (v_template_id, 'papel', 10, 'account_like', '6060%', 'Envases desechables');

  -- ============================================================================
  -- MANO DE OBRA (Grupo 64)
  -- ============================================================================
  
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

  -- ============================================================================
  -- GASTOS DE VIAJES (Grupo 625, 627)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'gastos_viajes', 5, 'account_like', '625%', 'Primas de seguros de personal'),
    (v_template_id, 'gastos_viajes', 10, 'account_like', '6270%', 'Gastos de viaje');

  -- ============================================================================
  -- PUBLICIDAD Y PROMOCIÓN (Grupo 627)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'publicidad', 10, 'account_like', '627%', 'Publicidad, propaganda y RRPP'),
    (v_template_id, 'publicidad', 15, 'account_like', '6271%', 'Publicidad local');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'promocion', 5, 'account_like', '6272%', 'Promociones y marketing'),
    (v_template_id, 'promocion', 10, 'account_like', '6273%', 'Eventos promocionales');

  -- ============================================================================
  -- SERVICIOS EXTERIORES (Grupo 62)
  -- ============================================================================
  
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

  -- ============================================================================
  -- REPARACIÓN Y MANTENIMIENTO (Grupo 622)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'reparacion_mantenimiento', 5, 'account_like', '6220%', 'Reparaciones y conservación'),
    (v_template_id, 'reparacion_mantenimiento', 10, 'account_like', '6221%', 'Mantenimiento equipos');

  -- ============================================================================
  -- SUMINISTROS (Luz, Agua, Teléfono)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'luz_agua_telefono', 5, 'account_like', '6281%', 'Energía eléctrica'),
    (v_template_id, 'luz_agua_telefono', 10, 'account_like', '6282%', 'Agua'),
    (v_template_id, 'luz_agua_telefono', 15, 'account_like', '6283%', 'Gas'),
    (v_template_id, 'luz_agua_telefono', 20, 'account_like', '6284%', 'Teléfono e internet');

  -- ============================================================================
  -- GASTOS DE OFICINA (Grupo 629)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'gastos_oficina', 10, 'account_like', '6290%', 'Material de oficina'),
    (v_template_id, 'gastos_oficina', 15, 'account_like', '6291%', 'Otros gastos de oficina');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'diferencias_caja', 5, 'account_like', '678%', 'Gastos excepcionales - Diferencias'),
    (v_template_id, 'diferencias_caja', 10, 'account_like', '6780%', 'Descuadres de caja');

  -- ============================================================================
  -- RENTA / ALQUILER (Grupo 621)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'renta', 5, 'account_like', '621%', 'Arrendamientos y cánones'),
    (v_template_id, 'renta', 10, 'account_like', '6210%', 'Alquiler local fijo');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'renta_adicional', 5, 'account_like', '6211%', 'Alquiler variable sobre ventas');

  -- ============================================================================
  -- ROYALTY (Específico McDonald's - Grupo 623)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'royalty', 3, 'account_like', '6230%', 'Royalty franquicia'),
    (v_template_id, 'royalty', 5, 'account_like', '623%', 'Servicios profesionales - Royalty');

  -- ============================================================================
  -- OFICINA Y LEGAL (Grupo 623)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'oficina_legal', 5, 'account_like', '6231%', 'Asesoría jurídica'),
    (v_template_id, 'oficina_legal', 10, 'account_like', '6232%', 'Asesoría contable y fiscal');

  -- ============================================================================
  -- SEGUROS (Grupo 625)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'seguros', 5, 'account_like', '625%', 'Primas de seguros'),
    (v_template_id, 'seguros', 10, 'account_like', '6250%', 'Seguro local y responsabilidad civil');

  -- ============================================================================
  -- TASAS Y LICENCIAS (Grupo 631)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'tasas_licencias', 5, 'account_like', '631%', 'Otros tributos'),
    (v_template_id, 'tasas_licencias', 10, 'account_like', '6310%', 'Tasas municipales y licencias');

  -- ============================================================================
  -- DEPRECIACIONES / AMORTIZACIONES (Grupo 68)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'depreciaciones', 5, 'account_like', '68%', 'Dotaciones para amortizaciones'),
    (v_template_id, 'depreciaciones', 10, 'account_like', '681%', 'Amortización inmovilizado material');

  -- ============================================================================
  -- INTERESES Y GASTOS FINANCIEROS (Grupo 66)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'intereses', 5, 'account_like', '66%', 'Gastos financieros'),
    (v_template_id, 'intereses', 10, 'account_like', '662%', 'Intereses de deudas'),
    (v_template_id, 'intereses', 15, 'account_like', '6620%', 'Intereses préstamos');

  -- ============================================================================
  -- PÉRDIDAS POR VENTA DE EQUIPOS (Grupo 671)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'perdidas_venta_equipos', 5, 'account_like', '671%', 'Pérdidas procedentes del inmovilizado'),
    (v_template_id, 'perdidas_venta_equipos', 10, 'account_like', '6710%', 'Pérdidas venta equipos');

  -- ============================================================================
  -- INGRESOS NO PRODUCTO (Grupo 75, 76)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'ventas_no_producto', 5, 'account_like', '75%', 'Otros ingresos de gestión'),
    (v_template_id, 'ventas_no_producto', 10, 'account_like', '76%', 'Ingresos financieros'),
    (v_template_id, 'ventas_no_producto', 15, 'account_like', '771%', 'Beneficios venta inmovilizado');

  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'costo_no_producto', 10, 'account_like', '678%', 'Gastos excepcionales'),
    (v_template_id, 'costo_no_producto', 15, 'account_like', '679%', 'Gastos y pérdidas de ejercicios anteriores');

  -- ============================================================================
  -- DRAW SALARY (Grupo 649)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'draw_salary', 5, 'account_like', '649%', 'Otros gastos sociales - Socio'),
    (v_template_id, 'draw_salary', 10, 'account_like', '6490%', 'Retribución socio-gerente');

  -- ============================================================================
  -- GASTOS GENERALES CORPORATIVOS
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'gastos_generales', 10, 'account_like', '6299%', 'Gastos generales diversos'),
    (v_template_id, 'gastos_generales', 15, 'account_like', '624%', 'Transportes corporativos');

  -- ============================================================================
  -- CASH FLOW - PRÉSTAMOS (Cuentas especiales)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'cuota_prestamo', 5, 'account_like', '170%', 'Deudas a largo plazo - Amortización'),
    (v_template_id, 'cuota_prestamo', 10, 'account_like', '520%', 'Deudas a corto plazo - Amortización');

  -- Para cash flow, duplicar depreciaciones e intereses
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'depreciaciones_cf', 5, 'account_like', '68%', 'Mismo que depreciaciones (ajuste CF)'),
    (v_template_id, 'gastos_intereses_cf', 5, 'account_like', '66%', 'Mismo que intereses (ajuste CF)');

  -- ============================================================================
  -- INVERSIONES (Grupo 21, 22)
  -- ============================================================================
  
  INSERT INTO pl_rules (template_id, rubric_code, priority, match_kind, account_like, notes)
  VALUES
    (v_template_id, 'inversiones_fondos_propios', 5, 'account_like', '21%', 'Inmovilizado material - Inversiones'),
    (v_template_id, 'inversiones_fondos_propios', 10, 'account_like', '22%', 'Inversiones inmobiliarias');

END $$;

-- Mensaje de confirmación
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM pl_rules 
  WHERE template_id = (SELECT id FROM pl_templates WHERE code = 'McD_QSR_v1');
  
  RAISE NOTICE 'Reglas de mapeo McD_QSR_v1 creadas: % reglas', v_count;
END $$;
