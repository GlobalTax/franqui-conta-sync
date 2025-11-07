-- =====================================================
-- SEED: Plan General Contable Español - Datos de Prueba
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza las variables {organization_id}, {user_id}, etc.
--    con los valores reales de tu base de datos
-- 2. Ejecuta este script en SQL Editor de Supabase
-- 3. Verifica en la página Chart of Accounts que se visualice
--    correctamente el árbol jerárquico con saldos
-- 
-- Para obtener los IDs necesarios, ejecuta:
--   SELECT id FROM franchisees LIMIT 1;         -- {organization_id}
--   SELECT auth.uid();                          -- {user_id}
--   SELECT id FROM centres LIMIT 1;             -- {restaurant_id}
--   SELECT id FROM cost_centers LIMIT 1;        -- {cost_center_id}
--   SELECT gen_random_uuid();                   -- {period_id}
-- 
-- =====================================================

BEGIN;

-- =====================================================
-- 1. INSERCIÓN DEL PLAN DE CUENTAS
-- =====================================================

-- ========== GRUPO 1: FINANCIACIÓN BÁSICA ==========
INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '1', 'FINANCIACIÓN BÁSICA', 'PN', NULL, 0, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '10', 'Capital', 'PN', (SELECT id FROM accounts WHERE code = '1' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '11', 'Reservas', 'PN', (SELECT id FROM accounts WHERE code = '1' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '12', 'Resultado del Ejercicio', 'PN', (SELECT id FROM accounts WHERE code = '1' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '17', 'Deudas a largo plazo', 'P', (SELECT id FROM accounts WHERE code = '1' AND organization_id = '{organization_id}'), 1, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '100', 'Capital Social', 'PN', (SELECT id FROM accounts WHERE code = '10' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '113', 'Reservas Voluntarias', 'PN', (SELECT id FROM accounts WHERE code = '11' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '129', 'Resultado del Ejercicio', 'PN', (SELECT id FROM accounts WHERE code = '12' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '170', 'Deudas con entidades de crédito a largo plazo', 'P', (SELECT id FROM accounts WHERE code = '17' AND organization_id = '{organization_id}'), 2, true, true);

-- ========== GRUPO 2: ACTIVO NO CORRIENTE ==========
INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '2', 'ACTIVO NO CORRIENTE', 'A', NULL, 0, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '21', 'Inmovilizaciones materiales', 'A', (SELECT id FROM accounts WHERE code = '2' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '28', 'Amortización acumulada del inmovilizado', 'A', (SELECT id FROM accounts WHERE code = '2' AND organization_id = '{organization_id}'), 1, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '210', 'Terrenos y bienes naturales', 'A', (SELECT id FROM accounts WHERE code = '21' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '211', 'Construcciones', 'A', (SELECT id FROM accounts WHERE code = '21' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '216', 'Mobiliario', 'A', (SELECT id FROM accounts WHERE code = '21' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '217', 'Equipos para procesos de información', 'A', (SELECT id FROM accounts WHERE code = '21' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '281', 'Amortización acumulada del inmovilizado material', 'A', (SELECT id FROM accounts WHERE code = '28' AND organization_id = '{organization_id}'), 2, true, true);

-- ========== GRUPO 4: ACREEDORES Y DEUDORES ==========
INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '4', 'ACREEDORES Y DEUDORES', 'A', NULL, 0, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '40', 'Proveedores', 'P', (SELECT id FROM accounts WHERE code = '4' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '41', 'Acreedores varios', 'P', (SELECT id FROM accounts WHERE code = '4' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '43', 'Clientes', 'A', (SELECT id FROM accounts WHERE code = '4' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '47', 'Administraciones Públicas', 'A', (SELECT id FROM accounts WHERE code = '4' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '52', 'Deudas a corto plazo con entidades de crédito', 'P', (SELECT id FROM accounts WHERE code = '4' AND organization_id = '{organization_id}'), 1, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '400', 'Proveedores', 'P', (SELECT id FROM accounts WHERE code = '40' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '410', 'Acreedores por prestaciones de servicios', 'P', (SELECT id FROM accounts WHERE code = '41' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '430', 'Clientes', 'A', (SELECT id FROM accounts WHERE code = '43' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '472', 'Hacienda Pública, IVA soportado', 'A', (SELECT id FROM accounts WHERE code = '47' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '477', 'Hacienda Pública, IVA repercutido', 'P', (SELECT id FROM accounts WHERE code = '47' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '520', 'Deudas a corto plazo con entidades de crédito', 'P', (SELECT id FROM accounts WHERE code = '52' AND organization_id = '{organization_id}'), 2, true, true);

-- ========== GRUPO 5: CUENTAS FINANCIERAS ==========
INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '5', 'CUENTAS FINANCIERAS', 'A', NULL, 0, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '57', 'Tesorería', 'A', (SELECT id FROM accounts WHERE code = '5' AND organization_id = '{organization_id}'), 1, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '570', 'Caja, euros', 'A', (SELECT id FROM accounts WHERE code = '57' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '572', 'Bancos e instituciones de crédito c/c vista, euros', 'A', (SELECT id FROM accounts WHERE code = '57' AND organization_id = '{organization_id}'), 2, true, true);

-- ========== GRUPO 6: COMPRAS Y GASTOS ==========
INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '6', 'COMPRAS Y GASTOS', 'GAS', NULL, 0, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '60', 'Compras', 'GAS', (SELECT id FROM accounts WHERE code = '6' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '62', 'Servicios exteriores', 'GAS', (SELECT id FROM accounts WHERE code = '6' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '64', 'Gastos de personal', 'GAS', (SELECT id FROM accounts WHERE code = '6' AND organization_id = '{organization_id}'), 1, false, true),
  ('{organization_id}', '68', 'Dotaciones para amortizaciones', 'GAS', (SELECT id FROM accounts WHERE code = '6' AND organization_id = '{organization_id}'), 1, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '600', 'Compra de mercaderías', 'GAS', (SELECT id FROM accounts WHERE code = '60' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '602', 'Compra de otros aprovisionamientos', 'GAS', (SELECT id FROM accounts WHERE code = '60' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '621', 'Arrendamientos y cánones', 'GAS', (SELECT id FROM accounts WHERE code = '62' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '623', 'Servicios de profesionales independientes', 'GAS', (SELECT id FROM accounts WHERE code = '62' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '625', 'Primas de seguros', 'GAS', (SELECT id FROM accounts WHERE code = '62' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '628', 'Suministros', 'GAS', (SELECT id FROM accounts WHERE code = '62' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '640', 'Sueldos y salarios', 'GAS', (SELECT id FROM accounts WHERE code = '64' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '642', 'Seguridad Social a cargo de la empresa', 'GAS', (SELECT id FROM accounts WHERE code = '64' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '681', 'Amortización del inmovilizado material', 'GAS', (SELECT id FROM accounts WHERE code = '68' AND organization_id = '{organization_id}'), 2, true, true);

-- ========== GRUPO 7: VENTAS E INGRESOS ==========
INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '7', 'VENTAS E INGRESOS', 'ING', NULL, 0, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '70', 'Ventas de mercaderías, de producción propia, de servicios, etc.', 'ING', (SELECT id FROM accounts WHERE code = '7' AND organization_id = '{organization_id}'), 1, false, true);

INSERT INTO accounts (organization_id, code, name, account_type, parent_account_id, level, is_detail, active) VALUES
  ('{organization_id}', '700', 'Ventas de mercaderías', 'ING', (SELECT id FROM accounts WHERE code = '70' AND organization_id = '{organization_id}'), 2, true, true),
  ('{organization_id}', '705', 'Prestaciones de servicios', 'ING', (SELECT id FROM accounts WHERE code = '70' AND organization_id = '{organization_id}'), 2, true, true);

-- =====================================================
-- 2. CREAR PERIODO CONTABLE
-- =====================================================
INSERT INTO periods (id, organization_id, year, month, start_date, end_date, is_closed) VALUES
  ('{period_id}', '{organization_id}', 2025, 1, '2025-01-01', '2025-01-31', false);

-- =====================================================
-- 3. ASIENTOS CONTABLES
-- =====================================================

-- ========== ASIENTO 1: Aportación de Capital Inicial ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-001', '2025-01-01', 'Aportación de capital social inicial', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '572' AND organization_id = '{organization_id}'), 1, 'Ingreso en banco', 50000, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '100' AND organization_id = '{organization_id}'), 2, 'Capital aportado', 0, 50000);
END $$;

-- ========== ASIENTO 2: Compra de Mobiliario ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-002', '2025-01-05', 'Compra de mobiliario para restaurante', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '216' AND organization_id = '{organization_id}'), 1, 'Mobiliario', 12000, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '472' AND organization_id = '{organization_id}'), 2, 'IVA Soportado (21%)', 2520, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '572' AND organization_id = '{organization_id}'), 3, 'Pago factura', 0, 14520);
END $$;

-- ========== ASIENTO 3: Compra de Mercaderías ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-003', '2025-01-10', 'Compra de mercaderías a proveedor', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '600' AND organization_id = '{organization_id}'), 1, 'Compra mercaderías', 3000, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '472' AND organization_id = '{organization_id}'), 2, 'IVA Soportado (21%)', 630, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '400' AND organization_id = '{organization_id}'), 3, 'Factura pendiente', 0, 3630);
END $$;

-- ========== ASIENTO 4: Venta de Mercaderías ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-004', '2025-01-15', 'Ventas del día', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '430' AND organization_id = '{organization_id}'), 1, 'Factura emitida', 6050, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '700' AND organization_id = '{organization_id}'), 2, 'Venta mercaderías', 0, 5000),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '477' AND organization_id = '{organization_id}'), 3, 'IVA Repercutido (21%)', 0, 1050);
END $$;

-- ========== ASIENTO 5: Pago a Proveedores ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-005', '2025-01-20', 'Pago factura proveedor', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '400' AND organization_id = '{organization_id}'), 1, 'Cancelación deuda', 3630, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '572' AND organization_id = '{organization_id}'), 2, 'Transferencia bancaria', 0, 3630);
END $$;

-- ========== ASIENTO 6: Cobro de Clientes ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-006', '2025-01-22', 'Cobro de facturas', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '572' AND organization_id = '{organization_id}'), 1, 'Ingreso bancario', 6050, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '430' AND organization_id = '{organization_id}'), 2, 'Cancelación crédito', 0, 6050);
END $$;

-- ========== ASIENTO 7: Gastos de Suministros ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-007', '2025-01-25', 'Factura electricidad y agua', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '628' AND organization_id = '{organization_id}'), 1, 'Electricidad y agua', 800, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '472' AND organization_id = '{organization_id}'), 2, 'IVA Soportado (21%)', 168, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '410' AND organization_id = '{organization_id}'), 3, 'Factura pendiente', 0, 968);
END $$;

-- ========== ASIENTO 8: Nóminas del Mes ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-008', '2025-01-31', 'Nóminas enero 2025', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '640' AND organization_id = '{organization_id}'), 1, 'Sueldos y salarios', 8000, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '642' AND organization_id = '{organization_id}'), 2, 'Seguridad Social', 2400, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '572' AND organization_id = '{organization_id}'), 3, 'Pago nóminas', 0, 10400);
END $$;

-- ========== ASIENTO 9: Arrendamiento Local ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-009', '2025-01-31', 'Alquiler local enero', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '621' AND organization_id = '{organization_id}'), 1, 'Alquiler mensual', 2000, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '472' AND organization_id = '{organization_id}'), 2, 'IVA Soportado (21%)', 420, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '572' AND organization_id = '{organization_id}'), 3, 'Transferencia alquiler', 0, 2420);
END $$;

-- ========== ASIENTO 10: Amortización Mensual ==========
DO $$
DECLARE
  v_entry_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO journal_entries (id, organization_id, period_id, entry_number, entry_date, description, status, source, created_by, posted_at, posted_by) VALUES
    (v_entry_id, '{organization_id}', '{period_id}', 'AST-2025-010', '2025-01-31', 'Amortización mobiliario (10 años)', 'posted', 'manual', '{user_id}', NOW(), '{user_id}');

  INSERT INTO journal_lines (journal_entry_id, account_id, line_number, description, debit, credit) VALUES
    (v_entry_id, (SELECT id FROM accounts WHERE code = '681' AND organization_id = '{organization_id}'), 1, 'Dotación amortización', 100, 0),
    (v_entry_id, (SELECT id FROM accounts WHERE code = '281' AND organization_id = '{organization_id}'), 2, 'Amortización acumulada', 0, 100);
END $$;

COMMIT;

-- =====================================================
-- QUERIES DE VERIFICACIÓN
-- =====================================================

-- Verificar cuentas insertadas con jerarquía
SELECT 
  code,
  name,
  account_type,
  level,
  is_detail,
  CASE WHEN parent_account_id IS NULL THEN 'ROOT' ELSE (SELECT code FROM accounts p WHERE p.id = a.parent_account_id) END as parent_code,
  (SELECT COUNT(*) FROM accounts c WHERE c.parent_account_id = a.id) as num_children
FROM accounts a
WHERE organization_id = '{organization_id}'
ORDER BY code;

-- Verificar asientos contables y cuadre
SELECT 
  je.entry_number,
  je.entry_date,
  je.description,
  je.status,
  COUNT(jl.id) as num_lines,
  ROUND(SUM(jl.debit), 2) as total_debit,
  ROUND(SUM(jl.credit), 2) as total_credit,
  ROUND(SUM(jl.debit) - SUM(jl.credit), 2) as balance_check
FROM journal_entries je
LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
WHERE je.organization_id = '{organization_id}'
GROUP BY je.id, je.entry_number, je.entry_date, je.description, je.status
ORDER BY je.entry_date;

-- Verificar saldos por cuenta (solo cuentas de detalle con movimientos)
SELECT 
  a.code,
  a.name,
  a.account_type,
  ROUND(SUM(jl.debit), 2) as total_debit,
  ROUND(SUM(jl.credit), 2) as total_credit,
  ROUND(SUM(jl.debit) - SUM(jl.credit), 2) as balance
FROM accounts a
JOIN journal_lines jl ON jl.account_id = a.id
JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE a.organization_id = '{organization_id}'
  AND je.status = 'posted'
  AND a.is_detail = true
GROUP BY a.id, a.code, a.name, a.account_type
ORDER BY a.code;

-- Balance de comprobación resumido
SELECT 
  CASE 
    WHEN a.account_type = 'A' THEN 'ACTIVO'
    WHEN a.account_type = 'P' THEN 'PASIVO'
    WHEN a.account_type = 'PN' THEN 'PATRIMONIO NETO'
    WHEN a.account_type = 'GAS' THEN 'GASTOS'
    WHEN a.account_type = 'ING' THEN 'INGRESOS'
  END as tipo_cuenta,
  ROUND(SUM(jl.debit), 2) as total_debit,
  ROUND(SUM(jl.credit), 2) as total_credit,
  ROUND(SUM(jl.debit) - SUM(jl.credit), 2) as saldo
FROM accounts a
JOIN journal_lines jl ON jl.account_id = a.id
JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE a.organization_id = '{organization_id}'
  AND je.status = 'posted'
GROUP BY a.account_type
ORDER BY a.account_type;

-- =====================================================
-- SALDOS ESPERADOS TRAS EJECUTAR EL SCRIPT
-- =====================================================
-- ACTIVO:
--   572 Bancos: 25,080 €
--   216 Mobiliario: 12,000 €
--   281 Amort. Acum: -100 € (cuenta compensadora)
--   472 IVA Soportado: 3,738 €
--   TOTAL ACTIVO NETO: 40,718 €
--
-- PASIVO:
--   410 Acreedores: 968 €
--   477 IVA Repercutido: 1,050 €
--   TOTAL PASIVO: 2,018 €
--
-- PATRIMONIO NETO:
--   100 Capital Social: 50,000 €
--   TOTAL PN: 50,000 €
--
-- GASTOS:
--   600 Compras: 3,000 €
--   628 Suministros: 800 €
--   640 Sueldos: 8,000 €
--   642 Seg. Social: 2,400 €
--   621 Arrendamientos: 2,000 €
--   681 Amortización: 100 €
--   TOTAL GASTOS: 16,300 €
--
-- INGRESOS:
--   700 Ventas: 5,000 €
--   TOTAL INGRESOS: 5,000 €
--
-- RESULTADO DEL EJERCICIO: 5,000 - 16,300 = -11,300 €
-- ECUACIÓN FUNDAMENTAL: ACTIVO (40,718) = PASIVO (2,018) + PN (50,000) + RESULTADO (-11,300)
-- =====================================================
