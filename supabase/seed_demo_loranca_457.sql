-- ============================================================================
-- Script de Datos de Prueba para Sistema Contable - LORANCA (457)
-- ============================================================================

-- Nota: Reemplaza este UUID con un user_id real de tu tabla auth.users
-- Puedes obtenerlo con: SELECT id FROM auth.users LIMIT 1;
DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- ⚠️ REEMPLAZAR CON USER_ID REAL
  v_centro_code TEXT := '457'; -- Loranca
  v_fiscal_year_id UUID;
  v_entry_id UUID;
BEGIN
  
  -- ========================================
  -- 1. CREAR EJERCICIO FISCAL 2025
  -- ========================================
  INSERT INTO fiscal_years (centro_code, year, start_date, end_date, status)
  VALUES (v_centro_code, 2025, '2025-01-01', '2025-12-31', 'open')
  ON CONFLICT (centro_code, year) DO NOTHING
  RETURNING id INTO v_fiscal_year_id;
  
  -- Si ya existía, obtener su ID
  IF v_fiscal_year_id IS NULL THEN
    SELECT id INTO v_fiscal_year_id 
    FROM fiscal_years 
    WHERE centro_code = v_centro_code AND year = 2025;
  END IF;

  RAISE NOTICE 'Fiscal year ID: %', v_fiscal_year_id;

  -- ========================================
  -- ASIENTO 1: APORTACIÓN CAPITAL INICIAL
  -- Fecha: 01-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 1, '2025-01-01', 'Aportación capital inicial', v_centro_code,
    v_fiscal_year_id, 'posted', 100000, 100000, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '572', 'debit', 100000, 1, 'Ingreso en banco'),
  (v_entry_id, '100', 'credit', 100000, 2, 'Capital social');

  -- ========================================
  -- ASIENTO 2: COMPRA EQUIPAMIENTO
  -- Fecha: 05-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 2, '2025-01-05', 'Compra mobiliario restaurante', v_centro_code,
    v_fiscal_year_id, 'posted', 18150, 18150, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '216', 'debit', 15000, 1, 'Mobiliario'),
  (v_entry_id, '472', 'debit', 3150, 2, 'IVA Soportado 21%'),
  (v_entry_id, '572', 'credit', 18150, 3, 'Pago por banco');

  -- ========================================
  -- ASIENTO 3: COMPRA MERCADERÍAS
  -- Fecha: 10-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 3, '2025-01-10', 'Compra mercaderías a proveedor', v_centro_code,
    v_fiscal_year_id, 'posted', 9680, 9680, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '600', 'debit', 8000, 1, 'Compra mercaderías'),
  (v_entry_id, '472', 'debit', 1680, 2, 'IVA Soportado 21%'),
  (v_entry_id, '400', 'credit', 9680, 3, 'Proveedor a pagar');

  -- ========================================
  -- ASIENTO 4: VENTAS PRIMERA QUINCENA
  -- Fecha: 15-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 4, '2025-01-15', 'Ventas primera quincena enero', v_centro_code,
    v_fiscal_year_id, 'posted', 24200, 24200, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '570', 'debit', 24200, 1, 'Cobro en caja'),
  (v_entry_id, '700', 'credit', 20000, 2, 'Ventas mercaderías'),
  (v_entry_id, '477', 'credit', 4200, 3, 'IVA Repercutido 21%');

  -- ========================================
  -- ASIENTO 5: PAGO A PROVEEDORES
  -- Fecha: 20-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 5, '2025-01-20', 'Pago factura proveedor', v_centro_code,
    v_fiscal_year_id, 'posted', 9680, 9680, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '400', 'debit', 9680, 1, 'Cancelación deuda proveedor'),
  (v_entry_id, '572', 'credit', 9680, 2, 'Pago por banco');

  -- ========================================
  -- ASIENTO 6: GASTOS SUMINISTROS
  -- Fecha: 25-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 6, '2025-01-25', 'Factura suministros (luz, agua, gas)', v_centro_code,
    v_fiscal_year_id, 'posted', 1452, 1452, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '628', 'debit', 1200, 1, 'Suministros'),
  (v_entry_id, '472', 'debit', 252, 2, 'IVA Soportado 21%'),
  (v_entry_id, '572', 'credit', 1452, 3, 'Pago por banco');

  -- ========================================
  -- ASIENTO 7: VENTAS SEGUNDA QUINCENA
  -- Fecha: 28-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 7, '2025-01-28', 'Ventas segunda quincena enero', v_centro_code,
    v_fiscal_year_id, 'posted', 18150, 18150, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '430', 'debit', 18150, 1, 'Clientes a cobrar'),
  (v_entry_id, '700', 'credit', 15000, 2, 'Ventas mercaderías'),
  (v_entry_id, '477', 'credit', 3150, 3, 'IVA Repercutido 21%');

  -- ========================================
  -- ASIENTO 8: NÓMINAS DEL MES
  -- Fecha: 31-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 8, '2025-01-31', 'Nóminas y seguros sociales enero', v_centro_code,
    v_fiscal_year_id, 'posted', 15600, 15600, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '640', 'debit', 12000, 1, 'Sueldos y salarios'),
  (v_entry_id, '642', 'debit', 3600, 2, 'Seguridad Social empresa'),
  (v_entry_id, '572', 'credit', 15600, 3, 'Pago por banco');

  -- ========================================
  -- ASIENTO 9: ALQUILER LOCAL
  -- Fecha: 31-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 9, '2025-01-31', 'Alquiler local enero', v_centro_code,
    v_fiscal_year_id, 'posted', 3630, 3630, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '621', 'debit', 3000, 1, 'Arrendamientos'),
  (v_entry_id, '472', 'debit', 630, 2, 'IVA Soportado 21%'),
  (v_entry_id, '572', 'credit', 3630, 3, 'Pago por banco');

  -- ========================================
  -- ASIENTO 10: AMORTIZACIÓN MENSUAL
  -- Fecha: 31-01-2025
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 10, '2025-01-31', 'Amortización mobiliario enero', v_centro_code,
    v_fiscal_year_id, 'posted', 250, 250, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '681', 'debit', 250, 1, 'Amortización inmovilizado material'),
  (v_entry_id, '281', 'credit', 250, 2, 'Amortización acumulada mobiliario');

  RAISE NOTICE 'Se crearon 10 asientos contables correctamente para Loranca (457)';

END $$;

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

SELECT 
  '✓ Total de asientos creados' as verificacion,
  COUNT(*) as cantidad
FROM accounting_entries 
WHERE centro_code = '457';

SELECT 
  '✓ Verificación balance (debe = haber)' as verificacion,
  SUM(CASE WHEN movement_type = 'debit' THEN amount ELSE 0 END) as total_debe,
  SUM(CASE WHEN movement_type = 'credit' THEN amount ELSE 0 END) as total_haber,
  SUM(CASE WHEN movement_type = 'debit' THEN amount ELSE -amount END) as diferencia
FROM accounting_transactions t
JOIN accounting_entries e ON e.id = t.entry_id
WHERE e.centro_code = '457';

SELECT 
  grupo,
  nombre_grupo,
  ROUND(balance::numeric, 2) as balance
FROM calculate_balance_sheet('457', '2025-01-31')
ORDER BY grupo;
