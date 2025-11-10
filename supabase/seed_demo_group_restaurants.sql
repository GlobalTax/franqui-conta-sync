-- ============================================================================
-- Script de Datos DEMO - Grupo de Restaurantes McDonald's
-- ============================================================================
-- Crea un franchisee demo con múltiples empresas, centros y datos contables
-- Ideal para demostraciones y testing
-- ============================================================================

-- ⚠️ IMPORTANTE: Reemplaza este UUID con un user_id real de tu tabla auth.users
-- Puedes obtenerlo con: SELECT id FROM auth.users LIMIT 1;

DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- ⚠️ REEMPLAZAR
  v_franchisee_id UUID;
  v_company_1_id UUID;
  v_company_2_id UUID;
  v_centre_1_id UUID;
  v_centre_2_id UUID;
  v_centre_3_id UUID;
  v_centre_4_id UUID;
  v_fiscal_year_id UUID;
  v_entry_id UUID;
  v_supplier_id UUID;
BEGIN

  -- ========================================
  -- 1. CREAR FRANCHISEE DEMO
  -- ========================================
  INSERT INTO franchisees (
    name,
    cif,
    contact_email,
    contact_phone,
    activo,
    created_at
  ) VALUES (
    'Grupo Demo McDonald''s',
    'B87654321',
    'demo@mcdonalds-demo.es',
    '+34 912 345 678',
    true,
    NOW()
  )
  ON CONFLICT (cif) DO UPDATE 
    SET name = EXCLUDED.name,
        contact_email = EXCLUDED.contact_email
  RETURNING id INTO v_franchisee_id;

  RAISE NOTICE '✓ Franchisee creado: %', v_franchisee_id;

  -- ========================================
  -- 2. CREAR EMPRESAS (COMPANIES)
  -- ========================================
  
  -- Empresa 1: Demo Restaurantes Madrid SL
  INSERT INTO companies (
    franchisee_id,
    razon_social,
    cif,
    tipo_sociedad,
    activo,
    created_at
  ) VALUES (
    v_franchisee_id,
    'Demo Restaurantes Madrid SL',
    'B12345678',
    'SL',
    true,
    NOW()
  )
  ON CONFLICT (cif) DO UPDATE 
    SET razon_social = EXCLUDED.razon_social
  RETURNING id INTO v_company_1_id;

  RAISE NOTICE '✓ Empresa 1 creada: %', v_company_1_id;

  -- Empresa 2: Demo Food Services Barcelona SL
  INSERT INTO companies (
    franchisee_id,
    razon_social,
    cif,
    tipo_sociedad,
    activo,
    created_at
  ) VALUES (
    v_franchisee_id,
    'Demo Food Services Barcelona SL',
    'B87654321',
    'SL',
    true,
    NOW()
  )
  ON CONFLICT (cif) DO UPDATE 
    SET razon_social = EXCLUDED.razon_social
  RETURNING id INTO v_company_2_id;

  RAISE NOTICE '✓ Empresa 2 creada: %', v_company_2_id;

  -- ========================================
  -- 3. CREAR CENTROS (RESTAURANTES)
  -- ========================================

  -- Centro 1: DEMO-001 Gran Vía Madrid
  INSERT INTO centres (
    franchisee_id,
    codigo,
    nombre,
    direccion,
    ciudad,
    provincia,
    codigo_postal,
    opening_date,
    seating_capacity,
    has_drive_thru,
    has_mccafe,
    activo,
    created_at
  ) VALUES (
    v_franchisee_id,
    'DEMO-001',
    'Gran Vía Madrid',
    'Gran Vía 28',
    'Madrid',
    'Madrid',
    '28013',
    '2024-01-15',
    120,
    false,
    true,
    true,
    NOW()
  )
  ON CONFLICT (codigo) DO UPDATE 
    SET nombre = EXCLUDED.nombre,
        direccion = EXCLUDED.direccion
  RETURNING id INTO v_centre_1_id;

  RAISE NOTICE '✓ Centro 1 creado: %', v_centre_1_id;

  -- Centro 2: DEMO-002 Castellana
  INSERT INTO centres (
    franchisee_id,
    codigo,
    nombre,
    direccion,
    ciudad,
    provincia,
    codigo_postal,
    opening_date,
    seating_capacity,
    has_drive_thru,
    has_mccafe,
    activo,
    created_at
  ) VALUES (
    v_franchisee_id,
    'DEMO-002',
    'Castellana',
    'Paseo de la Castellana 135',
    'Madrid',
    'Madrid',
    '28046',
    '2024-03-20',
    100,
    true,
    false,
    true,
    NOW()
  )
  ON CONFLICT (codigo) DO UPDATE 
    SET nombre = EXCLUDED.nombre,
        direccion = EXCLUDED.direccion
  RETURNING id INTO v_centre_2_id;

  RAISE NOTICE '✓ Centro 2 creado: %', v_centre_2_id;

  -- Centro 3: DEMO-003 Diagonal Barcelona
  INSERT INTO centres (
    franchisee_id,
    codigo,
    nombre,
    direccion,
    ciudad,
    provincia,
    codigo_postal,
    opening_date,
    seating_capacity,
    has_drive_thru,
    has_mccafe,
    activo,
    created_at
  ) VALUES (
    v_franchisee_id,
    'DEMO-003',
    'Diagonal Barcelona',
    'Avda Diagonal 471',
    'Barcelona',
    'Barcelona',
    '08036',
    '2024-05-10',
    150,
    false,
    true,
    true,
    NOW()
  )
  ON CONFLICT (codigo) DO UPDATE 
    SET nombre = EXCLUDED.nombre,
        direccion = EXCLUDED.direccion
  RETURNING id INTO v_centre_3_id;

  RAISE NOTICE '✓ Centro 3 creado: %', v_centre_3_id;

  -- Centro 4: DEMO-004 La Maquinista
  INSERT INTO centres (
    franchisee_id,
    codigo,
    nombre,
    direccion,
    ciudad,
    provincia,
    codigo_postal,
    opening_date,
    seating_capacity,
    has_drive_thru,
    has_mccafe,
    activo,
    created_at
  ) VALUES (
    v_franchisee_id,
    'DEMO-004',
    'La Maquinista',
    'C.C. La Maquinista, Potosí 2',
    'Barcelona',
    'Barcelona',
    '08030',
    '2024-07-01',
    80,
    true,
    true,
    true,
    NOW()
  )
  ON CONFLICT (codigo) DO UPDATE 
    SET nombre = EXCLUDED.nombre,
        direccion = EXCLUDED.direccion
  RETURNING id INTO v_centre_4_id;

  RAISE NOTICE '✓ Centro 4 creado: %', v_centre_4_id;

  -- ========================================
  -- 4. ASOCIAR CENTROS A EMPRESAS
  -- ========================================

  -- Asociar centros 1 y 2 a empresa 1 (Madrid)
  INSERT INTO centre_companies (centre_id, company_id, is_principal)
  VALUES 
    (v_centre_1_id, v_company_1_id, true),
    (v_centre_2_id, v_company_1_id, true)
  ON CONFLICT (centre_id, company_id) DO NOTHING;

  -- Asociar centros 3 y 4 a empresa 2 (Barcelona)
  INSERT INTO centre_companies (centre_id, company_id, is_principal)
  VALUES 
    (v_centre_3_id, v_company_2_id, true),
    (v_centre_4_id, v_company_2_id, true)
  ON CONFLICT (centre_id, company_id) DO NOTHING;

  RAISE NOTICE '✓ Centros asociados a empresas';

  -- ========================================
  -- 5. CREAR PROVEEDORES DEMO
  -- ========================================

  INSERT INTO suppliers (
    name,
    cif,
    email,
    phone,
    address,
    city,
    postal_code,
    activo,
    created_at
  ) VALUES 
    ('Demo Distribuciones Alimentarias SA', 'A11111111', 'pedidos@demo-alimentos.es', '+34 911111111', 'Polígono Industrial Norte', 'Madrid', '28100', true, NOW()),
    ('Demo Suministros Hostelería SL', 'B22222222', 'ventas@demo-suministros.es', '+34 922222222', 'Calle Industria 45', 'Barcelona', '08001', true, NOW()),
    ('Demo Bebidas y Refrescos SA', 'A33333333', 'comercial@demo-bebidas.es', '+34 933333333', 'Avenida Logística 12', 'Valencia', '46000', true, NOW())
  ON CONFLICT (cif) DO NOTHING;

  RAISE NOTICE '✓ Proveedores demo creados';

  -- ========================================
  -- 6. DATOS CONTABLES - CENTRO DEMO-001
  -- ========================================

  -- Crear ejercicio fiscal 2025
  INSERT INTO fiscal_years (centro_code, year, start_date, end_date, status)
  VALUES ('DEMO-001', 2025, '2025-01-01', '2025-12-31', 'open')
  ON CONFLICT (centro_code, year) DO NOTHING
  RETURNING id INTO v_fiscal_year_id;

  IF v_fiscal_year_id IS NULL THEN
    SELECT id INTO v_fiscal_year_id 
    FROM fiscal_years 
    WHERE centro_code = 'DEMO-001' AND year = 2025;
  END IF;

  RAISE NOTICE '✓ Ejercicio fiscal creado: %', v_fiscal_year_id;

  -- ========================================
  -- ASIENTO 1: Capital Inicial
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 1, '2025-01-01', 'Aportación capital inicial', 'DEMO-001',
    v_fiscal_year_id, 'posted', 150000, 150000, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '572', 'debit', 150000, 1, 'Ingreso en banco'),
  (v_entry_id, '100', 'credit', 150000, 2, 'Capital social');

  -- ========================================
  -- ASIENTO 2: Equipamiento Cocina
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 2, '2025-01-05', 'Compra equipamiento cocina', 'DEMO-001',
    v_fiscal_year_id, 'posted', 36300, 36300, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '213', 'debit', 30000, 1, 'Maquinaria'),
  (v_entry_id, '472', 'debit', 6300, 2, 'IVA Soportado 21%'),
  (v_entry_id, '572', 'credit', 36300, 3, 'Pago por banco');

  -- ========================================
  -- ASIENTO 3: Compra Inicial Mercaderías
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 3, '2025-01-08', 'Compra mercaderías inicial', 'DEMO-001',
    v_fiscal_year_id, 'posted', 12100, 12100, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '600', 'debit', 10000, 1, 'Compra mercaderías'),
  (v_entry_id, '472', 'debit', 2100, 2, 'IVA Soportado 21%'),
  (v_entry_id, '400', 'credit', 12100, 3, 'Proveedores');

  -- ========================================
  -- ASIENTO 4: Ventas Semana 1
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 4, '2025-01-07', 'Ventas semana 1 - enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 48400, 48400, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '570', 'debit', 48400, 1, 'Caja, euros'),
  (v_entry_id, '700', 'credit', 40000, 2, 'Ventas de mercaderías'),
  (v_entry_id, '477', 'credit', 8400, 3, 'IVA Repercutido 21%');

  -- ========================================
  -- ASIENTO 5: Ventas Semana 2
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 5, '2025-01-14', 'Ventas semana 2 - enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 42350, 42350, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '570', 'debit', 42350, 1, 'Caja, euros'),
  (v_entry_id, '700', 'credit', 35000, 2, 'Ventas de mercaderías'),
  (v_entry_id, '477', 'credit', 7350, 3, 'IVA Repercutido 21%');

  -- ========================================
  -- ASIENTO 6: Compra Mercaderías
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 6, '2025-01-15', 'Compra mercaderías quincena', 'DEMO-001',
    v_fiscal_year_id, 'posted', 18150, 18150, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '600', 'debit', 15000, 1, 'Compra mercaderías'),
  (v_entry_id, '472', 'debit', 3150, 2, 'IVA Soportado 21%'),
  (v_entry_id, '400', 'credit', 18150, 3, 'Proveedores');

  -- ========================================
  -- ASIENTO 7: Pago Proveedores
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 7, '2025-01-20', 'Pago a proveedores', 'DEMO-001',
    v_fiscal_year_id, 'posted', 30250, 30250, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '400', 'debit', 30250, 1, 'Proveedores'),
  (v_entry_id, '572', 'credit', 30250, 2, 'Bancos e instituciones de crédito');

  -- ========================================
  -- ASIENTO 8: Ventas Semana 3
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 8, '2025-01-21', 'Ventas semana 3 - enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 45375, 45375, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '570', 'debit', 45375, 1, 'Caja, euros'),
  (v_entry_id, '700', 'credit', 37500, 2, 'Ventas de mercaderías'),
  (v_entry_id, '477', 'credit', 7875, 3, 'IVA Repercutido 21%');

  -- ========================================
  -- ASIENTO 9: Nóminas Enero
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 9, '2025-01-31', 'Nóminas y SS enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 22000, 22000, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '640', 'debit', 18000, 1, 'Sueldos y salarios'),
  (v_entry_id, '642', 'debit', 4000, 2, 'Seguridad Social a cargo de la empresa'),
  (v_entry_id, '572', 'credit', 22000, 3, 'Bancos e instituciones de crédito');

  -- ========================================
  -- ASIENTO 10: Alquiler Local
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 10, '2025-01-31', 'Alquiler local enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 6050, 6050, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '621', 'debit', 5000, 1, 'Arrendamientos y cánones'),
  (v_entry_id, '472', 'debit', 1050, 2, 'IVA Soportado 21%'),
  (v_entry_id, '572', 'credit', 6050, 3, 'Bancos e instituciones de crédito');

  -- ========================================
  -- ASIENTO 11: Suministros
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 11, '2025-01-31', 'Suministros enero (luz, agua, gas)', 'DEMO-001',
    v_fiscal_year_id, 'posted', 2420, 2420, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '628', 'debit', 2000, 1, 'Suministros'),
  (v_entry_id, '472', 'debit', 420, 2, 'IVA Soportado 21%'),
  (v_entry_id, '572', 'credit', 2420, 3, 'Bancos e instituciones de crédito');

  -- ========================================
  -- ASIENTO 12: Ventas Semana 4
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 12, '2025-01-28', 'Ventas semana 4 - enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 39325, 39325, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '570', 'debit', 39325, 1, 'Caja, euros'),
  (v_entry_id, '700', 'credit', 32500, 2, 'Ventas de mercaderías'),
  (v_entry_id, '477', 'credit', 6825, 3, 'IVA Repercutido 21%');

  -- ========================================
  -- ASIENTO 13: Royalty McDonald's
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 13, '2025-01-31', 'Royalty McDonald''s enero (5% ventas)', 'DEMO-001',
    v_fiscal_year_id, 'posted', 7250, 7250, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '626', 'debit', 7250, 1, 'Servicios bancarios y similares'),
  (v_entry_id, '572', 'credit', 7250, 2, 'Bancos e instituciones de crédito');

  -- ========================================
  -- ASIENTO 14: Publicidad y Marketing
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 14, '2025-01-31', 'Publicidad y marketing enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 3630, 3630, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '627', 'debit', 3000, 1, 'Publicidad, propaganda y relaciones públicas'),
  (v_entry_id, '472', 'debit', 630, 2, 'IVA Soportado 21%'),
  (v_entry_id, '572', 'credit', 3630, 3, 'Bancos e instituciones de crédito');

  -- ========================================
  -- ASIENTO 15: Amortización Mensual
  -- ========================================
  v_entry_id := gen_random_uuid();
  
  INSERT INTO accounting_entries (
    id, entry_number, entry_date, description, centro_code, 
    fiscal_year_id, status, total_debit, total_credit, created_by
  ) VALUES (
    v_entry_id, 15, '2025-01-31', 'Amortización equipamiento enero', 'DEMO-001',
    v_fiscal_year_id, 'posted', 500, 500, v_user_id
  );
  
  INSERT INTO accounting_transactions (entry_id, account_code, movement_type, amount, line_number, description) VALUES
  (v_entry_id, '681', 'debit', 500, 1, 'Amortización del inmovilizado material'),
  (v_entry_id, '281', 'credit', 500, 2, 'Amortización acumulada del inmovilizado material');

  RAISE NOTICE '✓ Se crearon 15 asientos contables para DEMO-001';

  -- ========================================
  -- 7. RESUMEN FINAL
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'GRUPO DEMO CREADO CORRECTAMENTE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Franchisee: Grupo Demo McDonald''s (%)' , v_franchisee_id;
  RAISE NOTICE 'Empresas: 2';
  RAISE NOTICE '  - Demo Restaurantes Madrid SL';
  RAISE NOTICE '  - Demo Food Services Barcelona SL';
  RAISE NOTICE 'Centros: 4';
  RAISE NOTICE '  - DEMO-001 Gran Vía Madrid';
  RAISE NOTICE '  - DEMO-002 Castellana';
  RAISE NOTICE '  - DEMO-003 Diagonal Barcelona';
  RAISE NOTICE '  - DEMO-004 La Maquinista';
  RAISE NOTICE 'Datos contables: 15 asientos en DEMO-001';
  RAISE NOTICE '================================================';

END $$;

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

-- Verificar franchisee
SELECT 
  '✓ Franchisee creado' as verificacion,
  name,
  cif
FROM franchisees 
WHERE cif = 'B87654321';

-- Verificar empresas
SELECT 
  '✓ Empresas creadas' as verificacion,
  razon_social,
  cif
FROM companies 
WHERE franchisee_id = (SELECT id FROM franchisees WHERE cif = 'B87654321');

-- Verificar centros
SELECT 
  '✓ Centros creados' as verificacion,
  codigo,
  nombre,
  ciudad
FROM centres 
WHERE franchisee_id = (SELECT id FROM franchisees WHERE cif = 'B87654321')
ORDER BY codigo;

-- Verificar asientos contables
SELECT 
  '✓ Asientos contables' as verificacion,
  COUNT(*) as cantidad,
  SUM(total_debit) as total_debe,
  SUM(total_credit) as total_haber
FROM accounting_entries 
WHERE centro_code = 'DEMO-001';

-- Verificar balance
SELECT 
  '✓ Balance DEMO-001' as verificacion,
  ROUND(SUM(CASE WHEN movement_type = 'debit' THEN amount ELSE -amount END)::numeric, 2) as saldo
FROM accounting_transactions t
JOIN accounting_entries e ON e.id = t.entry_id
WHERE e.centro_code = 'DEMO-001';

-- Verificar proveedores
SELECT 
  '✓ Proveedores demo' as verificacion,
  COUNT(*) as cantidad
FROM suppliers
WHERE name LIKE 'Demo%';