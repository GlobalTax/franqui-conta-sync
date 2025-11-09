-- ============================================================================
-- SCRIPT DE DATOS DEMO: CONCILIACIÓN BANCARIA
-- ============================================================================
-- Este script crea datos de prueba para el módulo de conciliación bancaria
-- Centros: Islazul (1050) y Loranca (457)
-- Incluye: cuentas bancarias, transacciones, reglas, conciliaciones
-- ============================================================================

-- Variables de contexto (reemplazar con UUIDs reales si es necesario)
DO $$ 
DECLARE
  v_user_id UUID;
  v_islazul_account_1 UUID;
  v_islazul_account_2 UUID;
  v_loranca_account_1 UUID;
  v_loranca_account_2 UUID;
  v_rule_1 UUID;
  v_rule_2 UUID;
  v_rule_3 UUID;
  v_rule_4 UUID;
  v_rule_5 UUID;
  v_rule_6 UUID;
  v_rule_7 UUID;
  v_rule_8 UUID;
  v_transaction_id UUID;
  v_closure_id UUID;
  v_invoice_id UUID;
BEGIN

-- Obtener un usuario admin existente
SELECT id INTO v_user_id FROM auth.users LIMIT 1;

RAISE NOTICE 'Iniciando creación de datos demo para conciliación bancaria...';

-- ============================================================================
-- 1. CUENTAS BANCARIAS (bank_accounts)
-- ============================================================================
RAISE NOTICE '1. Creando cuentas bancarias...';

-- ISLAZUL (1050) - Cuenta Principal BBVA
INSERT INTO bank_accounts (id, centro_code, account_name, iban, swift, currency, account_code, current_balance, active)
VALUES (
  gen_random_uuid(),
  '1050',
  'BBVA Cuenta Principal',
  'ES7601821234567890123456',
  'BBVAESMM',
  'EUR',
  '5720001',
  45782.50,
  true
) ON CONFLICT (iban) DO NOTHING
RETURNING id INTO v_islazul_account_1;

-- ISLAZUL (1050) - Cuenta Secundaria CaixaBank
INSERT INTO bank_accounts (id, centro_code, account_name, iban, swift, currency, account_code, current_balance, active)
VALUES (
  gen_random_uuid(),
  '1050',
  'CaixaBank Cuenta Operativa',
  'ES9121009876543210987654',
  'CAIXESBB',
  'EUR',
  '5720002',
  12340.80,
  true
) ON CONFLICT (iban) DO NOTHING
RETURNING id INTO v_islazul_account_2;

-- LORANCA (457) - Cuenta Principal Santander
INSERT INTO bank_accounts (id, centro_code, account_name, iban, swift, currency, account_code, current_balance, active)
VALUES (
  gen_random_uuid(),
  '457',
  'Santander Cuenta Principal',
  'ES4500491111222233334444',
  'BSCHESMM',
  'EUR',
  '5720001',
  38956.30,
  true
) ON CONFLICT (iban) DO NOTHING
RETURNING id INTO v_loranca_account_1;

-- LORANCA (457) - Cuenta Secundaria Ibercaja
INSERT INTO bank_accounts (id, centro_code, account_name, iban, swift, currency, account_code, current_balance, active)
VALUES (
  gen_random_uuid(),
  '457',
  'Ibercaja Cuenta Operativa',
  'ES2320855556666777788888',
  'CAZRES2Z',
  'EUR',
  '5720002',
  8475.60,
  true
) ON CONFLICT (iban) DO NOTHING
RETURNING id INTO v_loranca_account_2;

RAISE NOTICE '✓ Cuentas bancarias creadas';

-- ============================================================================
-- 2. REGLAS DE CONCILIACIÓN (bank_reconciliation_rules)
-- ============================================================================
RAISE NOTICE '2. Creando reglas de conciliación automática...';

-- Regla 1: Cierres Diarios - TPV/Terminal
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, auto_match_type, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '1050',
  v_islazul_account_1,
  'Cobro TPV - Cierre Diario',
  'credit',
  '(TPV|TERMINAL|VENTAS|POS|DATAFONO)',
  'daily_closure',
  95,
  100,
  true
) RETURNING id INTO v_rule_1;

-- Regla 2: Facturas Emitidas - Transferencias recibidas
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, auto_match_type, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '1050',
  v_islazul_account_1,
  'Cobro Facturas Emitidas',
  'credit',
  '(TRANSFER|ABONO|INGRESO|COBRO)',
  'invoice',
  85,
  90,
  true
) RETURNING id INTO v_rule_2;

-- Regla 3: Facturas Recibidas - Pagos a proveedores
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, auto_match_type, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '1050',
  v_islazul_account_1,
  'Pago Facturas Recibidas',
  'debit',
  '(PAGO|DOMICILIACION|RECIBO|ADEUDO)',
  'invoice',
  90,
  95,
  true
) RETURNING id INTO v_rule_3;

-- Regla 4: Royalties - Canon franquicia
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, amount_min, amount_max, auto_match_type, suggested_account, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '1050',
  v_islazul_account_1,
  'Pago Royalty Mensual',
  'debit',
  '(ROYALTY|CANON|FRANQUICIA)',
  1000,
  5000,
  'royalty',
  '6290001',
  95,
  85,
  true
) RETURNING id INTO v_rule_4;

-- Regla 5: Marketing Fee
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, amount_min, amount_max, auto_match_type, suggested_account, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '1050',
  v_islazul_account_1,
  'Pago Marketing Fee',
  'debit',
  '(MARKETING|PUBLICIDAD|ADVERTISING)',
  500,
  3000,
  'commission',
  '6270001',
  90,
  80,
  true
) RETURNING id INTO v_rule_5;

-- Regla 6: Comisiones Bancarias
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, amount_min, amount_max, auto_match_type, suggested_account, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '1050',
  v_islazul_account_1,
  'Comisiones Bancarias',
  'debit',
  '(COMISION|GASTOS BANCARIOS|MANTENIMIENTO)',
  0,
  100,
  'manual',
  '6260001',
  80,
  50,
  true
) RETURNING id INTO v_rule_6;

-- Regla 7: Alquiler Local
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, amount_min, amount_max, auto_match_type, suggested_account, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '1050',
  v_islazul_account_1,
  'Pago Alquiler Mensual',
  'debit',
  '(ALQUILER|ARRENDAMIENTO|RENTA)',
  2000,
  8000,
  'manual',
  '6210001',
  95,
  75,
  true
) RETURNING id INTO v_rule_7;

-- Regla 8: Nóminas (para Loranca)
INSERT INTO bank_reconciliation_rules (id, centro_code, bank_account_id, rule_name, transaction_type, description_pattern, auto_match_type, suggested_account, confidence_threshold, priority, active)
VALUES (
  gen_random_uuid(),
  '457',
  v_loranca_account_1,
  'Pago Nóminas',
  'debit',
  '(NOMINA|SALARIO|SUELDO)',
  'manual',
  '6400001',
  85,
  70,
  true
) RETURNING id INTO v_rule_8;

RAISE NOTICE '✓ Reglas de conciliación creadas';

-- ============================================================================
-- 3. CIERRES DIARIOS (daily_closures) - Para matching con transacciones
-- ============================================================================
RAISE NOTICE '3. Creando cierres diarios...';

-- Cierres de Islazul - Enero 2025
INSERT INTO daily_closures (id, centro_code, closure_date, total_sales, sales_in_store, sales_delivery, tax_10_base, tax_10_amount, tax_21_base, tax_21_amount, total_tax, card_amount, cash_amount, status)
VALUES 
  (gen_random_uuid(), '1050', '2025-01-05', 3245.80, 2890.50, 355.30, 1500.00, 150.00, 1620.50, 340.30, 490.30, 2890.50, 355.30, 'posted'),
  (gen_random_uuid(), '1050', '2025-01-06', 2987.40, 2650.20, 337.20, 1380.00, 138.00, 1432.18, 300.75, 438.75, 2650.20, 337.20, 'posted'),
  (gen_random_uuid(), '1050', '2025-01-10', 4156.90, 3720.50, 436.40, 1920.00, 192.00, 1950.74, 409.65, 601.65, 3720.50, 436.40, 'posted'),
  (gen_random_uuid(), '1050', '2025-01-12', 3678.25, 3290.80, 387.45, 1700.00, 170.00, 1724.59, 362.16, 532.16, 3290.80, 387.45, 'posted'),
  (gen_random_uuid(), '1050', '2025-01-15', 3890.60, 3480.20, 410.40, 1800.00, 180.00, 1824.38, 383.11, 563.11, 3480.20, 410.40, 'posted');

-- Cierres de Loranca - Enero 2025
INSERT INTO daily_closures (id, centro_code, closure_date, total_sales, sales_in_store, sales_delivery, tax_10_base, tax_10_amount, tax_21_base, tax_21_amount, total_tax, card_amount, cash_amount, status)
VALUES 
  (gen_random_uuid(), '457', '2025-01-07', 2876.50, 2560.40, 316.10, 1330.00, 133.00, 1350.41, 283.58, 416.58, 2560.40, 316.10, 'posted'),
  (gen_random_uuid(), '457', '2025-01-09', 3123.70, 2790.20, 333.50, 1445.00, 144.50, 1468.27, 308.33, 452.83, 2790.20, 333.50, 'posted'),
  (gen_random_uuid(), '457', '2025-01-14', 3456.80, 3089.90, 366.90, 1600.00, 160.00, 1625.45, 341.34, 501.34, 3089.90, 366.90, 'posted'),
  (gen_random_uuid(), '457', '2025-01-16', 2987.30, 2670.50, 316.80, 1380.00, 138.00, 1402.73, 294.57, 432.57, 2670.50, 316.80, 'posted');

RAISE NOTICE '✓ Cierres diarios creados';

-- ============================================================================
-- 4. FACTURAS RECIBIDAS (invoices_received) - Para matching de pagos
-- ============================================================================
RAISE NOTICE '4. Creando facturas recibidas...';

INSERT INTO invoices_received (id, centro_code, proveedor, numero_factura, fecha_factura, base_imponible, tipo_iva, cuota_iva, total, estado, fecha_vencimiento)
VALUES 
  (gen_random_uuid(), '1050', 'SUMINISTROS HOSTELERIA SL', 'PROV-2025-001', '2025-01-02', 850.00, 21, 178.50, 1028.50, 'pagada', '2025-01-15'),
  (gen_random_uuid(), '1050', 'DISTRIBUCIONES ALIMENTARIAS SA', 'DA-2025-0045', '2025-01-03', 1245.80, 10, 124.58, 1370.38, 'pagada', '2025-01-10'),
  (gen_random_uuid(), '1050', 'CARNICAS Y CONGELADOS DEL SUR', 'CC-00234', '2025-01-05', 2340.50, 10, 234.05, 2574.55, 'pagada', '2025-01-20'),
  (gen_random_uuid(), '1050', 'BEBIDAS Y REFRESCOS PREMIUM SL', 'BRP-1523', '2025-01-08', 980.00, 21, 205.80, 1185.80, 'pendiente', '2025-01-22'),
  (gen_random_uuid(), '1050', 'LIMPIEZA PROFESIONAL MADRID', 'LPM-456', '2025-01-10', 425.00, 21, 89.25, 514.25, 'pendiente', '2025-01-25'),
  (gen_random_uuid(), '457', 'SUMINISTROS HOSTELERIA SL', 'PROV-2025-012', '2025-01-04', 720.00, 21, 151.20, 871.20, 'pagada', '2025-01-18'),
  (gen_random_uuid(), '457', 'CARNICAS Y CONGELADOS DEL SUR', 'CC-00256', '2025-01-06', 1890.30, 10, 189.03, 2079.33, 'pagada', '2025-01-21'),
  (gen_random_uuid(), '457', 'ENERGIA ELECTRICA IBERDROLA', 'IBE-2025-001', '2025-01-12', 560.00, 21, 117.60, 677.60, 'pendiente', '2025-01-27');

RAISE NOTICE '✓ Facturas recibidas creadas';

-- ============================================================================
-- 5. FACTURAS EMITIDAS (invoices_issued) - Para matching de cobros
-- ============================================================================
RAISE NOTICE '5. Creando facturas emitidas...';

INSERT INTO invoices_issued (id, centro_code, cliente, numero_factura, fecha_factura, base_imponible, tipo_iva, cuota_iva, total, estado, fecha_vencimiento)
VALUES 
  (gen_random_uuid(), '1050', 'EVENTOS Y CATERING PREMIUM SL', 'FE-1050-0001', '2025-01-04', 1850.00, 21, 388.50, 2238.50, 'cobrada', '2025-01-19'),
  (gen_random_uuid(), '1050', 'CORPORACION EMPRESARIAL MADRID', 'FE-1050-0002', '2025-01-08', 3200.00, 21, 672.00, 3872.00, 'pendiente', '2025-01-23'),
  (gen_random_uuid(), '1050', 'INSTITUTO EDUCATIVO LAS ROZAS', 'FE-1050-0003', '2025-01-11', 2450.00, 10, 245.00, 2695.00, 'pendiente', '2025-01-26'),
  (gen_random_uuid(), '457', 'CLUB DEPORTIVO FUENLABRADA', 'FE-457-0001', '2025-01-05', 1620.00, 10, 162.00, 1782.00, 'cobrada', '2025-01-20'),
  (gen_random_uuid(), '457', 'AYUNTAMIENTO DE FUENLABRADA', 'FE-457-0002', '2025-01-13', 2890.00, 10, 289.00, 3179.00, 'pendiente', '2025-01-28');

RAISE NOTICE '✓ Facturas emitidas creadas';

-- ============================================================================
-- 6. TRANSACCIONES BANCARIAS (bank_transactions)
-- ============================================================================
RAISE NOTICE '6. Creando transacciones bancarias...';

-- ========== ISLAZUL - Cuenta Principal BBVA ==========

-- INGRESOS (Credits) - Cobros TPV de cierres diarios
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_islazul_account_1, '2025-01-06', '2025-01-06', 'COBRO TPV TERMINAL 05/01/2025', 3245.80, 'TPV20250105001', 42340.20, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-07', '2025-01-07', 'COBRO VENTAS DATAFONO 06/01', 2987.40, 'TPV20250106001', 45327.60, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-11', '2025-01-11', 'COBRO TPV POS 10/01/2025', 4156.90, 'TPV20250110001', 49484.50, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-13', '2025-01-13', 'COBRO TERMINAL BANCARIO 12/01', 3678.25, 'TPV20250112001', 53162.75, 'pending');

-- INGRESOS - Cobros de facturas emitidas
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_islazul_account_1, '2025-01-09', '2025-01-09', 'TRANSFERENCIA RECIBIDA EVENTOS Y CATERING PREMIUM SL', 2238.50, 'TRANS20250109001', 47566.10, 'pending');

-- PAGOS (Debits) - Pagos a proveedores
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_islazul_account_1, '2025-01-08', '2025-01-08', 'PAGO DOMICILIACION SUMINISTROS HOSTELERIA SL', -1028.50, 'DOM20250108001', 46537.60, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-10', '2025-01-10', 'ADEUDO RECIBO DISTRIBUCIONES ALIMENTARIAS SA', -1370.38, 'REC20250110001', 48194.12, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-15', '2025-01-15', 'PAGO TRANSFERENCIA CARNICAS Y CONGELADOS DEL SUR', -2574.55, 'PAG20250115001', 50588.20, 'pending');

-- PAGOS - Royalty y Marketing Fee
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_islazul_account_1, '2025-01-05', '2025-01-05', 'PAGO ROYALTY FRANQUICIA DICIEMBRE 2024', -2850.00, 'ROY20250105001', 39490.20, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-05', '2025-01-05', 'PAGO MARKETING FEE DICIEMBRE 2024', -1425.00, 'MKT20250105001', 38065.20, 'pending');

-- PAGOS - Gastos operativos
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_islazul_account_1, '2025-01-03', '2025-01-03', 'PAGO ALQUILER LOCAL ENERO 2025', -4500.00, 'ALQ20250103001', 37565.20, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-12', '2025-01-12', 'COMISION MANTENIMIENTO CUENTA', -15.50, 'COM20250112001', 51014.62, 'pending'),
  (gen_random_uuid(), v_islazul_account_1, '2025-01-14', '2025-01-14', 'GASTOS BANCARIOS TRANSFERENCIAS', -8.25, 'GST20250114001', 53154.50, 'pending');

-- ========== ISLAZUL - Cuenta Secundaria CaixaBank ==========

INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_islazul_account_2, '2025-01-04', '2025-01-04', 'TRANSFERENCIA INTERNA DESDE PRINCIPAL', 5000.00, 'TI20250104001', 11240.80, 'pending'),
  (gen_random_uuid(), v_islazul_account_2, '2025-01-11', '2025-01-11', 'PAGO NOMINAS ENERO 2025', -3800.00, 'NOM20250111001', 15040.80, 'pending'),
  (gen_random_uuid(), v_islazul_account_2, '2025-01-15', '2025-01-15', 'COMISION MANTENIMIENTO', -12.00, 'COM20250115001', 11228.80, 'pending');

-- ========== LORANCA - Cuenta Principal Santander ==========

-- INGRESOS - Cobros TPV
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_loranca_account_1, '2025-01-08', '2025-01-08', 'COBRO TPV VENTAS 07/01/2025', 2876.50, 'TPV20250107001', 35820.30, 'pending'),
  (gen_random_uuid(), v_loranca_account_1, '2025-01-10', '2025-01-10', 'COBRO DATAFONO 09/01/2025', 3123.70, 'TPV20250109001', 38944.00, 'pending'),
  (gen_random_uuid(), v_loranca_account_1, '2025-01-15', '2025-01-15', 'COBRO TPV TERMINAL 14/01', 3456.80, 'TPV20250114001', 42400.80, 'pending');

-- INGRESOS - Cobro factura emitida
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_loranca_account_1, '2025-01-12', '2025-01-12', 'TRANSFERENCIA CLUB DEPORTIVO FUENLABRADA', 1782.00, 'TRANS20250112001', 40726.00, 'pending');

-- PAGOS - Proveedores
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_loranca_account_1, '2025-01-09', '2025-01-09', 'PAGO DOMICILIACION SUMINISTROS HOSTELERIA SL', -871.20, 'DOM20250109001', 37949.10, 'pending'),
  (gen_random_uuid(), v_loranca_account_1, '2025-01-14', '2025-01-14', 'ADEUDO CARNICAS Y CONGELADOS DEL SUR', -2079.33, 'REC20250114001', 40321.47, 'pending');

-- PAGOS - Royalty
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_loranca_account_1, '2025-01-06', '2025-01-06', 'PAGO ROYALTY FRANQUICIA DICIEMBRE', -2350.00, 'ROY20250106001', 33470.30, 'pending'),
  (gen_random_uuid(), v_loranca_account_1, '2025-01-06', '2025-01-06', 'PAGO MARKETING FEE DICIEMBRE', -1175.00, 'MKT20250106001', 32295.30, 'pending');

-- PAGOS - Gastos
INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_loranca_account_1, '2025-01-04', '2025-01-04', 'PAGO ALQUILER LOCAL ENERO', -3800.00, 'ALQ20250104001', 30495.30, 'pending'),
  (gen_random_uuid(), v_loranca_account_1, '2025-01-13', '2025-01-13', 'COMISION BANCARIA', -18.75, 'COM20250113001', 40302.72, 'pending');

-- ========== LORANCA - Cuenta Secundaria Ibercaja ==========

INSERT INTO bank_transactions (id, bank_account_id, transaction_date, value_date, description, amount, reference, balance, status)
VALUES 
  (gen_random_uuid(), v_loranca_account_2, '2025-01-05', '2025-01-05', 'TRANSFERENCIA INTERNA', 4000.00, 'TI20250105001', 7875.60, 'pending'),
  (gen_random_uuid(), v_loranca_account_2, '2025-01-12', '2025-01-12', 'PAGO NOMINAS ENERO', -3300.00, 'NOM20250112001', 11875.60, 'pending'),
  (gen_random_uuid(), v_loranca_account_2, '2025-01-16', '2025-01-16', 'COMISION MANTENIMIENTO', -10.00, 'COM20250116001', 8575.60, 'pending');

RAISE NOTICE '✓ Transacciones bancarias creadas';

-- ============================================================================
-- 7. ARCHIVO NORMA43 SIMULADO (norma43_files)
-- ============================================================================
RAISE NOTICE '7. Creando registro de archivo Norma43...';

INSERT INTO norma43_files (id, centro_code, bank_account_id, file_name, file_path, import_date, start_date, end_date, initial_balance, final_balance, total_transactions, status, imported_by)
VALUES 
  (gen_random_uuid(), '1050', v_islazul_account_1, 'BBVA_1050_ENE2025.n43', '/uploads/norma43/BBVA_1050_ENE2025.n43', '2025-01-16 10:30:00', '2025-01-01', '2025-01-15', 39128.50, 45782.50, 15, 'processed', v_user_id);

RAISE NOTICE '✓ Archivo Norma43 registrado';

-- ============================================================================
-- 8. CONCILIACIONES SUGERIDAS (bank_reconciliations)
-- ============================================================================
RAISE NOTICE '8. Creando conciliaciones sugeridas y confirmadas...';

-- Obtener IDs de transacciones para crear conciliaciones
-- (En producción, esto se haría mediante el algoritmo de auto-matching)

-- Ejemplo: Conciliación de TPV con cierre diario - CONFIRMADA
INSERT INTO bank_reconciliations (
  id, 
  bank_transaction_id, 
  matched_type, 
  matched_id, 
  reconciliation_status, 
  confidence_score, 
  rule_id,
  reconciled_by,
  reconciled_at,
  notes,
  metadata
)
SELECT 
  gen_random_uuid(),
  bt.id,
  'daily_closure',
  dc.id,
  'confirmed',
  95,
  v_rule_1,
  v_user_id,
  NOW() - INTERVAL '2 days',
  'Conciliación automática: TPV del 05/01/2025',
  jsonb_build_object(
    'match_reason', 'Coincidencia exacta de importe y fecha',
    'auto_matched', true
  )
FROM bank_transactions bt
CROSS JOIN daily_closures dc
WHERE bt.description LIKE '%TPV%05/01%'
  AND dc.closure_date = '2025-01-05'
  AND dc.centro_code = '1050'
LIMIT 1;

-- Sugerencias pendientes de confirmar
-- Sugerencia 1: TPV 06/01 - SUGGESTED
INSERT INTO bank_reconciliations (
  id, 
  bank_transaction_id, 
  matched_type, 
  matched_id, 
  reconciliation_status, 
  confidence_score, 
  rule_id,
  notes,
  metadata
)
SELECT 
  gen_random_uuid(),
  bt.id,
  'daily_closure',
  dc.id,
  'suggested',
  92,
  v_rule_1,
  'Sugerencia automática basada en patrón TPV',
  jsonb_build_object(
    'match_reason', 'Coincidencia de importe (diferencia < 1%)',
    'suggested_by_rule', 'Cobro TPV - Cierre Diario'
  )
FROM bank_transactions bt
CROSS JOIN daily_closures dc
WHERE bt.description LIKE '%DATAFONO%06/01%'
  AND dc.closure_date = '2025-01-06'
  AND dc.centro_code = '1050'
LIMIT 1;

-- Sugerencia 2: Pago proveedor - SUGGESTED
INSERT INTO bank_reconciliations (
  id, 
  bank_transaction_id, 
  matched_type, 
  matched_id, 
  reconciliation_status, 
  confidence_score, 
  rule_id,
  notes,
  metadata
)
SELECT 
  gen_random_uuid(),
  bt.id,
  'invoice_received',
  ir.id,
  'suggested',
  88,
  v_rule_3,
  'Sugerencia: Pago a proveedor SUMINISTROS HOSTELERIA SL',
  jsonb_build_object(
    'match_reason', 'Coincidencia de proveedor e importe exacto',
    'supplier_match', true
  )
FROM bank_transactions bt
CROSS JOIN invoices_received ir
WHERE bt.description LIKE '%SUMINISTROS HOSTELERIA%'
  AND ir.proveedor LIKE '%SUMINISTROS HOSTELERIA%'
  AND ABS(bt.amount) = ir.total
  AND ir.centro_code = '1050'
LIMIT 1;

-- Sugerencia 3: Cobro factura emitida - CONFIRMED
INSERT INTO bank_reconciliations (
  id, 
  bank_transaction_id, 
  matched_type, 
  matched_id, 
  reconciliation_status, 
  confidence_score, 
  rule_id,
  reconciled_by,
  reconciled_at,
  notes,
  metadata
)
SELECT 
  gen_random_uuid(),
  bt.id,
  'invoice_issued',
  ii.id,
  'confirmed',
  90,
  v_rule_2,
  v_user_id,
  NOW() - INTERVAL '1 day',
  'Cobro confirmado de factura FE-1050-0001',
  jsonb_build_object(
    'match_reason', 'Coincidencia exacta cliente e importe',
    'invoice_number', 'FE-1050-0001'
  )
FROM bank_transactions bt
CROSS JOIN invoices_issued ii
WHERE bt.description LIKE '%EVENTOS Y CATERING%'
  AND ii.cliente LIKE '%EVENTOS Y CATERING%'
  AND bt.amount = ii.total
  AND ii.centro_code = '1050'
LIMIT 1;

-- Sugerencia 4: Royalty - SUGGESTED (alto confidence)
INSERT INTO bank_reconciliations (
  id, 
  bank_transaction_id, 
  matched_type, 
  reconciliation_status, 
  confidence_score, 
  rule_id,
  notes,
  metadata
)
SELECT 
  gen_random_uuid(),
  bt.id,
  'manual',
  'suggested',
  95,
  v_rule_4,
  'Pago de royalty según patrón configurado',
  jsonb_build_object(
    'match_reason', 'Patrón ROYALTY detectado en descripción',
    'suggested_account', '6290001',
    'amount_in_range', true
  )
FROM bank_transactions bt
WHERE bt.description LIKE '%ROYALTY%'
  AND bt.bank_account_id = v_islazul_account_1
LIMIT 1;

-- Sugerencia 5: Marketing Fee - SUGGESTED
INSERT INTO bank_reconciliations (
  id, 
  bank_transaction_id, 
  matched_type, 
  reconciliation_status, 
  confidence_score, 
  rule_id,
  notes,
  metadata
)
SELECT 
  gen_random_uuid(),
  bt.id,
  'manual',
  'suggested',
  90,
  v_rule_5,
  'Pago de marketing fee detectado',
  jsonb_build_object(
    'match_reason', 'Patrón MARKETING encontrado',
    'suggested_account', '6270001'
  )
FROM bank_transactions bt
WHERE bt.description LIKE '%MARKETING%'
  AND bt.bank_account_id = v_islazul_account_1
LIMIT 1;

-- Conciliación rechazada (ejemplo de falso positivo)
INSERT INTO bank_reconciliations (
  id, 
  bank_transaction_id, 
  matched_type, 
  reconciliation_status, 
  confidence_score, 
  rule_id,
  reconciled_by,
  reconciled_at,
  notes,
  metadata
)
SELECT 
  gen_random_uuid(),
  bt.id,
  'manual',
  'rejected',
  75,
  v_rule_6,
  v_user_id,
  NOW() - INTERVAL '3 hours',
  'Rechazado: Comisión ya contabilizada manualmente',
  jsonb_build_object(
    'match_reason', 'Patrón COMISION detectado',
    'rejection_reason', 'Duplicado - ya existe asiento manual'
  )
FROM bank_transactions bt
WHERE bt.description LIKE '%COMISION%'
  AND bt.bank_account_id = v_islazul_account_1
LIMIT 1;

RAISE NOTICE '✓ Conciliaciones creadas (suggested, confirmed, rejected)';

-- ============================================================================
-- 9. ACTUALIZAR BALANCE DE CUENTAS
-- ============================================================================
RAISE NOTICE '9. Actualizando balances de cuentas...';

-- Calcular y actualizar el balance actual de cada cuenta basado en transacciones
UPDATE bank_accounts ba
SET current_balance = COALESCE((
  SELECT SUM(amount)
  FROM bank_transactions bt
  WHERE bt.bank_account_id = ba.id
), 0) + ba.current_balance;

RAISE NOTICE '✓ Balances actualizados';

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '================================================================';
RAISE NOTICE 'DATOS DEMO DE CONCILIACIÓN BANCARIA CREADOS EXITOSAMENTE';
RAISE NOTICE '================================================================';
RAISE NOTICE '';
RAISE NOTICE 'RESUMEN:';
RAISE NOTICE '--------';
RAISE NOTICE '✓ 4 Cuentas bancarias (2 por centro)';
RAISE NOTICE '✓ 8 Reglas de conciliación automática';
RAISE NOTICE '✓ 9 Cierres diarios';
RAISE NOTICE '✓ 8 Facturas recibidas';
RAISE NOTICE '✓ 5 Facturas emitidas';
RAISE NOTICE '✓ ~35 Transacciones bancarias variadas';
RAISE NOTICE '✓ 1 Archivo Norma43 registrado';
RAISE NOTICE '✓ 6+ Conciliaciones (suggested, confirmed, rejected)';
RAISE NOTICE '';
RAISE NOTICE 'PRÓXIMOS PASOS:';
RAISE NOTICE '---------------';
RAISE NOTICE '1. Navegar a /treasury/reconciliation';
RAISE NOTICE '2. Seleccionar cuenta bancaria';
RAISE NOTICE '3. Ver transacciones pendientes y sugerencias';
RAISE NOTICE '4. Probar botón "Auto-Conciliar"';
RAISE NOTICE '5. Confirmar/Rechazar sugerencias';
RAISE NOTICE '6. Ver reglas automáticas en pestaña "Reglas"';
RAISE NOTICE '';
RAISE NOTICE '================================================================';

END $$;
